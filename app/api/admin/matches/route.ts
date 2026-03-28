import { NextResponse }                              from 'next/server';
import dbConnect                                     from '@/lib/db';
import { getSessionUser }                            from '@/lib/session';
import Match                                         from '@/models/Match';
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

    if (league !== 'all' && !LEAGUES[league]) {
      return NextResponse.json(
        { error: `Invalid league. Options: all, ${Object.keys(LEAGUES).join(', ')}` },
        { status: 400 },
      );
    }

    const events = league === 'all'
      ? await fetchAllLeagues()
      : await fetchAllMatches(league);

    let imported = 0;
    let updated  = 0;

    for (const event of events) {
      // Build the search query — prefer apiId, fallback to team+date combo
      const query = event.apiId
        ? { apiId: event.apiId }
        : { homeTeam: event.homeTeam, awayTeam: event.awayTeam, date: event.date };

      const existing = await Match.findOne(query);

      if (existing) {
        // Update badges and league info but keep status/odds untouched
        const changed =
          existing.homeBadge !== event.homeBadge ||
          existing.awayBadge !== event.awayBadge ||
          !existing.league;

        if (changed) {
          existing.homeBadge = event.homeBadge;
          existing.awayBadge = event.awayBadge;
          if (!existing.league) existing.league = event.league;
          await existing.save();
          updated++;
        }
        continue;
      }

      // New match — create it
      await Match.create({
        apiId:     event.apiId  || null,
        homeTeam:  event.homeTeam,
        awayTeam:  event.awayTeam,
        homeBadge: event.homeBadge,
        awayBadge: event.awayBadge,
        league:    event.league,
        date:      event.date,
        time:      event.time,
        venue:     event.venue,
        status:    'pending',
      });
      imported++;
    }

    return NextResponse.json(
      {
        message: `${imported} new, ${updated} updated with badges`,
        imported, updated, total: events.length,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
