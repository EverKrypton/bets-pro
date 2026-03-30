import mongoose from 'mongoose';

const RubDepositSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountRub:{ type: Number, required: true },   // user declares how much they sent in RUB
    amountUsd:{ type: Number, required: true },   // converted at time of submission
    rate:     { type: Number, required: true },   // RUB/USD rate used
    txRef:    { type: String, required: true },   // user's bank reference / screenshot name
    status:   { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
    adminNote:{ type: String, default: '' },
  },
  { timestamps: true },
);

export default mongoose.models.RubDeposit || mongoose.model('RubDeposit', RubDepositSchema);
