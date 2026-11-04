import { promises as fs } from "node:fs";
import path from "node:path";

// A tiny key-value layer with two backends:
//   Upstash Redis  when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (use this in production)
//   Local file     .data/db.json, for `next dev` only
// A Google Sheet can receive a copy of the whitelist too: see lib/mirror.ts.

export interface KV {
  get(key: string): Promise<string | null>;
  mget(keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string): Promise<void>;
  // Set only if missing. Returns true when this call created it.
  setnx(key: string, value: string, ttlSec?: number): Promise<boolean>;
  del(key: string): Promise<void>;
  sadd(set: string, ...members: string[]): Promise<void>;
  srem(set: string, ...members: string[]): Promise<void>;
  scard(set: string): Promise<number>;
  smembers(set: string): Promise<string[]>;
  // Sorted sets: the live leaderboard. Highest score first.
  zadd(zset: string, score: number, member: string): Promise<void>;
  ztop(zset: string, count: number): Promise<{ member: string; score: number }[]>;
  zrank(zset: string, member: string): Promise<number | null>; // 0 is the top
  zcard(zset: string): Promise<number>;
  zscores(zset: string, members: string[]): Promise<(number | null)[]>;
  // Fixed window counter. Returns the count after this hit.
  hit(key: string, windowSec: number): Promise<number>;
}

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis<T>(...cmd: (string | number)[]): Promise<T> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

const upstash: KV = {
  get: (k) => redis("GET", k),
  mget: async (ks) => (ks.length ? redis("MGET", ...ks) : []),
  set: async (k, v) => void (await redis("SET", k, v)),
  setnx: async (k, v, ttl) => (await redis<string | null>("SET", k, v, "NX", ...(ttl ? ["EX", ttl] : []))) === "OK",
  del: async (k) => void (await redis("DEL", k)),
  sadd: async (s, ...m) => void (m.length && (await redis("SADD", s, ...m))),
  srem: async (s, ...m) => void (m.length && (await redis("SREM", s, ...m))),
  scard: (s) => redis("SCARD", s),
  smembers: (s) => redis("SMEMBERS", s),
  zadd: async (z, score, m) => void (await redis("ZADD", z, score, m)),
  async ztop(z, count) {
    const flat = await redis<string[]>("ZRANGE", z, 0, count - 1, "REV", "WITHSCORES");
    const out: { member: string; score: number }[] = [];
    for (let i = 0; i < flat.length; i += 2) out.push({ member: flat[i], score: Number(flat[i + 1]) });
    return out;
  },
  zrank: (z, m) => redis("ZREVRANK", z, m),
  zcard: (z) => redis("ZCARD", z),
  zscores: async (z, ms) => (ms.length ? (await redis<(string | null)[]>("ZMSCORE", z, ...ms)).map((v) => (v === null ? null : Number(v))) : []),
  async hit(k, windowSec) {
    const n = await redis<number>("INCR", k);
    if (n === 1) await redis("EXPIRE", k, windowSec);
    return n;
  },
};

// ---------- local file (dev only) ----------
type FileDB = { kv: Record<string, { v: string; exp?: number }>; sets: Record<string, string[]>; zsets?: Record<string, Record<string, number>> };
const FILE = path.join(process.cwd(), ".data", "db.json");
let db: FileDB | null = null;
let queue = Promise.resolve();

async function load(): Promise<FileDB> {
  if (db) return db;
  try {
    db = JSON.parse(await fs.readFile(FILE, "utf8")) as FileDB;
  } catch {
    db = { kv: {}, sets: {} };
  }
  return db;
}
function save() {
  queue = queue.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db));
  });
  return queue;
}
const sortedZ = (d: FileDB, z: string) =>
  Object.entries(d.zsets?.[z] ?? {})
    .map(([member, score]) => ({ member, score }))
    .sort((a, b) => b.score - a.score);
const live = (d: FileDB, k: string) => {
  const e = d.kv[k];
  if (e?.exp && e.exp < Date.now()) delete d.kv[k];
  return d.kv[k];
};

const file: KV = {
  get: async (k) => live(await load(), k)?.v ?? null,
  mget: async (ks) => {
    const d = await load();
    return ks.map((k) => live(d, k)?.v ?? null);
  },
  async set(k, v) {
    (await load()).kv[k] = { v };
    await save();
  },
  async setnx(k, v, ttl) {
    const d = await load();
    if (live(d, k)) return false;
    d.kv[k] = { v, exp: ttl ? Date.now() + ttl * 1000 : undefined };
    await save();
    return true;
  },
  async del(k) {
    delete (await load()).kv[k];
    await save();
  },
  async sadd(s, ...m) {
    const d = await load();
    const set = (d.sets[s] ??= []);
    for (const x of m) if (!set.includes(x)) set.push(x);
    await save();
  },
  async srem(s, ...m) {
    const d = await load();
    d.sets[s] = (d.sets[s] ?? []).filter((x) => !m.includes(x));
    await save();
  },
  scard: async (s) => ((await load()).sets[s] ?? []).length,
  smembers: async (s) => [...((await load()).sets[s] ?? [])],
  async zadd(z, score, m) {
    const d = await load();
    ((d.zsets ??= {})[z] ??= {})[m] = score;
    await save();
  },
  ztop: async (z, count) => sortedZ(await load(), z).slice(0, count),
  async zrank(z, m) {
    const i = sortedZ(await load(), z).findIndex((r) => r.member === m);
    return i < 0 ? null : i;
  },
  zcard: async (z) => Object.keys((await load()).zsets?.[z] ?? {}).length,
  zscores: async (z, ms) => {
    const set = (await load()).zsets?.[z] ?? {};
    return ms.map((m) => set[m] ?? null);
  },
  async hit(k, windowSec) {
    const d = await load();
    const e = live(d, k);
    const n = e ? Number(e.v) + 1 : 1;
    d.kv[k] = { v: String(n), exp: e?.exp ?? Date.now() + windowSec * 1000 };
    return n;
  },
};

export const storage: "upstash" | "file" | "none" =
  URL_ && TOKEN ? "upstash" : process.env.NODE_ENV !== "production" ? "file" : "none";

export class NotConfigured extends Error {
  constructor() {
    super("The whitelist database is not set up yet. Add the Upstash settings and redeploy.");
  }
}

const off = new Proxy({} as KV, {
  get: () => async () => {
    throw new NotConfigured();
  },
});

export const kv: KV = storage === "upstash" ? upstash : storage === "file" ? file : off;
