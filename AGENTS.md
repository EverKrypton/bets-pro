# Agents.md — Bets Pro

## Project Overview

**Type:** Crypto sportsbook web application
**Stack:** Next.js 15 (App Router) · MongoDB Atlas (Mongoose) · OxaPay (deposits only) · Custom BEP20 (withdrawals) · football-data.org API · Tailwind CSS v4

## Core Functionality

A transparent sports betting platform where:
1. Admin imports real matches from football-data.org and sets TRUE odds internally
2. Users see DISPLAY odds with configurable house margin (default 10%) baked in
3. Users deposit USDT via OxaPay static addresses, bet on matches, win/lose balances
4. Users can also play "Inverse Betting" (bet against outcomes) in Games section
5. Welcome bonus system rewards first depositors (up to 50% bonus claimable after meeting requirements)
6. Admin settles matches and approves withdrawals (sent via custom BEP20 module)

## Key Architectural Decisions

- **Inverse odds system**: `displayOdd = 1 / (1/trueOdd * (1 + marginPct))` — house edge is invisible to users
- **Inverse betting odds**: `inverseOdd = displayOdd / (displayOdd - 1)` — same house edge
- **Session auth**: SHA-256 hashed tokens stored in DB, cookie-based, `lib/session.ts`
- **Webhook HMAC**: OxaPay webhooks verified with `hmac-sha512` (case-insensitive)
- **Role-based access**: `user` / `mod` / `recruiter` / `admin` roles on User model
- **Double-chance bets**: Selections can be `home`, `draw`, `away`, `1x`, `x2`, `12`
- **moneyBack**: Matches default to `false` - losers lose their stake (house wins)

## Payment Architecture

### Deposits (OxaPay)
- OxaPay generates static BEP20 addresses for each user
- Funds auto-withdraw to admin OxaPay wallet (0% deposit fee)
- Webhook at `/api/webhook/oxapay` credits user balance
- Welcome bonus auto-created for first deposit >= $100

### Withdrawals (Custom BEP20)
- User requests withdrawal → creates pending Transaction
- Admin reviews in admin panel → approves/rejects
- On approve: BEP20 transfer sent from admin wallet
- $1 USDT fee sent to treasury wallet
- Uses `lib/bep20.ts` with ethers.js
- Private key stored ONLY in environment variables (never in DB)

## Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `OXAPAY_MERCHANT_API_KEY` | Deposit static address generation |
| `FOOTBALL_DATA_API_KEY` | Match imports & live scores (free at football-data.org) |
| `BEP20_ADMIN_PRIVATE_KEY` | Admin wallet for withdrawals (NEVER share or commit) |
| `BNB_RPC_URL` | BNB Smart Chain RPC (default: bsc-dataseed.binance.org) |
| `NEXT_PUBLIC_APP_URL` | Used for OxaPay callback_url |
| `ADMIN_EMAIL` | Auto-promoted to admin on first login |

## Directory Structure

```
app/
├── admin/page.tsx           — Admin panel (matches, odds, settle, withdrawals, users, etc.)
├── sports/page.tsx          — Public sportsbook + bet slip (normal betting)
├── games/page.tsx           — Inverse betting (bet against outcomes)
├── bonuses/page.tsx         — Welcome bonus progress and claim
├── wallet/page.tsx          — Deposit / Withdraw / Transaction history
├── referrals/page.tsx       — Referral link + stats
├── login/page.tsx           — Login form
├── register/page.tsx        — Registration form
├── careers/page.tsx         — Influencer application form
├── support/page.tsx         — Support ticket form
├── api/
│   ├── auth/{login,logout,me,change-password}/   — Auth endpoints
│   ├── bet/place/           — POST place a normal bet
│   ├── bet/inverse/         — POST place an inverse bet
│   ├── bets/                — GET bet history
│   ├── bets/inverse/        — GET inverse bet history
│   ├── bonus/               — GET bonus status, POST create bonus
│   ├── bonus/claim/         — POST claim welcome bonus
│   ├── matches/             — GET open matches (display odds only)
│   ├── deposit/create/      — Create OxaPay static address
│   ├── withdraw/request/    — POST request withdrawal
│   ├── transactions/        — GET user transaction history
│   ├── referral/{stats,validate}/ — GET referral stats / validate code
│   ├── webhook/oxapay/      — POST OxaPay webhook handler
│   ├── admin/
│   │   ├── matches/[id]/    — PATCH odds, POST settle, DELETE match
│   │   ├── withdraw/{approve,pending}/ — Admin withdrawal management (uses BEP20)
│   │   ├── users/           — GET users list
│   │   ├── settings/        — GET/PATCH global settings
│   │   ├── exposure/        — GET liability exposure per match
│   │   ├── autoclose/       — Auto-close matches after X minutes
│   │   ├── rub/             — RUB deposit management
│   │   └── applications/    — Influencer applications
│   ├── livescores/         — GET live scores from football-data.org
│   ├── notifications/{read}/ — GET/mark notifications
│   └── support/[id]/        — Support tickets

lib/
├── db.ts          — MongoDB connection singleton
├── session.ts     — Cookie session helpers (getSessionUser, hashSessionToken)
├── password.ts    — scrypt hash/verify helpers
├── sports.ts      — football-data.org league codes
├── oxapay.ts      — OxaPay deposit API (static addresses only)
├── bep20.ts       — Custom BEP20 payout module (withdrawals)
└── utils.ts       — General utilities (cn, etc.)

models/
├── User.ts         — email, passwordHash, balance, role, referrerCode, myReferralCode, welcomeBonusSeen, totalBetsVolume, firstDepositDone
├── Match.ts        — teams, odds (true/display), status, result, marginPct, moneyBack
├── Bet.ts          — userId, amount, multiplier, payout, status, selection, isInverse
├── Transaction.ts   — userId, type (deposit/withdraw/bet/win/referral/bonus), amount, status
├── Bonus.ts        — userId, type, status, firstDepositAmount, bonusAmount, bonusPercent, requirements...
├── Application.ts  — Influencer job applications
├── Settings.ts     — Global settings (minDepositAmount, maxBetAmount, treasuryWalletAddress, etc.)
├── Notification.ts — User notifications
├── RubDeposit.ts   — RUB deposit records
└── Ticket.ts       — Support tickets
```

## Data Models

### User
- `email`, `passwordHash`, `username`, `balance`
- `role`: `user` | `mod` | `recruiter` | `admin`
- `referrerCode`: code used when they registered
- `myReferralCode`: unique referral code for this user
- `welcomeBonusSeen`: whether welcome modal was shown
- `firstDepositDone`: whether first deposit was made
- `totalBetsVolume`: cumulative betting volume

### Bonus
- `userId`, `type`: 'welcome'
- `status`: 'pending' | 'eligible' | 'claimed' | 'expired'
- `firstDepositAmount`, `bonusAmount`, `bonusPercent`
- `requiredBetVolume`: $30 minimum
- `requiredReferrals`: 3 referrals with deposits
- `currentBetVolume`, `currentReferrals`: progress tracking
- `expiresAt`: 30-day expiry

### Match
- `apiId`: football-data.org event ID
- `homeTeam`, `awayTeam`, `homeBadge`, `awayBadge`, `league`, `date`, `time`, `venue`
- `trueOdds`: `{ home, draw, away }` — actual probabilities
- `displayOdds`: `{ home, draw, away }` — with margin applied
- `marginPct`: house margin (e.g. 0.10 for 10%)
- `status`: `pending` | `open` | `closed` | `settled`
- `result`: `home` | `draw` | `away` | null
- `moneyBack`: if true, losing bets get stake refunded on settle (default: false)

### Bet
- `userId`, `amount`, `multiplier`, `payout`
- `status`: `pending` | `won` | `lost` | `refunded`
- `matchId`, `selection`: `home` | `draw` | `away` | `1x` | `x2` | `12`
- `isInverse`: true for inverse bets
- `details`: additional bet info

## Lint & Typecheck Commands

```bash
npm run lint   # ESLint
npm run build  # Next.js build (includes typecheck via tsc)
```

## Coding Conventions

- **TypeScript strict mode** enabled
- **No inline comments** in code unless explicitly requested
- **Next.js App Router** with Server Components where possible
- **Tailwind CSS v4** (no config file, uses `@import "tailwindcss"`)
- **Motion** for animations (framer-motion compatible)
- **class-variance-authority + clsx + tailwind-merge** for conditional classes
- **Mongoose** for MongoDB with connection singleton in `lib/db.ts`

## Important Implementation Notes

1. **Match import flow**: Admin selects league → clicks Import → fetches from football-data.org → sets true odds + margin → opens for betting
2. **Bet settlement**: When admin settles a match, all pending bets are processed — winners get `amount * multiplier` credited, losers lose stake (or refund if `moneyBack`).
3. **Double chance odds**: Display odds for double chance combinations (`1x`, `x2`, `12`) are calculated client-side from three-way odds.
4. **Inverse bets**: Settled opposite — inverse bet on "home" wins when result is NOT "home".
5. **Auto-close**: If `autoCloseMinutes` is set in Settings, matches automatically close for betting X minutes after scheduled start.
6. **Exposure tracking**: Admin can see total potential liability per open match.
7. **BEP20 Withdrawals**: Admin private key in env vars only, transactions signed locally via ethers.js
8. **moneyBack default**: All new matches have `moneyBack: false` - house wins when bettors lose.
9. **Welcome bonus**: Auto-created on first deposit >= $100, claimable after $30 betting + 3 referral deposits.
10. **Withdrawal security**: 
    - BEP20 address validation (`/^0x[a-fA-F0-9]{40}$/`)
    - Minimum withdrawal $10, fixed $1 fee
    - Balance check before deduction
    - Admin-only approval process
    - Transaction hash stored for verification
