import { NextResponse }                         from 'next/server';
import dbConnect                               from '@/lib/db';
import { getSessionUser, SESSION_COOKIE_NAME } from '@/lib/session';

export async function POST() {
  try {
    await dbConnect();
    const user = await getSessionUser();

    if (user) {
      user.sessionTokenHash = null;
      await user.save();
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
      maxAge:   0,
    });

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
