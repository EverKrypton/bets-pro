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
      const { address, network } = transaction.details as { address: string; network: string };
      // amount already has the 1 USDT fee deducted at request time
      const oxaResponse    = await createPayout(
        address,
        transaction.amount,
        network || 'BEP20',
        `FCC withdrawal tx ${transactionId}`,
      );
      transaction.txId   = oxaResponse.data.track_id;
      transaction.status = 'completed';
      await transaction.save();
    } else {
      transaction.status = 'rejected';
      await transaction.save();

      // Refund the full amount the user requested (before fee) back to their balance
      const user = await User.findById(transaction.userId);
      if (user) {
        // The stored amount is already net (after fee), refund the gross amount
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
