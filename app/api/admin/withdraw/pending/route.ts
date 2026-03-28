import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Transaction        from '@/models/Transaction';

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const withdrawals = await Transaction.find({ type: 'withdraw', status: 'pending' })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ withdrawals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
