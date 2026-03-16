/**
 * Redis client (singleton) + cache helpers.
 * Uses ioredis for MariaDB-like connection reliability.
 */
import Redis from "ioredis";
import { FINAL_RESULTS_MODE } from "@/lib/results-mode";

let client: Redis | null = null;
let subClient: Redis | null = null;

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || "192.168.0.142",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy(times: number) {
    return Math.min(times * 200, 5000);
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};

/**
 * Get the main Redis client (for get/set/publish).
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(REDIS_CONFIG);
    client.on("error", (err) => console.error("[Redis]", err.message));
    client.connect().catch(() => {});
  }
  return client;
}

/**
 * Get a separate subscriber client (subscribe mode locks the connection).
 */
export function getSubscriber(): Redis {
  if (!subClient) {
    subClient = new Redis(REDIS_CONFIG);
    subClient.on("error", (err) => console.error("[Redis-sub]", err.message));
    subClient.connect().catch(() => {});
  }
  return subClient;
}

// ── Cache helpers ────────────────────────────────────────────────────

const DEFAULT_TTL = 120; // seconds

/**
 * Get a cached value, parsed from JSON.
 */
export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  if (FINAL_RESULTS_MODE) return null;
  try {
    const raw = await getRedis().get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cache value as JSON with optional TTL.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl = DEFAULT_TTL
): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    // Cache failures are non-fatal
  }
}

/**
 * Delete one or more cache keys.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    if (keys.length) await getRedis().del(...keys);
  } catch {
    // non-fatal
  }
}

/**
 * Publish a message on a channel (for SSE push).
 */
export async function publish(
  channel: string,
  data: unknown
): Promise<void> {
  try {
    await getRedis().publish(channel, JSON.stringify(data));
  } catch {
    // non-fatal
  }
}

// Channel name constants
export const CHANNEL_ELECTION_UPDATE = "election:update";
