import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet                from '@/models/Bet';
import Match              from '@/models/Match';
import Settings           from '@/models/Settings';
import User               from '@/models/User';
import { matchBet, HOUSE_EDGE } from '@/lib/pairing';

const RESULT_MARKETS = ['home', 'draw', 'away', '1x', 'x2', '12'] as const;
type Market = typeof RESULT_MARKETS[number];

function inverseOdds(odds: number): number {
  if (odds <= 1) return 999;
  return Math.max(1.01, Number((odds / (odds - 1)).toFixed(3)));
}

function dcInverseOdd(odds: { home: number; draw: number; away: number }, market: Market): number {
  const invH = inverseOdds(odds.home);
  const invD = inverseOdds(odds.draw);
  const invA = inverseOdds(odds.away);
  const pH = 1 / invH, pD = 1 / invD, pA = 1 / invA;
  const p = market === '1x' ? pH + pD : market === 'x2' ? pD + pA : pH + pA;
  return Math.max(1.02, Number((1 / p).toFixed(2)));
}

function doubleChanceOdd(odds: { home: number; draw: number; away: number }, market: Market): number {
  const pH = 1 / odds.home, pD = 1 / odds.draw, pA = 1 / odds.away;
  const p = market === '1x' ? pH + pD : market === 'x2' ? pD + pA : pH + pA;
  return Math.max(1.02, Number((1 / p).toFixed(2)));
}

export async function POST(req: Request) {
  try {
    const { amount, matchId, selection } = await req.json();

    if (!matchId || !RESULT_MARKETS.includes(selection as Market)) {
      return NextResponse.json({ error: 'matchId and a valid selection are required' }, { status: 400 });
    }

    await dbConnect();

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, new: true },
    );

    const minBet = settings?.minBetAmount ?? 1;
    const maxBet = settings?.maxBetAmount ?? 50;
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
      const displayOdd = match.displayOdds?.[sel as 'home' | 'draw' | 'away'];
      if (!displayOdd || displayOdd < 1.01) {
        return NextResponse.json({ error: 'Odds not available for this selection' }, { status: 400 });
      }
      odd = inverseOdds(displayOdd);
    } else if (['1x', 'x2', '12'].includes(sel)) {
      if (!match.displayOdds?.home || !match.displayOdds?.draw || !match.displayOdds?.away) {
        return NextResponse.json({ error: 'Odds not set for this match' }, { status: 400 });
      }
      odd = dcInverseOdd(match.displayOdds, sel);
    } else {
      return NextResponse.json({ error: 'Invalid selection for inverse bet' }, { status: 400 });
    }

    const potentialPayout = parseFloat((betAmount * odd).toFixed(6));

    if (potentialPayout > maxPayout) {
      const maxAllowed = parseFloat((maxPayout / odd).toFixed(2));
      return NextResponse.json({
        error: `Max potential win is ${maxPayout} USDT. Max bet for these odds: ${maxAllowed} USDT`,
      }, { status: 400 });
    }

    const liability = parseFloat((betAmount * (odd - 1)).toFixed(6));
    const userBalance = user.balance;

    if (userBalance < liability) {
      return NextResponse.json({
        error: `Inverse bet requires liability of ${liability.toFixed(2)} USDT. Your balance: ${userBalance.toFixed(2)} USDT`,
      }, { status: 400 });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: liability } },
      { $inc: { balance: -liability } },
      { new: true },
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'Insufficient balance for liability' }, { status: 400 });
    }

    const invSelMap: Record<string, string> = {
      home: 'not_home',
      draw: 'not_draw',
      away: 'not_away',
      '1x': 'not_12',
      'x2': 'not_1x',
      '12': 'not_x2',
    };

    const originalOdds = sel === 'home' || sel === 'draw' || sel === 'away'
      ? match.displayOdds?.[sel as 'home' | 'draw' | 'away']
      : dcInverseOdd(match.displayOdds, sel as '1x' | 'x2' | '12');

    const bet = await Bet.create({
      userId:      user._id,
      amount:      betAmount,
      odds:        odd,
      multiplier:  odd,
      payout:      0,
      status:      'open',
      matchId:     match._id,
      isInverse:   true,
      selection:   sel,
      houseEdge:   HOUSE_EDGE,
      details: {
        matchId:        match._id,
        homeTeam:       match.homeTeam,
        awayTeam:       match.awayTeam,
        league:         match.league,
        date:           match.date,
        selection:      sel,
        inverseSelection: invSelMap[sel],
        odd,
        originalOdds,
        potentialPayout,
        liability,
      },
    });

    const pairingResult = await matchBet(
      bet._id as any,
      match._id,
      sel,
      betAmount,
      true,
      user._id
    );

    return NextResponse.json({ 
      success: true, 
      bet, 
      newBalance: updatedUser.balance, 
      potentialPayout,
      matched: pairingResult.matched,
      pairedWith: pairingResult.counterBetId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Inverse bet error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}