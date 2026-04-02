import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import User               from '@/models/User';
import Transaction        from '@/models/Transaction';
import Settings           from '@/models/Settings';
import { isBEP20Address } from '@/lib/bep20';

const MIN_WITHDRAW = 10;
const MAX_WITHDRAW = 10000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, address, network } = body;

    const numAmount = parseFloat(String(amount ?? ''));
    if (isNaN(numAmount) || numAmount < MIN_WITHDRAW) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${MIN_WITHDRAW} USDT` },
        { status: 400 },
      );
    }

    if (numAmount > MAX_WITHDRAW) {
      return NextResponse.json(
        { error: `Maximum withdrawal is ${MAX_WITHDRAW} USDT` },
        { status: 400 },
      );
    }

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const sanitizedAddress = address.trim().toLowerCase();
    if (!isBEP20Address(sanitizedAddress)) {
      return NextResponse.json({ error: 'Invalid BEP20 address format' }, { status: 400 });
    }

    if (!network || network !== 'BEP20') {
      return NextResponse.json({ error: 'Only BEP20 network is supported' }, { status: 400 });
    }

    await dbConnect();

    const settings = await Settings.findOne({ key: 'global' });
    const fee = settings?.withdrawFee ?? 1;

    if (numAmount - fee <= 0) {
      return NextResponse.json({ error: `Amount must be greater than fee (${fee} USDT)` }, { status: 400 });
    }

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const recentWithdrawals = await Transaction.countDocuments({
      userId: user._id,
      type: 'withdraw',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentWithdrawals >= 10) {
      return NextResponse.json({ error: 'Daily withdrawal limit reached (10 per day)' }, { status: 429 });
    }

    const netAmount = parseFloat((numAmount - fee).toFixed(6));

    const updated = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: numAmount } },
      { $inc: { balance: -numAmount } },
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
      details:  { address: sanitizedAddress, network, grossAmount: numAmount, fee },
    });

    return NextResponse.json({ success: true, transaction, netAmount, fee });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Withdraw request error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
