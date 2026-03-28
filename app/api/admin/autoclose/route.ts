import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match              from '@/models/Match';
import Settings           from '@/models/Settings';

// POST /api/admin/autoclose — call this manually or via Vercel cron
export async function POST(req: Request) {
  try {
    // Allow either admin session OR a secret header for cron calls
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
    const closeBeforeMinutes = settings?.autoCloseMinutes ?? 30;

    // Find all open matches
    const openMatches = await Match.find({ status: 'open' });
    const now         = new Date();
    const closed: string[] = [];

    for (const match of openMatches) {
      if (!match.date) continue;

      // Parse match datetime — date is YYYY-MM-DD, time is HH:MM:SS or TBD
      let matchTime: Date;
      if (match.time && match.time !== 'TBD') {
        matchTime = new Date(`${match.date}T${match.time}Z`);
      } else {
        // No time known — use end of day to be safe
        matchTime = new Date(`${match.date}T23:59:00Z`);
      }

      const minutesUntilKickoff = (matchTime.getTime() - now.getTime()) / 60000;

      if (minutesUntilKickoff <= closeBeforeMinutes && minutesUntilKickoff > -120) {
        // Close if within the window and not more than 2h past kickoff
        match.status = 'closed';
        await match.save();
        closed.push(`${match.homeTeam} vs ${match.awayTeam}`);
      }
    }

    return NextResponse.json({
      message:  closed.length > 0 ? `Closed ${closed.length} match(es)` : 'No matches to close',
      closed,
      checkedAt: now.toISOString(),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// GET — same logic, easier to trigger manually
export async function GET(req: Request) {
  return POST(req);
}
