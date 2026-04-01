# Agents.md — Bets Pro

## Project Overview

**Type:** Crypto sportsbook web application
**Stack:** Next.js 15 (App Router) · MongoDB Atlas (Mongoose) · OxaPay (deposits) · Custom BEP20 (withdrawals) · football-data.org API · Tailwind CSS v4

## Core Functionality

A transparent sports betting platform where:
1. Admin imports real matches from football-data.org and sets TRUE odds internally
2. Users see DISPLAY odds with configurable house margin (default 10%) baked in
3. Users deposit USDT via OxaPay (auto-withdraw to admin wallet), bet on matches, win/lose balances
4. Admin settles matches and approves withdrawals (sent via custom BEP20 module)

## Key Architectural Decisions

- **Inverse odds system**: `displayOdd = 1 / (1/trueOdd * (1 + marginPct))` — house edge is invisible to users
- **Session auth**: SHA-256 hashed tokens stored in DB, cookie-based, `lib/session.ts`
- **Webhook HMAC**: OxaPay webhooks verified with `hmac-sha512`
- **Role-based access**: `user` / `mod` / `recruiter` / `admin` roles on User model
- **Double-chance bets**: Selections can be `home`, `draw`, `away`, `1x`, `x2`, `12`
- **moneyBack**: All matches default to refund losing bets (u91-style inverse betting)

## Payment Architecture

### Deposits (OxaPay)
- OxaPay generates static BEP20 addresses for each user
- Funds auto-withdraw to admin OxaPay wallet (0% deposit fee)
- Webhook at `/api/webhook/oxapay` credits user balance

### Withdrawals (Custom BEP20)
- Admin's BEP20 wallet sends USDT directly to users
- Uses `lib/bep20.ts` with ethers.js
- Private key stored ONLY in environment variables (never in DB)
- Admin approves withdrawals in admin panel → system sends BEP20 transfer

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
├── sports/page.tsx          — Public sportsbook + bet slip
├── wallet/page.tsx          — Deposit / Withdraw / Transaction history
├── referrals/page.tsx       — Referral link + stats
├── login/page.tsx           — Login form
├── register/page.tsx         — Registration form
├── careers/page.tsx         — Influencer application form
├── support/page.tsx         — Support ticket form
├── api/
│   ├── auth/{login,logout,me,change-password}/   — Auth endpoints
│   ├── bet/place/         — POST place a bet
│   ├── bets/{recent}/      — GET bet history
│   ├── matches/            — GET open matches (display odds only)
│   ├── deposit/{create,rub}/ — USDT deposit / RUB deposit
│   ├── withdraw/request/  — POST request withdrawal
│   ├── transactions/       — GET user transaction history
│   ├── referral/{stats,validate}/ — GET referral stats / validate code
│   ├── webhook/oxapay/     — POST OxaPay webhook handler
│   ├── admin/
│   │   ├── matches/[id]/   — PATCH odds, POST settle, DELETE match
│   │   ├── withdraw/{approve,pending}/ — Admin withdrawal management (uses BEP20)
│   │   ├── users/         — GET users list
│   │   ├── settings/      — GET/PATCH global settings
│   │   ├── exposure/      — GET liability exposure per match
│   │   ├── autoclose/     — Auto-close matches after X minutes
│   │   ├── rub/           — RUB deposit management
│   │   └── applications/  — Influencer applications
│   ├── livescores/        — GET live scores from football-data.org
│   ├── notifications/{read}/ — GET/mark notifications
│   └── support/[id]/       — Support tickets

lib/
├── db.ts          — MongoDB connection singleton
├── session.ts     — Cookie session helpers (getSessionUser, hashSessionToken)
├── password.ts    — scrypt hash/verify helpers
├── sports.ts      — football-data.org league codes
├── oxapay.ts      — OxaPay deposit API only
├── bep20.ts      — Custom BEP20 payout module (withdrawals)
└── utils.ts      — General utilities (cn, etc.)

models/
├── User.ts         — email, passwordHash, balance, role, referrerCode, myReferralCode
├── Match.ts        — teams, odds (true/display), status, result, marginPct, moneyBack
├── Bet.ts          — userId, amount, multiplier, payout, status, selection
├── Transaction.ts  — userId, type (deposit/withdraw/bet/win/referral), amount, status
├── Application.ts  — Influencer job applications
├── Settings.ts     — Global settings (minDepositAmount, maxBetAmount, etc.)
├── Notification.ts — User notifications
├── RubDeposit.ts   — RUB deposit records
├── Ticket.ts       — Support tickets
```

## Data Models

### User
- `email`, `passwordHash`, `username`, `balance`
- `role`: `user` | `mod` | `recruiter` | `admin`
- `referrerCode`: code used when they registered
- `myReferralCode`: unique referral code for this user

### Match
- `apiId`: football-data.org event ID
- `homeTeam`, `awayTeam`, `homeBadge`, `awayBadge`, `league`, `date`, `time`, `venue`
- `trueOdds`: `{ home, draw, away }` — actual probabilities
- `displayOdds`: `{ home, draw, away }` — with margin applied
- `marginPct`: house margin (e.g. 0.10 for 10%)
- `status`: `pending` | `open` | `closed` | `settled`
- `result`: `home` | `draw` | `away` | null
- `moneyBack`: if true, losing bets get stake refunded on settle (default: true)

### Bet
- `userId`, `amount`, `multiplier`, `payout`
- `status`: `pending` | `won` | `lost` | `refunded`
- `matchId`, `selection`: `home` | `draw` | `away` | `1x` | `x2` | `12`
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
2. **Bet settlement**: When admin settles a match, all pending bets are processed — winners get `amount * multiplier` credited, losers get refund if `moneyBack` is true.
3. **Double chance odds**: Display odds for double chance combinations (`1x`, `x2`, `12`) are calculated client-side in the sports page from the three-way odds.
4. **Auto-close**: If `autoCloseMinutes` is set in Settings, matches automatically close for betting X minutes after scheduled start time.
5. **Exposure tracking**: Admin can see total potential liability per open match (sum of all pending bets * their odds).
6. **BEP20 Withdrawals**: Uses `lib/bep20.ts` - admin private key in env vars only, transactions signed locally via ethers.js
7. **moneyBack default**: All new matches have `moneyBack: true` - losers get stake refunded when admin settles.
