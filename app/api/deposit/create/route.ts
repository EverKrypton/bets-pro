import { NextResponse }        from 'next/server';
import dbConnect               from '@/lib/db';
import { getSessionUser }      from '@/lib/session';
import { createStaticAddress } from '@/lib/oxapay';

export async function POST() {
  try {
    await dbConnect();

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.depositAddress) {
      return NextResponse.json({
        address:  user.depositAddress,
        currency: 'USDT',
        network:  'BSC (BEP20)',
        minimum:  10,
      });
    }

    const oxaResponse           = await createStaticAddress(user._id.toString());
    const { address, network }  = oxaResponse.data;

    user.depositAddress = address;
    await user.save();

    return NextResponse.json({ address, currency: 'USDT', network: network || 'BSC (BEP20)', minimum: 10 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Deposit create error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
