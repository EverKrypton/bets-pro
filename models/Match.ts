import mongoose from 'mongoose';

const OddsSchema = new mongoose.Schema(
  { home: { type: Number, default: null }, draw: { type: Number, default: null }, away: { type: Number, default: null } },
  { _id: false },
);

const MatchSchema = new mongoose.Schema(
  {
    apiId:       { type: String, default: null },
    homeTeam:    { type: String, required: true },
    awayTeam:    { type: String, required: true },
    homeBadge:   { type: String, default: '' },
    awayBadge:   { type: String, default: '' },
    league:      { type: String, default: '' },
    date:        { type: String, default: '' },
    time:        { type: String, default: 'TBD' },
    venue:       { type: String, default: '' },
    trueOdds:    { type: OddsSchema, default: () => ({}) },
    marginPct:   { type: Number, default: 0 },
    displayOdds: { type: OddsSchema, default: () => ({}) },
    status:      { type: String, enum: ['pending','open','closed','settled'], default: 'pending' },
    result:      { type: String, enum: ['home','draw','away',null], default: null },
    // Money-back: if enabled, losing bettors get their stake refunded automatically on settle
    moneyBack:   { type: Boolean, default: true },
  },
  { timestamps: true, autoIndex: false },
);

MatchSchema.index({ status: 1, date: 1 });

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
