import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet from '@/models/Bet';
import Match from '@/models/Match';

const WINS: Record<string, string[]> = {
  home: ['home', '1x', '12'],
  draw: ['draw', '1x', 'x2'],
  away: ['away', 'x2', '12'],
};

const RESULT_SELECTIONS = ['home', 'draw', 'away', '1x', 'x2', '12'];
const GOAL_SELECTIONS = [
  'homeOver05', 'homeOver15', 'homeUnder05',
  'awayOver05', 'awayOver15', 'awayUnder05',
  'totalOver15', 'totalOver25', 'totalUnder15', 'totalUnder25',
  'bttsYes', 'bttsNo',
];

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const matches = await Match.find({ status: { $in: ['open', 'closed'] } });

    const exposure = await Promise.all(
      matches.map(async (match) => {
        const bets = await Bet.find({ matchId: match._id, status: 'pending' });

        const resultBets = bets.filter(b => RESULT_SELECTIONS.includes(b.selection));
        const goalBets = bets.filter(b => GOAL_SELECTIONS.includes(b.selection));

        const totalStaked = bets.reduce((s, b) => s + b.amount, 0);
        const resultStaked = resultBets.reduce((s, b) => s + b.amount, 0);
        const goalStaked = goalBets.reduce((s, b) => s + b.amount, 0);

        const payIfHome = resultBets
          .filter(b => WINS.home.includes(b.selection))
          .reduce((s, b) => s + b.amount * b.multiplier, 0);

        const payIfDraw = resultBets
          .filter(b => WINS.draw.includes(b.selection))
          .reduce((s, b) => s + b.amount * b.multiplier, 0);

        const payIfAway = resultBets
          .filter(b => WINS.away.includes(b.selection))
          .reduce((s, b) => s + b.amount * b.multiplier, 0);

        // Goal bets max payout (worst case: all goal bets win)
        const goalMaxPayout = goalBets.reduce((s, b) => s + b.amount * b.multiplier, 0);

        // Total payout per result scenario (including goal bets potential)
        const totalPayIfHome = payIfHome + goalMaxPayout;
        const totalPayIfDraw = payIfDraw + goalMaxPayout;
        const totalPayIfAway = payIfAway + goalMaxPayout;

        const profitIfHome = parseFloat((totalStaked - totalPayIfHome).toFixed(2));
        const profitIfDraw = parseFloat((totalStaked - totalPayIfDraw).toFixed(2));
        const profitIfAway = parseFloat((totalStaked - totalPayIfAway).toFixed(2));

        const worstCase = parseFloat(Math.min(profitIfHome, profitIfDraw, profitIfAway).toFixed(2));

        const homeCount = resultBets.filter(b => b.selection === 'home').length;
        const drawCount = resultBets.filter(b => b.selection === 'draw').length;
        const awayCount = resultBets.filter(b => b.selection === 'away').length;
        const dcCount = resultBets.filter(b => ['1x', 'x2', '12'].includes(b.selection)).length;

        const goalBreakdown: Record<string, number> = {};
        for (const sel of GOAL_SELECTIONS) {
          goalBreakdown[sel] = goalBets.filter(b => b.selection === sel).length;
        }

        return {
          matchId: match._id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          league: match.league,
          date: match.date,
          time: match.time,
          status: match.status,
          displayOdds: match.displayOdds,
          totalBets: bets.length,
          totalStaked: parseFloat(totalStaked.toFixed(2)),
          resultStaked: parseFloat(resultStaked.toFixed(2)),
          goalStaked: parseFloat(goalStaked.toFixed(2)),
          breakdown: { home: homeCount, draw: drawCount, away: awayCount, dc: dcCount },
          goalBreakdown,
          payouts: {
            ifHome: parseFloat(totalPayIfHome.toFixed(2)),
            ifDraw: parseFloat(totalPayIfDraw.toFixed(2)),
            ifAway: parseFloat(totalPayIfAway.toFixed(2)),
          },
          profit: {
            ifHome: profitIfHome,
            ifDraw: profitIfDraw,
            ifAway: profitIfAway,
            worstCase,
          },
        };
      }),
    );

    const totalExposure = parseFloat(
      exposure.reduce((s, m) => s + Math.max(0, -m.profit.worstCase), 0).toFixed(2),
    );

    return NextResponse.json({ exposure, totalExposure });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}