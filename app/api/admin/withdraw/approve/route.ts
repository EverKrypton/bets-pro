import { NextResponse }    from 'next/server';
import dbConnect           from '@/lib/db';
import { getSessionUser }  from '@/lib/session';
import User                from '@/models/User';
import Transaction         from '@/models/Transaction';
import Settings            from '@/models/Settings';
import { sendBEP20Payout, sendToTreasury } from '@/lib/bep20';

const FEE = 1;

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
      const details = transaction.details as { address: string; network: string; grossAmount?: number; fee?: number };
      const address = details.address;
      const amount = transaction.amount;

      const result = await sendBEP20Payout(
        address,
        amount,
        transactionId,
      );

      if (!result.success) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }

      transaction.txId   = result.txHash;
      transaction.status = 'completed';
      transaction.details = { ...details, bep20TxHash: result.txHash };
      await transaction.save();

      const settings = await Settings.findOne({ key: 'global' });
      const treasuryAddress = settings?.treasuryWalletAddress;

      if (treasuryAddress && /^0x[a-fA-F0-9]{40}$/.test(treasuryAddress)) {
        const treasuryResult = await sendToTreasury(FEE, treasuryAddress);
        if (treasuryResult.success) {
          transaction.details = { 
            ...transaction.details as object, 
            treasuryTxHash: treasuryResult.txHash,
            feeSent: FEE 
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

      return NextResponse.json({ success: true, transaction });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Withdraw approve error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
