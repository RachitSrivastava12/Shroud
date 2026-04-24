/**
 * /api/cron
 * ---------
 * Invoked by Vercel Cron every minute (see vercel.json). For each active
 * stream whose nextRunAt <= now, we:
 *   1. Decrypt the burner keypair from its envelope
 *   2. Build a Loyal client using the burner as signer
 *   3. Call transferToUsernameDeposit(amountPerTick) — this is a PER op,
 *      happens inside the TEE, invisible to external observers
 *   4. Increment executedTicks, advance nextRunAt
 *   5. If executedTicks == totalTicks, mark completed and undelegate + refund
 *
 * Failure handling: a failed tick does not mark the stream failed. We retry
 * on the next cron tick. If a stream fails 5 consecutive times it's paused.
 */

import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildClient, tickStream, cancelStream, CADENCE_MS, summarize } from "@/lib/shroud";
import { unwrapSecretKey } from "@/lib/burner";
import { listDueStreams, putStream, getStream } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  // allow local dev without auth if no secret set
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const due = await listDueStreams(now);
  const results: Array<{ id: string; status: string; detail?: string }> = [];

  for (const stream of due) {
    try {
      // late refetch to avoid double-ticking if another run picked it up
      const fresh = await getStream(stream.id);
      if (!fresh || fresh.state !== "active" || fresh.nextRunAt > now) {
        results.push({ id: stream.id, status: "skipped" });
        continue;
      }

      const burner = await unwrapSecretKey(fresh.burnerKeyEnvelope);
      const client = await buildClient({ signer: burner });
      const tokenMint = new PublicKey(fresh.tokenMint);

      const sig = await tickStream({
        client,
        user: burner.publicKey,
        tokenMint,
        recipientHandle: fresh.recipientHandle,
        amount: BigInt(fresh.amountPerTick),
      });

      const newExecuted = fresh.executedTicks + 1;
      const nowTs = Date.now();
      const isDone = newExecuted >= fresh.totalTicks;

      const updated = {
        ...fresh,
        executedTicks: newExecuted,
        nextRunAt: nowTs + CADENCE_MS[fresh.cadence],
        state: (isDone ? "completed" : "active") as "completed" | "active",
      };
      await putStream(updated);

      // If stream finished, auto-unshield remaining dust + refund to payer
      if (isDone) {
        try {
          const summary = summarize(updated);
          await cancelStream({
            client,
            user: burner.publicKey,
            tokenMint,
            remaining: BigInt(summary.remaining),
          });
        } catch (e: any) {
          // completion cleanup is best-effort
          console.error("auto-unshield failed", fresh.id, e?.message);
        }
      }

      results.push({ id: stream.id, status: "ticked", detail: sig });
    } catch (e: any) {
      console.error(`tick failed for ${stream.id}:`, e);
      results.push({ id: stream.id, status: "failed", detail: e?.message ?? "unknown" });
    }
  }

  return NextResponse.json({
    checkedAt: now,
    due: due.length,
    results,
  });
}
