import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User from '@/models/User';
import Bonus from '@/models/Bonus';
import Transaction from '@/models/Transaction';

export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fullUser = await User.findById(user._id);
    const bonus = await Bonus.findOne({ userId: user._id, type: 'welcome' });

    const referredCount = await User.countDocuments({ referrerCode: fullUser.myReferralCode });

    const referredInvested = await User.aggregate([
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

    const referredWithDeposit = referredInvested[0]?.count || 0;

    const totalBets = await Transaction.aggregate([
      { $match: { userId: user._id, type: 'bet', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const betVolume = totalBets[0]?.total || 0;

    return NextResponse.json({
      bonus: bonus || null,
      stats: {
        referredCount,
        referredWithDeposit,
        betVolume,
        totalBetsVolume: fullUser.totalBetsVolume || betVolume,
        welcomeBonusSeen: fullUser.welcomeBonusSeen,
        firstDepositDone: fullUser.firstDepositDone || false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bonus fetch error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { depositAmount } = body;

    const fullUser = await User.findById(user._id);

    const existingBonus = await Bonus.findOne({ userId: user._id, type: 'welcome' });
    if (existingBonus) {
      return NextResponse.json({ bonus: existingBonus });
    }

    const firstDeposit = await Transaction.findOne({
      userId: user._id,
      type: 'deposit',
      status: 'completed'
    });

    if (firstDeposit && !depositAmount) {
      return NextResponse.json({ error: 'Welcome bonus only for first deposit' }, { status: 400 });
    }

    const amount = depositAmount || 0;
    if (amount < 100) {
      return NextResponse.json({ bonus: null, message: 'Minimum deposit for bonus is $100' });
    }

    let bonusPercent = 0;
    if (amount >= 100 && amount < 200) bonusPercent = 20;
    else if (amount >= 200 && amount < 500) bonusPercent = 30;
    else if (amount >= 500 && amount < 1000) bonusPercent = 40;
    else if (amount >= 1000) bonusPercent = 50;

    const bonusAmount = parseFloat((amount * bonusPercent / 100).toFixed(2));

    const bonus = await Bonus.create({
      userId: user._id,
      type: 'welcome',
      status: 'pending',
      firstDepositAmount: amount,
      bonusAmount,
      bonusPercent,
      requiredBetVolume: 30,
      requiredReferrals: 3,
      currentBetVolume: 0,
      currentReferrals: 0,
      referredUsersInvested: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return NextResponse.json({ bonus });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bonus create error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}