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
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pendingBets = await Bet.find({ userId: user._id, status: 'pending' }).populate('matchId');

    if (pendingBets.length === 0) {
      return NextResponse.json({
        hasActiveBets: false,
        totalStaked: 0,
        pendingCount: 0,
        distribution: {
          byResult: { home: 0, draw: 0, away: 0, doubleChance: 0, total: 0 },
          byType: { results: 0, goals: 0 },
        },
        scenarios: {
          homeWins: { payout: 0, profit: 0 },
          draw: { payout: 0, profit: 0 },
          awayWins: { payout: 0, profit: 0 },
        },
        worstCase: { profit: 0, scenario: 'none' },
      });
    }

    let totalStaked = 0;
    const distribution = {
      byResult: { home: 0, draw: 0, away: 0, doubleChance: 0, total: 0 },
      byType: { results: 0, goals: 0 },
    };

    const betsByMatch = new Map<string, typeof pendingBets>();
    for (const bet of pendingBets) {
      totalStaked += bet.amount;

      if (RESULT_SELECTIONS.includes(bet.selection)) {
        distribution.byType.results += bet.amount;
        distribution.byResult.total += bet.amount;
        if (bet.selection === 'home') distribution.byResult.home += bet.amount;
        else if (bet.selection === 'draw') distribution.byResult.draw += bet.amount;
        else if (bet.selection === 'away') distribution.byResult.away += bet.amount;
        else distribution.byResult.doubleChance += bet.amount;
      } else if (GOAL_SELECTIONS.includes(bet.selection)) {
        distribution.byType.goals += bet.amount;
      }

      const matchId = (bet.matchId as any)?._id?.toString() || bet.matchId?.toString();
      if (matchId) {
        if (!betsByMatch.has(matchId)) betsByMatch.set(matchId, []);
        betsByMatch.get(matchId)!.push(bet as any);
      }
    }

    const scenarios = {
      homeWins: { payout: 0, profit: 0 },
      draw: { payout: 0, profit: 0 },
      awayWins: { payout: 0, profit: 0 },
    };

    let worstCaseProfit = Infinity;
    let worstCaseScenario = 'home';

    for (const [, bets] of betsByMatch) {
      const resultBets = bets.filter(b => RESULT_SELECTIONS.includes(b.selection));
      const goalBets = bets.filter(b => GOAL_SELECTIONS.includes(b.selection));
      const matchStake = bets.reduce((s, b) => s + b.amount, 0);

      const goalMaxPayout = goalBets.reduce((s, b) => s + b.amount * b.multiplier, 0);

      const payIfHome = resultBets.filter(b => WINS.home.includes(b.selection)).reduce((s, b) => s + b.amount * b.multiplier, 0);
      const payIfDraw = resultBets.filter(b => WINS.draw.includes(b.selection)).reduce((s, b) => s + b.amount * b.multiplier, 0);
      const payIfAway = resultBets.filter(b => WINS.away.includes(b.selection)).reduce((s, b) => s + b.amount * b.multiplier, 0);

      const totalPayIfHome = payIfHome + goalMaxPayout;
      const totalPayIfDraw = payIfDraw + goalMaxPayout;
      const totalPayIfAway = payIfAway + goalMaxPayout;

      scenarios.homeWins.payout += totalPayIfHome;
      scenarios.draw.payout += totalPayIfDraw;
      scenarios.awayWins.payout += totalPayIfAway;

      const profitIfHome = matchStake - totalPayIfHome;
      const profitIfDraw = matchStake - totalPayIfDraw;
      const profitIfAway = matchStake - totalPayIfAway;

      if (profitIfHome < worstCaseProfit) {
        worstCaseProfit = profitIfHome;
        worstCaseScenario = 'home';
      }
      if (profitIfDraw < worstCaseProfit) {
        worstCaseProfit = profitIfDraw;
        worstCaseScenario = 'draw';
      }
      if (profitIfAway < worstCaseProfit) {
        worstCaseProfit = profitIfAway;
        worstCaseScenario = 'away';
      }
    }

    scenarios.homeWins.profit = totalStaked - scenarios.homeWins.payout;
    scenarios.draw.profit = totalStaked - scenarios.draw.payout;
    scenarios.awayWins.profit = totalStaked - scenarios.awayWins.payout;

    if (worstCaseProfit === Infinity) worstCaseProfit = 0;

    return NextResponse.json({
      hasActiveBets: true,
      totalStaked: parseFloat(totalStaked.toFixed(2)),
      pendingCount: pendingBets.length,
      distribution: {
        byResult: {
          home: parseFloat(distribution.byResult.home.toFixed(2)),
          draw: parseFloat(distribution.byResult.draw.toFixed(2)),
          away: parseFloat(distribution.byResult.away.toFixed(2)),
          doubleChance: parseFloat(distribution.byResult.doubleChance.toFixed(2)),
          total: parseFloat(distribution.byResult.total.toFixed(2)),
        },
        byType: {
          results: parseFloat(distribution.byType.results.toFixed(2)),
          goals: parseFloat(distribution.byType.goals.toFixed(2)),
        },
      },
      scenarios: {
        homeWins: {
          payout: parseFloat(scenarios.homeWins.payout.toFixed(2)),
          profit: parseFloat(scenarios.homeWins.profit.toFixed(2)),
        },
        draw: {
          payout: parseFloat(scenarios.draw.payout.toFixed(2)),
          profit: parseFloat(scenarios.draw.profit.toFixed(2)),
        },
        awayWins: {
          payout: parseFloat(scenarios.awayWins.payout.toFixed(2)),
          profit: parseFloat(scenarios.awayWins.profit.toFixed(2)),
        },
      },
      worstCase: {
        profit: parseFloat(worstCaseProfit.toFixed(2)),
        scenario: worstCaseScenario,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}