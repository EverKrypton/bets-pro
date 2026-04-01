import { NextResponse }        from 'next/server';
import dbConnect               from '@/lib/db';
import { getSessionUser }      from '@/lib/session';
import { createStaticAddress } from '@/lib/oxapay';
import Settings               from '@/models/Settings';

export async function POST() {
  try {
    await dbConnect();

    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await Settings.findOne({ key: 'global' });
    const minDeposit = settings?.minDepositAmount ?? 10;

    if (user.depositAddress) {
      return NextResponse.json({
        address:  user.depositAddress,
        currency: 'USDT',
        network:  'BSC (BEP20)',
        minimum:  minDeposit,
      });
    }

    const oxaResponse           = await createStaticAddress(user._id.toString());
    const { address, network, track_id }  = oxaResponse.data;

    user.depositAddress = address;
    user.depositTrackId = track_id;
    await user.save();

    return NextResponse.json({ address, currency: 'USDT', network: network || 'BSC (BEP20)', minimum: minDeposit });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Deposit create error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
