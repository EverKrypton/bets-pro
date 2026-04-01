import { NextResponse }                              from 'next/server';
import dbConnect                                     from '@/lib/db';
import { getSessionUser }                            from '@/lib/session';
import Match                                         from '@/models/Match';
import Settings                                      from '@/models/Settings';

const FOOTBALL_DATA = 'https://api.football-data.org/v4';

const LEAGUE_CODES: Record<string, string> = {
  premier_league:   'PPL',
  la_liga:          'PD',
  bundesliga:       'BL1',
  serie_a:          'SA',
  champions_league: 'CL',
  mls:              'MLS',
};

async function fetchFootballDataMatches(leagueKey?: string): Promise<any[]> {
  const settings = await Settings.findOne({ key: 'global' });
  const apiKey = settings?.footballDataApiKey || process.env.FOOTBALL_DATA_API_KEY;

  if (!apiKey) {
    throw new Error('football-data.org API key not configured. Add it in Admin > Settings > API Keys');
  }

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const dateFrom = today.toISOString().split('T')[0];
  const dateTo = nextWeek.toISOString().split('T')[0];

  let url = `${FOOTBALL_DATA}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED,TIMED`;

  if (leagueKey && LEAGUE_CODES[leagueKey]) {
    url = `${FOOTBALL_DATA}/competitions/${LEAGUE_CODES[leagueKey]}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED,TIMED`;
  }

  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`football-data.org API error: ${res.status} - ${res.statusText}`);
  }

  const data = await res.json();

  if (!data.matches || data.matches.length === 0) {
    return [];
  }

  return data.matches;
}

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const matches = await Match.find().sort({ date: 1, createdAt: -1 });
    return NextResponse.json({ matches });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { league = 'all' } = await req.json().catch(() => ({}));
    const leagueKey = league === 'all' ? undefined : league;

    const matches = await fetchFootballDataMatches(leagueKey);

    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'No upcoming matches found. The API key may be invalid, or there are no scheduled matches in the next 7 days.' },
        { status: 400 },
      );
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const m of matches) {
      const dateStr = m.utcDate ? m.utcDate.split('T')[0] : new Date().toISOString().split('T')[0];
      const timeStr = m.utcDate ? m.utcDate.split('T')[1]?.slice(0, 5) || '00:00' : '00:00';

      const query: any = { apiId: String(m.id) };
      const existing = await Match.findOne(query);

      if (existing) {
        const changed =
          existing.homeBadge !== (m.homeTeam?.crest || '') ||
          existing.awayBadge !== (m.awayTeam?.crest || '') ||
          existing.homeTeam !== (m.homeTeam?.name || '') ||
          existing.awayTeam !== (m.awayTeam?.name || '');

        if (changed) {
          existing.homeTeam = m.homeTeam?.name || existing.homeTeam;
          existing.awayTeam = m.awayTeam?.name || existing.awayTeam;
          existing.homeBadge = m.homeTeam?.crest || existing.homeBadge;
          existing.awayBadge = m.awayTeam?.crest || existing.awayBadge;
          existing.league = m.competition?.name || existing.league;
          existing.date = dateStr;
          existing.time = timeStr;
          await existing.save();
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      await Match.create({
        apiId:     String(m.id),
        homeTeam:  m.homeTeam?.name || 'Unknown',
        awayTeam:  m.awayTeam?.name || 'Unknown',
        homeBadge: m.homeTeam?.crest || '',
        awayBadge: m.awayTeam?.crest || '',
        league:    m.competition?.name || '',
        date:      dateStr,
        time:      timeStr,
        venue:     '',
        status:    'pending',
      });
      imported++;
    }

    return NextResponse.json(
      { message: `${imported} imported, ${updated} updated, ${skipped} unchanged`, imported, updated, skipped, total: matches.length },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
