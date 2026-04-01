# Agents.md — Foxy Cash Casino / Bets Pro

## Project Overview

**Type:** Crypto sportsbook web application
**Stack:** Next.js 15 (App Router) · MongoDB Atlas (Mongoose) · OxaPay (USDT BEP20) · TheSportsDB API · Tailwind CSS v4

## Core Functionality

A transparent-ish sports betting platform where:
1. Admin imports real matches from TheSportsDB and sets TRUE odds internally
2. Users see DISPLAY odds with configurable house margin (default 10%) baked in
3. Users deposit USDT via OxaPay static addresses, bet on matches, win/lose balances
4. Admin settles matches and approves withdrawals

## Key Architectural Decisions

- **Inverse odds system**: `displayOdd = 1 / (1/trueOdd * (1 + marginPct))` — house edge is invisible to users
- **Session auth**: SHA-256 hashed tokens stored in DB, cookie-based, `lib/session.ts`
- **Webhook HMAC**: OxaPay webhooks verified with `hmac-sha512`, key selection depends on `type` field
- **Role-based access**: `user` / `mod` / `recruiter` / `admin` roles on User model
- **Double-chance bets**: Selections can be `home`, `draw`, `away`, `1x`, `x2`, `12`

## Environment Variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `OXAPAY_MERCHANT_API_KEY` | Deposit webhooks + static address generation |
| `OXAPAY_PAYOUT_API_KEY` | Withdrawal payout generation |
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
│   │   ├── withdraw/{approve,pending}/ — Admin withdrawal management
│   │   ├── users/         — GET users list
│   │   ├── settings/      — GET/PATCH global settings
│   │   ├── exposure/      — GET liability exposure per match
│   │   ├── autoclose/     — Auto-close matches after X minutes
│   │   ├── rub/           — RUB deposit management
│   │   └── applications/  — Influencer applications
│   ├── livescores/        — GET live scores from TheSportsDB
│   ├── notifications/{read}/ — GET/mark notifications
│   └── support/[id]/       — Support tickets

lib/
├── db.ts          — MongoDB connection singleton
├── session.ts     — Cookie session helpers (getSessionUser, hashSessionToken)
├── password.ts    — scrypt hash/verify helpers
├── sports.ts      — TheSportsDB API + odds margin calculation
├── oxapay.ts      — OxaPay static address + payout API wrappers
└── utils.ts      — General utilities (cn, etc.)

models/
├── User.ts         — email, passwordHash, balance, role, referrerCode, myReferralCode
├── Match.ts        — teams, odds (true/display), status, result, marginPct, moneyBack
├── Bet.ts          — userId, amount, multiplier, payout, status, selection
├── Transaction.ts  — userId, type (deposit/withdraw/bet/win/referral), amount, status
├── Application.ts  — Influencer job applications
├── Settings.ts     — Global settings (maxBetAmount, minBetAmount, autoCloseMinutes, etc.)
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
- `apiId`: TheSportsDB event ID
- `homeTeam`, `awayTeam`, `homeBadge`, `awayBadge`, `league`, `date`, `time`, `venue`
- `trueOdds`: `{ home, draw, away }` — actual probabilities
- `displayOdds`: `{ home, draw, away }` — with margin applied
- `marginPct`: house margin (e.g. 0.10 for 10%)
- `status`: `pending` | `open` | `closed` | `settled`
- `result`: `home` | `draw` | `away` | null
- `moneyBack`: if true, losing bets get stake refunded on settle

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

1. **Match import flow**: Admin selects league → clicks Import → fetches next match from TheSportsDB → sets true odds + margin → opens for betting
2. **Bet settlement**: When admin settles a match, all pending bets are processed — winners get `amount * multiplier` credited, losers lose their stake. If `moneyBack` is true, losers get refund.
3. **Double chance odds**: When setting true odds for a match, the display odds for double chance combinations (`1x`, `x2`, `12`) are calculated client-side in the sports page from the three-way odds.
4. **Auto-close**: If `autoCloseMinutes` is set in Settings, matches automatically close for betting X minutes after scheduled start time.
5. **Exposure tracking**: Admin can see total potential liability per open match (sum of all pending bets * their odds).
