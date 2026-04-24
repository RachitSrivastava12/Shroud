"use client";

import Link from "next/link";
import clsx from "clsx";

type ShroudMarkProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

export function ShroudMark({
  className,
  size = "md",
}: ShroudMarkProps) {
  return (
    <Link
      href="/"
      className={clsx(
        "inline-flex items-baseline gap-2 group select-none",
        className,
      )}
    >
      <span
        className={clsx(
          "font-display leading-none tracking-tight text-ink",
          size === "lg" ? "text-4xl" : size === "sm" ? "text-lg" : "text-2xl",
        )}
      >
        SHROUD
      </span>
      <span
        className={clsx(
          "font-mono tracking-[0.2em] uppercase text-muted group-hover:text-blood transition-colors",
          size === "lg" ? "text-xs" : "text-[0.6rem]",
        )}
      >
        v0.1 · confidential
      </span>
    </Link>
  );
}
