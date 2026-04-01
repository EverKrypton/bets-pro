import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings  from '@/models/Settings';

const FOOTBALL_DATA = 'https://api.football-data.org/v4';

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({ key: 'global' });
    const apiKey = settings?.footballDataApiKey || process.env.FOOTBALL_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ events: [], source: 'error', error: 'API key not configured' });
    }

    const today = new Date().toISOString().split('T')[0];

    const res = await fetch(
      `${FOOTBALL_DATA}/matches?dateFrom=${today}&dateTo=${today}&status=IN_PLAY,PAUSED`,
      {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 30 },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ events: [], source: 'error', error: `API error: ${res.status}` });
    }

    const data = await res.json();
    const events = (data.matches || []).map((m: any) => ({
      apiId:      String(m.id),
      homeTeam:   m.homeTeam?.name ?? '',
      awayTeam:   m.awayTeam?.name ?? '',
      homeBadge:  m.homeTeam?.crest ?? '',
      awayBadge:  m.awayTeam?.crest ?? '',
      homeScore:  m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0,
      awayScore:  m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0,
      minute:     m.minute ? `${m.minute}'` : '',
      status:     m.status ?? '',
      league:     m.competition?.name ?? '',
      date:       m.utcDate?.split('T')[0] ?? today,
      isLive:     ['IN_PLAY', 'PAUSED'].includes(m.status),
    }));

    return NextResponse.json({ events, source: 'football-data' });
  } catch (error) {
    console.error('Livescores error:', error);
    return NextResponse.json({ events: [], source: 'error' });
  }
}
