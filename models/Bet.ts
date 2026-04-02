import mongoose from 'mongoose';

const BetSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount:     { type: Number, required: true },
    multiplier: { type: Number, required: true },
    payout:     { type: Number, default: 0 },
    status:     { type: String, enum: ['pending', 'won', 'lost', 'refunded'], default: 'pending' },
    matchId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
    isInverse:  { type: Boolean, default: false },
    selection:  { type: String, default: null },
    details:    { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default mongoose.models.Bet || mongoose.model('Bet', BetSchema);
