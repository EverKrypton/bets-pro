import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User               from '@/models/User';
import Transaction        from '@/models/Transaction';

export async function GET() {
  try {
    await dbConnect();
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Count users who used this user's referral code
    const referredUsers = await User.countDocuments({ referrerCode: me.myReferralCode });

    // Sum referral earnings from transactions
    const referralTxs = await Transaction.find({ userId: me._id, type: 'referral', status: 'completed' });
    const totalEarned  = referralTxs.reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      referredUsers,       // people who registered with your code
      referralTxCount: referralTxs.length, // number of deposits that earned you a bonus
      totalEarned: parseFloat(totalEarned.toFixed(6)),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
