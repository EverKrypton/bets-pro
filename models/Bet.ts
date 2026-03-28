import mongoose from 'mongoose';

// selection: single outcome (home/draw/away) or double chance (1x/x2/12)
const BetSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:     { type: Number, required: true },
    multiplier: { type: Number, required: true },
    payout:     { type: Number, default: 0 },
    status:     { type: String, enum: ['pending', 'won', 'lost', 'refunded'], default: 'pending' },
    matchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    selection:  { type: String, enum: ['home', 'draw', 'away', '1x', 'x2', '12', null], default: null },
    details:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.models.Bet || mongoose.model('Bet', BetSchema);
