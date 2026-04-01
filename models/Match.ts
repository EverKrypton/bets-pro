import mongoose from 'mongoose';

const OddsSchema = new mongoose.Schema(
  { home: { type: Number, default: null }, draw: { type: Number, default: null }, away: { type: Number, default: null } },
  { _id: false },
);

// Goal betting odds
const GoalOddsSchema = new mongoose.Schema(
  {
    // Team goals - Over/Under
    homeOver05: { type: Number, default: null },  // Home scores 1+ goals
    homeOver15: { type: Number, default: null },  // Home scores 2+ goals
    homeUnder05: { type: Number, default: null }, // Home scores 0 goals
    awayOver05: { type: Number, default: null },  // Away scores 1+ goals
    awayOver15: { type: Number, default: null },  // Away scores 2+ goals
    awayUnder05: { type: Number, default: null }, // Away scores 0 goals
    // Total goals
    totalOver15: { type: Number, default: null }, // Total 3+ goals
    totalOver25: { type: Number, default: null }, // Total 3+ goals
    totalUnder15: { type: Number, default: null }, // Total 0-1 goals
    totalUnder25: { type: Number, default: null }, // Total 0-2 goals
    // Both teams to score
    bttsYes: { type: Number, default: null }, // Both teams score
    bttsNo: { type: Number, default: null },  // At least one team doesn't score
  },
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
    goalOdds:    { type: GoalOddsSchema, default: () => ({}) },
    status:      { type: String, enum: ['pending','open','closed','settled'], default: 'pending' },
    result:      { type: String, enum: ['home','draw','away',null], default: null },
    // Match result for goal bets
    homeScore:   { type: Number, default: null },
    awayScore:   { type: Number, default: null },
    // Money-back: if enabled, losing bettors get their stake refunded automatically on settle
    moneyBack:   { type: Boolean, default: true },
  },
  { timestamps: true, autoIndex: false },
);

MatchSchema.index({ status: 1, date: 1 });

export default mongoose.models.Match || mongoose.model('Match', MatchSchema);
