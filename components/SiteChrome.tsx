"use client";

import { FC } from "react";
import Link from "next/link";
import { ShroudMark } from "./ShroudMark";
import { ConnectButton } from "./ConnectButton";

export const Header: FC<{ showNav?: boolean }> = ({ showNav = true }) => {
  return (
    <header className="border-b hairline">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        <ShroudMark />
        {showNav && (
          <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
            <Link href="/create" className="hover:text-blood transition-colors">
              New stream
            </Link>
            <Link href="/dashboard" className="hover:text-blood transition-colors">
              Dashboard
            </Link>
            <a
              href="https://docs.askloyal.com/sdk/private-transactions/quick-start"
              target="_blank"
              rel="noreferrer"
              className="hover:text-blood transition-colors"
            >
              SDK
            </a>
          </nav>
        )}
        <ConnectButton />
      </div>
    </header>
  );
};

export const Footer: FC = () => {
  return (
    <footer className="border-t hairline mt-32">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 grid md:grid-cols-3 gap-8 font-mono text-xs">
        <div className="space-y-1">
          <div className="eyebrow">Protocol</div>
          <div>
            SHROUD · SOLANA · LOYAL{" "}
            <span className="text-muted">/ MAGICBLOCK PER</span>
          </div>
          <div className="text-muted">Intel TDX Trusted Execution Environment</div>
        </div>
        <div className="space-y-1">
          <div className="eyebrow">Auditable settlement</div>
          <div className="text-muted">
            All state commits back to base Solana. Shielded transfers remain
            invisible to external observers, yet every shield and unshield is
            publicly verifiable on-chain.
          </div>
        </div>
        <div className="space-y-1 md:text-right">
          <div className="eyebrow">Document</div>
          <div className="text-muted">CLASSIFIED · INTERNAL · {new Date().getFullYear()}</div>
          <div className="text-muted">
            Built for{" "}
            <a
              href="https://x.com/loyal_hq"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-blood"
            >
              @loyal_hq
            </a>{" "}
            mini build challenge
          </div>
        </div>
      </div>
    </footer>
  );
};
