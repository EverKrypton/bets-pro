import { NextResponse } from 'next/server';

// football-data.org free tier: 10 req/min, no key needed for basic
// Supported competitions (free): PL, PD, BL1, SA, FL1, CL
const COMPETITION_IDS: Record<string, string> = {
  'English Premier League': 'PL',
  'La Liga':                'PD',
  'Bundesliga':             'BL1',
  'Serie A':                'SA',
  'Ligue 1':                'FL1',
  'UEFA Champions League':  'CL',
};

const THESPORTSDB = 'https://www.thesportsdb.com/api/v1/json/3';

// Try TheSportsDB livescore first (free), fallback to football-data.org
export async function GET() {
  try {
    // TheSportsDB livescore (returns live matches if any)
    const res  = await fetch(`${THESPORTSDB}/livescore.php`, {
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

      // If TheSportsDB returned events (premium feature may work), use it
      if (events.length > 0) return NextResponse.json({ events, source: 'thesportsdb' });
    }

    // Fallback: fetch today's matches from football-data.org (free, no key needed for basic)
    const today    = new Date().toISOString().split('T')[0];
    const fdRes    = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}&status=IN_PLAY,PAUSED`,
      {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY ?? '',
          'User-Agent':   'bets-pro/1.0',
        },
        next: { revalidate: 0 },
      },
    );

    if (fdRes.ok) {
      const fdData = await fdRes.json();
      const events = (fdData.matches ?? []).map((m: any) => ({
        apiId:      String(m.id),
        homeTeam:   m.homeTeam?.name ?? '',
        awayTeam:   m.awayTeam?.name ?? '',
        homeBadge:  m.homeTeam?.crest ?? '',
        awayBadge:  m.awayTeam?.crest ?? '',
        homeScore:  m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? null,
        awayScore:  m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? null,
        minute:     m.minute ? `${m.minute}` : '',
        status:     m.status ?? '',
        league:     m.competition?.name ?? '',
        date:       m.utcDate?.split('T')[0] ?? today,
        isLive:     ['IN_PLAY','PAUSED'].includes(m.status),
      }));
      return NextResponse.json({ events, source: 'football-data' });
    }

    return NextResponse.json({ events: [], source: 'none' });
  } catch {
    return NextResponse.json({ events: [], source: 'error' });
  }
}
