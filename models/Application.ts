import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, required: true },
    telegram:     { type: String, default: '' },
    instagram:    { type: String, default: '' },
    tiktok:       { type: String, default: '' },
    twitter:      { type: String, default: '' },
    youtube:      { type: String, default: '' },
    totalFollowers: { type: String, default: '' },
    description:  { type: String, required: true },
    motivation:   { type: String, required: true },
    status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);
