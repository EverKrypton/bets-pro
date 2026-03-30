import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    key:                  { type: String, default: 'global', unique: true },
    maxBetAmount:         { type: Number, default: 50   },
    maxPotentialPayout:   { type: Number, default: 200  },
    minBetAmount:         { type: Number, default: 1    },
    autoCloseMinutes:     { type: Number, default: 30   },
    houseReserve:         { type: Number, default: 0    },
    footballDataApiKey:   { type: String, default: ''   },
    liveScoreRefreshSecs: { type: Number, default: 30   },
    rubUsdRate:           { type: Number, default: 90   }, // RUB per 1 USDT
    rubBankDetails:       { type: String, default: ''   }, // card number / bank account shown to users
  },
  { timestamps: true },
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
