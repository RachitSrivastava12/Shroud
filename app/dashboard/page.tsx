"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { Header, Footer } from "@/components/SiteChrome";
import { StreamCard } from "@/components/StreamCard";
import type { Stream } from "@/lib/shroud";

export default function Dashboard() {
  const { publicKey, connected } = useWallet();
  const [streams, setStreams] = useState<Omit<Stream, "burnerKeyEnvelope">[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/streams?payer=${publicKey.toBase58()}`);
      const data = await res.json();
      setStreams(data.streams ?? []);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    load();
    const i = setInterval(load, 10_000);
    return () => clearInterval(i);
  }, [load]);

  const active = streams.filter((s) => s.state === "active");
  const closed = streams.filter((s) => s.state !== "active");

  return (
    <main>
      <Header />
      <section className="max-w-6xl mx-auto px-6 md:px-10 py-14">
        <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
          <div>
            <div className="eyebrow mb-4">§ DOSSIER · ACTIVE TRANSMISSIONS</div>
            <h1 className="font-display text-display-2">Your streams.</h1>
          </div>
          <Link href="/create" className="btn btn-primary">
            + New stream
          </Link>
        </div>

        {!connected ? (
          <div className="border hairline py-20 text-center bg-cream">
            <div className="eyebrow mb-3">Wallet required</div>
            <div className="font-serif text-lg text-graphite">
              Connect to view your active shrouds.
            </div>
          </div>
        ) : loading && streams.length === 0 ? (
          <div className="font-mono text-sm text-muted py-12">Loading dossier…</div>
        ) : streams.length === 0 ? (
          <div className="border hairline py-20 text-center bg-cream">
            <div className="eyebrow mb-3">No active transmissions</div>
            <div className="font-serif text-lg text-graphite mb-6">
              You haven&apos;t opened any streams. Yet.
            </div>
            <Link href="/create" className="btn btn-primary">
              Open the first shroud
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {active.length > 0 && (
              <div className="space-y-4">
                <div className="eyebrow text-blood">Active · {active.length}</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {active.map((s) => (
                    <StreamCard key={s.id} stream={s} onChanged={load} />
                  ))}
                </div>
              </div>
            )}
            {closed.length > 0 && (
              <div className="space-y-4">
                <div className="eyebrow text-muted">Archive · {closed.length}</div>
                <div className="grid md:grid-cols-2 gap-4 opacity-70">
                  {closed.map((s) => (
                    <StreamCard key={s.id} stream={s} onChanged={load} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
