import { promises as fs } from "node:fs";
import path from "node:path";

// A tiny key-value layer with two backends:
//   Upstash Redis  when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (use this in production)
//   Local file     .data/db.json, for `next dev` only

export interface KV {
  get(key: string): Promise<string | null>;
  mget(keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string): Promise<void>;
  // Set only if missing. Returns true when this call created it.
  setnx(key: string, value: string, ttlSec?: number): Promise<boolean>;
  del(key: string): Promise<void>;
  sadd(set: string, member: string): Promise<void>;
  smembers(set: string): Promise<string[]>;
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
  sadd: async (s, m) => void (await redis("SADD", s, m)),
  smembers: (s) => redis("SMEMBERS", s),
  async hit(k, windowSec) {
    const n = await redis<number>("INCR", k);
    if (n === 1) await redis("EXPIRE", k, windowSec);
    return n;
  },
};

// ---------- local file (dev only) ----------
type FileDB = { kv: Record<string, { v: string; exp?: number }>; sets: Record<string, string[]> };
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
  async sadd(s, m) {
    const d = await load();
    const set = (d.sets[s] ??= []);
    if (!set.includes(m)) set.push(m);
    await save();
  },
  smembers: async (s) => [...((await load()).sets[s] ?? [])],
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
