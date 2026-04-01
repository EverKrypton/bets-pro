# Bets Pro - Tasks Tracking

## Completed Tasks

### 2024-04-01: Financial Summary Dashboard for Active Bets

**Status: DONE**

Created a comprehensive financial summary for users to see their active bets at a glance.

#### What was implemented:

1. **New API Endpoint: `/api/bets/stats`** (`app/api/bets/stats/route.ts`)
   - Calculates user's pending bets statistics
   - Returns:
     - `totalStaked`: Total amount in pending bets
     - `pendingCount`: Number of pending bets
     - `distribution.byResult`: Amounts on Home/Draw/Away/DoubleChance
     - `distribution.byType`: Amounts on Results vs Goals bets
     - `scenarios.homeWins/draw/awayWins`: Potential payout and profit for each outcome
     - `worstCase`: Worst case profit/loss scenario

2. **Updated Dashboard: `app/page.tsx`**
   - Added new "Active Bets Summary" section
   - Shows:
     - Total in Play (USDT)
     - Distribution by Result (Home/Draw/Away/DC)
     - Distribution by Bet Type (Results/Goals)
     - Potential Outcome for each scenario (Home Win/Draw/Away Win)
     - Worst Case scenario with profit/loss

#### Files created/modified:
- `app/api/bets/stats/route.ts` (NEW)
- `app/page.tsx` (MODIFIED)

---

### 2024-04-01: Remove moneyBack Default & Add Treasury Wallet

**Status: DONE**

Fixed the inverse betting system so the owner can actually profit, and added automatic fee transfer to treasury wallet.

#### Problem Analysis:

With `moneyBack: true` (previous default):
- Winners: Owner PAYS `stake × odds` → **OWNER LOSES**
- Losers: Users get stake refunded → **OWNER GETS ZERO**
- **Result: Owner can NEVER profit, only lose**

The inverse odds margin alone provides the house edge. No need for moneyBack.

#### What was implemented:

1. **Changed `moneyBack` default from `true` to `false`** (`models/Match.ts`)
   - Admin can still enable it per-match for promotions
   - Default now means: losers lose their stake (house wins)

2. **Added Treasury Wallet System** (`models/Settings.ts`)
   - New field: `treasuryWalletAddress` (BEP20 address)
   - Configured in Admin Settings

3. **Automatic Fee Transfer** (`app/api/admin/withdraw/approve/route.ts`)
   - On withdrawal approval: sends user amount, then $1 USDT to treasury
   - Uses new `sendToTreasury()` function in `lib/bep20.ts`

4. **New BEP20 Functions** (`lib/bep20.ts`)
   - `sendToTreasury(amount, address)`: Send USDT to treasury wallet
   - `getAdminBNBBalance()`: Check BNB balance for gas

5. **Admin Settings UI** (`app/admin/page.tsx`)
   - Treasury wallet input field in Settings tab
   - Shows truncated address in summary
   - Warning if not configured

#### Files modified:
- `models/Match.ts` - moneyBack default changed
- `models/Settings.ts` - added treasuryWalletAddress
- `lib/bep20.ts` - added sendToTreasury, getAdminBNBBalance
- `app/api/admin/withdraw/approve/route.ts` - auto-send fee to treasury
- `app/api/admin/settings/route.ts` - handle treasuryWalletAddress
- `app/admin/page.tsx` - treasury wallet UI

#### Important Notes:

- **BSC Gas**: Paid in BNB from admin wallet (~$0.06/transaction)
- **Treasury fee**: $1 USDT per withdrawal
- **BNB Balance**: Admin must keep BNB for gas (check with `getAdminBNBBalance()`)
- Set `TREASURY_WALLET_ADDRESS` in Settings or the fee stays in system

---

### 2024-04-01: Fix OxaPay Integration for Deposit Addresses

**Status: DONE**

Fixed the OxaPay deposit address generation that was failing for new users.

#### Problem:
- The `oxapay` npm package has a bug where it tries to read `methodInfos.json` from `__dirname`
- In Next.js production builds, this path doesn't work (`ENOENT: no such file or directory`)
- New users couldn't get deposit addresses

#### Solution:
- Replaced the buggy `oxapay` package with direct HTTP calls using `axios`
- Direct API calls to `https://api.oxapay.com/v1/payment/staticaddress`
- No bundled JSON files needed

#### Files modified:
- `lib/oxapay.ts` - Complete rewrite using direct axios HTTP calls

#### Important:
- `NEXT_PUBLIC_APP_URL` must be set for callback URL
- Callback URL: `{NEXT_PUBLIC_APP_URL}/api/webhook/oxapay`

---

## Pending Tasks

### Future Enhancements (Not yet started)

- [ ] Add bet history filtering by date range
- [ ] Add export functionality for bet history
- [ ] Add live odds comparison
- [ ] Implement cash-out feature for pending bets
- [ ] Add push notifications for bet results
- [ ] Create admin analytics dashboard charts
- [ ] Add multi-bet (parlay) support
- [ ] Admin panel to check BNB gas balance
- [ ] Auto-alert when admin BNB balance is low

---

## Notes

- This file tracks progress when offline connection is not available
- Update status markers: `[x]` for completed, `[ ]` for pending
- Update this file after completing each major feature