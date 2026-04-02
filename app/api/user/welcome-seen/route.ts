import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User from '@/models/User';

export async function POST() {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await User.findByIdAndUpdate(user._id, { welcomeBonusSeen: true });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Welcome seen error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}