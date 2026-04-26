"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Header, Footer } from "@/components/SiteChrome";
import { useCreateStream, type StreamDraft } from "@/lib/useCreateStream";
import { CADENCE_MS, validateHandle, normalizeHandle } from "@/lib/shroud";
import { toast } from "sonner";
import { Check, Loader2, ArrowRight, Copy } from "lucide-react";

const CADENCES = [
  { k: "daily", label: "Daily", every: "every 24h" },
  { k: "weekly", label: "Weekly", every: "every 7d" },
  { k: "monthly", label: "Monthly", every: "every 30d" },
] as const;

export default function CreatePage() {
  const wallet = useWallet();
  const { status, create } = useCreateStream();
  const [copied, setCopied] = useState(false);

  const [handle, setHandle] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState<"SOL" | "USDC">("USDC");
  const [amount, setAmount] = useState("10");
  const [cadence, setCadence] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [totalTicks, setTotalTicks] = useState("12");
  const [note, setNote] = useState("");

  const handleError = handle ? validateHandle(handle) : null;
  const amountNum = Number(amount);
  const ticksNum = Number(totalTicks);

  const total = Number.isFinite(amountNum) && Number.isFinite(ticksNum)
    ? (amountNum * ticksNum).toFixed(tokenSymbol === "SOL" ? 4 : 2)
    : "—";

  const canSubmit =
    wallet.connected &&
    !handleError &&
    handle.length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    Number.isFinite(ticksNum) &&
    ticksNum > 0 &&
    ticksNum <= 520 &&
    status.phase !== "generating-burner" &&
    status.phase !== "wrapping-key" &&
    status.phase !== "funding-burner" &&
    status.phase !== "shielding" &&
    status.phase !== "registering";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const draft: StreamDraft = {
      recipientHandle: normalizeHandle(handle),
      tokenSymbol,
      amountPerTick: amountNum,
      cadence,
      totalTicks: ticksNum,
      note: note || undefined,
    };
    try {
      await create(draft);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create stream");
    }
  };

  if (status.phase === "done") {
    const publicUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/s/${status.streamId}`
        : `/s/${status.streamId}`;

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Could not copy");
      }
    };

    return (
      <main>
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <div className="eyebrow text-blood mb-6">DOSSIER FILED</div>
          <h1 className="font-display text-display-2">Stream is live.</h1>
          <p className="font-serif text-lg text-graphite mt-6">
            The shield settled on base Solana. From here, every scheduled
            transfer executes silently inside the TEE. Track it from your
            dashboard.
          </p>

          {/* Public share link card */}
          <div className="mt-12 border hairline bg-cream p-6 text-left">
            <div className="eyebrow mb-3">§ shareable public dossier</div>
            <p className="font-serif text-sm text-graphite mb-4">
              Anyone with this link sees the redacted ledger — proof your
              stream exists, with amounts hidden. No wallet required.
            </p>
            <div className="flex items-center gap-2 bg-paper border hairline p-3">
              <code className="font-mono text-xs flex-1 truncate text-ink">
                {publicUrl}
              </code>
              <button
                onClick={copyLink}
                className="btn text-xs flex-shrink-0"
              >
                {copied ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={12} /> Copied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <Copy size={12} /> Copy
                  </span>
                )}
              </button>
            </div>
            <Link
              href={`/s/${status.streamId}`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-mono text-muted hover:text-blood"
            >
              Open public view <ArrowRight size={11} />
            </Link>
          </div>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/dashboard" className="btn btn-primary">
              Open dashboard
            </Link>
            <Link href="/create" className="btn">
              Create another
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const busy =
    status.phase === "generating-burner" ||
    status.phase === "wrapping-key" ||
    status.phase === "funding-burner" ||
    status.phase === "shielding" ||
    status.phase === "registering";

  return (
    <main>
      <Header />
      <section className="max-w-5xl mx-auto px-6 md:px-10 py-14 md:py-20">
        <div className="eyebrow mb-4">§ NEW · STREAM</div>
        <h1 className="font-display text-display-2">Open a shroud.</h1>
        <p className="font-serif text-lg text-graphite mt-4 max-w-xl">
          One signature from your wallet funds a single-purpose burner, which
          shields the full amount into a private Loyal deposit and delegates to
          the MagicBlock TEE. From there, your schedule runs itself.
        </p>

        <form onSubmit={onSubmit} className="mt-14 grid md:grid-cols-2 gap-12">
          {/* LEFT — inputs */}
          <div className="space-y-10">
            <div>
              <label className="eyebrow block mb-3">Recipient · @handle</label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-2xl text-muted">@</span>
                <input
                  className="field"
                  placeholder="alice_user"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
                />
              </div>
              {handleError && (
                <div className="text-blood text-xs font-mono mt-2">
                  {handleError}
                </div>
              )}
            </div>

            <div>
              <label className="eyebrow block mb-3">Asset</label>
              <div className="flex gap-2">
                {(["USDC", "SOL"] as const).map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`btn ${tokenSymbol === t ? "btn-primary" : ""}`}
                    onClick={() => setTokenSymbol(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="eyebrow block mb-3">Amount / tick</label>
                <input
                  className="field"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="eyebrow block mb-3">Ticks</label>
                <input
                  className="field"
                  inputMode="numeric"
                  value={totalTicks}
                  onChange={(e) => setTotalTicks(e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-3">Cadence</label>
              <div className="flex flex-wrap gap-2">
                {CADENCES.map((c) => (
                  <button
                    type="button"
                    key={c.k}
                    className={`btn ${cadence === c.k ? "btn-primary" : ""}`}
                    onClick={() => setCadence(c.k as typeof cadence)}
                  >
                    {c.label}{" "}
                    <span className="ml-2 text-[0.65rem] opacity-60">{c.every}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="eyebrow block mb-3">Private note (optional)</label>
              <input
                className="field"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Never leaves your dashboard"
                maxLength={280}
              />
            </div>
          </div>

          {/* RIGHT — summary / submit */}
          <div className="md:border-l hairline md:pl-12">
            <div className="border hairline p-8 bg-cream space-y-6 relative">
              <div className="stamp -top-3 -right-3">Confidential</div>

              <div className="eyebrow">Summary</div>

              <Row label="Recipient">
                <span className="font-mono">
                  @{normalizeHandle(handle) || "—"}
                </span>
              </Row>
              <Row label="Asset">
                <span className="font-mono">{tokenSymbol}</span>
              </Row>
              <Row label="Per tick">
                <span className="font-mono tabular-nums">
                  {amount || "—"} {tokenSymbol}
                </span>
              </Row>
              <Row label="Schedule">
                <span className="font-mono">
                  {totalTicks} × {cadence}
                </span>
              </Row>
              <div className="border-t hairline pt-4 mt-4">
                <Row label="Total to shield">
                  <span className="font-mono tabular-nums font-medium">
                    {total} {tokenSymbol}
                  </span>
                </Row>
              </div>

              <div className="mt-6 space-y-2 text-xs font-mono text-muted leading-relaxed">
                <div>+ Stream burner receives 0.05 SOL for fees</div>
                <div>+ Base-layer tx count over lifetime: 2</div>
                <div>+ Private ticks executed: {totalTicks}</div>
              </div>
            </div>

            <div className="mt-8">
              <button
                type="submit"
                className="btn btn-primary w-full py-5 text-sm"
                disabled={!canSubmit}
              >
                {busy ? (
                  <span className="inline-flex items-center gap-3 justify-center">
                    <Loader2 size={14} className="animate-spin" />
                    {phaseLabel(status.phase)}
                  </span>
                ) : !wallet.connected ? (
                  "Connect wallet to continue"
                ) : (
                  <span className="inline-flex items-center gap-3 justify-center">
                    Shield and schedule <ArrowRight size={14} />
                  </span>
                )}
              </button>
              {status.phase === "error" && (
                <div className="mt-3 text-blood text-xs font-mono">
                  {status.message}
                </div>
              )}
            </div>

            {busy && <TimelineTrace phase={status.phase} />}
          </div>
        </form>
      </section>
      <Footer />
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="eyebrow">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function phaseLabel(p: string) {
  switch (p) {
    case "generating-burner":
      return "Generating burner…";
    case "wrapping-key":
      return "Sealing envelope…";
    case "funding-burner":
      return "Funding burner (sign in wallet)…";
    case "shielding":
      return "Shielding & delegating to TEE…";
    case "registering":
      return "Filing dossier…";
    default:
      return "Working…";
  }
}

function TimelineTrace({ phase }: { phase: string }) {
  const steps = [
    ["generating-burner", "Generate burner"],
    ["wrapping-key", "Seal envelope"],
    ["funding-burner", "Fund burner"],
    ["shielding", "Shield to PER"],
    ["registering", "File dossier"],
  ] as const;
  const idx = steps.findIndex(([k]) => k === phase);
  return (
    <ol className="mt-8 space-y-2 font-mono text-xs">
      {steps.map(([k, label], i) => (
        <li
          key={k}
          className={`flex items-center gap-3 ${
            i < idx
              ? "text-muted"
              : i === idx
              ? "text-blood"
              : "text-muted/40"
          }`}
        >
          {i < idx ? <Check size={12} /> : i === idx ? <Loader2 size={12} className="animate-spin" /> : <span className="w-3 inline-block">·</span>}
          <span className="uppercase tracking-widest">{label}</span>
        </li>
      ))}
    </ol>
  );
}