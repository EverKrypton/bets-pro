# Bets Pro — Inverse Sportsbook Platform

## Overview

Bets Pro is a crypto sportsbook platform built with Next.js 15, MongoDB Atlas, and USDT BEP20 payments. The platform implements a **unique inverse betting system** similar to u91, where losing bettors get their stakes refunded.

---

## What is Inverse Betting (Money Back)?

### The u91 Model

Traditional sportsbooks keep the stakes of losing bettors. Inverse betting flips this model:

| Traditional Sportsbook | Inverse Betting (Bets Pro) |
|------------------------|----------------------------|
| Winners: stake × odds | Winners: stake × odds |
| Losers: lose entire stake | Losers: **get stake refunded** |
| House profit: all losing stakes | House profit: **odds margin only** |
| High risk for bettors | Low risk for bettors |

### How It Works

1. **User places a bet** on any market (match result, goals, BTTS, etc.)
2. **If the bet wins**: User receives `stake × odds` (same as traditional)
3. **If the bet loses**: User gets their **stake refunded** (money back)

This creates a safer betting environment where users only risk the potential winnings, not their principal.

---

## Betting Markets

### 1. Match Result (1X2)

| Selection | Description |
|-----------|-------------|
| `home` (1) | Home team wins |
| `draw` (X) | Match ends in a draw |
| `away` (2) | Away team wins |
| `1X` | Home win OR draw |
| `X2` | Draw OR away win |
| `12` | Home win OR away win (no draw) |

### 2. Team Goals (Over/Under 0.5)

| Selection | Description | Win Condition |
|-----------|-------------|---------------|
| `homeOver05` | Home team scores 1+ goals | Home score ≥ 1 |
| `homeOver15` | Home team scores 2+ goals | Home score ≥ 2 |
| `homeUnder05` | Home team scores 0 goals | Home score = 0 |
| `awayOver05` | Away team scores 1+ goals | Away score ≥ 1 |
| `awayOver15` | Away team scores 2+ goals | Away score ≥ 2 |
| `awayUnder05` | Away team scores 0 goals | Away score = 0 |

### 3. Total Goals (Over/Under)

| Selection | Description | Win Condition |
|-----------|-------------|---------------|
| `totalOver15` | Total goals ≥ 2 | Home + Away ≥ 2 |
| `totalOver25` | Total goals ≥ 3 | Home + Away ≥ 3 |
| `totalUnder15` | Total goals ≤ 1 | Home + Away ≤ 1 |
| `totalUnder25` | Total goals ≤ 2 | Home + Away ≤ 2 |

### 4. Both Teams to Score (BTTS)

| Selection | Description | Win Condition |
|-----------|-------------|---------------|
| `bttsYes` | Both teams score | Home ≥ 1 AND Away ≥ 1 |
| `bttsNo` | At least one team doesn't score | Home = 0 OR Away = 0 |

---

## Odds System

### Display Odds Formula

The system uses transparent odds internally but shows adjusted odds to users:

```
displayOdds = 1 / ((1 / trueOdds) × (1 + margin))

Example:
  trueOdds = 2.00
  margin = 10% (0.10)
  
  implied = 1 / 2.00 = 0.50
  margined = 0.50 × 1.10 = 0.55
  displayOdds = 1 / 0.55 = 1.82
```

The house edge is built into every displayed odd. Users always bet at worse-than-fair odds.

### Money Back Default

All matches have `moneyBack: true` by default. This means:
- **Winners**: Get `stake × odds` credited to balance
- **Losers**: Get `stake` refunded to balance (no profit, no loss)

---

## Settlement Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MATCH SETTLEMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Admin inputs:                                               │
│  - Match result (home/draw/away)                             │
│  - Final score (home goals, away goals)                      │
│                                                              │
│  For each pending bet:                                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Check Bet Type                                       │   │
│  │                                                       │   │
│  │  Result bets (home/draw/away/1x/x2/12):              │   │
│  │    → Compare selection with match result             │   │
│  │                                                       │   │
│  │  Goal bets (over/under/BTTS):                        │   │
│  │    → Evaluate using final scores                     │   │
│  │    → homeOver05: homeScore >= 1                      │   │
│  │    → bttsYes: homeScore >= 1 && awayScore >= 1       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Payout Logic                                         │   │
│  │                                                       │   │
│  │  if (bet wins):                                      │   │
│  │    payout = stake × odds                             │   │
│  │    status = 'won'                                    │   │
│  │                                                       │   │
│  │  else if (moneyBack enabled):                       │   │
│  │    payout = stake (refund)                           │   │
│  │    status = 'refunded'                               │   │
│  │                                                       │   │
│  │  else:                                               │   │
│  │    payout = 0                                        │   │
│  │    status = 'lost'                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Live Scores

The platform displays real-time scores for ongoing matches:

1. **API**: football-data.org provides live match data
2. **Refresh**: Configurable (default: every 30 seconds)
3. **Display**: Shows current score and minute for live matches
4. **Visual**: Goals animate with a "bump" effect when scores change

---

## User Flow

### Betting Flow

```
1. User navigates to /sports
2. Sees list of open matches with odds
3. Expands match to see all betting options:
   - Match Result (1X2 + Double Chance)
   - Team Goals (Over/Under 0.5/1.5)
   - Total Goals (Over/Under 1.5/2.5)
   - BTTS (Yes/No)
4. Selects bet, enters stake
5. Confirms bet → stake deducted from balance
6. Waits for match to complete
7. On settlement:
   - Win: Receives stake × odds
   - Lose (moneyBack=true): Receives stake back
   - Lose (moneyBack=false): Loses stake
```

### Money Back Badge

Matches with `moneyBack: true` display a green "Money Back" badge, informing users that their stake is protected.

---

## Technical Architecture

### Database Models

```
User
├── email, passwordHash, username
├── balance (USDT)
├── role: user | mod | recruiter | admin
├── myReferralCode
└── referrerCode

Match
├── apiId (football-data.org ID)
├── homeTeam, awayTeam, homeBadge, awayBadge
├── league, date, time, venue
├── trueOdds: { home, draw, away }
├── displayOdds: { home, draw, away }
├── goalOdds: {
│   homeOver05, homeOver15, homeUnder05,
│   awayOver05, awayOver15, awayUnder05,
│   totalOver15, totalOver25, totalUnder15, totalUnder25,
│   bttsYes, bttsNo
│ }
├── status: pending | open | closed | settled
├── result: home | draw | away | null
├── homeScore, awayScore
└── moneyBack: boolean (default: true)

Bet
├── userId, matchId
├── amount, multiplier, payout
├── status: pending | won | lost | refunded
├── selection: home | draw | away | 1x | x2 | 12 |
│              homeOver05 | homeOver15 | homeUnder05 |
│              awayOver05 | awayOver15 | awayUnder05 |
│              totalOver15 | totalOver25 |
│              totalUnder15 | totalUnder25 |
│              bttsYes | bttsNo
└── details: { homeTeam, awayTeam, league, selection, odd }
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/matches` | GET | List open matches |
| `/api/bet/place` | POST | Place a bet |
| `/api/bets` | GET | User's bet history |
| `/api/livescores` | GET | Current live scores |
| `/api/admin/matches` | GET/POST | Admin: list/import matches |
| `/api/admin/matches/[id]` | PATCH/POST/DELETE | Admin: odds/settle/delete |
| `/api/admin/exposure` | GET | Admin: liability tracking |

---

## Revenue Model

With `moneyBack: true` on all matches:

| Outcome | User Gets | House Gets |
|---------|-----------|------------|
| Bet Wins | stake × odds | Pays winner |
| Bet Loses | stake back | Keeps odds margin |

The house profit comes from the margin baked into odds:
- Users bet at1.82 instead of 2.00 (10% margin example)
- Winners get slightly less than fair payout
- Losers get full stake back
- House keeps the difference on winning bets only

---

## Security

- **Authentication**: Session-based with SHA-256 hashed tokens
- **Passwords**: scrypt hashing with salt
- **Webhooks**: HMAC-SHA512 signature verification
- **Admin**: Role-based access control (user < mod < admin)
- **Keys**: BEP20 private key stored in env vars only

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB Atlas connection |
| `OXAPAY_MERCHANT_API_KEY` | Deposit address generation |
| `FOOTBALL_DATA_API_KEY` | Match imports & live scores |
| `BEP20_ADMIN_PRIVATE_KEY` | Withdrawal signing (NEVER commit) |
| `BNB_RPC_URL` | BNB Smart Chain RPC |
| `NEXT_PUBLIC_APP_URL` | OxaPay callback URL |
| `ADMIN_EMAIL` | Auto-promote to admin |

---

## Development

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
```

---

## License

Proprietary — All rights reserved.