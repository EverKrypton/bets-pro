import mongoose from 'mongoose';

// Single document — always upserted by key "global"
const SettingsSchema = new mongoose.Schema(
  {
    key:                  { type: String, default: 'global', unique: true },
    maxBetAmount:         { type: Number, default: 50    },  // USDT per bet
    maxPotentialPayout:   { type: Number, default: 200   },  // USDT max win per bet
    minBetAmount:         { type: Number, default: 1     },  // USDT
    autoCloseMinutes:     { type: Number, default: 30    },  // minutes before match start
    houseReserve:         { type: Number, default: 0     },  // admin tracks this manually
  },
  { timestamps: true },
);

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
