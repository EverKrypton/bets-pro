import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import RubDeposit         from '@/models/RubDeposit';
import User               from '@/models/User';
import Transaction        from '@/models/Transaction';

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const deposits = await RubDeposit.find({ status: 'pending' })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });
    return NextResponse.json({ deposits });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id, action, adminNote } = await req.json();
    if (!id || !['approve','reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const deposit = await RubDeposit.findById(id);
    if (!deposit || deposit.status !== 'pending') {
      return NextResponse.json({ error: 'Deposit not found or already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      deposit.status    = 'approved';
      deposit.adminNote = adminNote || '';
      await deposit.save();

      const user = await User.findById(deposit.userId);
      if (user) {
        user.balance = parseFloat((user.balance + deposit.amountUsd).toFixed(6));
        await user.save();
      }

      await Transaction.create({
        userId:   deposit.userId,
        type:     'deposit',
        amount:   deposit.amountUsd,
        currency: 'USDT',
        status:   'completed',
        details:  { method: 'rub', amountRub: deposit.amountRub, rate: deposit.rate, txRef: deposit.txRef },
      });
    } else {
      deposit.status    = 'rejected';
      deposit.adminNote = adminNote || '';
      await deposit.save();
    }

    return NextResponse.json({ success: true, deposit });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
