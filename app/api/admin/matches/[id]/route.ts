import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match              from '@/models/Match';
import Bet                from '@/models/Bet';
import User               from '@/models/User';

// Result bet winners
const WINS: Record<string, string[]> = {
  home: ['home', '1x', '12'],
  draw: ['draw', '1x', 'x2'],
  away: ['away', 'x2', '12'],
};

// Inverse bet winners (opposite of normal)
const INVERSE_WINS: Record<string, string[]> = {
  home: ['draw', 'away', 'x2'],
  draw: ['home', 'away', '12'],
  away: ['home', 'draw', '1x'],
};

// Check if a goal bet wins based on scores
function checkGoalBet(selection: string, homeScore: number, awayScore: number): boolean {
  const total = homeScore + awayScore;
  switch (selection) {
    case 'homeOver05': return homeScore >= 1;
    case 'homeOver15': return homeScore >= 2;
    case 'homeUnder05': return homeScore === 0;
    case 'awayOver05': return awayScore >= 1;
    case 'awayOver15': return awayScore >= 2;
    case 'awayUnder05': return awayScore === 0;
    case 'totalOver15': return total >= 2;
    case 'totalOver25': return total >= 3;
    case 'totalUnder15': return total <= 1;
    case 'totalUnder25': return total <= 2;
    case 'bttsYes': return homeScore >= 1 && awayScore >= 1;
    case 'bttsNo': return homeScore === 0 || awayScore === 0;
    default: return false;
  }
}

// Result bet selections
const RESULT_SELECTIONS = ['home', 'draw', 'away', '1x', 'x2', '12'];

// Goal bet selections
const GOAL_SELECTIONS = [
  'homeOver05', 'homeOver15', 'homeUnder05',
  'awayOver05', 'awayOver15', 'awayUnder05',
  'totalOver15', 'totalOver25', 'totalUnder15', 'totalUnder25',
  'bttsYes', 'bttsNo',
];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const { odds, goalOdds, status, moneyBack } = await req.json();

    const update: Record<string, unknown> = {};

    if (odds) {
      if (typeof odds.home !== 'number' || typeof odds.draw !== 'number' || typeof odds.away !== 'number')
        return NextResponse.json({ error: 'odds must include numeric home, draw and away' }, { status: 400 });
      if ([odds.home, odds.draw, odds.away].some(o => o < 1.01))
        return NextResponse.json({ error: 'All odds must be >= 1.01' }, { status: 400 });
      if ([odds.home, odds.draw, odds.away].some(o => o > 3.2))
        return NextResponse.json({ error: 'Maximum odds is 3.2' }, { status: 400 });
      if (odds.home === odds.draw || odds.home === odds.away || odds.draw === odds.away)
        return NextResponse.json({ error: 'All odds must be different' }, { status: 400 });
      update.trueOdds    = odds;
      update.displayOdds = odds;
      update.marginPct   = 0;
    }

    if (goalOdds) {
      const goalValues = Object.values(goalOdds) as number[];
      if (goalValues.some(o => typeof o !== 'number' || o < 1.01))
        return NextResponse.json({ error: 'All goal odds must be >= 1.01' }, { status: 400 });
      if (goalValues.some(o => o > 3.2))
        return NextResponse.json({ error: 'Maximum goal odds is 3.2' }, { status: 400 });
      const uniqueGoalOdds = new Set(goalValues);
      if (uniqueGoalOdds.size !== goalValues.length)
        return NextResponse.json({ error: 'All goal odds must be different' }, { status: 400 });
      update.goalOdds = goalOdds;
    }

    if (status)               update.status     = status;
    if (moneyBack !== undefined) update.moneyBack = Boolean(moneyBack);

    const match = await Match.findByIdAndUpdate(id, update, { new: true });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    return NextResponse.json({ match });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const { result, homeScore, awayScore } = await req.json();

    if (!['home', 'draw', 'away'].includes(result))
      return NextResponse.json({ error: 'result must be: home | draw | away' }, { status: 400 });

    const match = await Match.findById(id);
    if (!match)                     return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status === 'settled') return NextResponse.json({ error: 'Match already settled' }, { status: 400 });

    // Store scores
    const hScore = parseInt(homeScore) || 0;
    const aScore = parseInt(awayScore) || 0;

    const bets           = await Bet.find({ matchId: id, status: 'pending' });
    const winningSelections = WINS[result];
    const useMoneyBack   = match.moneyBack === true;

    let winnersCount  = 0;
    let losersCount   = 0;
    let refundedCount = 0;

    for (const bet of bets) {
      const isResultBet = RESULT_SELECTIONS.includes(bet.selection);
      const isGoalBet   = GOAL_SELECTIONS.includes(bet.selection);
      const isInverse   = bet.isInverse === true;

      let isWinner = false;

      if (isResultBet) {
        if (isInverse) {
          isWinner = INVERSE_WINS[result].includes(bet.selection);
        } else {
          isWinner = winningSelections.includes(bet.selection);
        }
      } else if (isGoalBet) {
        isWinner = checkGoalBet(bet.selection, hScore, aScore);
        if (isInverse) isWinner = !isWinner;
      }

      if (isWinner) {
        const payout   = parseFloat((bet.amount * bet.multiplier).toFixed(6));
        bet.payout     = payout;
        bet.status     = 'won';
        await bet.save();
        const user = await User.findById(bet.userId);
        if (user) {
          user.balance = parseFloat((user.balance + payout).toFixed(6));
          await user.save();
        }
        winnersCount++;
      } else if (useMoneyBack && !isInverse) {
        bet.payout = bet.amount;
        bet.status = 'refunded';
        await bet.save();
        const user = await User.findById(bet.userId);
        if (user) {
          user.balance = parseFloat((user.balance + bet.amount).toFixed(6));
          await user.save();
        }
        refundedCount++;
      } else if (useMoneyBack && isInverse) {
        bet.payout = 0;
        bet.status = 'lost';
        await bet.save();
        const user = await User.findById(bet.userId);
        if (user) {
          const refundAmount = bet.details?.liability ?? bet.amount;
          user.balance = parseFloat((user.balance + refundAmount).toFixed(6));
          await user.save();
        }
        refundedCount++;
      } else {
        bet.status = 'lost';
        await bet.save();
        losersCount++;
      }
    }

    match.result = result;
    match.homeScore = hScore;
    match.awayScore = aScore;
    match.status = 'settled';
    await match.save();

    return NextResponse.json({
      message: `Settled: ${result} (${hScore}-${aScore})${useMoneyBack ? ' (Money Back enabled)' : ''}`,
      match, winnersCount, losersCount, refundedCount,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const match  = await Match.findById(id);
    if (!match)                     return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status === 'settled') return NextResponse.json({ error: 'Cannot delete a settled match' }, { status: 400 });

    const bets = await Bet.find({ matchId: id, status: 'pending' });
    for (const bet of bets) {
      bet.status = 'refunded';
      await bet.save();
      const user = await User.findById(bet.userId);
      if (user) {
        user.balance = parseFloat((user.balance + bet.amount).toFixed(6));
        await user.save();
      }
    }

    await match.deleteOne();
    return NextResponse.json({ message: 'Match deleted and bets refunded' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}