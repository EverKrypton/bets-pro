import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    username:         { type: String, default: '' },
    balance:          { type: Number, default: 0 },
    depositAddress:   { type: String, default: '' },
    role:             { type: String, enum: ['user', 'admin'], default: 'user' },
    sessionTokenHash: { type: String, default: null },
    // referrerCode = the code that was used when THIS user registered (who referred them)
    referrerCode:     { type: String, default: null },
    // myReferralCode = THIS user's unique invite code (shown in /referrals)
    myReferralCode:   { type: String, default: null, unique: true, sparse: true },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
