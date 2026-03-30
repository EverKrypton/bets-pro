import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Match            from '@/models/Match';

export async function GET() {
  try {
    await dbConnect();

    // Show open, closed, and settled (so users can see results)
    const matches = await Match.find({ status: { $in: ['open', 'closed', 'settled'] } })
      .select('-trueOdds -marginPct')
      .sort({ date: 1, createdAt: 1 });

    const now = new Date();

    // Auto-tag matches as "past" for display (don't change DB status)
    const enriched = matches.map(m => {
      const obj = m.toObject() as any;
      if (m.date) {
        const matchDT = m.time && m.time !== 'TBD'
          ? new Date(`${m.date}T${m.time}Z`)
          : new Date(`${m.date}T23:59:00Z`);
        // If more than 2h past kickoff and still open/closed → mark displayStatus as finished
        if ((now.getTime() - matchDT.getTime()) > 2 * 60 * 60 * 1000 && m.status !== 'settled') {
          obj.displayStatus = 'finished';
        } else {
          obj.displayStatus = m.status;
        }
      } else {
        obj.displayStatus = m.status;
      }
      return obj;
    });

    return NextResponse.json({ matches: enriched });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
