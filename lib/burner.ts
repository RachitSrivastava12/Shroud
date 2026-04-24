/**
 * Burner key envelope
 * --------------------
 * Each stream owns a burner Solana keypair. The burner:
 *   - receives enough SOL for rent + tx fees from the user's main wallet
 *   - receives the total stream amount (shielded by the burner itself)
 *   - is the signer for every `transferToUsernameDeposit` tick
 *
 * Trust model:
 *   The burner's secret key is encrypted with AES-GCM using a server-side
 *   SCHEDULER_SECRET and stored in the stream record. It is ONLY decrypted
 *   in-memory during a scheduled tick and never logged.
 *
 *   If the server is compromised, the blast radius is capped at the sum of
 *   remaining balances in active streams. The user's main wallet is NEVER
 *   touched by the scheduler.
 *
 * Alternative we considered: wallet pre-signs N off-chain authorizations.
 * Rejected because it requires cooperation from the Loyal program's signer
 * check and complicates the UX. Burner model is simpler and equally safe
 * for a hackathon/bounty MVP.
 */

import { Keypair } from "@solana/web3.js";
import { webcrypto } from "node:crypto";
import bs58 from "bs58";

const crypto = webcrypto;

function getKeyMaterial(): Promise<CryptoKey> {
  const secret = process.env.SCHEDULER_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SCHEDULER_SECRET must be set to a >= 32 char string. Generate one with: openssl rand -base64 48",
    );
  }
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapSecretKey(kp: Keypair): Promise<string> {
  const key = await getKeyMaterial();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      kp.secretKey,
    ),
  );
  // envelope: iv (12 bytes) + ciphertext, base64
  const envelope = new Uint8Array(iv.length + ciphertext.length);
  envelope.set(iv, 0);
  envelope.set(ciphertext, iv.length);
  return Buffer.from(envelope).toString("base64");
}

export async function unwrapSecretKey(envelope: string): Promise<Keypair> {
  const key = await getKeyMaterial();
  const buf = Buffer.from(envelope, "base64");
  const iv = buf.subarray(0, 12);
  const ciphertext = buf.subarray(12);
  const secretKey = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    ),
  );
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Generate a fresh burner for a stream. Caller is responsible for funding it.
 */
export function newBurner(): { keypair: Keypair; pubkey: string; secretKeyBase58: string } {
  const kp = Keypair.generate();
  return {
    keypair: kp,
    pubkey: kp.publicKey.toBase58(),
    secretKeyBase58: bs58.encode(kp.secretKey),
  };
}

export function burnerFromBase58(secret: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(secret));
}
