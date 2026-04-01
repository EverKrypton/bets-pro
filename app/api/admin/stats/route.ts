import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User from '@/models/User';
import Bet from '@/models/Bet';
import Transaction from '@/models/Transaction';
import Match from '@/models/Match';

const WINS: Record<string, string[]> = {
  home: ['home', '1x', '12'],
  draw: ['draw', '1x', 'x2'],
  away: ['away', 'x2', '12'],
};

const RESULT_SELECTIONS = ['home', 'draw', 'away', '1x', 'x2', '12'];
const GOAL_SELECTIONS = [
  'homeOver05', 'homeOver15', 'homeUnder05',
  'awayOver05', 'awayOver15', 'awayUnder05',
  'totalOver15', 'totalOver25', 'totalUnder15', 'totalUnder25',
  'bttsYes', 'bttsNo',
];

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const totalUsers = await User.countDocuments();
    const usersWithBalance = await User.countDocuments({ balance: { $gt: 0 } });
    const totalUserBalance = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);
    const userBalance = totalUserBalance[0]?.total || 0;

    const depositStats = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const totalDeposited = depositStats[0]?.total || 0;
    const depositCount = depositStats[0]?.count || 0;

    const withdrawStats = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const totalWithdrawn = withdrawStats[0]?.total || 0;
    const withdrawCount = withdrawStats[0]?.count || 0;

    const pendingWithdrawals = await Transaction.countDocuments({ type: 'withdraw', status: 'pending' });
    const pendingWithdrawalAmount = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const pendingWithdrawTotal = pendingWithdrawalAmount[0]?.total || 0;

    const withdrawalFees = withdrawCount * 1;

    const totalBets = await Bet.countDocuments();
    const pendingBets = await Bet.countDocuments({ status: 'pending' });
    const wonBets = await Bet.countDocuments({ status: 'won' });
    const lostBets = await Bet.countDocuments({ status: 'lost' });
    const refundedBets = await Bet.countDocuments({ status: 'refunded' });

    const betAmounts = await Bet.aggregate([
      { $group: { _id: null, totalStaked: { $sum: '$amount' }, totalPayout: { $sum: '$payout' } } },
    ]);
    const totalStaked = betAmounts[0]?.totalStaked || 0;
    const totalPayout = betAmounts[0]?.totalPayout || 0;

    const wonPayouts = await Bet.aggregate([
      { $match: { status: 'won' } },
      { $group: { _id: null, total: { $sum: '$payout' } } },
    ]);
    const wonPayout = wonPayouts[0]?.total || 0;

    const refundedAmounts = await Bet.aggregate([
      { $match: { status: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const refundedTotal = refundedAmounts[0]?.total || 0;

    const openMatches = await Match.countDocuments({ status: 'open' });
    const closedMatches = await Match.countDocuments({ status: 'closed' });
    const settledMatches = await Match.countDocuments({ status: 'settled' });

    // ===== ACTIVE BETS ANALYSIS =====
    const pendingBetsList = await Bet.find({ status: 'pending' }).populate('matchId');
    
    const activeBets = {
      total: pendingBets,
      totalStaked: 0,
      resultBets: {
        home: 0,
        draw: 0,
        away: 0,
        doubleChance: 0,
        totalStaked: 0,
      },
      goalBets: {
        total: 0,
        totalStaked: 0,
        breakdown: {} as Record<string, number>,
      },
      scenarios: {
        ifHomeWins: { payout: 0, profit: 0 },
        ifDraw: { payout: 0, profit: 0 },
        ifAwayWins: { payout: 0, profit: 0 },
      },
      worstCase: 0,
    };

    // Calculate totals
    for (const bet of pendingBetsList) {
      activeBets.totalStaked += bet.amount;
      
      if (RESULT_SELECTIONS.includes(bet.selection)) {
        activeBets.resultBets.totalStaked += bet.amount;
        if (bet.selection === 'home') activeBets.resultBets.home += bet.amount;
        else if (bet.selection === 'draw') activeBets.resultBets.draw += bet.amount;
        else if (bet.selection === 'away') activeBets.resultBets.away += bet.amount;
        else activeBets.resultBets.doubleChance += bet.amount;
      } else if (GOAL_SELECTIONS.includes(bet.selection)) {
        activeBets.goalBets.totalStaked += bet.amount;
        activeBets.goalBets.breakdown[bet.selection] = (activeBets.goalBets.breakdown[bet.selection] || 0) + bet.amount;
      }
    }

    // Calculate payouts per scenario
    // Worst case: sum of max payments across ALL matches (assuming goal bets always win for worst case)
    
    // Group bets by match
    const betsByMatch = new Map<string, typeof pendingBetsList>();
    for (const bet of pendingBetsList) {
      const matchId = (bet.matchId as any)?._id?.toString() ||bet.matchId?.toString();
      if (!matchId) continue;
      if (!betsByMatch.has(matchId)) betsByMatch.set(matchId, []);
      betsByMatch.get(matchId)!.push(bet as any);
    }

    let totalWorstCase = 0;

    for (const [matchId, bets] of betsByMatch) {
      const resultBets = bets.filter(b => RESULT_SELECTIONS.includes(b.selection));
      const goalBets = bets.filter(b => GOAL_SELECTIONS.includes(b.selection));
      
      const matchStake = bets.reduce((s, b) => s + b.amount, 0);
      
      // Goal bets worst case: all win
      const goalMaxPayout = goalBets.reduce((s, b) => s + b.amount *b.multiplier, 0);
      
      // Result bets payouts per scenario
      const payIfHome = resultBets.filter(b => WINS.home.includes(b.selection)).reduce((s, b) => s + b.amount *b.multiplier, 0);
      const payIfDraw = resultBets.filter(b => WINS.draw.includes(b.selection)).reduce((s, b) => s + b.amount *b.multiplier, 0);
      const payIfAway = resultBets.filter(b => WINS.away.includes(b.selection)).reduce((s, b) => s + b.amount *b.multiplier, 0);
      
      // Total payout per scenario (result + goal worst case)
      const totalPayIfHome = payIfHome + goalMaxPayout;
      const totalPayIfDraw = payIfDraw + goalMaxPayout;
      const totalPayIfAway = payIfAway + goalMaxPayout;
      
      // Profit per scenario
      const profitIfHome = matchStake - totalPayIfHome;
      const profitIfDraw = matchStake - totalPayIfDraw;
      const profitIfAway = matchStake - totalPayIfAway;
      
      // Accumulate scenarios
      activeBets.scenarios.ifHomeWins.payout += totalPayIfHome;
      activeBets.scenarios.ifDraw.payout += totalPayIfDraw;
      activeBets.scenarios.ifAwayWins.payout += totalPayIfAway;
      
      // Worst case for this match
      const matchWorstCase = Math.min(profitIfHome, profitIfDraw, profitIfAway);
      totalWorstCase += matchWorstCase;
    }
    
    // Calculate profits
    activeBets.scenarios.ifHomeWins.profit = activeBets.totalStaked - activeBets.scenarios.ifHomeWins.payout;
    activeBets.scenarios.ifDraw.profit = activeBets.totalStaked - activeBets.scenarios.ifDraw.payout;
    activeBets.scenarios.ifAwayWins.profit = activeBets.totalStaked - activeBets.scenarios.ifAwayWins.payout;
    activeBets.worstCase = totalWorstCase;

    const recentDeposits = await Transaction.find({ type: 'deposit' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'username email');

    const recentWithdrawals = await Transaction.find({ type: 'withdraw' })
      .sort({ createdAt: -1})
      .limit(5)
      .populate('userId', 'username email');

    const recentBets = await Bet.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'username email');

    return NextResponse.json({
      users: {
        total: totalUsers,
        withBalance: usersWithBalance,
        totalBalance: parseFloat(userBalance.toFixed(2)),
      },
      deposits: {
        total: parseFloat(totalDeposited.toFixed(2)),
        count: depositCount,
      },
      withdrawals: {
        total: parseFloat(totalWithdrawn.toFixed(2)),
        count: withdrawCount,
        pending: pendingWithdrawals,
        pendingAmount: parseFloat(pendingWithdrawTotal.toFixed(2)),
      },
      fees: {
        withdrawal: withdrawalFees,
      },
      bets: {
        total: totalBets,
        pending: pendingBets,
        won: wonBets,
        lost: lostBets,
        refunded: refundedBets,
        totalStaked: parseFloat(totalStaked.toFixed(2)),
        totalPayout: parseFloat(totalPayout.toFixed(2)),
        wonPayout: parseFloat(wonPayout.toFixed(2)),
        refundedTotal: parseFloat(refundedTotal.toFixed(2)),
      },
      matches: {
        open: openMatches,
        closed: closedMatches,
        settled: settledMatches,
      },
      activeBets: {
        total: activeBets.total,
        totalStaked: parseFloat(activeBets.totalStaked.toFixed(2)),
        resultBets: {
          home: parseFloat(activeBets.resultBets.home.toFixed(2)),
          draw: parseFloat(activeBets.resultBets.draw.toFixed(2)),
          away: parseFloat(activeBets.resultBets.away.toFixed(2)),
          doubleChance: parseFloat(activeBets.resultBets.doubleChance.toFixed(2)),
          totalStaked: parseFloat(activeBets.resultBets.totalStaked.toFixed(2)),
        },
        goalBets: {
          total: activeBets.goalBets.total,
          totalStaked: parseFloat(activeBets.goalBets.totalStaked.toFixed(2)),
          breakdown: activeBets.goalBets.breakdown,
        },
        scenarios: {
          ifHomeWins: {
            payout: parseFloat(activeBets.scenarios.ifHomeWins.payout.toFixed(2)),
            profit: parseFloat(activeBets.scenarios.ifHomeWins.profit.toFixed(2)),
          },
          ifDraw: {
            payout: parseFloat(activeBets.scenarios.ifDraw.payout.toFixed(2)),
            profit: parseFloat(activeBets.scenarios.ifDraw.profit.toFixed(2)),
          },
          ifAwayWins: {
            payout: parseFloat(activeBets.scenarios.ifAwayWins.payout.toFixed(2)),
            profit: parseFloat(activeBets.scenarios.ifAwayWins.profit.toFixed(2)),
          },
        },
        worstCase: parseFloat(activeBets.worstCase.toFixed(2)),
      },
      houseProfit: {
        withdrawalFees,
        netFlow: totalDeposited - totalWithdrawn - wonPayout - refundedTotal,
      },
      recent: {
        deposits: recentDeposits,
        withdrawals: recentWithdrawals,
        bets: recentBets,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}