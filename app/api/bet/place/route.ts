import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet                from '@/models/Bet';
import Match              from '@/models/Match';

const MIN_BET     = 1;
const ALL_MARKETS = ['home', 'draw', 'away', '1x', 'x2', '12'] as const;
type Market = typeof ALL_MARKETS[number];

// Double-chance odds derived from display odds
function doubleChanceOdd(
  displayOdds: { home: number; draw: number; away: number },
  market: Market,
): number {
  const { home, draw, away } = displayOdds;
  const pH = 1 / home;
  const pD = 1 / draw;
  const pA = 1 / away;

  let combinedProb: number;
  if (market === '1x') combinedProb = pH + pD;
  else if (market === 'x2') combinedProb = pD + pA;
  else combinedProb = pH + pA; // 12

  return Math.max(1.01, Number((1 / combinedProb).toFixed(2)));
}

export async function POST(req: Request) {
  try {
    const { amount, matchId, selection } = await req.json();

    if (!amount || amount < MIN_BET) {
      return NextResponse.json({ error: `Minimum bet is ${MIN_BET} USDT` }, { status: 400 });
    }

    if (!matchId || !ALL_MARKETS.includes(selection as Market)) {
      return NextResponse.json({ error: 'matchId and a valid selection are required' }, { status: 400 });
    }

    await dbConnect();

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

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

    const potentialPayout = parseFloat((amount * odd).toFixed(6));

    user.balance = parseFloat((user.balance - amount).toFixed(6));
    await user.save();

    const bet = await Bet.create({
      userId:     user._id,
      amount,
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

    return NextResponse.json({ success: true, bet, newBalance: user.balance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bet error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
