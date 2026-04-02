import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Match from '@/models/Match';

const MAX_ODDS = 3.2;
const MIN_ODDS = 1.01;

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
  
  // Generate unique odds for home, draw, away
  const generateUniqueOdds = (base: number): { home: number; draw: number; away: number } => {
    let home = clampOdds(base * (0.7 + Math.random() * 0.6));
    let draw = clampOdds(base * (0.8 + Math.random() * 0.4));
    let away = clampOdds(base * (0.7 + Math.random() * 0.6));
    
    // Ensure all are different - adjust minimum increment
    const minDiff = 0.02;
    if (Math.abs(home - draw) < minDiff) {
      draw = clampOdds(draw + minDiff + Math.random() * 0.05);
    }
    if (Math.abs(home - away) < minDiff) {
      away = clampOdds(away + minDiff + Math.random() * 0.05);
    }
    if (Math.abs(draw - away) < minDiff) {
      away = clampOdds(away + minDiff + Math.random() * 0.05);
    }
    
    // Ensure max 3.2
    home = Math.min(MAX_ODDS, home);
    draw = Math.min(MAX_ODDS, draw);
    away = Math.min(MAX_ODDS, away);
    
    return { home, draw, away };
  };
  
  const result = generateUniqueOdds(baseOdds);
  
  // Generate unique goal odds
  const allOdds = new Set<number>();
  allOdds.add(result.home);
  allOdds.add(result.draw);
  allOdds.add(result.away);
  
  const genGoalOdds = (base: number, multiplier: number): number => {
    let odds = clampOdds(base * multiplier);
    let attempts = 0;
    while (allOdds.has(odds) && attempts < 20) {
      odds = clampOdds(odds + 0.01 + Math.random() * 0.05);
      attempts++;
    }
    allOdds.add(odds);
    return odds;
  };
  
  const homeStrength = 1 / result.home;
  const awayStrength = 1 / result.away;
  
  const homeOver05 = genGoalOdds(baseOdds, 1.15 + (0.5 - homeStrength) * 2);
  const homeOver15 = genGoalOdds(baseOdds, 1.40 + (1.0 - homeStrength) * 3);
  const homeUnder05 = genGoalOdds(baseOdds, 2.50 + homeStrength * 5);
  
  const awayOver05 = genGoalOdds(baseOdds, 1.15 + (0.5 - awayStrength) * 2);
  const awayOver15 = genGoalOdds(baseOdds, 1.40 + (1.0 - awayStrength) * 3);
  const awayUnder05 = genGoalOdds(baseOdds, 2.50 + awayStrength * 5);
  
  const totalStrength = homeStrength + awayStrength;
  const totalOver15 = genGoalOdds(baseOdds, 1.25 + (1.0 - totalStrength * 0.3) * 2);
  const totalOver25 = genGoalOdds(baseOdds, 1.60 + (1.5 - totalStrength * 0.4) * 3);
  const totalUnder15 = genGoalOdds(baseOdds, 3.00 + totalStrength * 2);
  const totalUnder25 = genGoalOdds(baseOdds, 2.00 + totalStrength * 1.5);
  
  const bttsProb = Math.min(0.8, Math.max(0.3, 0.4 + (homeStrength + awayStrength) * 0.3));
  const bttsYes = genGoalOdds(baseOdds, 1 / (bttsProb * 1.05));
  const bttsNo = genGoalOdds(baseOdds, 1 / ((1 - bttsProb) * 1.05));
  
  return {
    result,
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
    if (baseOdds > MAX_ODDS) {
      return NextResponse.json({ error: `Maximum base odds is ${MAX_ODDS}` }, { status: 400 });
    }

    const matches = await Match.find({ 
      status: { $in: ['pending', 'open'] } 
    });

    if (matches.length === 0) {
      return NextResponse.json({ error: 'No matches to update' }, { status: 400 });
    }

    let updated = 0;
    let opened = 0;
    
    for (const match of matches) {
      const odds = generateVariedOdds(baseOdds);
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
      message: `Updated ${updated} matches (opened ${opened}), max odds ${MAX_ODDS}`
    });
  } catch (error: unknown) {
    console.error('Bulk odds error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}