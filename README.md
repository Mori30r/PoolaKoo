# PoolaKoo — Wealth & Crypto Dashboard

Local-first personal wealth tracker. All data lives in your browser's
localStorage. Dark theme only. Every manual amount field (deposits,
withdrawals, airdrop costs, recurring income, basket balances) accepts
either USD or Toman and stores everything internally as USD.

DeFi positions are their own page and each one connects to a specific
wallet basket (Hot or Cold Wallet) — add a wallet first, then a DeFi
position referencing it.

Wallet and DeFi balances are entered manually via Deposit/Withdraw — there's
no live balance/PnL syncing in this build.

## Setup

```bash
npm install
```

## Run locally

```bash
npm run dev
```
Open the URL Vite prints (usually http://localhost:5173). Everything works
with plain `vite dev` now — the only serverless function left is
`/api/usdt.js` (the live USDT→IRT rate lookup), which needs `vercel dev`
instead if you want to test that specific button locally:

```bash
npm install -g vercel
vercel dev
```

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to Vercel

**Option A — CLI**
```bash
npm install -g vercel
vercel
```
Vercel auto-detects the Vite preset and picks up `api/usdt.js` automatically.
No environment variables are required.

**Option B — GitHub import**
1. Push this folder to a new GitHub repo.
2. vercel.com → New Project → import the repo → Deploy.

## Notes
- **USDT→IRT rate** comes from zipodo.ir via `/api/usdt.js`, which
  normalizes whatever field name that API returns (undocumented shape, so
  it scans for a plausible price field). If it ever guesses wrong, the
  manual rate field in Settings is the reliable fallback.
- Want live wallet balances/DeFi/PnL back (e.g. via CoinStats)? That's a
  bigger addition — a serverless proxy that keeps the API key server-side,
  same pattern as `/api/usdt.js`. Ask and it can be re-added.
