import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['deposit', 'withdraw', 'bet', 'win', 'referral'], required: true },
    amount:   { type: Number, required: true },
    currency: { type: String, default: 'USDT' },
    status:   { type: String, enum: ['pending', 'completed', 'rejected'], default: 'pending' },
    txId:     { type: String, sparse: true, unique: true },
    details:  { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

TransactionSchema.index({ txId: 1 }, { unique: true, sparse: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
