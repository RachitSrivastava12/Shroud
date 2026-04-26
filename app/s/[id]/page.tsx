"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/SiteChrome";
import { Ticker } from "@/components/Ticker";
import { RedactedAmount } from "@/components/RedactedAmount";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Lock, Eye, ArrowRight } from "lucide-react";
import type { Stream } from "@/lib/shroud";
import { getToken, toDisplay } from "@/lib/shroud";

export default function PublicStreamView({ params }: { params: { id: string } }) {
  const [stream, setStream] = useState<Omit<Stream, "burnerKeyEnvelope"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/streams?id=${params.id}`);
        if (!res.ok) {
          if (alive) setNotFound(true);
          return;
        }
        const data = await res.json();
        if (alive) setStream(data.stream);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [params.id]);

  if (notFound) {
    return (
      <main>
        <Header showNav={false} />
        <section className="max-w-2xl mx-auto px-6 py-32 text-center">
          <div className="eyebrow mb-4">§ DOSSIER · NOT FOUND</div>
          <h1 className="font-display text-display-2">No such stream.</h1>
          <p className="font-serif text-lg text-graphite mt-4">
            This dossier ID doesn&apos;t exist, or has been redacted from the registry.
          </p>
          <div className="mt-10">
            <Link href="/" className="btn btn-primary">
              ← Back to home
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  if (loading || !stream) {
    return (
      <main>
        <Header showNav={false} />
        <section className="max-w-2xl mx-auto px-6 py-32 text-center font-mono text-sm text-muted">
          <div className="animate-shimmer">Decrypting dossier metadata…</div>
        </section>
      </main>
    );
  }

  const token = getToken(stream.tokenSymbol);
  const perTick = toDisplay(BigInt(stream.amountPerTick), token.decimals);
  const totalAmount = toDisplay(
    BigInt(stream.amountPerTick) * BigInt(stream.totalTicks),
    token.decimals,
  );

  const stateColor =
    stream.state === "active" ? "text-blood"
    : stream.state === "completed" ? "text-ok"
    : "text-muted";

  return (
    <main>
      <Header showNav={false} />

      {/* HERO BAR */}
      <section className="border-b hairline bg-cream">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="eyebrow mb-3">§ DOSSIER · {stream.id.slice(0, 8).toUpperCase()}</div>
            <h1 className="font-display text-4xl md:text-6xl flex items-baseline gap-3 flex-wrap">
              <span className="text-muted text-3xl md:text-5xl">@</span>
              {stream.recipientHandle}
            </h1>
            <div className={`mt-2 font-mono text-xs uppercase tracking-widest ${stateColor}`}>
              ● {stream.state}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xs text-muted uppercase tracking-widest">
              cadence · {stream.cadence}
            </div>
            <div className="font-display text-2xl mt-1">
              {perTick} <span className="text-base text-muted">{stream.tokenSymbol}</span>
              <span className="text-muted text-sm font-mono"> / tick</span>
            </div>
          </div>
        </div>
      </section>

      <Ticker />

      {/* THE LIVE LEDGER */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-16">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="eyebrow mb-4">§ THE PUBLIC LEDGER</div>
            <h2 className="font-display text-3xl md:text-4xl">
              What chain watchers see for this stream.
            </h2>
            <p className="font-serif text-lg text-graphite mt-4 leading-relaxed">
              A single shield. Then silence — for {stream.totalTicks} ticks, the chain shows
              nothing. Each tick fires inside MagicBlock&apos;s TEE. Eventually, a single
              unshield commits dust back to the payer.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 font-mono text-xs">
              <div>
                <div className="eyebrow mb-1">base txs</div>
                <div className="text-2xl font-display">2</div>
              </div>
              <div>
                <div className="eyebrow mb-1">private ticks</div>
                <div className="text-2xl font-display">{stream.totalTicks}</div>
              </div>
              <div>
                <div className="eyebrow mb-1">executed</div>
                <div className="text-2xl font-display text-blood">{stream.executedTicks}</div>
              </div>
              <div>
                <div className="eyebrow mb-1">remaining</div>
                <div className="text-2xl font-display">
                  {stream.totalTicks - stream.executedTicks}
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="scanlines border hairline bg-ink text-paper p-8 font-mono text-sm">
              <div className="text-cream/60 mb-4 text-xs tracking-widest uppercase flex items-center justify-between">
                <span>solscan · devnet · live</span>
                {stream.state === "active" && (
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blood rounded-full animate-shimmer" />
                    streaming
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <PublicLedgerRow
                  date="T+00:00"
                  sig={stream.shieldTxSig}
                  action="shield"
                  amt={`${totalAmount} ${stream.tokenSymbol}`}
                  visible
                />
                {Array.from({ length: Math.min(stream.totalTicks, 8) }).map((_, i) => {
                  const isDone = i < stream.executedTicks;
                  const isCurrent = i === stream.executedTicks && stream.state === "active";
                  return (
                    <PublicLedgerRow
                      key={i}
                      date={`tick #${String(i + 1).padStart(2, "0")}`}
                      sig="—"
                      action={isCurrent ? "→ next" : "transfer"}
                      amt="hidden"
                      muted={!isDone && !isCurrent}
                      highlight={isCurrent}
                      done={isDone}
                    />
                  );
                })}
                {stream.totalTicks > 8 && (
                  <div className="text-cream/30 text-xs py-2">
                    · · · {stream.totalTicks - 8} more ticks · · ·
                  </div>
                )}
                <PublicLedgerRow
                  date={`T+${stream.totalTicks}×${stream.cadence.replace("ly", "")}`}
                  sig={stream.state === "completed" ? "(committed)" : "—"}
                  action="unshield"
                  amt={stream.state === "completed" ? "0.00" : "pending"}
                  visible={stream.state === "completed"}
                />
              </div>
              <div className="mt-6 pt-6 border-t border-cream/10 text-cream/50 text-xs flex justify-between">
                <span>
                  base-layer txs visible: <span className="text-blood">2</span>
                </span>
                <span>
                  private payments executed:{" "}
                  <span className="text-blood">{stream.executedTicks}/{stream.totalTicks}</span>
                </span>
              </div>
            </div>

            {/* progress bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between font-mono text-xs text-muted mb-2">
                <span>
                  {stream.executedTicks} of {stream.totalTicks} ticks executed
                </span>
                <span>
                  {stream.state === "active" && stream.nextRunAt > Date.now()
                    ? `next tick ${formatDistanceToNowStrict(stream.nextRunAt)}`
                    : stream.state === "active"
                    ? "tick imminent…"
                    : `created ${format(stream.createdAt, "MMM d")}`}
                </span>
              </div>
              <div className="h-1 bg-cream relative overflow-hidden">
                <div
                  className="h-full bg-ink transition-all duration-700"
                  style={{ width: `${(stream.executedTicks / stream.totalTicks) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REDACTED PAYLOAD */}
      <section className="border-y hairline bg-cream">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-16 grid md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3 text-blood">
              <Lock size={16} />
              <span className="eyebrow">Amount per tick</span>
            </div>
            <div className="font-display text-3xl">
              <RedactedAmount value={perTick} suffix={stream.tokenSymbol} width="6ch" />
            </div>
            <div className="text-xs font-mono text-muted mt-2">hover to reveal</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 text-blood">
              <Lock size={16} />
              <span className="eyebrow">Total shielded</span>
            </div>
            <div className="font-display text-3xl">
              <RedactedAmount value={totalAmount} suffix={stream.tokenSymbol} width="6ch" />
            </div>
            <div className="text-xs font-mono text-muted mt-2">redacted by default</div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 text-blood">
              <Eye size={16} />
              <span className="eyebrow">What observers see</span>
            </div>
            <div className="font-display text-3xl">2 txs</div>
            <div className="text-xs font-mono text-muted mt-2">
              for {stream.totalTicks} private payments
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-20 text-center">
        <div className="eyebrow mb-4">§ open one yourself</div>
        <h2 className="font-display text-display-2">
          Stop leaking <br /> your payroll.
        </h2>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/create" className="btn btn-primary">
            Create a stream <ArrowRight size={14} className="ml-2 inline" />
          </Link>
          <Link href="/" className="btn">
            What is this?
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function PublicLedgerRow({
  date,
  sig,
  action,
  amt,
  visible,
  muted,
  highlight,
  done,
}: {
  date: string;
  sig: string | null;
  action: string;
  amt: string;
  visible?: boolean;
  muted?: boolean;
  highlight?: boolean;
  done?: boolean;
}) {
  const colorClass = highlight
    ? "text-blood"
    : muted
    ? "text-cream/40"
    : done
    ? "text-cream/60"
    : "text-cream/90";

  return (
    <div className={`grid grid-cols-12 gap-3 items-center ${colorClass}`}>
      <div className="col-span-3">{date}</div>
      <div className="col-span-3">
        {sig && sig.length > 4 ? (
          <a
            href={`https://solscan.io/tx/${sig}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="hover:text-blood underline-offset-2 hover:underline"
          >
            {sig.slice(0, 4)}…{sig.slice(-3)}
          </a>
        ) : (
          <span className="text-cream/40">{sig ?? "—"}</span>
        )}
      </div>
      <div
        className={`col-span-2 uppercase text-xs tracking-widest ${
          action === "shield" || action === "unshield"
            ? "text-blood"
            : highlight
            ? "text-blood"
            : "text-cream/40"
        }`}
      >
        {action}
      </div>
      <div className="col-span-4 text-right">
        {visible ? (
          <span>{amt}</span>
        ) : (
          <span className="redacted" style={{ minWidth: "7ch" }}>
            ~~~~~~
          </span>
        )}
      </div>
    </div>
  );
}