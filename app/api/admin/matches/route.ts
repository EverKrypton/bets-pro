import { NextResponse }        from 'next/server';
import dbConnect               from '@/lib/db';
import { getSessionUser }      from '@/lib/session';
import Match                   from '@/models/Match';
import { fetchNextMatch, LEAGUES } from '@/lib/sports';

// GET /api/admin/matches — list all matches (admin only)
export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const matches = await Match.find().sort({ createdAt: -1 });
    return NextResponse.json({ matches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/matches — fetch next match from TheSportsDB and store it
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

    const event = await fetchNextMatch(league);

    // Avoid duplicates by apiId
    const existing = await Match.findOne({ apiId: event.apiId });
    if (existing) {
      return NextResponse.json(
        { message: 'Match already exists in the database', match: existing },
        { status: 200 },
      );
    }

    const match = await Match.create({
      apiId:    event.apiId,
      homeTeam: event.homeTeam,
      awayTeam: event.awayTeam,
      league:   event.league,
      date:     event.date,
      time:     event.time,
      venue:    event.venue,
      status:   'pending',
    });

    return NextResponse.json({ match }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
