import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash:     { type: String, required: true },
    username:         { type: String, default: '' },
    balance:          { type: Number, default: 0 },
    depositAddress:   { type: String, default: '' },
    depositTrackId:   { type: String, default: '' },
    role:             { type: String, enum: ['user', 'mod', 'recruiter', 'admin'], default: 'user' },
    sessionTokenHash: { type: String, default: null },
    referrerCode:     { type: String, default: null },
    myReferralCode:   { type: String, default: null, unique: true, sparse: true },
    welcomeBonusSeen: { type: Boolean, default: false },
    totalBetsVolume:  { type: Number, default: 0 },
    firstDepositDone: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
