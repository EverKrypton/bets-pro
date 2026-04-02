import mongoose from 'mongoose';

const BetSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:       { type: Number, required: true },
    odds:         { type: Number, required: true },
    multiplier:   { type: Number, required: true },
    payout:       { type: Number, default: 0 },
    status:       { type: String, enum: ['open', 'matched', 'pending', 'won', 'lost', 'refunded', 'cancelled'], default: 'open' },
    matchId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    isInverse:    { type: Boolean, default: false },
    selection:    { type: String, default: null },
    pairedWith:   { type: mongoose.Schema.Types.ObjectId, ref: 'Bet', default: null },
    pairedAmount: { type: Number, default: 0 },
    houseEdge:    { type: Number, default: 0.10 },
    result:       { type: String, enum: ['won', 'lost', null], default: null },
    details:      { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.models.Bet || mongoose.model('Bet', BetSchema);
