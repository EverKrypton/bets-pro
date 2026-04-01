import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User               from '@/models/User';
import Transaction        from '@/models/Transaction';

const MIN_WITHDRAW = 10;  // USDT
const FEE          = 1;   // USDT

export async function POST(req: Request) {
  try {
    const { amount, address, network } = await req.json();

    if (!amount || amount < MIN_WITHDRAW) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${MIN_WITHDRAW} USDT` },
        { status: 400 },
      );
    }

    if (!address || !network) {
      return NextResponse.json({ error: 'address and network are required' }, { status: 400 });
    }

    await dbConnect();

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const netAmount = parseFloat((amount - FEE).toFixed(6));

    const updated = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    );

    if (!updated) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const transaction = await Transaction.create({
      userId:   user._id,
      type:     'withdraw',
      amount:   netAmount,
      currency: 'USDT',
      status:   'pending',
      details:  { address, network, grossAmount: amount, fee: FEE },
    });

    return NextResponse.json({ success: true, transaction, netAmount, fee: FEE });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Withdraw request error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
