import { randomBytes } from "node:crypto";
import { CONFIG, rewardFor } from "./config";
import { kv } from "./kv";

export type Review = "none" | "pending" | "approved" | "rejected";

export type Entry = {
  address: string; // lowercase
  joinedAt: number;
  ref: string; // own invite code
  referredBy?: string; // inviter's address
  ip: string; // hashed, for the same-network referral rule
  x_handle?: string;
  follow_status: Review;
  follow_note?: string;
  status: Review; // the reply to the announcement post
  post_url?: string;
  note?: string;
  missions: Record<string, { url: string; at: number; pts: number }>;
  updatedAt: number;
};

export type Mission = { id: string; title: string; post: string; points: number; active: boolean; createdAt: number };

// ---------- keys ----------
const E = (a: string) => `e:${a}`;
const ENTRIES = "entries";
const REF = (c: string) => `ref:${c}`;
const HANDLE = (h: string) => `h:${h.toLowerCase()}`;
const POST = (id: string) => `p:${id}`;
const MISSIONS = "missions";

// ---------- entries ----------
export async function getEntry(address: string) {
  const v = await kv.get(E(address));
  return v ? (JSON.parse(v) as Entry) : null;
}

export async function putEntry(e: Entry) {
  e.updatedAt = Date.now();
  await kv.set(E(e.address), JSON.stringify(e));
  board.at = 0;
}

export async function allEntries() {
  const addrs = await kv.smembers(ENTRIES);
  const out: Entry[] = [];
  for (let i = 0; i < addrs.length; i += 500) {
    const vals = await kv.mget(addrs.slice(i, i + 500).map(E));
    for (const v of vals) if (v) out.push(JSON.parse(v) as Entry);
  }
  return out;
}

export async function refOwner(code: string) {
  return /^[a-z0-9]{6}$/.test(code) ? kv.get(REF(code)) : null;
}

export async function createEntry(address: string, ip: string, refCode?: string) {
  let ref = "";
  for (let i = 0; i < 8 && !ref; i++) {
    const c = randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
    if (c.length === 6 && (await kv.setnx(REF(c), address))) ref = c;
  }
  if (!ref) throw new Error("Could not create your invite code. Try again.");
  const inviter = refCode ? await refOwner(refCode) : null;
  const e: Entry = {
    address,
    joinedAt: Date.now(),
    ref,
    referredBy: inviter && inviter !== address ? inviter : undefined,
    ip,
    follow_status: "none",
    status: "none",
    missions: {},
    updatedAt: Date.now(),
  };
  await putEntry(e);
  await kv.sadd(ENTRIES, address);
  return e;
}

// One X account per wallet. Returns false when another wallet holds it.
export async function claimHandle(handle: string, address: string, previous?: string) {
  const owner = await kv.get(HANDLE(handle));
  if (owner && owner !== address) return false;
  if (!owner && !(await kv.setnx(HANDLE(handle), address)) && (await kv.get(HANDLE(handle))) !== address) return false;
  if (previous && previous.toLowerCase() !== handle.toLowerCase()) await kv.del(HANDLE(previous));
  return true;
}

// Each post counts once across everyone.
export async function claimPost(id: string, owner: string) {
  const cur = await kv.get(POST(id));
  if (cur) return cur === owner;
  return kv.setnx(POST(id), owner);
}
export const releasePost = (id: string) => kv.del(POST(id));

// ---------- missions ----------
export async function getMissions(): Promise<Mission[]> {
  const v = await kv.get(MISSIONS);
  return v ? (JSON.parse(v) as Mission[]) : [];
}
export const putMissions = (m: Mission[]) => kv.set(MISSIONS, JSON.stringify(m));

// ---------- X links ----------
const HANDLE_RE = /^@?([A-Za-z0-9_]{1,15})$/;
const PROFILE_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/i;
const STATUS_RE = /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/i;

export function parseHandle(input: string) {
  const s = input.trim();
  return (HANDLE_RE.exec(s) ?? PROFILE_RE.exec(s))?.[1] ?? null;
}

export function parseStatus(input: string) {
  const m = STATUS_RE.exec(input.trim());
  return m ? { author: m[1], id: m[2], url: `https://x.com/${m[1]}/status/${m[2]}` } : null;
}

// Post IDs grow over time, so a reply must have a bigger ID than the post it answers.
export const isNewer = (id: string, than: string) => BigInt(id) > BigInt(than);

// ---------- scoring ----------
export type Scored = {
  address: string;
  handle: string | null;
  points: number;
  refs: number;
  mpts: number;
  rank: number;
  reward: number;
};

const P = CONFIG.whitelist.points;

function score(entries: Entry[]) {
  const byAddr = new Map(entries.map((e) => [e.address, e]));
  const refs = new Map<string, number>();
  for (const e of entries) {
    if (!e.referredBy || e.follow_status !== "approved") continue;
    const inviter = byAddr.get(e.referredBy);
    if (!inviter || inviter.ip === e.ip) continue; // same network does not count
    refs.set(inviter.address, (refs.get(inviter.address) ?? 0) + 1);
  }
  return entries
    .map((e) => {
      const r = refs.get(e.address) ?? 0;
      const mpts = Object.values(e.missions).reduce((s, m) => s + m.pts, 0);
      const points =
        P.joined + (e.follow_status === "approved" ? P.follow : 0) + (e.status === "approved" ? P.comment : 0) + r * P.referral + mpts;
      return { e, points, refs: r, mpts };
    })
    .sort((a, b) => b.points - a.points || a.e.joinedAt - b.e.joinedAt)
    .map(({ e, points, refs, mpts }, i): Scored => ({
      address: e.address,
      // only a reviewed handle is shown publicly
      handle: e.follow_status === "approved" ? e.x_handle ?? null : null,
      points,
      refs,
      mpts,
      rank: i + 1,
      reward: rewardFor(i + 1),
    }));
}

// The whole ranking, kept for a few seconds per server.
const board = { at: 0, rows: [] as Scored[], entries: [] as Entry[] };
export async function ranking(fresh = false) {
  if (fresh || Date.now() - board.at > 15_000) {
    board.entries = await allEntries();
    board.rows = score(board.entries);
    board.at = Date.now();
  }
  return board;
}

// What the owner of an entry may see about it.
export function publicEntry(e: Entry) {
  return {
    address: e.address,
    ref_code: e.ref,
    x_handle: e.x_handle ?? null,
    follow_status: e.follow_status,
    follow_note: e.follow_status === "rejected" ? e.follow_note ?? null : null,
    status: e.status,
    post_url: e.post_url ?? null,
    note: e.status === "rejected" ? e.note ?? null : null,
    invited: !!e.referredBy,
  };
}
