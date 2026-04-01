import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet                from '@/models/Bet';
import Match              from '@/models/Match';
import Settings           from '@/models/Settings';
import User               from '@/models/User';

const ALL_MARKETS = ['home', 'draw', 'away', '1x', 'x2', '12'] as const;
type Market = typeof ALL_MARKETS[number];

function doubleChanceOdd(odds: { home: number; draw: number; away: number }, market: Market): number {
  const pH = 1 / odds.home, pD = 1 / odds.draw, pA = 1 / odds.away;
  const p  = market === '1x' ? pH + pD : market === 'x2' ? pD + pA : pH + pA;
  return Math.max(1.02, Number((1 / p).toFixed(2)));
}

export async function POST(req: Request) {
  try {
    const { amount, matchId, selection } = await req.json();

    if (!matchId || !ALL_MARKETS.includes(selection as Market)) {
      return NextResponse.json({ error: 'matchId and a valid selection are required' }, { status: 400 });
    }

    await dbConnect();

    // Load settings for limits
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, new: true },
    );

    const minBet   = settings?.minBetAmount       ?? 1;
    const maxBet   = settings?.maxBetAmount       ?? 50;
    const maxPayout = settings?.maxPotentialPayout ?? 200;

    if (!amount || isNaN(Number(amount))) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const betAmount = parseFloat(Number(amount).toFixed(6));

    if (betAmount < minBet) {
      return NextResponse.json({ error: `Minimum bet is ${minBet} USDT` }, { status: 400 });
    }

    if (betAmount > maxBet) {
      return NextResponse.json({ error: `Maximum bet is ${maxBet} USDT` }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const match = await Match.findById(matchId);
    if (!match || match.status !== 'open') {
      return NextResponse.json({ error: 'Match is not open for betting' }, { status: 400 });
    }

    const sel = selection as Market;
    let odd: number;

    if (['home', 'draw', 'away'].includes(sel)) {
      odd = match.displayOdds?.[sel as 'home' | 'draw' | 'away'];
      if (!odd || odd < 1.01) {
        return NextResponse.json({ error: 'Odds not available for this selection' }, { status: 400 });
      }
    } else {
      if (!match.displayOdds?.home || !match.displayOdds?.draw || !match.displayOdds?.away) {
        return NextResponse.json({ error: 'Odds not set for this match' }, { status: 400 });
      }
      odd = doubleChanceOdd(match.displayOdds, sel);
    }

    const potentialPayout = parseFloat((betAmount * odd).toFixed(6));

    if (potentialPayout > maxPayout) {
      const maxAllowed = parseFloat((maxPayout / odd).toFixed(2));
      return NextResponse.json({
        error: `Max potential win is ${maxPayout} USDT. Max bet for these odds: ${maxAllowed} USDT`,
      }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: betAmount } },
      { $inc: { balance: -betAmount } },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const bet = await Bet.create({
      userId:     user._id,
      amount:     betAmount,
      multiplier: odd,
      payout:     0,
      status:     'pending',
      matchId:    match._id,
      selection:  sel,
      details: {
        matchId:        match._id,
        homeTeam:       match.homeTeam,
        awayTeam:       match.awayTeam,
        league:         match.league,
        date:           match.date,
        selection:      sel,
        odd,
        potentialPayout,
      },
    });

    return NextResponse.json({ success: true, bet, newBalance: updatedUser.balance, potentialPayout });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bet error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
