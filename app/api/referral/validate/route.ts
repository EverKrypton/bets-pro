import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import User             from '@/models/User';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    if (!code || code.length < 3) return NextResponse.json({ valid: false });
    await dbConnect();
    const referrer = await User.findOne({ myReferralCode: code }).select('username myReferralCode');
    if (!referrer) return NextResponse.json({ valid: false });
    return NextResponse.json({ valid: true, username: referrer.username || 'User' });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
