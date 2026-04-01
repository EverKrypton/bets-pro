export const LEAGUES: Record<string, { code: string; name: string }> = {
  premier_league:   { code: 'PPL', name: 'Premier League' },
  la_liga:          { code: 'PD',  name: 'La Liga' },
  bundesliga:       { code: 'BL1', name: 'Bundesliga' },
  serie_a:          { code: 'SA',  name: 'Serie A' },
  champions_league: { code: 'CL',  name: 'Champions League' },
  mls:              { code: 'MLS', name: 'MLS' },
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
