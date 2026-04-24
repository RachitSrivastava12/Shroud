"use client";

import Link from "next/link";
import { Header, Footer } from "@/components/SiteChrome";
import { Ticker } from "@/components/Ticker";
import { RedactedAmount } from "@/components/RedactedAmount";
import { ArrowRight, Lock, Clock, Eye } from "lucide-react";

export default function Page() {
  return (
    <main>
      <Header />

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-28 pb-20 relative">
        <div className="grid md:grid-cols-12 gap-y-10 items-end">
          <div className="md:col-span-8">
            <div className="eyebrow mb-6">
              SHROUD · DOSSIER 001 · CONFIDENTIAL
            </div>
            <h1 className="font-display text-display-1 leading-[0.9]">
              PAY ANYONE.
              <br />
              ON A SCHEDULE.
              <br />
              <span className="text-blood">SEEN BY NOBODY.</span>
            </h1>
          </div>
          <div className="md:col-span-4 md:pl-8 md:border-l hairline">
            <p className="font-serif text-lg md:text-xl leading-snug text-graphite">
              Shroud is the first <span className="font-medium">recurring</span>{" "}
              private payment layer on Solana. Shield once. Stream forever.
              The schedule, the amount, and the payer remain invisible —
              settlement stays publicly verifiable.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/create" className="btn btn-primary inline-flex items-center gap-2">
                New stream <ArrowRight size={14} />
              </Link>
              <Link href="/dashboard" className="btn">
                My dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* floating stamp */}
        <div className="stamp right-6 md:right-10 top-10">Top Secret · No Forn</div>
      </section>

      <Ticker />

      {/* THE OBSERVATION */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="eyebrow mb-6">§ 1 · The observation</div>
            <h2 className="font-display text-display-2">
              Every payroll, <br />
              every subscription, <br />
              every stipend — <br />
              <em>leaks who, how much, and how often.</em>
            </h2>
          </div>
          <div className="md:col-span-6 md:col-start-7 font-serif text-lg leading-relaxed text-graphite space-y-6">
            <p>
              Streaming protocols on Solana publish a transaction to base layer
              for every tick. A DAO that pays its contributors weekly publishes
              its contributor list, their cadence, and their rate — forever,
              publicly, immutably.
            </p>
            <p>
              Existing privacy tools stop at the single transfer. No shielded
              pool on Solana lets you <em>schedule</em> private payments without
              leaking the schedule itself.
            </p>
            <p className="font-mono text-sm text-blood">
              Shroud fixes that.
            </p>
          </div>
        </div>
      </section>

      {/* THE MECHANISM — a 4-panel diagram in prose form */}
      <section className="border-y hairline bg-cream">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-20">
          <div className="eyebrow mb-10">§ 2 · Mechanism</div>
          <div className="grid md:grid-cols-4 gap-0 md:divide-x hairline">
            {[
              {
                n: "01",
                t: "SHIELD",
                b: "You fund a per-stream burner once. It deposits into Loyal's vault and delegates to MagicBlock's Private Ephemeral Rollup.",
              },
              {
                n: "02",
                t: "DELEGATE",
                b: "Account ownership moves into Intel TDX. From here, every balance update is invisible to external observers.",
              },
              {
                n: "03",
                t: "TICK",
                b: "Our scheduler executes transferToUsernameDeposit on cadence — inside the TEE. No base-layer footprint. No trace.",
              },
              {
                n: "04",
                t: "UNSHIELD",
                b: "On completion or cancel, state commits back to base. Remaining funds refund to your wallet. One in, one out.",
              },
            ].map((s) => (
              <div key={s.n} className="p-6 md:p-8 space-y-3">
                <div className="font-mono text-blood text-sm">{s.n}</div>
                <div className="font-display text-3xl">{s.t}</div>
                <p className="font-serif text-base leading-relaxed text-graphite">
                  {s.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-24">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="eyebrow mb-6">§ 3 · Field use</div>
            <h2 className="font-display text-display-2">
              Who moves money <br /> through a shroud?
            </h2>
          </div>
          <div className="md:col-span-8 grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: <Lock size={18} />,
                h: "DAOs paying contributors",
                b: "Stop publishing your full contributor list on-chain every Friday.",
              },
              {
                icon: <Clock size={18} />,
                h: "Creators on retainer",
                b: "Monthly payments to your editor, translator, ghostwriter — without doxxing them.",
              },
              {
                icon: <Eye size={18} />,
                h: "Private treasuries",
                b: "Fund a public persona from an unlinked shielded pool.",
              },
              {
                icon: <ArrowRight size={18} />,
                h: "Ghost subscriptions",
                b: "Tip or subscribe to a creator by @handle only. No wallet ever touches wallet.",
              },
            ].map((c) => (
              <div
                key={c.h}
                className="border hairline p-6 bg-paper hover:bg-cream transition-colors group"
              >
                <div className="flex items-center gap-2 mb-3 text-blood">
                  {c.icon}
                  <span className="eyebrow">{c.h}</span>
                </div>
                <p className="font-serif text-graphite leading-relaxed">{c.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE LEDGER — a preview of what observers see */}
      <section className="bg-ink text-paper">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <div className="eyebrow text-cream mb-6">§ 4 · The public ledger</div>
            <h2 className="font-display text-display-2 text-paper">
              What chain watchers see.
            </h2>
            <p className="font-serif text-lg text-cream mt-6 leading-relaxed">
              A single shield transaction. Then silence — for days, weeks, months.
              Then a single unshield. That&apos;s the entire on-chain trace of a
              12-month private payroll.
            </p>
          </div>

          <div className="md:col-span-7 scanlines border hairline border-cream/20 p-8 font-mono text-sm">
            <div className="text-cream/60 mb-4 text-xs tracking-widest uppercase">
              Solscan · mainnet · real-time
            </div>
            <div className="space-y-3">
              <LedgerRow
                date="T+00:00"
                sig="5Kp…a1F"
                action="shield"
                amt="1200.00 USDC"
                visible
              />
              <LedgerRow date="T+07d" sig="—" action="transfer" amt="hidden" />
              <LedgerRow date="T+14d" sig="—" action="transfer" amt="hidden" />
              <LedgerRow date="T+21d" sig="—" action="transfer" amt="hidden" />
              <div className="text-cream/30 text-xs py-2">· · · 12 more ticks · · ·</div>
              <LedgerRow
                date="T+365d"
                sig="9Hm…b4Q"
                action="unshield"
                amt="0.00 USDC"
                visible
              />
            </div>
            <div className="mt-6 pt-6 border-t border-cream/10 text-cream/50 text-xs">
              Total base-layer transactions: <span className="text-blood">2</span> ·
              Total private payments executed: <span className="text-blood">52</span>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-32 text-center">
        <div className="eyebrow mb-6">§ ∞ · Your turn</div>
        <h2 className="font-display text-display-1 leading-[0.95]">
          Stop leaking <br /> your payroll.
        </h2>
        <div className="mt-12 flex items-center justify-center gap-3">
          <Link href="/create" className="btn btn-primary text-base px-8 py-5">
            Create a stream
          </Link>
          <Link href="/dashboard" className="btn text-base px-8 py-5">
            Watch your streams
          </Link>
        </div>
        <div className="mt-16 font-mono text-xs text-muted">
          Devnet ready · Mainnet soon · Built on Loyal + MagicBlock PER
        </div>
      </section>

      <Footer />
    </main>
  );
}

function LedgerRow({
  date,
  sig,
  action,
  amt,
  visible,
}: {
  date: string;
  sig: string;
  action: string;
  amt: string;
  visible?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center text-cream/90">
      <div className="col-span-3 text-cream/50">{date}</div>
      <div className="col-span-3 text-cream/70">{sig}</div>
      <div
        className={`col-span-2 uppercase text-xs tracking-widest ${
          action === "shield" ? "text-blood" : action === "unshield" ? "text-blood" : "text-cream/40"
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
