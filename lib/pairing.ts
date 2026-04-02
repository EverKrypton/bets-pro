import Bet from '@/models/Bet';
import mongoose from 'mongoose';

const HOUSE_EDGE = 0.10;

const OPPOSITE_SELECTIONS: Record<string, string[]> = {
  home: ['away', 'draw'],
  away: ['home', 'draw'],
  draw: ['home', 'away'],
  '1x': ['away'],
  'x2': ['home'],
  '12': ['draw'],
};

const INVERSE_BET_OPPOSITES: Record<string, string[]> = {
  home: ['away', 'draw'],
  away: ['home', 'draw'],
  draw: ['home', 'away'],
  '1x': ['away'],
  'x2': ['home'],
  '12': ['draw'],
};

interface PairingResult {
  matched: boolean;
  pairedWith?: mongoose.Types.ObjectId;
  pairedAmount?: number;
  counterBetId?: mongoose.Types.ObjectId;
}

export async function findCounterBet(
  matchId: mongoose.Types.ObjectId,
  selection: string,
  amount: number,
  isInverse: boolean,
  excludeUserId: mongoose.Types.ObjectId
): Promise<PairingResult> {
  const oppositeSelections = isInverse 
    ? INVERSE_BET_OPPOSITES[selection] || []
    : OPPOSITE_SELECTIONS[selection] || [];

  if (!oppositeSelections.length) {
    return { matched: false };
  }

  const counterBet = await Bet.findOne({
    matchId,
    selection: { $in: oppositeSelections },
    status: 'open',
    isInverse: false,
    userId: { $ne: excludeUserId },
    amount: { $gte: amount * 0.5, $lte: amount * 2 },
  }).sort({ createdAt: 1 });

  if (!counterBet) {
    return { matched: false };
  }

  const pairedAmount = Math.min(amount, counterBet.amount);

  return {
    matched: true,
    pairedWith: counterBet._id,
    pairedAmount,
    counterBetId: counterBet._id,
  };
}

export function calculatePayout(
  winnerAmount: number,
  loserAmount: number,
  houseEdge: number = HOUSE_EDGE
): number {
  const totalPool = winnerAmount + loserAmount;
  return parseFloat((totalPool * (1 - houseEdge)).toFixed(6));
}

export function calculateOpenPayout(
  amount: number,
  odds: number,
  houseEdge: number = HOUSE_EDGE
): number {
  return parseFloat((amount * odds * (1 - houseEdge)).toFixed(6));
}

export function calculateLiability(odds: number, amount: number): number {
  if (odds <= 1) return 0;
  const potentialWin = amount * odds;
  const liability = potentialWin - amount;
  return parseFloat(liability.toFixed(6));
}

export async function matchBet(
  newBetId: mongoose.Types.ObjectId,
  matchId: mongoose.Types.ObjectId,
  selection: string,
  amount: number,
  isInverse: boolean,
  userId: mongoose.Types.ObjectId
): Promise<{ matched: boolean; counterBetId?: mongoose.Types.ObjectId }> {
  const pairing = await findCounterBet(matchId, selection, amount, isInverse, userId);

  if (!pairing.matched || !pairing.pairedWith) {
    await Bet.findByIdAndUpdate(newBetId, {
      status: 'open',
      pairedWith: null,
      pairedAmount: 0,
    });
    return { matched: false };
  }

  await Bet.findByIdAndUpdate(newBetId, {
    status: 'matched',
    pairedWith: pairing.pairedWith,
    pairedAmount: pairing.pairedAmount,
  });

  await Bet.findByIdAndUpdate(pairing.pairedWith, {
    status: 'matched',
    pairedWith: newBetId,
    pairedAmount: pairing.pairedAmount,
  });

  return {
    matched: true,
    counterBetId: pairing.pairedWith,
  };
}

export async function getUnpairedBets(matchId: mongoose.Types.ObjectId): Promise<typeof Bet[]> {
  return Bet.find({
    matchId,
    status: 'open',
  }).sort({ createdAt: 1 });
}

export { HOUSE_EDGE, OPPOSITE_SELECTIONS, INVERSE_BET_OPPOSITES };