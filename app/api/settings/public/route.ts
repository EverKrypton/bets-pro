import { NextResponse } from 'next/server';
import dbConnect        from '@/lib/db';
import Settings         from '@/models/Settings';

export async function GET() {
  try {
    await dbConnect();
    const settings = await Settings.findOne({ key: 'global' });
    return NextResponse.json({
      minBetAmount:         settings?.minBetAmount         ?? 1,
      maxBetAmount:         settings?.maxBetAmount         ?? 50,
      maxPotentialPayout:   settings?.maxPotentialPayout   ?? 200,
      liveScoreRefreshSecs: settings?.liveScoreRefreshSecs ?? 30,
      rubUsdRate:           settings?.rubUsdRate           ?? 90,
      rubBankDetails:       settings?.rubBankDetails       ?? '',
    });
  } catch {
    return NextResponse.json({ minBetAmount:1, maxBetAmount:50, maxPotentialPayout:200, liveScoreRefreshSecs:30, rubUsdRate:90, rubBankDetails:'' });
  }
}
