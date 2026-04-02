import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet              from '@/models/Bet';

export async function GET() {
  try {
    await dbConnect();

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bets = await Bet.find({ userId: user._id, isInverse: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ bets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fetch inverse bets error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}