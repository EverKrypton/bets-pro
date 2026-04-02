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
    rubUsdRate:           { type: Number, default: 90   },
    rubBankDetails:       { type: String, default: ''   },
    minDepositAmount:     { type: Number, default: 10   },
    minWithdrawAmount:    { type: Number, default: 10   },
    maxWithdrawAmount:    { type: Number, default: 10000 },
    withdrawFee:          { type: Number, default: 1    },
    treasuryWalletAddress:{ type: String, default: ''   },
  },
  { timestamps: true },
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
