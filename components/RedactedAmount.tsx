"use client";

import { useState } from "react";
import clsx from "clsx";

type RedactedAmountProps = {
  value: string;
  suffix?: string;
  revealOnHover?: boolean;
  width?: string;
  className?: string;
};

export function RedactedAmount({
  value,
  suffix,
  revealOnHover = true,
  width = "7ch",
  className,
}: RedactedAmountProps) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className={clsx("font-mono tabular-nums inline-flex items-baseline gap-1", className)}
      onMouseEnter={() => revealOnHover && setRevealed(true)}
      onMouseLeave={() => revealOnHover && setRevealed(false)}
    >
      {revealed ? (
        <>
          <span>{value}</span>
          {suffix && <span className="text-muted">{suffix}</span>}
        </>
      ) : (
        <>
          <span className="redacted" style={{ minWidth: width }}>
            {value}
          </span>
          {suffix && <span className="text-muted">{suffix}</span>}
        </>
      )}
    </span>
  );
}
