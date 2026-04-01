import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match from '@/models/Match';

const MAX_ODDS = 4.00;
const MIN_ODDS = 1.30;

function clampOdds(odds: number): number {
  return Math.max(MIN_ODDS, Math.min(MAX_ODDS, Number(odds.toFixed(2))));
}

function generateVariedOdds(baseOdds: number): { 
  result: { home: number; draw: number; away: number };
  goals: {
    homeOver05: number; homeOver15: number; homeUnder05: number;
    awayOver05: number; awayOver15: number; awayUnder05: number;
    totalOver15: number; totalOver25: number; totalUnder15: number; totalUnder25: number;
    bttsYes: number; bttsNo: number;
  };
} {
  const variance = () => (Math.random() * 0.20 - 0.10);
  const randomNumber = (min: number, max: number) => min + Math.random() * (max - min);
  const homeProbBase = randomNumber(0.35, 0.55);
  const drawProbBase = randomNumber(0.20, 0.30);
  const awayProbBase = Math.max(0.15, 1 - homeProbBase - drawProbBase);
  
  let homeProb = homeProbBase + variance();
  let drawProb = drawProbBase + variance();
  let awayProb = awayProbBase + variance();
  
  const total = homeProb + drawProb + awayProb;
  homeProb /= total;
  drawProb /= total;
  awayProb /= total;
  
  const home = clampOdds(baseOdds * (0.7 + Math.random() * 0.6) * (homeProb > 0.4 ? 0.8 : 1.2));
  const draw = clampOdds(baseOdds * (0.8 + Math.random() * 0.4));
  const away = clampOdds(baseOdds * (0.7 + Math.random() * 0.6) * (awayProb > 0.35 ? 0.8 : 1.3));
  
  const homeStrength = 1 / home;
  const awayStrength = 1 / away;
  const avgStrength = (homeStrength + awayStrength) / 2;
  
  const homeOver05 = clampOdds(1.15 + (0.5 - homeStrength) *2);
  const homeOver15 = clampOdds(1.40 + (1.0 - homeStrength) * 3);
  const homeUnder05 = clampOdds(2.50 + homeStrength *5);
  
  const awayOver05 = clampOdds(1.15 + (0.5 - awayStrength) * 2);
  const awayOver15 = clampOdds(1.40 + (1.0 - awayStrength) * 3);
  const awayUnder05 = clampOdds(2.50 + awayStrength * 5);
  
  const totalStrength = homeStrength + awayStrength;
  const totalOver15 = clampOdds(1.25 + (1.0 - totalStrength * 0.3) * 2);
  const totalOver25 = clampOdds(1.60 + (1.5 - totalStrength * 0.4) * 3);
  const totalUnder15 = clampOdds(3.00 + totalStrength * 2);
  const totalUnder25 = clampOdds(2.00 + totalStrength * 1.5);
  
  const bttsProb = Math.min(0.8, Math.max(0.3, 0.4 + (homeStrength + awayStrength) * 0.3));
  const bttsYes = clampOdds(1 / (bttsProb * 1.05));
  const bttsNo = clampOdds(1 / ((1 - bttsProb) * 1.05));
  
  return {
    result: { home, draw, away },
    goals: {
      homeOver05, homeOver15, homeUnder05,
      awayOver05, awayOver15, awayUnder05,
      totalOver15, totalOver25, totalUnder15, totalUnder25,
      bttsYes, bttsNo,
    },
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
    if (!baseOdds || baseOdds < 1.1) {
      return NextResponse.json({ error: 'Invalid base odds (min 1.1)' }, { status: 400 });
    }

    const cappedBase = Math.min(MAX_ODDS, Math.max(1.5, baseOdds));

    const matches = await Match.find({ 
      status: { $in: ['pending', 'open'] } 
    });

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No matches to update' }, { status: 400 });
    }

    let updated = 0;
    let opened = 0;
    
    for (const match of matches) {
      const odds = generateVariedOdds(cappedBase);
      match.displayOdds = odds.result;
      match.trueOdds = odds.result;
      match.goalOdds = odds.goals;
      
      if (match.status === 'pending') {
        match.status = 'open';
        opened++;
      }
      
      await match.save();
      updated++;
    }

    return NextResponse.json({ 
      success: true, 
      updated,
      opened,
      maxOdds: MAX_ODDS,
      message: `Updated ${updated} matches (opened ${opened}), odds capped at ${MAX_ODDS}`
    });
  } catch (error: unknown) {
    console.error('Bulk odds error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}