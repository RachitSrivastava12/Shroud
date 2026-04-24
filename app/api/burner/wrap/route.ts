/**
 * POST /api/burner/wrap
 * ---------------------
 * The browser generates a burner keypair client-side (the secret never
 * existed on disk). We receive the raw secret over HTTPS once, encrypt it
 * with SCHEDULER_SECRET, and return the envelope to the browser which then
 * submits it with the stream creation.
 *
 * This endpoint does NOT store anything. It is a stateless cipher.
 */

import { NextRequest, NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";
import { wrapSecretKey } from "@/lib/burner";

export const runtime = "nodejs";

const Schema = z.object({
  burnerSecretBase58: z.string(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  let kp: Keypair;
  try {
    kp = Keypair.fromSecretKey(bs58.decode(parsed.data.burnerSecretBase58));
  } catch {
    return NextResponse.json({ error: "invalid_keypair" }, { status: 400 });
  }

  const envelope = await wrapSecretKey(kp);
  return NextResponse.json({
    envelope,
    pubkey: kp.publicKey.toBase58(),
  });
}
