import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet                from '@/models/Bet';
import Match              from '@/models/Match';

const MIN_BET = 1; // USDT

export async function POST(req: Request) {
  try {
    const { amount, matchId, selection } = await req.json();

    if (!amount || amount < MIN_BET) {
      return NextResponse.json(
        { error: `Minimum bet is ${MIN_BET} USDT` },
        { status: 400 },
      );
    }

    if (!matchId || !['home', 'draw', 'away'].includes(selection)) {
      return NextResponse.json(
        { error: 'matchId and selection (home|draw|away) are required' },
        { status: 400 },
      );
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

    const displayOdd = match.displayOdds?.[selection as 'home' | 'draw' | 'away'];
    if (!displayOdd || displayOdd < 1) {
      return NextResponse.json({ error: 'Odds not set for this selection' }, { status: 400 });
    }

    const potentialPayout = parseFloat((amount * displayOdd).toFixed(6));

    user.balance = parseFloat((user.balance - amount).toFixed(6));
    await user.save();

    const bet = await Bet.create({
      userId:     user._id,
      game:       'sports',
      amount,
      multiplier: displayOdd,
      payout:     0,
      status:     'pending',
      matchId:    match._id,
      selection,
      details:    {
        matchId:  match._id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league:   match.league,
        date:     match.date,
        selection,
        displayOdd,
        potentialPayout,
      },
    });

    return NextResponse.json({ success: true, bet, newBalance: user.balance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sports bet error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
