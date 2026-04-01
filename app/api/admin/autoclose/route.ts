import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match from '@/models/Match';
import Settings from '@/models/Settings';

const FOOTBALL_DATA = 'https://api.football-data.org/v4';

interface LiveMatch {
  apiId: string;
  minute: number | null;
  status: string;
}

async function getLiveMatches(apiKey: string): Promise<Map<string, LiveMatch>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Get matches from today including live ones
    const res = await fetch(
      `${FOOTBALL_DATA}/matches?dateFrom=${today}&dateTo=${today}&status=IN_PLAY,PAUSED,FINISHED`,
      {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 30 },
      },
    );

    if (!res.ok) return new Map();

    const data = await res.json();
    const liveMap = new Map<string, LiveMatch>();

    for (const m of data.matches || []) {
      const minute = m.minute ?? null;
      const status = m.status ?? '';
      liveMap.set(String(m.id), {
        apiId: String(m.id),
        minute: minute ? parseInt(String(minute)) : null,
        status,
     });
    }

    return liveMap;
  } catch {
    return new Map();
  }
}

export async function POST(req: Request) {
  try {
    const cronSecret = req.headers.get('x-cron-secret');
    const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

    await dbConnect();

    if (!isValidCron) {
      const admin = await getSessionUser();
      if (!admin || admin.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const settings = await Settings.findOne({ key: 'global' });
    const apiKey = settings?.footballDataApiKey || process.env.FOOTBALL_DATA_API_KEY;
    const minMinutesPlayed = settings?.autoCloseMinutes ?? 30;

    // Get live match data to check actual minutes played
    const liveMatches = apiKey ? await getLiveMatches(apiKey) : new Map();

    const openMatches = await Match.find({ status: 'open' });
    const closed: string[] = [];
    const errors: string[] = [];

    for (const match of openMatches) {
      try {
        // Check if we have live data for this match
        const liveData = match.apiId ? liveMatches.get(match.apiId) : null;
        
        let shouldClose = false;
        let reason = '';

        if (liveData && liveData.minute !== null) {
          // We have live match data - close if match has been running > minMinutesPlayed
          if (liveData.minute >= minMinutesPlayed) {
            shouldClose = true;
            reason = `minute ${liveData.minute}' >= ${minMinutesPlayed}'`;
          }
        } else {
          // No live data - fall back to kickoff time check
          if (!match.date) continue;

          let matchTime: Date;
          if (match.time && match.time !== 'TBD') {
            matchTime = new Date(`${match.date}T${match.time}Z`);
          } else {
            matchTime = new Date(`${match.date}T23:59:00Z`);
          }

          const now = new Date();
          const minutesSinceKickoff = (now.getTime() - matchTime.getTime()) / 60000;

          // Only close if match should have started more than minMinutesPlayed ago
          // Allow up to 3 hours past kickoff before closing without live data
          if (minutesSinceKickoff >= minMinutesPlayed && minutesSinceKickoff <= 180) {
            shouldClose = true;
            reason = `estimated ${Math.round(minutesSinceKickoff)}' since kickoff`;
          }
        }

        if (shouldClose) {
          match.status = 'closed';
          await match.save();
          closed.push(`${match.homeTeam} vs ${match.awayTeam} (${reason})`);
        }
      } catch (err) {
        errors.push(`Error processing ${match.homeTeam} vs ${match.awayTeam}`);
      }
    }

    return NextResponse.json({
      message: closed.length > 0 
        ? `Closed ${closed.length} match(es) - only matches running >${minMinutesPlayed} minutes`
        : 'No matches to close',
      closed,
      checkedAt: new Date().toISOString(),
      minMinutesPlayed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}