import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match              from '@/models/Match';
import Bet                from '@/models/Bet';
import User               from '@/models/User';

const WINS: Record<string, string[]> = {
  home: ['home', '1x', '12'],
  draw: ['draw', '1x', 'x2'],
  away: ['away', 'x2', '12'],
};

const INVERSE_WINS: Record<string, string[]> = {
  home: ['draw', 'away', 'x2'],
  draw: ['home', 'away', '12'],
  away: ['home', 'draw', '1x'],
};

function checkGoalBet(selection: string, homeScore: number, awayScore: number): boolean {
  const total = homeScore + awayScore;
  switch (selection) {
    case 'homeOver05':   return homeScore >= 1;
    case 'homeOver15':   return homeScore >= 2;
    case 'homeUnder05':  return homeScore === 0;
    case 'awayOver05':   return awayScore >= 1;
    case 'awayOver15':   return awayScore >= 2;
    case 'awayUnder05':  return awayScore === 0;
    case 'totalOver15':  return total >= 2;
    case 'totalOver25':  return total >= 3;
    case 'totalUnder15': return total <= 1;
    case 'totalUnder25': return total <= 2;
    case 'bttsYes':      return homeScore >= 1 && awayScore >= 1;
    case 'bttsNo':       return homeScore === 0 || awayScore === 0;
    default:             return false;
  }
}

const RESULT_SELECTIONS = ['home', 'draw', 'away', '1x', 'x2', '12'];
const GOAL_SELECTIONS = [
  'homeOver05', 'homeOver15', 'homeUnder05',
  'awayOver05', 'awayOver15', 'awayUnder05',
  'totalOver15', 'totalOver25', 'totalUnder15', 'totalUnder25',
  'bttsYes', 'bttsNo',
];
const HOUSE_EDGE = 0.10;

function isBetWinner(bet: typeof Bet.prototype, result: string, hScore: number, aScore: number): boolean {
  const isResultBet = RESULT_SELECTIONS.includes(bet.selection);
  const isGoalBet = GOAL_SELECTIONS.includes(bet.selection);
  const isInverse = bet.isInverse === true;

  let wins = false;
  if (isResultBet) {
    wins = isInverse ? INVERSE_WINS[result].includes(bet.selection) : WINS[result].includes(bet.selection);
  } else if (isGoalBet) {
    wins = checkGoalBet(bet.selection, hScore, aScore);
    if (isInverse) wins = !wins;
  }
  return wins;
}

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

    if (status) update.status = status;
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
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status === 'settled') return NextResponse.json({ error: 'Match already settled' }, { status: 400 });

    const hScore = parseInt(homeScore) || 0;
    const aScore = parseInt(awayScore) || 0;

    const allBets = await Bet.find({ matchId: id, status: { $in: ['open', 'matched', 'pending'] } });

    const winners: typeof Bet.prototype[] = [];
    const losers: typeof Bet.prototype[] = [];
    const processedBets = new Set<string>();

    for (const bet of allBets) {
      if (processedBets.has(bet._id.toString())) continue;

      const isWinner = isBetWinner(bet, result, hScore, aScore);

      if (bet.status === 'matched' && bet.pairedWith) {
        const pairedBet = allBets.find(b => b._id.toString() === (bet.pairedWith as any).toString());
        if (!pairedBet || processedBets.has(pairedBet._id.toString())) continue;

        processedBets.add(bet._id.toString());
        processedBets.add(pairedBet._id.toString());

        const pairedIsWinner = isBetWinner(pairedBet, result, hScore, aScore);

        if (isWinner && !pairedIsWinner) {
          winners.push(bet);
          losers.push(pairedBet);
        } else if (!isWinner && pairedIsWinner) {
          winners.push(pairedBet);
          losers.push(bet);
        } else {
          bet.status = 'refunded';
          bet.payout = bet.pairedAmount || bet.amount;
          await bet.save();
          pairedBet.status = 'refunded';
          pairedBet.payout = pairedBet.pairedAmount || pairedBet.amount;
          await pairedBet.save();

          const user1 = await User.findById(bet.userId);
          const user2 = await User.findById(pairedBet.userId);
          if (user1) {
            user1.balance = parseFloat((user1.balance + (bet.pairedAmount || bet.amount)).toFixed(6));
            await user1.save();
          }
          if (user2) {
            user2.balance = parseFloat((user2.balance + (pairedBet.pairedAmount || pairedBet.amount)).toFixed(6));
            await user2.save();
          }
        }
      } else {
        processedBets.add(bet._id.toString());
        if (isWinner) {
          winners.push(bet);
        } else {
          losers.push(bet);
        }
      }
    }

    const totalLoserPool = losers.reduce((sum, b) => sum + b.amount, 0);
    const totalWinnerPool = winners.reduce((sum, b) => sum + b.amount, 0);
    const totalPool = totalLoserPool + totalWinnerPool;
    const afterHouseEdge = totalPool * (1 - HOUSE_EDGE);
    const houseProfit = totalPool * HOUSE_EDGE;

    const userPayouts = new Map<string, number>();

    for (const winner of winners) {
      const weight = winner.amount / totalWinnerPool;
      const payout = parseFloat((afterHouseEdge * weight).toFixed(6));
      userPayouts.set(winner.userId.toString(), (userPayouts.get(winner.userId.toString()) || 0) + payout);
      winner.status = 'won';
      winner.payout = payout;
      await winner.save();
    }

    for (const loser of losers) {
      loser.status = 'lost';
      loser.payout = 0;
      await loser.save();
    }

    for (const [userId, payout] of userPayouts) {
      const user = await User.findById(userId);
      if (user) {
        user.balance = parseFloat((user.balance + payout).toFixed(6));
        await user.save();
      }
    }

    match.result = result;
    match.homeScore = hScore;
    match.awayScore = aScore;
    match.status = 'settled';
    await match.save();

    return NextResponse.json({
      message: `Settled: ${result} (${hScore}-${aScore}) | House profit: ${houseProfit.toFixed(2)} USDT`,
      match,
      winnersCount: winners.length,
      losersCount: losers.length,
      totalPool: parseFloat(totalPool.toFixed(6)),
      houseProfit: parseFloat(houseProfit.toFixed(6)),
      payoutToWinners: parseFloat(afterHouseEdge.toFixed(6)),
    });
  } catch (error: unknown) {
    console.error('Settle error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await params;
    const match = await Match.findById(id);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status === 'settled') return NextResponse.json({ error: 'Cannot delete a settled match' }, { status: 400 });

    const bets = await Bet.find({ matchId: id, status: { $in: ['open', 'matched', 'pending'] } });
    for (const bet of bets) {
      bet.status = 'cancelled';
      await bet.save();
      
      const user = await User.findById(bet.userId);
      if (user) {
        const refundAmount = bet.isInverse ? (bet.details as any)?.liability ?? bet.amount : bet.amount;
        user.balance = parseFloat((user.balance + refundAmount).toFixed(6));
        await user.save();
      }
    }

    await match.deleteOne();
    return NextResponse.json({ message: 'Match deleted and bets refunded' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}