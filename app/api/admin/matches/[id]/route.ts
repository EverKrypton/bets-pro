import { NextResponse }              from 'next/server';
import dbConnect                     from '@/lib/db';
import { getSessionUser }            from '@/lib/session';
import Match                         from '@/models/Match';
import Bet                           from '@/models/Bet';
import User                          from '@/models/User';
import { computeDisplayOdds }        from '@/lib/sports';

// PATCH /api/admin/matches/[id] — set trueOdds, marginPct, and status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id }                             = await params;
    const { trueOdds, marginPct = 10, status } = await req.json();

    if (
      !trueOdds ||
      typeof trueOdds.home !== 'number' ||
      typeof trueOdds.draw !== 'number' ||
      typeof trueOdds.away !== 'number'
    ) {
      return NextResponse.json(
        { error: 'trueOdds must include numeric home, draw, away' },
        { status: 400 },
      );
    }

    if ([trueOdds.home, trueOdds.draw, trueOdds.away].some((o) => o < 1)) {
      return NextResponse.json({ error: 'All odds must be >= 1' }, { status: 400 });
    }

    const displayOdds = computeDisplayOdds(trueOdds, marginPct);

    const match = await Match.findByIdAndUpdate(
      id,
      {
        trueOdds,
        marginPct,
        displayOdds,
        ...(status ? { status } : {}),
      },
      { new: true },
    );

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    return NextResponse.json({ match });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/admin/matches/[id]/settle — settle match, pay out winners
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id }     = await params;
    const { result } = await req.json();

    if (!['home', 'draw', 'away'].includes(result)) {
      return NextResponse.json(
        { error: 'result must be: home | draw | away' },
        { status: 400 },
      );
    }

    const match = await Match.findById(id);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status === 'settled') {
      return NextResponse.json({ error: 'Match already settled' }, { status: 400 });
    }

    // Settle all pending bets for this match
    const bets = await Bet.find({ matchId: id, status: 'pending' });

    let winnersCount = 0;
    let losersCount  = 0;

    for (const bet of bets) {
      if (bet.selection === result) {
        const payout     = parseFloat((bet.amount * bet.multiplier).toFixed(6));
        bet.payout       = payout;
        bet.status       = 'won';
        await bet.save();

        const user = await User.findById(bet.userId);
        if (user) {
          user.balance = parseFloat((user.balance + payout).toFixed(6));
          await user.save();
        }
        winnersCount++;
      } else {
        bet.status = 'lost';
        await bet.save();
        losersCount++;
      }
    }

    match.result = result;
    match.status = 'settled';
    await match.save();

    return NextResponse.json({
      message:      `Match settled: ${result}`,
      match,
      winnersCount,
      losersCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/matches/[id] — remove a pending/unsettled match
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const admin = await getSessionUser();
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const match  = await Match.findById(id);
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    if (match.status === 'settled') {
      return NextResponse.json({ error: 'Cannot delete a settled match' }, { status: 400 });
    }

    // Refund pending bets
    const bets = await Bet.find({ matchId: id, status: 'pending' });
    for (const bet of bets) {
      bet.status = 'refunded';
      await bet.save();
      const user = await User.findById(bet.userId);
      if (user) {
        user.balance = parseFloat((user.balance + bet.amount).toFixed(6));
        await user.save();
      }
    }

    await match.deleteOne();
    return NextResponse.json({ message: 'Match deleted and bets refunded' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
