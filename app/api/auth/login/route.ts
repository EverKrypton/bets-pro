import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import User               from '@/models/User';
import { verifyPassword } from '@/lib/password';
import {
  SESSION_COOKIE_NAME,
  generateSessionToken,
  hashSessionToken,
} from '@/lib/session';

function generateReferralCode(userId: string): string {
  return `BP-${userId.toString().slice(-6).toUpperCase()}`;
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user            = await User.findOne({ email: normalizedEmail });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Promote to admin if matching ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (adminEmail && normalizedEmail === adminEmail && user.role !== 'admin') {
      user.role = 'admin';
    }

    // Auto-assign referral code if missing
    if (!user.myReferralCode) {
      user.myReferralCode = generateReferralCode(user._id.toString());
    }

    const sessionToken    = generateSessionToken();
    user.sessionTokenHash = hashSessionToken(sessionToken);
    await user.save();

    const res = NextResponse.json({
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

    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
      maxAge:   60 * 60 * 24 * 30,
    });

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
