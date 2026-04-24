# SHROUD

**Private recurring payments on Solana.** Shield once. Pay anyone, on any cadence, by Telegram handle. Nobody sees the schedule. Nobody sees the amount. Settlement stays publicly verifiable.

Built on [Loyal's Private Transactions SDK](https://docs.askloyal.com/sdk/private-transactions/quick-start) + [MagicBlock Private Ephemeral Rollups](https://docs.magicblock.gg/pages/private-ephemeral-rollups-pers/introduction/authorization) (Intel TDX TEE).

Submission for the **@loyal_hq mini build challenge**.

---

## The bet

Every other entry in this challenge will ship a single private `send`. That's the thing the SDK docs demo. That's not the interesting thing.

**The interesting thing is this:** once a deposit is `delegated` into PER, every subsequent `transferToUsernameDeposit` is an accounting-only balance update inside the TEE. No base-layer footprint. Which means you can tick a private transfer 52 times and, to any external chain watcher, it looks identical to a single shield + single unshield.

That's a primitive nobody on Solana has exposed yet: **recurring private payments**. Payroll, contributor stipends, ghost subscriptions, retainers — all of them leak their full schedule on-chain today, even on Elusiv/Light-style shielded tools, because those tools stop at the single transfer.

Shroud is the thin layer that turns the Loyal SDK into a schedulable, cancellable, refund-safe stream.

---

## What observers see

A 12-month weekly contributor payout via Shroud:

| Time   | Base-layer tx | Action    | Amount visible? |
|--------|---------------|-----------|-----------------|
| T+0    | 1 signature   | `shield`  | Yes             |
| T+7d   | —             | tick      | No              |
| T+14d  | —             | tick      | No              |
| ...    | —             | 50 more   | No              |
| T+365d | 1 signature   | `unshield`| Yes (= 0)       |

Total base-layer transactions: **2**. Total private payments executed: **52**.

---

## How it works

```
         base solana                                 magicblock PER (intel TDX TEE)
─────────────────────────────────         ────────────────────────────────────────
  1. initializeDeposit (burner)
  2. modifyBalance (tokens → vault)
  3. createPermission
  4. delegate ─────────────────────────▶  (account enters PER)

                                               5. tick #1  ─ transferToUsername
                                               6. tick #2
                                               ...
                                               N. tick #N  (cadence driven, cheap)

  N+1. undelegate  ◀────────────────────      (commit state back to base)
  N+2. modifyBalance (vault → user)
```

Every tick is one CPI call against the TEE. The scheduler runs them. The user's main wallet is touched **exactly twice** per stream lifetime — once to fund, once to refund dust.

---

## Architecture

### Per-stream burner key model

Each stream owns a fresh Solana keypair (the "burner") generated in the browser. The burner:

- receives enough SOL for lifetime tx fees (~0.05 SOL)
- receives the full stream amount
- shields + delegates itself to PER
- is the signer of every recurring `transferToUsernameDeposit`

The burner's secret key is encrypted with AES-GCM using a server-side `SCHEDULER_SECRET` and stored as an opaque envelope in Redis. It's only decrypted in memory during a scheduled tick.

**Trust blast radius:** if the scheduler secret leaks, attacker can drain the sum of *active stream remaining balances* — nothing else. The user's main wallet is never custodied or signed for by the server.

An alternative we considered and rejected: `sessionToken`-style pre-signed authorizations, which would keep custody client-side but are far more complex for this MVP and don't meaningfully improve the security model at hackathon-scale amounts.

### Storage

Upstash Redis in production, a local JSON file in dev. The store holds stream metadata + wrapped burner envelopes — no private keys in plaintext, ever.

### Scheduler

Vercel Cron hits `/api/cron` every minute. Each invocation:

1. Fetches streams with `nextRunAt <= now()` (a Redis ZSET range query)
2. Decrypts the burner, builds a Loyal client with it
3. Calls `transferToUsernameDeposit`
4. Advances `nextRunAt`, increments `executedTicks`
5. If stream is complete, auto-unshields and refunds remaining balance to payer

Authenticated via `CRON_SECRET`. Failed ticks retry on the next minute — no manual recovery needed.

### Stack

- Next.js 14 App Router
- `@loyal-labs/private-transactions` + `@magicblock-labs/ephemeral-rollups-sdk`
- `@solana/wallet-adapter` (Phantom + Solflare)
- Upstash Redis
- Tailwind + brutalist editorial design (Tanker + JetBrains Mono + Satoshi)

---

## Run locally

Prereqs: Node 20+, a Solana devnet wallet with some SOL and devnet USDC.

```bash
git clone <this-repo>
cd shroud
npm install          # or bun install
cp .env.example .env
# generate two 48-byte secrets
openssl rand -base64 48    # → SCHEDULER_SECRET
openssl rand -base64 48    # → CRON_SECRET
```

Fill `.env`. Leave the Upstash vars blank — it'll fall back to a local `.shroud-streams.json` file.

```bash
npm run dev
open http://localhost:3000
```

### Getting devnet test tokens

```bash
# SOL
solana airdrop 2 --url devnet

# devnet USDC (mint: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
# use https://spl-token-faucet.com/?token-name=USDC-Dev
```

### Manually trigger a tick (instead of waiting for cron)

```bash
curl http://localhost:3000/api/cron
```

If you set `CRON_SECRET`, pass it as `Authorization: Bearer $CRON_SECRET`.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Create an Upstash Redis (free tier is fine). Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. `vercel` — connect the repo.
4. Set all env vars from `.env.example` in Vercel's project settings.
5. Vercel reads `vercel.json` and registers the cron automatically.
6. Deploy.

Vercel cron fires `/api/cron` every minute on the Hobby plan once deployed.

---

## Project layout

```
app/
  page.tsx                      landing
  create/page.tsx               new-stream wizard
  dashboard/page.tsx            your streams
  i/[handle]/page.tsx           public "ghost inbox" for a handle
  api/
    streams/route.ts            create + list
    streams/cancel/route.ts     sign-challenge → undelegate + refund
    burner/wrap/route.ts        one-shot AES-GCM key wrap
    cron/route.ts               the scheduler

lib/
  shroud.ts                     Loyal SDK wrapper + stream model + helpers
  store.ts                      Redis (or local JSON) persistence
  burner.ts                     AES-GCM key envelope
  useCreateStream.ts            frontend hook for the shield+register flow

components/
  SiteChrome / ShroudMark / ConnectButton
  StreamCard / RedactedAmount / Ticker / WalletProviders
```

---

## Status

This is an MVP. Known limits:

- **Recipient claim flow is out of scope** for this demo. The SDK's `claimUsernameDepositToDeposit` requires a verified Telegram session PDA, which is produced by Loyal's existing MiniApp. The recipient inbox at `/i/[handle]` links out to that flow rather than reimplementing it.
- **Devnet only** by default. Flip `NEXT_PUBLIC_SHROUD_NETWORK=mainnet` to run on mainnet; the SDK supports both with the same code path.
- **No retry budget** on failed ticks yet — a tick that fails 5 times in a row should auto-pause the stream. TODO.
- **No pause/resume UI** — only cancel. Easy add.

---

## Credit

- [Loyal Labs](https://askloyal.com) — private transactions SDK
- [MagicBlock](https://magicblock.xyz) — ephemeral rollup infra
- Built for the Loyal mini build challenge, April 2026
