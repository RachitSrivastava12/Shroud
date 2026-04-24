"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header, Footer } from "@/components/SiteChrome";
import { RedactedAmount } from "@/components/RedactedAmount";
import { formatDistanceToNowStrict } from "date-fns";
import type { Stream } from "@/lib/shroud";
import { getToken, toDisplay } from "@/lib/shroud";
import { Ghost } from "lucide-react";

export default function HandleInbox({ params }: { params: { handle: string } }) {
  const rawHandle = decodeURIComponent(params.handle).replace(/^@/, "");
  const [streams, setStreams] = useState<Omit<Stream, "burnerKeyEnvelope">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/streams?recipient=${rawHandle}`);
        const data = await res.json();
        if (alive) setStreams(data.streams ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(i);
    };
  }, [rawHandle]);

  const active = streams.filter((s) => s.state === "active");
  const completed = streams.filter((s) => s.state === "completed");

  return (
    <main>
      <Header />
      <section className="max-w-4xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <div className="text-center">
          <div className="eyebrow mb-4">§ GHOST INBOX · HANDLE</div>
          <h1 className="font-display text-display-1 flex items-baseline justify-center gap-2">
            <span className="text-muted text-5xl md:text-7xl">@</span>
            {rawHandle}
          </h1>
          <p className="font-serif text-lg md:text-xl text-graphite mt-4 max-w-xl mx-auto">
            {loading
              ? "Scanning the ephemeral layer…"
              : active.length > 0
              ? `You have ${active.length} active shrouded transmission${active.length === 1 ? "" : "s"} pointed at this handle.`
              : "No active shrouds directed at this handle."}
          </p>
        </div>

        {active.length > 0 && (
          <div className="mt-14 space-y-4">
            {active.map((s) => {
              const token = getToken(s.tokenSymbol);
              const perTick = toDisplay(BigInt(s.amountPerTick), token.decimals);
              const progress = (s.executedTicks / s.totalTicks) * 100;
              return (
                <div
                  key={s.id}
                  className="border hairline p-6 bg-cream flex items-center gap-6 scanlines"
                >
                  <Ghost className="text-blood flex-shrink-0" size={28} />
                  <div className="flex-1">
                    <div className="font-mono text-xs uppercase tracking-widest text-muted">
                      Inbound · {s.cadence} · {s.tokenSymbol}
                    </div>
                    <div className="font-display text-2xl mt-1 flex items-baseline gap-3">
                      <RedactedAmount
                        value={perTick}
                        suffix={s.tokenSymbol}
                        width="5ch"
                      />
                      <span className="text-muted text-sm font-mono">/tick</span>
                    </div>
                    <div className="h-0.5 mt-3 bg-paper relative overflow-hidden">
                      <div
                        className="h-full bg-blood"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-mono text-xs mt-2 text-muted">
                      <span>
                        {s.executedTicks} of {s.totalTicks} received
                      </span>
                      <span>
                        next{" "}
                        {s.nextRunAt > Date.now()
                          ? formatDistanceToNowStrict(s.nextRunAt)
                          : "imminent"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {completed.length > 0 && (
          <div className="mt-14">
            <div className="eyebrow mb-4">Archive · {completed.length} completed</div>
            <div className="grid sm:grid-cols-2 gap-3 opacity-60">
              {completed.map((s) => (
                <div key={s.id} className="border hairline p-4 font-mono text-xs bg-paper">
                  <div className="flex items-center justify-between">
                    <span>{s.totalTicks} × {s.cadence} · {s.tokenSymbol}</span>
                    <span className="text-ok">✓ completed</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA to claim */}
        <div className="mt-16 border hairline p-8 bg-paper relative">
          <div className="stamp right-4 top-4">Claim · Pending</div>
          <div className="eyebrow mb-3">§ CLAIM</div>
          <h3 className="font-display text-3xl">Is this handle yours?</h3>
          <p className="font-serif text-base text-graphite mt-3 max-w-lg">
            To move these funds into a wallet you control, prove ownership of
            this Telegram handle via Loyal&apos;s verified session flow. The
            recipient claim ceremony runs through{" "}
            <a
              href="https://docs.askloyal.com/sdk/private-transactions/how-it-works#telegram-verification"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-blood"
            >
              @{rawHandle} · Loyal MiniApp
            </a>
            . Claim is a two-tx ceremony — session store, then signature verify.
          </p>
          <div className="mt-6 flex gap-3">
            <a
              href={`https://t.me/loyal_hq_bot?start=claim_${rawHandle}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              Open Telegram · claim
            </a>
            <Link href="/" className="btn">
              What is this?
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
