import { NextResponse }    from 'next/server';
import dbConnect           from '@/lib/db';
import { getSessionUser }  from '@/lib/session';
import User                from '@/models/User';
import Transaction         from '@/models/Transaction';
import { createPayout }    from '@/lib/oxapay';

export async function POST(req: Request) {
  try {
    const { transactionId, action } = await req.json();

    if (!transactionId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    await dbConnect();

    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const transaction = await Transaction.findById(transactionId);
    if (!transaction || transaction.type !== 'withdraw' || transaction.status !== 'pending') {
      return NextResponse.json({ error: 'Invalid transaction' }, { status: 400 });
    }

    if (action === 'approve') {
      const details = transaction.details as { address: string; network: string; grossAmount?: number };
      const address = details.address;
      const network = details.network || 'BEP20';

      // transaction.amount = net amount (after 1 USDT fee already deducted)
      const oxaResponse = await createPayout(
        address,
        transaction.amount,   // number — OxaPay requires decimal, not string
        network,
        `Bets Pro withdrawal tx ${transactionId}`,
      );

      transaction.txId   = oxaResponse.data.track_id;
      transaction.status = 'completed';
      await transaction.save();
    } else {
      transaction.status = 'rejected';
      await transaction.save();

      const user = await User.findById(transaction.userId);
      if (user) {
        const gross      = parseFloat(((transaction.details as any)?.grossAmount ?? transaction.amount).toString());
        user.balance     = parseFloat((user.balance + gross).toFixed(6));
        await user.save();
      }
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Withdraw approve error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
