/**
 * Stream store
 * ------------
 * Persistence for Stream records. Upstash Redis in production, local JSON
 * file in dev so you don't need any services to run `bun dev`.
 *
 * Security note: this store holds the scheduler's signer reference and the
 * stream schedule, NOT the private keys themselves. Keys live in
 * SCHEDULER_SECRET (a single server-side hot key) and NEVER leave the backend.
 * The user signs the initial shield tx with their real wallet; for recurring
 * ticks, they pre-sign a session that authorizes only `transferDeposit` for
 * the stream's specific amount and cadence. In this MVP, the payer uses a
 * delegated PDA signer flow — see route.ts for how we authorize ticks.
 */

import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";
import type { Stream } from "./shroud";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const USE_REDIS = !!(REDIS_URL && REDIS_TOKEN);

let redis: Redis | null = null;
if (USE_REDIS) {
  redis = new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! });
}

const LOCAL_DB_PATH = path.join(process.cwd(), ".shroud-streams.json");

async function readLocal(): Promise<Record<string, Stream>> {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeLocal(data: Record<string, Stream>) {
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

export async function putStream(stream: Stream): Promise<void> {
  if (USE_REDIS && redis) {
    await redis.hset(`stream:${stream.id}`, stream as unknown as Record<string, unknown>);
    await redis.sadd(`streams:by-payer:${stream.payerPubkey}`, stream.id);
    await redis.sadd(`streams:by-recipient:${stream.recipientHandle}`, stream.id);
    if (stream.state === "active") {
      await redis.zadd("streams:active", { score: stream.nextRunAt, member: stream.id });
    } else {
      await redis.zrem("streams:active", stream.id);
    }
    return;
  }
  const db = await readLocal();
  db[stream.id] = stream;
  await writeLocal(db);
}

export async function getStream(id: string): Promise<Stream | null> {
  if (USE_REDIS && redis) {
    const s = await redis.hgetall<Stream>(`stream:${id}`);
    if (!s || !s.id) return null;
    return normalize(s);
  }
  const db = await readLocal();
  return db[id] ?? null;
}

export async function listStreamsByPayer(pubkey: string): Promise<Stream[]> {
  if (USE_REDIS && redis) {
    const ids = await redis.smembers(`streams:by-payer:${pubkey}`);
    const streams = await Promise.all(ids.map(getStream));
    return streams.filter(Boolean) as Stream[];
  }
  const db = await readLocal();
  return Object.values(db).filter((s) => s.payerPubkey === pubkey);
}

export async function listStreamsByRecipient(handle: string): Promise<Stream[]> {
  if (USE_REDIS && redis) {
    const ids = await redis.smembers(`streams:by-recipient:${handle}`);
    const streams = await Promise.all(ids.map(getStream));
    return streams.filter(Boolean) as Stream[];
  }
  const db = await readLocal();
  return Object.values(db).filter((s) => s.recipientHandle === handle);
}

export async function listDueStreams(now: number, limit = 50): Promise<Stream[]> {
  if (USE_REDIS && redis) {
    const ids = await redis.zrange<string[]>("streams:active", 0, now, {
      byScore: true,
      offset: 0,
      count: limit,
    });
    const streams = await Promise.all(ids.map(getStream));
    return streams.filter(Boolean) as Stream[];
  }
  const db = await readLocal();
  return Object.values(db).filter(
    (s) => s.state === "active" && s.nextRunAt <= now,
  );
}

function normalize(s: any): Stream {
  return {
    ...s,
    executedTicks: Number(s.executedTicks ?? 0),
    totalTicks: Number(s.totalTicks),
    nextRunAt: Number(s.nextRunAt),
    createdAt: Number(s.createdAt),
  };
}
