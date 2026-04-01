import mongoose from 'mongoose';

// selection: single outcome (home/draw/away) or double chance (1x/x2/12) or goal bet
const BetSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:     { type: Number, required: true },
    multiplier: { type: Number, required: true },
    payout:     { type: Number, default: 0 },
    status:     { type: String, enum: ['pending', 'won', 'lost', 'refunded'], default: 'pending' },
    matchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    // Result bets: home, draw, away, 1x, x2, 12
    // Goal bets: homeOver05, homeOver15, homeUnder05, awayOver05, awayOver15, awayUnder05,
    //            totalOver15, totalOver25, totalUnder15, totalUnder25, bttsYes, bttsNo
    selection:  { type: String, default: null },
    details:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.models.Bet || mongoose.model('Bet', BetSchema);
