# Foxy Cash Casino — Crypto Sportsbook

Next.js 15 · MongoDB Atlas · OxaPay · USDT BEP20 · TheSportsDB (free, no key)

Updated: 2026-04-01

---

## Stack

| Layer      | Tech                                      |
|------------|-------------------------------------------|
| Frontend   | Next.js 15, Tailwind CSS v4, Motion       |
| Backend    | Next.js API Routes (App Router)           |
| Database   | MongoDB Atlas (Mongoose)                  |
| Payments   | OxaPay v1 — USDT BEP20 deposits & payouts|
| Sports API | TheSportsDB (free, no API key needed)     |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your values
cp .env.example .env.local

# 3. Run dev server
npm run dev
```

---

## Environment Variables

| Variable                    | Description                                          |
|-----------------------------|------------------------------------------------------|
| `MONGODB_URI`               | MongoDB Atlas connection string                      |
| `OXAPAY_MERCHANT_API_KEY`   | OxaPay Merchant key (deposits + webhook HMAC)        |
| `OXAPAY_PAYOUT_API_KEY`     | OxaPay Payout key (withdrawals + webhook HMAC)       |
| `NEXT_PUBLIC_APP_URL`       | Your public URL (used for OxaPay callback_url)       |
| `ADMIN_EMAIL`               | Email that auto-promotes to admin on first login     |

---

## Features

- **Auth** — Register/Login with email + password (no email verification)
- **Sportsbook** — Real matches from TheSportsDB API (La Liga, Premier League, Bundesliga, Serie A, Champions League, MLS)
- **Inverse odds** — Admin sets TRUE odds internally; users see display odds with configurable house margin (default 10%) applied automatically
- **Deposits** — USDT BEP20 static address via OxaPay. Minimum: 10 USDT
- **Withdrawals** — Manual admin approval → OxaPay payout. Minimum: 10 USDT. Fee: 1 USDT
- **Referral system** — 5% bonus on any deposit; 30% if deposit ≥ 100 USDT
- **Webhook** — HMAC-SHA512 verified. Handles deposits (static_address) and payouts

---

## Admin Workflow

1. Log in with the email set in `ADMIN_EMAIL`
2. Go to `/admin` → **Matches** tab
3. Select a league → click **Import** to fetch the next real match from TheSportsDB
4. Click **Odds** on the match → enter your TRUE odds + house margin % → set status to **Open** → Save
5. Users can now see display odds and place bets on `/sports`
6. When the match ends → set status to **Closed** (no more bets)
7. Click **Settle** → select the result (home / draw / away) → confirm
8. Winners are paid out automatically from their balance. Losers' stakes are kept.
9. Pending withdrawals appear in the **Withdrawals** tab → Approve (sends via OxaPay) or Reject (refunds user)

---

## Inverse Odds Explained

The system is transparent internally but opaque to users:

```
trueOdd  = 2.00  (what the real probability suggests)
margin   = 10%
implied  = 1 / 2.00 = 0.50
margined = 0.50 * 1.10 = 0.55
display  = 1 / 0.55 = 1.82   ← what the user sees
```

The house edge is baked into every displayed odd. Users always bet at worse-than-fair odds.

---

## OxaPay Webhook

**IMPORTANT**: Configure BOTH of these for webhooks to work:

### 1. OxaPay Dashboard Configuration
1. Go to https://app.oxapay.com/merchant-service
2. Create or edit your Merchant API key
3. In **Advanced Options**, set the **Callback URL** to:
   ```
   https://your-domain.com/api/webhook/oxapay
   ```
4. Save the configuration

### 2. Environment Variables
Ensure these are set in your Vercel/hosting environment:
- `OXAPAY_MERCHANT_API_KEY` — Your OxaPay merchant key
- `OXAPAY_PAYOUT_API_KEY` — Your OxaPay payout key (for withdrawals)
- `NEXT_PUBLIC_APP_URL` — Your app's public URL

### 3. Webhook Endpoint
The webhook handler is at `/api/webhook/oxapay` and accepts POST requests with HMAC-SHA512 verification.

**Webflow flow:**
1. OxaPay sends POST to your callback URL with payment data
2. Your server validates HMAC signature using your merchant key
3. On success, user balance is credited automatically
4. Welcome bonus is created for first deposits ≥ $100

**Supported payment types:** `invoice`, `white_label`, `static_address`, `payment_link`, `donation`, `payment`

**Supported statuses:** `Paid`, `Completed`, `Confirmed` (case-insensitive)

**Troubleshooting:**
- Check Vercel/Netlify logs for `[OxaPay]` entries
- Verify `NEXT_PUBLIC_APP_URL` matches your deployment URL
- Ensure callback URL is accessible (no auth blocking `/api/webhook/oxapay`)
- Test with webhook.site to verify OxaPay is sending webhooks

---

## Project Structure

```
app/
  admin/          ← Admin panel (matches, odds, settle, withdrawals)
  sports/         ← Public sportsbook + bet slip
  wallet/         ← Deposit / Withdraw / History
  referrals/      ← Referral link + stats
  login/
  register/
  api/
    admin/
      matches/    ← GET all, POST import from TheSportsDB
      matches/[id]← PATCH set odds, POST settle, DELETE
      withdraw/
        approve/  ← Admin approve or reject withdrawal
        pending/  ← List pending withdrawals
    auth/         ← POST register
    auth/login/   ← POST login
    auth/logout/  ← POST logout
    auth/me/      ← GET current user
    bet/place/    ← POST place sports bet
    bets/         ← GET user's bet history
    deposit/create/← POST get USDT deposit address
    matches/      ← GET open matches (display odds only)
    transactions/ ← GET user's transaction history
    withdraw/request/ ← POST request withdrawal
    webhook/oxapay/   ← POST OxaPay webhook

lib/
  db.ts           ← MongoDB connection
  oxapay.ts       ← OxaPay API (USDT BEP20)
  password.ts     ← scrypt hash/verify
  session.ts      ← Cookie session
  sports.ts       ← TheSportsDB + odds margin calculation

models/
  User.ts
  Match.ts
  Bet.ts
  Transaction.ts

components/
  Layout.tsx
  Mascot.tsx
```
