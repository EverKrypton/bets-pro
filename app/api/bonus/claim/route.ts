import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User from '@/models/User';
import Bonus from '@/models/Bonus';
import Transaction from '@/models/Transaction';
import Notification from '@/models/Notification';

export async function POST() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bonus = await Bonus.findOne({ userId: user._id, type: 'welcome' });
    if (!bonus) {
      return NextResponse.json({ error: 'No welcome bonus found' }, { status: 404 });
    }

    if (bonus.status === 'claimed') {
      return NextResponse.json({ error: 'Bonus already claimed' }, { status: 400 });
    }

    const fullUser = await User.findById(user._id);

    const referredWithDeposit = await User.aggregate([
      { $match: { referrerCode: fullUser.myReferralCode } },
      { $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'userId',
          as: 'transactions'
        }},
      { $match: { 'transactions.type': 'deposit', 'transactions.status': 'completed' } },
      { $count: 'count' }
    ]);

    const referredInvested = referredWithDeposit[0]?.count || 0;

    const totalBets = await Transaction.aggregate([
      { $match: { userId: user._id, type: { $in: ['bet'] }, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const betVolume = totalBets[0]?.total || 0;

    if (betVolume < bonus.requiredBetVolume) {
      return NextResponse.json({
        error: `Bet volume requirement not met. Need $${bonus.requiredBetVolume}, have $${betVolume.toFixed(2)}`
      }, { status: 400 });
    }

    if (referredInvested < bonus.requiredReferrals) {
      return NextResponse.json({
        error: `Referral requirement not met. Need ${bonus.requiredReferrals} referrals with deposits, have ${referredInvested}`
      }, { status: 400 });
    }

    bonus.status = 'claimed';
    bonus.claimedAt = new Date();
    bonus.currentBetVolume = betVolume;
    bonus.currentReferrals = referredInvested;
    await bonus.save();

    fullUser.balance = parseFloat((fullUser.balance + bonus.bonusAmount).toFixed(6));
    await fullUser.save();

    await Transaction.create({
      userId: user._id,
      type: 'bonus',
      amount: bonus.bonusAmount,
      currency: 'USDT',
      status: 'completed',
      details: {
        bonusType: 'welcome',
        bonusPercent: bonus.bonusPercent,
        firstDeposit: bonus.firstDepositAmount,
      },
    });

    await Notification.create({
      userId: user._id,
      title: 'Bonus Claimed!',
      body: `Congratulations! You've claimed your $${bonus.bonusAmount.toFixed(2)} welcome bonus.`,
      type: 'personal',
      icon: '🎁',
    });

    return NextResponse.json({
      success: true,
      bonus,
      newBalance: fullUser.balance,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bonus claim error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}