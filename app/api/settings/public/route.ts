import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Settings         from '@/models/Settings';

export async function GET() {
  try {
    await dbConnect();
    const s = await Settings.findOne({ key: 'global' });
    return NextResponse.json({
      minBetAmount:         s?.minBetAmount         ?? 1,
      maxBetAmount:         s?.maxBetAmount         ?? 50,
      maxPotentialPayout:   s?.maxPotentialPayout   ?? 200,
      liveScoreRefreshSecs: s?.liveScoreRefreshSecs ?? 30,
    });
  } catch {
    return NextResponse.json({ minBetAmount: 1, maxBetAmount: 50, maxPotentialPayout: 200, liveScoreRefreshSecs: 30 });
  }
}
