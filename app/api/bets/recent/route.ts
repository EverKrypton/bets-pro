import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Bet              from '@/models/Bet';

export async function GET() {
  try {
    await dbConnect();
    // Public feed — only safe fields, no userId exposed
    const bets = await Bet.find({ status: { $in: ['pending','won','lost','refunded'] } })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('amount status details.homeTeam details.awayTeam details.selection details.odd createdAt');
    return NextResponse.json({ bets });
  } catch {
    return NextResponse.json({ bets: [] });
  }
}
