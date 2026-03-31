import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    username:         { type: String, default: '' },
    balance:          { type: Number, default: 0 },
    depositAddress:   { type: String, default: '' },
    // Roles:
    //   user      — default, can bet and deposit
    //   mod       — access to support/withdrawals/RUB deposits panel
    //   recruiter — access to job applications panel
    //   admin     — full access to everything
    role:             { type: String, enum: ['user', 'mod', 'recruiter', 'admin'], default: 'user' },
    sessionTokenHash: { type: String, default: null },
    referrerCode:     { type: String, default: null },   // code used when they registered
    myReferralCode:   { type: String, default: null, unique: true, sparse: true },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
