"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { format, formatDistanceToNowStrict } from "date-fns";
import { NETWORK, getToken, toDisplay, type Stream } from "@/lib/shroud";
import { RedactedAmount } from "./RedactedAmount";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type StreamCardProps = {
  stream: Omit<Stream, "burnerKeyEnvelope">;
  onChanged?: () => void;
};

const SOLSCAN_CLUSTER = NETWORK === "mainnet" ? "" : "?cluster=devnet";

export function StreamCard({
  stream,
  onChanged,
}: StreamCardProps) {
  const wallet = useWallet();
  const [cancelling, setCancelling] = useState(false);

  const token = getToken(stream.tokenSymbol);
  const perTick = toDisplay(BigInt(stream.amountPerTick), token.decimals);
  const totalAmount = toDisplay(
    BigInt(stream.amountPerTick) * BigInt(stream.totalTicks),
    token.decimals,
  );
  const consumed = toDisplay(
    BigInt(stream.amountPerTick) * BigInt(stream.executedTicks),
    token.decimals,
  );
  const remaining = toDisplay(
    BigInt(stream.amountPerTick) * BigInt(stream.totalTicks - stream.executedTicks),
    token.decimals,
  );

  const pct = (stream.executedTicks / stream.totalTicks) * 100;

  const cancel = async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      toast.error("Wallet required");
      return;
    }
    if (!confirm("Cancel this stream? The remaining shielded balance will be unwound.")) {
      return;
    }
    setCancelling(true);
    try {
      const challenge = `shroud:cancel:${stream.id}:${Date.now()}`;
      const sig = await wallet.signMessage(new TextEncoder().encode(challenge));
      const res = await fetch("/api/streams/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          streamId: stream.id,
          challenge,
          signature: bs58.encode(sig),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error ?? "cancel failed");
      }
      toast.success("Stream cancelled. Unwind request submitted.");
      onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const stateColor =
    stream.state === "active"
      ? "text-blood"
      : stream.state === "completed"
      ? "text-ok"
      : "text-muted";

  return (
    <div className="border hairline p-6 bg-paper relative group hover:bg-cream transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl">@{stream.recipientHandle}</span>
            <span className={`font-mono text-xs uppercase tracking-widest ${stateColor}`}>
              · {stream.state}
            </span>
          </div>
          {stream.note && (
            <div className="mt-1 text-sm text-muted italic font-serif">
              “{stream.note}”
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-xs text-muted uppercase tracking-widest">
            per {stream.cadence.replace("ly", "")}
          </div>
          <div className="font-display text-2xl">
            {perTick} <span className="text-muted text-base">{stream.tokenSymbol}</span>
          </div>
        </div>
      </div>

      {/* progress rail */}
      <div className="mt-5">
        <div className="flex items-center justify-between font-mono text-xs text-muted mb-2">
          <span>
            {stream.executedTicks} / {stream.totalTicks} ticks
          </span>
          <span>
            {stream.state === "active" && stream.nextRunAt > Date.now()
              ? `next ${formatDistanceToNowStrict(stream.nextRunAt)}`
              : stream.state === "active"
              ? "executing…"
              : format(stream.createdAt, "MMM d, yyyy")}
          </span>
        </div>
        <div className="h-1 bg-cream relative overflow-hidden">
          <div
            className="h-full bg-ink transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 font-mono text-xs">
        <div>
          <div className="eyebrow mb-1">Paid out</div>
          <RedactedAmount value={consumed} suffix={stream.tokenSymbol} />
        </div>
        <div>
          <div className="eyebrow mb-1">Shielded</div>
          <RedactedAmount value={remaining} suffix={stream.tokenSymbol} />
        </div>
        <div>
          <div className="eyebrow mb-1">Total</div>
          <span className="tabular-nums">
            {totalAmount} <span className="text-muted">{stream.tokenSymbol}</span>
          </span>
        </div>
      </div>

      {stream.state === "active" && (
        <div className="mt-6 flex items-center justify-between">
          {stream.shieldTxSig && (
            <a
              href={`https://solscan.io/tx/${stream.shieldTxSig}${SOLSCAN_CLUSTER}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-muted hover:text-blood"
            >
              shield tx ↗
            </a>
          )}
          <button
            onClick={cancel}
            disabled={cancelling}
            className="btn btn-danger text-xs"
          >
            {cancelling ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Cancelling…
              </span>
            ) : (
              "Cancel & refund"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
