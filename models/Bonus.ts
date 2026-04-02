import mongoose from 'mongoose';

const BonusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['welcome'], default: 'welcome' },
    status: { type: String, enum: ['pending', 'eligible', 'claimed', 'expired'], default: 'pending' },
    firstDepositAmount: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    bonusPercent: { type: Number, default: 0 },
    requiredBetVolume: { type: Number, default: 30 },
    requiredReferrals: { type: Number, default: 3 },
    currentBetVolume: { type: Number, default: 0 },
    currentReferrals: { type: Number, default: 0 },
    referredUsersInvested: { type: Number, default: 0 },
    claimedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.Bonus || mongoose.model('Bonus', BonusSchema);