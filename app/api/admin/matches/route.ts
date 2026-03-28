import { NextResponse }                        from 'next/server';
import dbConnect                               from '@/lib/db';
import { getSessionUser }                      from '@/lib/session';
import Match                                   from '@/models/Match';
import { fetchAllLeagues, fetchAllMatches, LEAGUES } from '@/lib/sports';

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

    // Validate league
    if (league !== 'all' && !LEAGUES[league]) {
      return NextResponse.json({ error: `Invalid league. Options: all, ${Object.keys(LEAGUES).join(', ')}` }, { status: 400 });
    }

    const events = league === 'all'
      ? await fetchAllLeagues()
      : await fetchAllMatches(league);

    let imported = 0;
    let skipped  = 0;

    for (const event of events) {
      // Dedup: by apiId if present, otherwise by homeTeam+awayTeam+date
      const query = event.apiId
        ? { apiId: event.apiId }
        : { homeTeam: event.homeTeam, awayTeam: event.awayTeam, date: event.date };

      const existing = await Match.findOne(query);
      if (existing) { skipped++; continue; }

      await Match.create({
        apiId:      event.apiId  || null,
        homeTeam:   event.homeTeam,
        awayTeam:   event.awayTeam,
        homeBadge:  event.homeBadge,
        awayBadge:  event.awayBadge,
        league:     event.league,
        date:       event.date,
        time:       event.time,
        venue:      event.venue,
        status:     'pending',
      });
      imported++;
    }

    return NextResponse.json(
      { message: `${imported} imported, ${skipped} already existed`, imported, skipped, total: events.length },
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
