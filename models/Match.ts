import mongoose from 'mongoose';

const OddsSchema = new mongoose.Schema(
  {
    home: { type: Number, default: null },
    draw: { type: Number, default: null },
    away: { type: Number, default: null },
  },
  { _id: false },
);

const MatchSchema = new mongoose.Schema(
  {
    apiId:       { type: String, default: null },   // TheSportsDB event ID — no unique index
    homeTeam:    { type: String, required: true },
    awayTeam:    { type: String, required: true },
    league:      { type: String, default: '' },
    date:        { type: String, default: '' },
    time:        { type: String, default: 'TBD' },
    venue:       { type: String, default: '' },
    trueOdds:    { type: OddsSchema, default: () => ({}) },
    marginPct:   { type: Number, default: 0 },
    displayOdds: { type: OddsSchema, default: () => ({}) },
    status: {
      type:    String,
      enum:    ['pending', 'open', 'closed', 'settled'],
      default: 'pending',
    },
    result: {
      type:    String,
      enum:    ['home', 'draw', 'away', null],
      default: null,
    },
  },
  {
    timestamps: true,
    // Explicitly tell Mongoose NOT to auto-create indexes on this model
    autoIndex: false,
  },
);

// Only index we want — non-unique so duplicates are handled in code
MatchSchema.index({ status: 1, date: 1 });

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
