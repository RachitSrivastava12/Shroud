"use client";

import { useState, useCallback } from "react";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  createSyncNativeInstruction,
} from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import {
  buildClient,
  shieldForStream,
  toMinor,
  getToken,
  CADENCE_MS,
  type Cadence,
} from "@/lib/shroud";

export type StreamDraft = {
  recipientHandle: string;
  tokenSymbol: "SOL" | "USDC";
  amountPerTick: number;
  cadence: Cadence;
  totalTicks: number;
  note?: string;
};

// How much extra SOL the burner gets to cover tx fees across its lifetime.
// 0.05 SOL is conservative for ~500 txs.
const BURNER_SOL_BUFFER = 0.05 * LAMPORTS_PER_SOL;

export type CreateStatus =
  | { phase: "idle" }
  | { phase: "generating-burner" }
  | { phase: "wrapping-key" }
  | { phase: "funding-burner"; sig?: string }
  | { phase: "shielding"; sig?: string }
  | { phase: "registering" }
  | { phase: "done"; streamId: string }
  | { phase: "error"; message: string };

export function useCreateStream() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [status, setStatus] = useState<CreateStatus>({ phase: "idle" });

  const create = useCallback(
    async (draft: StreamDraft) => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        setStatus({ phase: "error", message: "Wallet not connected" });
        return;
      }

      try {
        const token = getToken(draft.tokenSymbol);
        const tokenMint = new PublicKey(token.mint);
        const amountPerTickMinor = toMinor(draft.amountPerTick, token.decimals);
        const totalAmountMinor = amountPerTickMinor * BigInt(draft.totalTicks);

        // 1 — generate burner
        setStatus({ phase: "generating-burner" });
        const burner = Keypair.generate();
        const burnerSecretBase58 = bs58.encode(burner.secretKey);

        // 2 — wrap the key server-side
        setStatus({ phase: "wrapping-key" });
        const wrapRes = await fetch("/api/burner/wrap", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ burnerSecretBase58 }),
        });
        if (!wrapRes.ok) throw new Error("Failed to wrap key");
        const { envelope } = await wrapRes.json();

        // 3 — fund the burner from user's wallet
        setStatus({ phase: "funding-burner" });
        const fundTx = new Transaction();

        // SOL buffer for tx fees (always)
        fundTx.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: burner.publicKey,
            lamports: BURNER_SOL_BUFFER,
          }),
        );

        if (draft.tokenSymbol === "SOL") {
          // Wrap SOL into the burner's wSOL ATA
          const burnerWsol = getAssociatedTokenAddressSync(
            NATIVE_MINT,
            burner.publicKey,
            true,
          );
          fundTx.add(
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              burnerWsol,
              burner.publicKey,
              NATIVE_MINT,
            ),
          );
          // Send SOL into the wSOL account, then sync
          fundTx.add(
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: burnerWsol,
              lamports: Number(totalAmountMinor),
            }),
          );
          fundTx.add(createSyncNativeInstruction(burnerWsol));
        } else {
          // Send SPL tokens from user ATA -> burner ATA
          const userAta = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);
          const burnerAta = getAssociatedTokenAddressSync(
            tokenMint,
            burner.publicKey,
            true,
          );
          fundTx.add(
            createAssociatedTokenAccountIdempotentInstruction(
              wallet.publicKey,
              burnerAta,
              burner.publicKey,
              tokenMint,
            ),
          );
          fundTx.add(
            createTransferInstruction(
              userAta,
              burnerAta,
              wallet.publicKey,
              totalAmountMinor,
            ),
          );
        }

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash("confirmed");
        fundTx.recentBlockhash = blockhash;
        fundTx.feePayer = wallet.publicKey;
        const signedFund = await wallet.signTransaction(fundTx);
        const fundSig = await connection.sendRawTransaction(signedFund.serialize(), {
          skipPreflight: false,
        });
        await connection.confirmTransaction(
          { signature: fundSig, blockhash, lastValidBlockHeight },
          "confirmed",
        );
        setStatus({ phase: "funding-burner", sig: fundSig });

        // 4 — shield via burner
        setStatus({ phase: "shielding" });
        const client = await buildClient({ signer: burner });
        const { shieldTxSig } = await shieldForStream({
          client,
          user: burner.publicKey,
          tokenMint,
          totalAmount: totalAmountMinor,
        });
        setStatus({ phase: "shielding", sig: shieldTxSig });

        // 5 — register stream
        setStatus({ phase: "registering" });
        const firstTickAt = Date.now() + CADENCE_MS[draft.cadence];
        const regRes = await fetch("/api/streams", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            payerPubkey: wallet.publicKey.toBase58(),
            burnerPubkey: burner.publicKey.toBase58(),
            burnerKeyEnvelope: envelope,
            recipientHandle: draft.recipientHandle,
            tokenSymbol: draft.tokenSymbol,
            tokenMint: token.mint,
            amountPerTick: amountPerTickMinor.toString(),
            cadence: draft.cadence,
            totalTicks: draft.totalTicks,
            shieldTxSig,
            note: draft.note,
            firstTickAt,
          }),
        });

        if (!regRes.ok) {
          const err = await regRes.json().catch(() => ({}));
          throw new Error(err?.error ?? "Failed to register stream");
        }
        const { stream } = await regRes.json();

        setStatus({ phase: "done", streamId: stream.id });
      } catch (error) {
        console.error(error);
        setStatus({
          phase: "error",
          message: error instanceof Error ? error.message : "unknown error",
        });
      }
    },
    [wallet, connection],
  );

  return { status, create };
}
