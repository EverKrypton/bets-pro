import { NextResponse }   from 'next/server';
import dbConnect          from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import Bet                from '@/models/Bet';
import Match              from '@/models/Match';

// Double-chance winning selections
const WINS: Record<string, string[]> = {
  home: ['home', '1x', '12'],
  draw: ['draw', '1x', 'x2'],
  away: ['away', 'x2', '12'],
};

export async function GET() {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    // Only open/closed matches have live exposure
    const matches = await Match.find({ status: { $in: ['open', 'closed'] } });

    const exposure = await Promise.all(
      matches.map(async (match) => {
        const bets = await Bet.find({ matchId: match._id, status: 'pending' });

        const totalStaked = bets.reduce((s, b) => s + b.amount, 0);

        // How much the house pays out if each result happens
        const payIfHome = bets
          .filter(b => WINS.home.includes(b.selection))
          .reduce((s, b) => s + b.amount * b.multiplier, 0);

        const payIfDraw = bets
          .filter(b => WINS.draw.includes(b.selection))
          .reduce((s, b) => s + b.amount * b.multiplier, 0);

        const payIfAway = bets
          .filter(b => WINS.away.includes(b.selection))
          .reduce((s, b) => s + b.amount * b.multiplier, 0);

        // House profit = staked - payout (negative means house loses)
        const profitIfHome = parseFloat((totalStaked - payIfHome).toFixed(2));
        const profitIfDraw = parseFloat((totalStaked - payIfDraw).toFixed(2));
        const profitIfAway = parseFloat((totalStaked - payIfAway).toFixed(2));

        // Worst case = maximum the house can lose
        const worstCase = parseFloat(Math.min(profitIfHome, profitIfDraw, profitIfAway).toFixed(2));

        // Bet count breakdown
        const homeCount = bets.filter(b => b.selection === 'home').length;
        const drawCount = bets.filter(b => b.selection === 'draw').length;
        const awayCount = bets.filter(b => b.selection === 'away').length;
        const dcCount   = bets.filter(b => ['1x','x2','12'].includes(b.selection)).length;

        return {
          matchId:      match._id,
          homeTeam:     match.homeTeam,
          awayTeam:     match.awayTeam,
          league:       match.league,
          date:         match.date,
          time:         match.time,
          status:       match.status,
          displayOdds:  match.displayOdds,
          totalBets:    bets.length,
          totalStaked:  parseFloat(totalStaked.toFixed(2)),
          breakdown:    { home: homeCount, draw: drawCount, away: awayCount, dc: dcCount },
          payouts: {
            ifHome: parseFloat(payIfHome.toFixed(2)),
            ifDraw: parseFloat(payIfDraw.toFixed(2)),
            ifAway: parseFloat(payIfAway.toFixed(2)),
          },
          profit: {
            ifHome:    profitIfHome,
            ifDraw:    profitIfDraw,
            ifAway:    profitIfAway,
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
