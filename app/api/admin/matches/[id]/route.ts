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

  if (isResultBet) {
    if (isInverse) {
      return INVERSE_WINS[result].includes(bet.selection);
    }
    return WINS[result].includes(bet.selection);
  }
  if (isGoalBet) {
    const wins = checkGoalBet(bet.selection, hScore, aScore);
    return isInverse ? !wins : wins;
  }
  return false;
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

    const processedBets = new Set<string>();
    let matchedSettled = 0;
    let openSettled = 0;
    let totalHouseProfit = 0;
    const results: { betId: string; status: string; payout: number }[] = [];

    for (const bet of allBets) {
      if (processedBets.has(bet._id.toString())) continue;

      const isWinner = isBetWinner(bet, result, hScore, aScore);

      if (bet.status === 'matched' && bet.pairedWith) {
        const pairedBet = allBets.find(b => b._id.toString() === (bet.pairedWith as any).toString());
        
        if (!pairedBet) {
          console.error(`Paired bet not found for ${bet._id}`);
          continue;
        }

        if (processedBets.has(pairedBet._id.toString())) continue;

        processedBets.add(bet._id.toString());
        processedBets.add(pairedBet._id.toString());

        const pairedIsWinner = isBetWinner(pairedBet, result, hScore, aScore);

        const betAmount = bet.pairedAmount || Math.min(bet.amount, pairedBet.amount);
        const totalPool = betAmount * 2;
        const houseTake = totalPool * HOUSE_EDGE;
        const payoutToWinner = totalPool - houseTake;

        if (isWinner && !pairedIsWinner) {
          const winnerUser = await User.findById(bet.userId);
          if (winnerUser) {
            winnerUser.balance = parseFloat((winnerUser.balance + payoutToWinner).toFixed(6));
            await winnerUser.save();
          }
          bet.status = 'won';
          bet.result = 'won';
          bet.payout = payoutToWinner;
          await bet.save();

          pairedBet.status = 'lost';
          pairedBet.result = 'lost';
          pairedBet.payout = 0;
          await pairedBet.save();

          totalHouseProfit += houseTake;
          matchedSettled++;
        } else if (!isWinner && pairedIsWinner) {
          const winnerUser = await User.findById(pairedBet.userId);
          if (winnerUser) {
            winnerUser.balance = parseFloat((winnerUser.balance + payoutToWinner).toFixed(6));
            await winnerUser.save();
          }
          bet.status = 'lost';
          bet.result = 'lost';
          bet.payout = 0;
          await bet.save();

          pairedBet.status = 'won';
          pairedBet.result = 'won';
          pairedBet.payout = payoutToWinner;
          await pairedBet.save();

          totalHouseProfit += houseTake;
          matchedSettled++;
        } else {
          const refundAmount = betAmount * (1 - HOUSE_EDGE);
          
          const user1 = await User.findById(bet.userId);
          if (user1) {
            user1.balance = parseFloat((user1.balance + refundAmount).toFixed(6));
            await user1.save();
          }
          bet.status = 'refunded';
          bet.result = null;
          bet.payout = refundAmount;
          await bet.save();

          const user2 = await User.findById(pairedBet.userId);
          if (user2) {
            user2.balance = parseFloat((user2.balance + refundAmount).toFixed(6));
            await user2.save();
          }
          pairedBet.status = 'refunded';
          pairedBet.result = null;
          pairedBet.payout = refundAmount;
          await pairedBet.save();

          totalHouseProfit += houseTake;
          matchedSettled++;
        }

      } else if (bet.status === 'open' || bet.status === 'pending') {
        processedBets.add(bet._id.toString());

        if (isWinner) {
          const payout = parseFloat((bet.amount * bet.odds * (1 - HOUSE_EDGE)).toFixed(6));
          
          const user = await User.findById(bet.userId);
          if (user) {
            user.balance = parseFloat((user.balance + payout).toFixed(6));
            await user.save();
          }
          bet.status = 'won';
          bet.result = 'won';
          bet.payout = payout;
          await bet.save();

          const houseRevenue = payout - bet.amount;
          totalHouseProfit += houseRevenue;
        } else {
          bet.status = 'lost';
          bet.result = 'lost';
          bet.payout = 0;
          await bet.save();

          totalHouseProfit += bet.amount;
        }
        openSettled++;
      }
    }

    match.result = result;
    match.homeScore = hScore;
    match.awayScore = aScore;
    match.status = 'settled';
    await match.save();

    return NextResponse.json({
      message: `Settled: ${result} (${hScore}-${aScore}) | House profit: ${totalHouseProfit.toFixed(2)} USDT`,
      match,
      matchedSettled,
      openSettled,
      totalBets: allBets.length,
      houseProfit: parseFloat(totalHouseProfit.toFixed(6)),
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