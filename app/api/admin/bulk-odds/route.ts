import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match from '@/models/Match';

// Generate varied odds around a base value with realistic probability distribution
function generateVariedOdds(baseOdds: number): { home: number; draw: number; away: number } {
  // Random variance factor between -8% to +8%
  const variance = () => (Math.random() * 0.16 - 0.08);
  
  // Realistic probability distribution (home wins more often)
  const homeProbBase = 0.40 + Math.random() * 0.25; // 40-65%
  const drawProbBase = 0.20 + Math.random() * 0.15; // 20-35%
  const awayProbBase = 1 - homeProbBase - drawProbBase;
  
  // Apply variance to each
  const homeProb = Math.max(0.05, Math.min(0.75, homeProbBase + variance()));
  const drawProb = Math.max(0.10, Math.min(0.35, drawProbBase + variance()));
  const awayProb = Math.max(0.05, Math.min(0.50, awayProbBase + variance()));
  
  // Normalize to sum to ~1 (with bookmaker margin of ~5%)
  const total = homeProb + drawProb + awayProb;
  const margin = 1.05;
  
  // Convert probabilities to odds
  const home = Math.max(1.01, Number((baseOdds * (total / homeProb) / margin).toFixed(2)));
  const draw = Math.max(1.01, Number((baseOdds * (total / drawProb) / margin).toFixed(2)));
  const away = Math.max(1.01, Number((baseOdds * (total / awayProb) / margin).toFixed(2)));
  
  // Add some randomness to make each match different
  const randomize = (odds: number) => {
    const factor = 0.85 + Math.random() * 0.30; // 85-115% of calculated
    return Math.max(1.01, Number((odds * factor).toFixed(2)));
  };
  
  return {
    home: randomize(home),
    draw: randomize(draw),
    away: randomize(away),
  };
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { baseOdds } = await req.json();
    if (!baseOdds || baseOdds < 1.01) {
      return NextResponse.json({ error: 'Invalid base odds' }, { status: 400 });
    }

    // Get all open/pending matches
    const matches = await Match.find({ 
      status: { $in: ['pending', 'open'] } 
    });

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No matches to update' }, { status: 400 });
    }

    // Update each match with varied odds
    let updated = 0;
    for (const match of matches) {
      const odds = generateVariedOdds(baseOdds);
      match.displayOdds = odds;
      match.trueOdds = odds;
      await match.save();
      updated++;
    }

    return NextResponse.json({ 
      success: true, 
      updated,
      message: `Updated ${updated} matches with varied odds around ${baseOdds}x`
    });
  } catch (error: unknown) {
    console.error('Bulk odds error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}