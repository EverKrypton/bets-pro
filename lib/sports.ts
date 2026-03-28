/**
 * TheSportsDB free public API — no API key required for v1/json/3
 * Docs: https://www.thesportsdb.com/api.php
 */

const BASE = 'https://www.thesportsdb.com/api/v1/json/3';

export const LEAGUES: Record<string, { id: string; name: string }> = {
  premier_league:   { id: '4328', name: 'English Premier League' },
  la_liga:          { id: '4335', name: 'La Liga' },
  bundesliga:       { id: '4331', name: 'Bundesliga' },
  serie_a:          { id: '4332', name: 'Serie A' },
  champions_league: { id: '4480', name: 'UEFA Champions League' },
  mls:              { id: '4346', name: 'MLS' },
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
 * Returns ALL upcoming events for the given league, sorted by date ascending.
 */
export async function fetchAllMatches(leagueKey = 'la_liga'): Promise<SportsEvent[]> {
  const league = LEAGUES[leagueKey] ?? LEAGUES.la_liga;
  const res    = await fetch(`${BASE}/eventsnextleague.php?id=${league.id}`, {
    headers: { 'User-Agent': 'foxy-cash-casino/1.0' },
    next:    { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);

  const body = await res.json();
  if (!body.events?.length) throw new Error('No upcoming events found for this league');

  return [...body.events]
    .sort(
      (a: Record<string, string>, b: Record<string, string>) =>
        new Date(a.dateEvent).getTime() - new Date(b.dateEvent).getTime(),
    )
    .map(parseEvent);
}
