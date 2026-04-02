import { NextResponse }    from 'next/server';
import dbConnect           from '@/lib/db';
import { getSessionUser }  from '@/lib/session';
import User                from '@/models/User';
import Transaction         from '@/models/Transaction';
import Settings            from '@/models/Settings';
import { sendBEP20Payout, sendToTreasury, isBEP20Address } from '@/lib/bep20';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transactionId, action } = body;

    if (!transactionId || typeof transactionId !== 'string') {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "approve" or "reject"' }, { status: 400 });
    }

    if (!/^[a-fA-F0-9]{24}$/.test(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID format' }, { status: 400 });
    }

    await dbConnect();

    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 403 });
    }

    const transaction = await Transaction.findById(transactionId).populate('userId');
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.type !== 'withdraw') {
      return NextResponse.json({ error: 'Transaction is not a withdrawal' }, { status: 400 });
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json({ error: `Transaction already ${transaction.status}` }, { status: 400 });
    }

    const details = transaction.details as { address: string; network: string; grossAmount?: number; fee?: number };

    if (action === 'approve') {
      if (details.network !== 'BEP20') {
        return NextResponse.json({ error: 'Only BEP20 withdrawals are supported' }, { status: 400 });
      }

      if (!isBEP20Address(details.address)) {
        return NextResponse.json({ error: 'Invalid BEP20 address' }, { status: 400 });
      }

      const amount = transaction.amount;
      if (amount <= 0 || amount > 100000) {
        return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
      }

      const result = await sendBEP20Payout(details.address, amount, transactionId);

      if (!result.success) {
        transaction.status = 'failed';
        transaction.details = { ...details, errorMessage: result.message };
        await transaction.save();
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      transaction.txId   = result.txHash;
      transaction.status = result.status === 'confirmed' ? 'completed' : 'pending';
      transaction.details = { ...details, bep20TxHash: result.txHash };
      await transaction.save();

      const settings = await Settings.findOne({ key: 'global' });
      const treasuryAddress = settings?.treasuryWalletAddress;
      const fee = details.fee || settings?.withdrawFee || 1;

      if (treasuryAddress && isBEP20Address(treasuryAddress) && fee > 0) {
        const treasuryResult = await sendToTreasury(fee, treasuryAddress);
        if (treasuryResult.success) {
          transaction.details = { 
            ...transaction.details as object, 
            treasuryTxHash: treasuryResult.txHash,
            feeSent: fee 
          };
          await transaction.save();
        } else {
          console.error('Treasury fee failed:', treasuryResult.message);
        }
      }

      return NextResponse.json({ 
        success: true, 
        transaction,
        message: result.message,
      });
    } else {
      transaction.status = 'rejected';
      await transaction.save();

      const user = await User.findById(transaction.userId);
      if (user) {
        const gross = parseFloat(((transaction.details as any)?.grossAmount ?? transaction.amount).toString());
        user.balance = parseFloat((user.balance + gross).toFixed(6));
        await user.save();
      }

      return NextResponse.json({ success: true, transaction, message: 'Withdrawal rejected and balance refunded' });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Withdraw approve error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
