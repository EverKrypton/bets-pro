import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings  from '@/models/Settings';

const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/3';
const FOOTBALL_DATA = 'https://api.football-data.org/v4';

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({ key: 'global' });
    const footballApiKey = settings?.footballDataApiKey || process.env.FOOTBALL_DATA_API_KEY || '';

    const today = new Date().toISOString().split('T')[0];

    // Try football-data.org first (best for live scores)
    if (footballApiKey) {
      try {
        const fdRes = await fetch(
          `${FOOTBALL_DATA}/matches?dateFrom=${today}&dateTo=${today}&status=IN_PLAY,PAUSED`,
          {
            headers: {
              'X-Auth-Token': footballApiKey,
              'User-Agent':   'bets-pro/1.0',
            },
            next: { revalidate: 0 },
          },
        );

        if (fdRes.ok) {
          const fdData = await fdRes.json();
          if (fdData.matches?.length > 0) {
            const events = fdData.matches.map((m: any) => ({
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
          }
        }
      } catch { /* fallback to TheSportsDB */ }
    }

    // Fallback: TheSportsDB livescore
    try {
      const res = await fetch(`${THESPORTSDB}/livescore.php`, {
        headers: { 'User-Agent': 'bets-pro/1.0' },
        next:    { revalidate: 0 },
      });

      if (res.ok) {
        const data   = await res.json();
        const events = (data.events ?? []).map((e: Record<string, string>) => ({
          apiId:      e.idEvent       ?? '',
          homeTeam:   e.strHomeTeam   ?? '',
          awayTeam:   e.strAwayTeam   ?? '',
          homeBadge:  e.strHomeTeamBadge ?? '',
          awayBadge:  e.strAwayTeamBadge ?? '',
          homeScore:  e.intHomeScore  ?? null,
          awayScore:  e.intAwayScore  ?? null,
          minute:     e.strProgress   ?? e.strStatus ?? '',
          status:     e.strStatus     ?? '',
          league:     e.strLeague     ?? '',
          date:       e.dateEvent     ?? '',
          isLive:     true,
        }));

        if (events.length > 0) {
          return NextResponse.json({ events, source: 'thesportsdb' });
        }
      }
    } catch { /* return empty */ }

    return NextResponse.json({ events: [], source: 'none' });
  } catch {
    return NextResponse.json({ events: [], source: 'error' });
  }
}
