import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Settings           from '@/models/Settings';

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $setOnInsert: { key: 'global' } },
      { upsert: true, new: true },
    );
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const body    = await req.json();
    const numKeys = ['maxBetAmount','maxPotentialPayout','minBetAmount','autoCloseMinutes','houseReserve','liveScoreRefreshSecs'];
    const strKeys = ['footballDataApiKey'];
    const update: Record<string, unknown> = {};

    for (const key of numKeys) {
      if (body[key] !== undefined) {
        const val = parseFloat(body[key]);
        if (isNaN(val) || val < 0) return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
        update[key] = val;
      }
    }
    for (const key of strKeys) {
      if (body[key] !== undefined) update[key] = String(body[key]).trim();
    }

    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

    const settings = await Settings.findOneAndUpdate(
      { key: 'global' },
      { $set: update },
      { upsert: true, new: true },
    );
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
