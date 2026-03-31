import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    return NextResponse.json({
      success: true,
      user: {
        id:             user._id,
        email:          user.email,
        username:       user.username,
        balance:        user.balance,
        depositAddress: user.depositAddress,
        role:           user.role,
        myReferralCode: user.myReferralCode ?? null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
