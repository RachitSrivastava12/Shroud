import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  CADENCE_MS,
  type Cadence,
  type Stream,
  validateHandle,
  normalizeHandle,
} from "@/lib/shroud";
import { putStream, listStreamsByPayer, listStreamsByRecipient, getStream } from "@/lib/store";

export const runtime = "nodejs";

const CreateSchema = z.object({
  payerPubkey: z.string().min(32).max(64),
  burnerPubkey: z.string().min(32).max(64),
  burnerKeyEnvelope: z.string(),
  recipientHandle: z.string(),
  tokenSymbol: z.enum(["SOL", "USDC"]),
  tokenMint: z.string().min(32),
  amountPerTick: z.string().regex(/^\d+$/),
  cadence: z.enum(["daily", "weekly", "monthly"]),
  totalTicks: z.number().int().positive().max(520), // cap at ~10 years daily / 40 yrs monthly
  shieldTxSig: z.string().nullable(),
  note: z.string().max(280).optional(),
  firstTickAt: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const handleErr = validateHandle(parsed.data.recipientHandle);
  if (handleErr) {
    return NextResponse.json({ error: handleErr }, { status: 400 });
  }

  const now = Date.now();
  const nextRunAt =
    parsed.data.firstTickAt ?? now + CADENCE_MS[parsed.data.cadence as Cadence];

  const stream: Stream = {
    id: randomUUID(),
    payerPubkey: parsed.data.payerPubkey,
    burnerPubkey: parsed.data.burnerPubkey,
    burnerKeyEnvelope: parsed.data.burnerKeyEnvelope,
    recipientHandle: normalizeHandle(parsed.data.recipientHandle),
    tokenSymbol: parsed.data.tokenSymbol,
    tokenMint: parsed.data.tokenMint,
    amountPerTick: parsed.data.amountPerTick,
    cadence: parsed.data.cadence,
    totalTicks: parsed.data.totalTicks,
    executedTicks: 0,
    nextRunAt,
    createdAt: now,
    state: "active",
    shieldTxSig: parsed.data.shieldTxSig,
    note: parsed.data.note,
  };

  await putStream(stream);
  return NextResponse.json({ stream }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const payer = searchParams.get("payer");
  const recipient = searchParams.get("recipient");
  const id = searchParams.get("id");

  if (id) {
    const s = await getStream(id);
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    // scrub envelope before sending to browser
    const { burnerKeyEnvelope, ...safe } = s;
    return NextResponse.json({ stream: safe });
  }

  if (payer) {
    const streams = (await listStreamsByPayer(payer)).map(
      ({ burnerKeyEnvelope, ...s }) => s,
    );
    return NextResponse.json({ streams });
  }

  if (recipient) {
    const streams = (await listStreamsByRecipient(normalizeHandle(recipient))).map(
      ({ burnerKeyEnvelope, ...s }) => s,
    );
    return NextResponse.json({ streams });
  }

  return NextResponse.json({ error: "missing_filter" }, { status: 400 });
}
