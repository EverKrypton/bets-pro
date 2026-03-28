import { NextResponse }            from 'next/server';
import dbConnect                   from '@/lib/db';
import { getSessionUser }          from '@/lib/session';
import Match                       from '@/models/Match';
import { fetchAllMatches, LEAGUES } from '@/lib/sports';

// GET /api/admin/matches — list all matches
export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const matches = await Match.find().sort({ date: 1, createdAt: -1 });
    return NextResponse.json({ matches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/matches — import ALL upcoming matches from TheSportsDB for a league
export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { league = 'la_liga' } = await req.json().catch(() => ({}));

    if (!LEAGUES[league]) {
      return NextResponse.json(
        { error: `Invalid league. Options: ${Object.keys(LEAGUES).join(', ')}` },
        { status: 400 },
      );
    }

    const events = await fetchAllMatches(league);

    let imported  = 0;
    let skipped   = 0;

    for (const event of events) {
      const existing = await Match.findOne({ apiId: event.apiId });
      if (existing) { skipped++; continue; }

      await Match.create({
        apiId:    event.apiId,
        homeTeam: event.homeTeam,
        awayTeam: event.awayTeam,
        league:   event.league,
        date:     event.date,
        time:     event.time,
        venue:    event.venue,
        status:   'pending',
      });
      imported++;
    }

    return NextResponse.json(
      { message: `${imported} imported, ${skipped} already existed`, imported, skipped, total: events.length },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
