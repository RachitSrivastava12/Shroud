# Submission Playbook

Order of operations for the bounty reply:

1. Deploy Shroud to Vercel → get the live URL
2. Record the 45-second demo video (script below)
3. Post the tweet (drafts below)
4. Like + RT the original challenge tweet
5. Drop your submission link as a reply

---

## The tweet

Three variants, ranked by my honest confidence in which one wins.

### Variant A — the mechanism flex (my pick)

```
built shroud for the @loyal_hq mini build challenge

what it is: private recurring payments on solana

what it does: you shield once. it pays @handles on any cadence. nobody sees the schedule. nobody sees the amount. settlement stays publicly verifiable.

what chain watchers see for a 52-tick stream:
  ▪ 1 shield tx
  ▪ 1 unshield tx
  ▪ nothing else.

everything in between runs inside magicblock's PER / intel TDX — using loyal's transferToUsernameDeposit as the tick primitive. no base-layer footprint per payment.

first private payroll / ghost subscription / DAO stipend tool on solana that hides the *schedule* not just the single transfer.

shroud.vercel.app
[demo video]
```

**Why this one:** the "2 txs for 52 private payments" line is the meme. It's a concrete, shocking comparison that makes the mechanism legible in one read. Judges (who are the Loyal team) will immediately recognize this is someone who read the SDK carefully and found a non-obvious use case.

### Variant B — the story angle

```
the problem: every DAO that pays contributors weekly publishes its full contributor list on-chain, forever. their cadence. their rates. all of it, public.

existing privacy tools fix the single transfer. they don't fix the schedule.

shroud fixes the schedule.

shield once → pay @handles on cadence → nobody sees it → refund dust on cancel.

built on @loyal_hq's private-transactions SDK for their mini build challenge.

shroud.vercel.app
[demo video]
```

**Why this one:** more readable for non-technical viewers. Good for broad RT engagement. Slightly worse for convincing the judges of technical depth.

### Variant C — the visual flex

```
shroud 🕯️

private recurring payments on solana, by telegram @handle

shield once. stream forever. the ledger sees two transactions.

built on @loyal_hq
shroud.vercel.app

[demo video]
```

**Why this one:** maximum virality potential, minimum signal to judges. Use as the first reply, then quote-tweet with Variant A.

---

## The 45-second demo video

Record it at 1920×1080 or vertical 1080×1920. Tool: QuickTime or Loom. No voiceover. Text overlays only. Background music: something tense + minimal (Kavinsky "Nightcall" instrumental works, or any "slow shutter" / dark ambient).

### Beat-by-beat

**00:00–00:04** — landing page. Camera on the hero: "PAY ANYONE. ON A SCHEDULE. SEEN BY NOBODY." Text overlay: `@shroud / built on loyal`.

**00:04–00:08** — scroll past the "what observers see" ledger section. The redacted bars for the 50 middle ticks are the hook. Pause for 1 second on `Total base-layer transactions: 2 · Total private payments executed: 52`.

**00:08–00:12** — click New Stream. Fill in: `@alice_reviewer`, USDC, 10/tick, weekly, 12 ticks, note "monthly essay retainer". Text overlay: `one signature. 12 payments scheduled.`

**00:12–00:20** — click Shield and schedule. The timeline trace plays through its 5 phases. Don't cut — let it run, because the staged phases look *expensive* and that's the point.

**00:20–00:24** — "Stream is live" confirmation screen.

**00:24–00:32** — dashboard. Show the stream card. Hover over the "Shielded" redacted amount → it reveals. Hover away → it re-hides. Text overlay: `amounts hidden by default`.

**00:32–00:38** — open solscan in a second tab on the shield tx. Show: one transaction. Text overlay: `the only thing the chain will ever see`.

**00:38–00:45** — back to dashboard. Slow zoom on the progress bar and the "next in 7d" timestamp. End card with the URL + `shroud.vercel.app`.

### Text overlays to prepare (copy-paste)

```
@shroud / built on loyal
one signature. 12 payments scheduled.
shield to magicblock PER · intel TDX TEE
amounts hidden by default
the only thing the chain will ever see
2 transactions. 52 private payments.
shroud.vercel.app
```

---

## Posting order

1. **First:** like the challenge tweet.
2. **Then:** RT the challenge tweet (required).
3. **Then:** post **Variant A** as a standalone tweet with the video + link, tagging `@loyal_hq`.
4. **Then:** reply to the challenge tweet with the link to your Variant A tweet (so it shows up in the thread as required).
5. **Optional kicker:** quote-tweet Variant A with Variant C's one-liner for a second push ~12h later.

---

## Things to not do

- Don't call the SDK "zk" or "zero-knowledge" anywhere. It's not ZK. It's TEE-based (Intel TDX). The Loyal team will notice.
- Don't overclaim on the recipient-claim UX. The sender side is the demo. The claim is the SDK's existing flow via Telegram MiniApp.
- Don't bury the lede. The first sentence should contain either "recurring" or "schedule" — that's the differentiator nobody else in the bounty will have.

---

## If they ask how you did it

Short answer:

> Each stream gets a one-time burner keypair. It shields + delegates into PER once, then a Vercel cron hits transferToUsernameDeposit on cadence inside the TEE. The burner's secret is AES-GCM wrapped server-side with a scheduler secret — blast radius is capped at active stream balances, user's main wallet is never server-custodied. On cancel or completion, undelegate + refund dust to the original payer.

That's the whole trick. It's embarrassingly simple once you see it. Which is why nobody else in the thread will ship it.
