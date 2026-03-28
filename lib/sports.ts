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
  apiId:      string;
  homeTeam:   string;
  awayTeam:   string;
  homeBadge:  string;
  awayBadge:  string;
  league:     string;
  leagueKey:  string;
  date:       string;
  time:       string;
  venue:      string;
}

function parseEvent(e: Record<string, string>, leagueKey: string): SportsEvent {
  return {
    apiId:      e.idEvent      ?? '',
    homeTeam:   e.strHomeTeam  ?? '',
    awayTeam:   e.strAwayTeam  ?? '',
    homeBadge:  e.strHomeTeamBadge ?? '',
    awayBadge:  e.strAwayTeamBadge ?? '',
    league:     e.strLeague    ?? '',
    leagueKey,
    date:       e.dateEvent    ?? '',
    time:       e.strTime      ?? 'TBD',
    venue:      e.strVenue     ?? '',
  };
}

/** Fetch ALL upcoming matches from ALL leagues at once */
export async function fetchAllLeagues(): Promise<SportsEvent[]> {
  const results: SportsEvent[] = [];

  await Promise.allSettled(
    Object.entries(LEAGUES).map(async ([leagueKey, league]) => {
      try {
        const res  = await fetch(`${BASE}/eventsnextleague.php?id=${league.id}`, {
          headers: { 'User-Agent': 'bets-pro/1.0' },
          next:    { revalidate: 0 },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (!body.events?.length) return;
        const events = body.events.map((e: Record<string, string>) => parseEvent(e, leagueKey));
        results.push(...events);
      } catch {
        // skip failed leagues silently
      }
    }),
  );

  return results.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/** Fetch upcoming matches for a single league */
export async function fetchAllMatches(leagueKey = 'la_liga'): Promise<SportsEvent[]> {
  const league = LEAGUES[leagueKey] ?? LEAGUES.la_liga;
  const res    = await fetch(`${BASE}/eventsnextleague.php?id=${league.id}`, {
    headers: { 'User-Agent': 'bets-pro/1.0' },
    next:    { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`TheSportsDB error: ${res.status}`);
  const body = await res.json();
  if (!body.events?.length) throw new Error('No upcoming events found');
  return [...body.events]
    .sort((a: Record<string, string>, b: Record<string, string>) =>
      new Date(a.dateEvent).getTime() - new Date(b.dateEvent).getTime())
    .map((e: Record<string, string>) => parseEvent(e, leagueKey));
}
