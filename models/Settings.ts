import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    key:                  { type: String, default: 'global', unique: true },
    maxBetAmount:         { type: Number, default: 50   },
    maxPotentialPayout:   { type: Number, default: 200  },
    minBetAmount:         { type: Number, default: 1    },
    autoCloseMinutes:     { type: Number, default: 30   },
    houseReserve:         { type: Number, default: 0    },
    footballDataApiKey:   { type: String, default: ''   }, // football-data.org free API key
    liveScoreRefreshSecs: { type: Number, default: 30   }, // how often front-end polls
  },
  { timestamps: true },
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
