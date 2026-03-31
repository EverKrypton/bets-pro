import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';

function generateReferralCode(userId: string): string {
  return `BP-${userId.toString().slice(-6).toUpperCase()}`;
}

export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Auto-assign referral code for existing users that never got one
    if (!user.myReferralCode) {
      user.myReferralCode = generateReferralCode(user._id.toString());
      try { await user.save(); } catch {
        // If duplicate (edge case), append random suffix
        user.myReferralCode = `BP-${user._id.toString().slice(-6).toUpperCase()}${Math.floor(Math.random()*9)}`;
        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id:             user._id,
        email:          user.email,
        username:       user.username,
        balance:        user.balance,
        depositAddress: user.depositAddress,
        role:           user.role,
        myReferralCode: user.myReferralCode,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
