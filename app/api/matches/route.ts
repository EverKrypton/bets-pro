import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Match            from '@/models/Match';

export async function GET() {
  try {
    await dbConnect();
    const matches = await Match.find({ status: { $in: ['open', 'closed'] } })
      .select('-trueOdds -marginPct')
      .sort({ date: 1, createdAt: 1 });
    return NextResponse.json({ matches });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
