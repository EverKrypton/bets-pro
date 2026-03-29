import { NextResponse } from 'next/server';

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

// TheSportsDB free livescores endpoint
// Returns currently live matches across all supported leagues
export async function GET() {
  try {
    const res = await fetch(`${BASE}/livescore.php`, {
      headers: { 'User-Agent': 'bets-pro/1.0' },
      next:    { revalidate: 0 }, // never cache — always fresh
    });

    if (!res.ok) {
      return NextResponse.json({ events: [] });
    }

    const data = await res.json();
    const events = (data.events ?? []).map((e: Record<string, string>) => ({
      apiId:      e.idEvent,
      homeTeam:   e.strHomeTeam,
      awayTeam:   e.strAwayTeam,
      homeBadge:  e.strHomeTeamBadge ?? '',
      awayBadge:  e.strAwayTeamBadge ?? '',
      homeScore:  e.intHomeScore ?? null,
      awayScore:  e.intAwayScore ?? null,
      minute:     e.strProgress ?? e.strStatus ?? '',
      status:     e.strStatus  ?? '',
      league:     e.strLeague  ?? '',
      date:       e.dateEvent  ?? '',
    }));

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
