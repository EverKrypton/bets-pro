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
    apiId:      { type: String, default: null },
    homeTeam:   { type: String, required: true },
    awayTeam:   { type: String, required: true },
    league:     { type: String, default: '' },
    date:       { type: String, default: '' },
    time:       { type: String, default: 'TBD' },
    venue:      { type: String, default: '' },
    // True odds set by admin — never exposed to users
    trueOdds:   { type: OddsSchema, default: () => ({}) },
    // House margin percentage applied on top of true odds
    marginPct:  { type: Number, default: 10 },
    // Display odds shown to users (trueOdds with margin applied)
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
  { timestamps: true },
);

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
