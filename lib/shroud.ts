/**
 * Shroud core library
 * -------------------
 * Thin, opinionated wrapper over @loyal-labs/private-transactions that turns
 * the shield / transfer / unshield primitives into a "stream" abstraction.
 *
 * A stream = one shielded deposit funded up front, then N private transfers
 * executed on PER over time by our scheduler.
 *
 * Why this works:
 *   - modifyBalance + delegateDeposit hit base Solana exactly ONCE (on create)
 *     and ONCE (on cancel/unshield). Everything in between happens inside PER.
 *   - transferToUsernameDeposit only mutates the `amount` field inside the TEE.
 *     External observers cannot see it. This is what makes "recurring" viable
 *     without leaking a payment schedule on-chain.
 */

import {
  LoyalPrivateTransactionsClient,
  ER_VALIDATOR,
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  findDepositPda,
  findUsernameDepositPda,
  solToLamports,
  lamportsToSol,
  LAMPORTS_PER_SOL,
  type DepositData,
  type UsernameDepositData,
} from "@loyal-labs/private-transactions";
import {
  Keypair,
  PublicKey,
  type Commitment,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";

// ─── config ─────────────────────────────────────────────────────────────

export const NETWORK = (process.env.NEXT_PUBLIC_SHROUD_NETWORK ?? "devnet") as
  | "devnet"
  | "mainnet";

export const BASE_RPC =
  NETWORK === "mainnet"
    ? process.env.NEXT_PUBLIC_MAINNET_RPC ?? "https://api.mainnet-beta.solana.com"
    : process.env.NEXT_PUBLIC_DEVNET_RPC ?? "https://api.devnet.solana.com";

export const EPHEMERAL_RPC =
  NETWORK === "mainnet"
    ? "https://mainnet-tee.magicblock.app"
    : "https://tee.magicblock.app";

export const EPHEMERAL_WS =
  NETWORK === "mainnet"
    ? "wss://mainnet-tee.magicblock.app"
    : "wss://tee.magicblock.app";

// Known mints we show in the UI. USDC on devnet uses the standard devnet mint.
export const TOKENS = {
  devnet: {
    SOL: { mint: NATIVE_MINT.toBase58(), decimals: 9, symbol: "SOL" },
    USDC: {
      mint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
      decimals: 6,
      symbol: "USDC",
    },
  },
  mainnet: {
    SOL: { mint: NATIVE_MINT.toBase58(), decimals: 9, symbol: "SOL" },
    USDC: {
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      symbol: "USDC",
    },
  },
} as const;

export type TokenInfo = (typeof TOKENS)[keyof typeof TOKENS][keyof (typeof TOKENS)["devnet"]];

export function getToken(symbol: "SOL" | "USDC"): TokenInfo {
  return TOKENS[NETWORK][symbol];
}

// ─── stream model ───────────────────────────────────────────────────────

export type Cadence = "daily" | "weekly" | "monthly";

export const CADENCE_MS: Record<Cadence, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export interface Stream {
  id: string;
  payerPubkey: string;        // user's main wallet — for UI ownership only
  burnerPubkey: string;       // stream-owned burner, signer of all ticks
  burnerKeyEnvelope: string;  // AES-GCM wrapped secret key (server-only decrypts)
  recipientHandle: string;    // telegram handle (no @)
  tokenSymbol: "SOL" | "USDC";
  tokenMint: string;
  amountPerTick: string;      // in minor units (lamports / USDC base units)
  cadence: Cadence;
  totalTicks: number;
  executedTicks: number;
  nextRunAt: number;          // unix ms
  createdAt: number;
  state: "active" | "paused" | "cancelled" | "completed";
  shieldTxSig: string | null;
  note?: string;
}

export interface StreamSummary {
  remaining: string;       // minor units still shielded
  consumed: string;        // minor units paid out
  nextRunAt: number;
  ticksLeft: number;
}

// ─── client ──────────────────────────────────────────────────────────────

export interface BuildClientOpts {
  signer: Keypair | Record<string, unknown>;
  commitment?: Commitment;
}

export async function buildClient(opts: BuildClientOpts) {
  return LoyalPrivateTransactionsClient.fromConfig({
    signer: opts.signer,
    baseRpcEndpoint: BASE_RPC,
    ephemeralRpcEndpoint: EPHEMERAL_RPC,
    ephemeralWsEndpoint: EPHEMERAL_WS,
    commitment: opts.commitment ?? "confirmed",
  });
}

// ─── primitives ──────────────────────────────────────────────────────────

/**
 * Shield: wallet -> private deposit, fully delegated to PER.
 * Call ONCE per stream creation with the total amount (amountPerTick * totalTicks).
 *
 * Returns the signature of the final delegate tx (the one that matters for "is this live").
 */
export async function shieldForStream(params: {
  client: LoyalPrivateTransactionsClient;
  user: PublicKey;
  tokenMint: PublicKey;
  totalAmount: bigint;
}): Promise<{ shieldTxSig: string }> {
  const { client, user, tokenMint, totalAmount } = params;

  // 1. Init deposit (idempotent)
  await client.initializeDeposit({ user, tokenMint, payer: user });

  // 2. Transfer real tokens from user's ATA into program vault
  const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user, true);
  const fundResult = await client.modifyBalance({
    user,
    tokenMint,
    payer: user,
    amount: totalAmount,
    increase: true,
    userTokenAccount,
  });

  // 3. Permission for PER (idempotent)
  await client.createPermission({ user, tokenMint, payer: user });

  // 4. Delegate to TEE validator
  const delegateSig = await client.delegateDeposit({
    user,
    tokenMint,
    payer: user,
    validator: ER_VALIDATOR,
  });

  return { shieldTxSig: delegateSig ?? fundResult.signature };
}

/**
 * Execute one private tick: transfer `amount` from payer's PER deposit
 * to the recipient's username deposit. Happens entirely inside PER.
 */
export async function tickStream(params: {
  client: LoyalPrivateTransactionsClient;
  user: PublicKey;
  tokenMint: PublicKey;
  recipientHandle: string;
  amount: bigint;
}): Promise<string> {
  const { client, user, tokenMint, recipientHandle, amount } = params;
  return client.transferToUsernameDeposit({
    user,
    payer: user,
    tokenMint,
    username: recipientHandle,
    amount,
    sessionToken: null,
  });
}

/**
 * Cancel: undelegate + withdraw remaining shielded tokens back to wallet.
 */
export async function cancelStream(params: {
  client: LoyalPrivateTransactionsClient;
  user: PublicKey;
  tokenMint: PublicKey;
  remaining: bigint;
}): Promise<{ undelegateSig: string; refundSig?: string }> {
  const { client, user, tokenMint, remaining } = params;

  const undelegateSig = await client.undelegateDeposit({
    user,
    tokenMint,
    payer: user,
    sessionToken: null,
    magicProgram: MAGIC_PROGRAM_ID,
    magicContext: MAGIC_CONTEXT_ID,
  });

  let refundSig: string | undefined;
  if (remaining > 0n) {
    const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, user, true);
    const r = await client.modifyBalance({
      user,
      tokenMint,
      payer: user,
      amount: remaining,
      increase: false,
      userTokenAccount,
    });
    refundSig = r.signature;
  }

  return { undelegateSig, refundSig };
}

// ─── queries ─────────────────────────────────────────────────────────────

export async function getShieldedBalance(
  client: LoyalPrivateTransactionsClient,
  user: PublicKey,
  tokenMint: PublicKey,
): Promise<{ baseAmount: bigint; ephemeralAmount: bigint; isDelegated: boolean }> {
  const [base, ephemeral] = await Promise.all([
    client.getBaseDeposit(user, tokenMint),
    client.getEphemeralDeposit(user, tokenMint),
  ]);
  return {
    baseAmount: base?.amount ?? 0n,
    ephemeralAmount: ephemeral?.amount ?? 0n,
    isDelegated: !!ephemeral && (!base || base.amount === 0n),
  };
}

export async function getUsernameInbox(
  client: LoyalPrivateTransactionsClient,
  handle: string,
  tokenMint: PublicKey,
): Promise<{ amount: bigint; exists: boolean }> {
  const ephemeral = await client.getEphemeralUsernameDeposit(handle, tokenMint);
  if (ephemeral) return { amount: ephemeral.amount, exists: true };
  const base = await client.getBaseUsernameDeposit(handle, tokenMint);
  return { amount: base?.amount ?? 0n, exists: !!base };
}

// ─── formatting ──────────────────────────────────────────────────────────

export function toDisplay(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const frac = amount % divisor;
  if (frac === 0n) return whole.toString();
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function toMinor(amount: number, decimals: number): bigint {
  const [whole, frac = ""] = amount.toString().split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export function summarize(stream: Stream): StreamSummary {
  const perTick = BigInt(stream.amountPerTick);
  const executed = BigInt(stream.executedTicks);
  const total = BigInt(stream.totalTicks);
  return {
    consumed: (perTick * executed).toString(),
    remaining: (perTick * (total - executed)).toString(),
    nextRunAt: stream.nextRunAt,
    ticksLeft: stream.totalTicks - stream.executedTicks,
  };
}

// ─── handle validation (mirrors SDK's on-chain rules) ────────────────────

export function validateHandle(handle: string): string | null {
  const h = handle.replace(/^@/, "").toLowerCase();
  if (h.length < 5 || h.length > 32) return "Handle must be 5–32 characters";
  if (!/^[a-z0-9_]+$/.test(h)) return "Handle may only contain a-z, 0-9, _";
  return null;
}

export function normalizeHandle(handle: string): string {
  return handle.replace(/^@/, "").toLowerCase();
}

// ─── re-exports ──────────────────────────────────────────────────────────

export {
  ER_VALIDATOR,
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  findDepositPda,
  findUsernameDepositPda,
  solToLamports,
  lamportsToSol,
  LAMPORTS_PER_SOL,
  LoyalPrivateTransactionsClient,
};
export type { DepositData, UsernameDepositData };
