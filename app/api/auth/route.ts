import { NextResponse }        from 'next/server';
import dbConnect               from '@/lib/db';
import User                    from '@/models/User';
import { createStaticAddress } from '@/lib/oxapay';
import { hashPassword }        from '@/lib/password';
import {
  SESSION_COOKIE_NAME,
  generateSessionToken,
  hashSessionToken,
} from '@/lib/session';

function generateReferralCode(userId: string): string {
  // BP- + last 6 chars of mongo ObjectId = unique, short, human-friendly
  const suffix = userId.toString().slice(-6).toUpperCase();
  return `BP-${suffix}`;
}

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { email, password, username, referrerCode } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (String(password).length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const adminEmail      = process.env.ADMIN_EMAIL?.toLowerCase().trim();

    if (await User.findOne({ email: normalizedEmail })) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Validate referrer code if provided
    let validReferrerCode: string | null = null;
    if (referrerCode) {
      const referrer = await User.findOne({ myReferralCode: String(referrerCode).trim().toUpperCase() });
      if (referrer) validReferrerCode = referrer.myReferralCode;
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email:        normalizedEmail,
      passwordHash,
      username:     username?.trim() || normalizedEmail.split('@')[0],
      balance:      0,
      referrerCode: validReferrerCode,
      role:         adminEmail && normalizedEmail === adminEmail ? 'admin' : 'user',
    });

    // Assign unique referral code based on their ObjectId
    user.myReferralCode = generateReferralCode(user._id.toString());
    await user.save();

    try {
      const oxaResponse   = await createStaticAddress(user._id.toString());
      user.depositAddress = oxaResponse.data.address;
    } catch {
      user.depositAddress = '';
    }

    const sessionToken    = generateSessionToken();
    user.sessionTokenHash = hashSessionToken(sessionToken);
    await user.save();

    const res = NextResponse.json({
      success: true,
      user: {
        id:              user._id,
        email:           user.email,
        username:        user.username,
        balance:         user.balance,
        depositAddress:  user.depositAddress,
        role:            user.role,
        myReferralCode:  user.myReferralCode,
      },
    });

    res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
      maxAge:   60 * 60 * 24 * 30,
    });

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('E11000') && message.includes('email')) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }
    console.error('Register error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
