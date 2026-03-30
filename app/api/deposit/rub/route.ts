import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import RubDeposit         from '@/models/RubDeposit';
import Settings           from '@/models/Settings';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { amountRub, txRef } = await req.json();

    if (!amountRub || amountRub < 500) {
      return NextResponse.json({ error: 'Minimum deposit is 500 RUB' }, { status: 400 });
    }
    if (!txRef || String(txRef).trim().length < 4) {
      return NextResponse.json({ error: 'Transfer reference is required (min 4 characters)' }, { status: 400 });
    }

    const settings  = await Settings.findOne({ key: 'global' });
    const rate      = settings?.rubUsdRate ?? 90;
    const amountUsd = parseFloat((amountRub / rate).toFixed(6));

    const deposit = await RubDeposit.create({
      userId:    user._id,
      amountRub,
      amountUsd,
      rate,
      txRef:     String(txRef).trim(),
      status:    'pending',
    });

    return NextResponse.json({ success: true, deposit, amountUsd, rate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('RUB deposit error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
