import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { z } from "zod";
import { buildClient, cancelStream as cancel, summarize } from "@/lib/shroud";
import { unwrapSecretKey } from "@/lib/burner";
import { getStream, putStream } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const CancelSchema = z.object({
  streamId: z.string(),
  signature: z.string(),   // base58 signature over the cancel challenge
  challenge: z.string(),   // the exact string that was signed
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const stream = await getStream(parsed.data.streamId);
  if (!stream) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (stream.state === "cancelled" || stream.state === "completed") {
    return NextResponse.json({ error: "already_closed", state: stream.state }, { status: 409 });
  }

  // Verify the cancel request was signed by the stream's payer
  const expectedPrefix = `shroud:cancel:${stream.id}:`;
  if (!parsed.data.challenge.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "bad_challenge" }, { status: 400 });
  }
  const tsStr = parsed.data.challenge.slice(expectedPrefix.length);
  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60_000) {
    return NextResponse.json({ error: "expired_challenge" }, { status: 400 });
  }

  const ok = nacl.sign.detached.verify(
    new TextEncoder().encode(parsed.data.challenge),
    bs58.decode(parsed.data.signature),
    new PublicKey(stream.payerPubkey).toBytes(),
  );
  if (!ok) {
    return NextResponse.json({ error: "bad_signature" }, { status: 403 });
  }

  // Execute undelegate + refund from burner
  try {
    const burner = await unwrapSecretKey(stream.burnerKeyEnvelope);
    const client = await buildClient({ signer: burner });
    const tokenMint = new PublicKey(stream.tokenMint);
    const { remaining } = summarize(stream);
    await cancel({
      client,
      user: burner.publicKey,
      tokenMint,
      remaining: BigInt(remaining),
    });
  } catch (e: any) {
    console.error("cancel on-chain failed", e);
    return NextResponse.json(
      { error: "onchain_cancel_failed", detail: e?.message },
      { status: 500 },
    );
  }

  const updated = { ...stream, state: "cancelled" as const };
  await putStream(updated);
  return NextResponse.json({ ok: true });
}
