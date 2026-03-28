/**
 * TheSportsDB free public API — no API key required for v1/json/3
 * Docs: https://www.thesportsdb.com/api.php
 */

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

export const LEAGUES: Record<string, { id: string; name: string }> = {
  premier_league:    { id: '4328', name: 'English Premier League' },
  la_liga:           { id: '4335', name: 'La Liga' },
  bundesliga:        { id: '4331', name: 'Bundesliga' },
  serie_a:           { id: '4332', name: 'Serie A' },
  champions_league:  { id: '4480', name: 'UEFA Champions League' },
  mls:               { id: '4346', name: 'MLS' },
};

export interface SportsEvent {
  apiId:    string;
  homeTeam: string;
  awayTeam: string;
  league:   string;
  date:     string;
  time:     string;
  venue:    string;
}

function parseEvent(e: Record<string, string>): SportsEvent {
  return {
    apiId:    e.idEvent,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    league:   e.strLeague,
    date:     e.dateEvent,
    time:     e.strTime ?? 'TBD',
    venue:    e.strVenue ?? '',
  };
}

/**
 * Returns the single soonest upcoming event for the given league.
 * Throws if no events are found.
 */
export async function fetchNextMatch(leagueKey = 'la_liga'): Promise<SportsEvent> {
  const league = LEAGUES[leagueKey] ?? LEAGUES.la_liga;
  const res    = await fetch(`${BASE}/eventsnextleague.php?id=${league.id}`, {
    headers:    { 'User-Agent': 'foxy-cash-casino/1.0' },
    next:       { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);

  const body = await res.json();
  if (!body.events?.length) throw new Error('No upcoming events found for this league');

  const sorted = [...body.events].sort(
    (a: Record<string, string>, b: Record<string, string>) =>
      new Date(a.dateEvent).getTime() - new Date(b.dateEvent).getTime(),
  );

  return parseEvent(sorted[0]);
}

/**
 * Applies house margin to a true odd.
 * impliedProb = 1/trueOdd  →  margined = impliedProb * (1 + margin/100)  →  displayOdd = 1/margined
 */
export function applyMargin(trueOdd: number, marginPct: number): number {
  if (!trueOdd || trueOdd <= 1) return trueOdd;
  const implied  = 1 / trueOdd;
  const margined = implied * (1 + marginPct / 100);
  return Number((1 / margined).toFixed(2));
}

export function computeDisplayOdds(
  trueOdds: { home: number; draw: number; away: number },
  marginPct: number,
): { home: number; draw: number; away: number } {
  return {
    home: applyMargin(trueOdds.home, marginPct),
    draw: applyMargin(trueOdds.draw, marginPct),
    away: applyMargin(trueOdds.away, marginPct),
  };
}
