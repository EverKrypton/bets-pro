import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User from '@/models/User';
import Bet from '@/models/Bet';
import Transaction from '@/models/Transaction';
import Match from '@/models/Match';

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // User stats
    const totalUsers = await User.countDocuments();
    const usersWithBalance = await User.countDocuments({ balance: { $gt: 0 } });
    const totalUserBalance = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);
    const userBalance = totalUserBalance[0]?.total || 0;

    // Deposit stats
    const depositStats = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const totalDeposited = depositStats[0]?.total || 0;
    const depositCount = depositStats[0]?.count || 0;

    // Withdrawal stats
    const withdrawStats = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const totalWithdrawn = withdrawStats[0]?.total || 0;
    const withdrawCount = withdrawStats[0]?.count || 0;

    // Pending withdrawals
    const pendingWithdrawals = await Transaction.countDocuments({ type: 'withdraw', status: 'pending' });
    const pendingWithdrawalAmount = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const pendingWithdrawTotal = pendingWithdrawalAmount[0]?.total || 0;

    // Withdrawal fees (1 USDT per withdrawal)
    const withdrawalFees = withdrawCount * 1;

    // Bet stats
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

    // Won bets payout (money actually paid to winners)
    const wonPayouts = await Bet.aggregate([
      { $match: { status: 'won' } },
      { $group: { _id: null, total: { $sum: '$payout' } } },
    ]);
    const wonPayout = wonPayouts[0]?.total || 0;

    // Refunded amounts
    const refundedAmounts = await Bet.aggregate([
      { $match: { status: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const refundedTotal = refundedAmounts[0]?.total || 0;

    // Match stats
    const openMatches = await Match.countDocuments({ status: 'open' });
    const closedMatches = await Match.countDocuments({ status: 'closed' });
    const settledMatches = await Match.countDocuments({ status: 'settled' });

    // House profit calculation
    // Money in: deposits + fees
    // Money out: withdrawals + payouts + refunds
    // But user balance is money owed to users
    // House profit = deposits - withdrawals - payouts - (user balance increase)
    
    // Simplified: fees are the only direct income
    // Margins are built into payouts already
    
    const houseProfit = {
      withdrawalFees,
      netFlow: totalDeposited - totalWithdrawn - wonPayout - refundedTotal,
    };

    // Recent activity
    const recentDeposits = await Transaction.find({ type: 'deposit' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'username email');

    const recentWithdrawals = await Transaction.find({ type: 'withdraw' })
      .sort({ createdAt: -1 })
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
      houseProfit: {
        withdrawalFees,
        note: 'Fees de retiro son ganancia directa. Margen en cuotas está en cada apuesta.',
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