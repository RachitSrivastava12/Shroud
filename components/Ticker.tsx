"use client";

const PHRASES = [
  "CLASSIFIED",
  "NO TRACE",
  "TEE · INTEL TDX",
  "TRANSFERS EXECUTED INSIDE EPHEMERAL ROLLUP",
  "PAYEE IDENTITY: TELEGRAM HANDLE",
  "SCHEDULE: HIDDEN",
  "AMOUNT: HIDDEN",
  "SETTLEMENT: PUBLIC",
];

export function Ticker() {
  const items = [...PHRASES, ...PHRASES, ...PHRASES];
  return (
    <div className="border-y hairline py-3 overflow-hidden bg-ink text-paper">
      <div className="marquee font-mono text-[0.7rem] tracking-[0.25em] uppercase">
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-blood rounded-full animate-shimmer" />
            <span>{p}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
