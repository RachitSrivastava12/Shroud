"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";

export function ConnectButton() {
  const { publicKey, connected } = useWallet();
  return (
    <div className="flex items-center gap-3">
      {connected && publicKey && (
        <span className="font-mono text-xs text-muted hidden md:inline">
          {publicKey.toBase58().slice(0, 4)}…{publicKey.toBase58().slice(-4)}
        </span>
      )}
      <WalletMultiButton />
    </div>
  );
}
