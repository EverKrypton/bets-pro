import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Match            from '@/models/Match';

// GET /api/matches — returns only open matches with display odds (no trueOdds exposed)
export async function GET() {
  try {
    await dbConnect();

    const matches = await Match.find({ status: 'open' })
      .select('-trueOdds -marginPct')
      .sort({ date: 1, createdAt: 1 });

    return NextResponse.json({ matches });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
