import { randomBytes } from "node:crypto";
import { CONFIG, rewardFor } from "./config";
import { kv } from "./kv";
import { flushMirror, queueMirror } from "./mirror";

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
export const BOARD = "board"; // sorted set: every wallet by score
const REFS = (a: string) => `refs:${a}`; // friends who count for this wallet
const INVITES = (a: string) => `inv:${a}`; // everyone who used this wallet's link
const PENDING = { follow: "q:follow", comment: "q:comment" };
const APPROVED = { follow: "ok:follow", comment: "ok:comment" };
const MISSION_LOG = "m:log"; // sorted set of "wallet|mission" by time
const TOP = "board:top";
const TOP_LOCK = "board:lock";

// ---------- entries ----------
export async function getEntry(address: string) {
  const v = await kv.get(E(address));
  if (!v) return null;
  const e = JSON.parse(v) as Entry;
  loaded.set(e, seenAs(e));
  return e;
}

// What a wallet looked like when read, so a save only touches what changed.
const loaded = new WeakMap<Entry, { follow: Review; comment: Review; base: number }>();
const seenAs = (e: Entry) => ({ follow: e.follow_status, comment: e.status, base: pointsOf(e, 0) });

async function moveLists(address: string, kind: "follow" | "comment", was: Review, now: Review) {
  if (was === now) return;
  await Promise.all([
    now === "pending" ? kv.sadd(PENDING[kind], address) : was === "pending" ? kv.srem(PENDING[kind], address) : null,
    now === "approved" ? kv.sadd(APPROVED[kind], address) : was === "approved" ? kv.srem(APPROVED[kind], address) : null,
  ]);
}

async function rescore(e: Entry) {
  await kv.zadd(BOARD, boardScore(pointsOf(e, await kv.scard(REFS(e.address))), e.joinedAt), e.address);
}

// A friend counts once their follow is approved and they aren't on the inviter's network.
async function creditInviter(e: Entry, wasApproved: boolean) {
  const nowApproved = e.follow_status === "approved";
  if (!e.referredBy || wasApproved === nowApproved) return;
  const inviter = await getEntry(e.referredBy);
  if (!inviter || inviter.ip === e.ip) return;
  await (nowApproved ? kv.sadd(REFS(inviter.address), e.address) : kv.srem(REFS(inviter.address), e.address));
  await rescore(inviter);
  await queueMirror(inviter.address); // their points moved, so their sheet row should too
}

export async function putEntry(e: Entry) {
  e.updatedAt = Date.now();
  await kv.set(E(e.address), JSON.stringify(e));
  const was = loaded.get(e);
  const now = seenAs(e);
  loaded.set(e, now);
  await Promise.all([
    moveLists(e.address, "follow", was?.follow ?? "none", e.follow_status),
    moveLists(e.address, "comment", was?.comment ?? "none", e.status),
    !was || was.base !== now.base ? rescore(e) : null,
  ]);
  await creditInviter(e, was?.follow === "approved");
  await queueMirror(e.address);
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
  await kv.sadd(ENTRIES, address);
  if (e.referredBy) await kv.sadd(INVITES(e.referredBy), address);
  await putEntry(e);
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

function pointsOf(e: Entry, refs: number) {
  const mpts = Object.values(e.missions).reduce((s, m) => s + m.pts, 0);
  return P.joined + (e.follow_status === "approved" ? P.follow : 0) + (e.status === "approved" ? P.comment : 0) + refs * P.referral + mpts;
}

// Whole points, with a fraction that is higher the earlier a wallet joined: ties go to the first in.
const boardScore = (points: number, joinedAt: number) => points + 1 - joinedAt / 2e13;
export const pointsFrom = (score: number | null) => (score === null ? 0 : Math.floor(score));

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
      return { e, points: pointsOf(e, r), refs: r, mpts };
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

// The whole ranking, read from every wallet. Heavy: only for the admin export.
export async function ranking() {
  const entries = await allEntries();
  return { entries, rows: score(entries) };
}

// ---------- the public board ----------
export type BoardTop = { at: number; total: number; top: { address: string; handle: string | null; rank: number; points: number; reward: number }[] };

const BOARD_MAX_AGE = 120_000;
let held: { until: number; value: BoardTop | null } = { until: 0, value: null };

async function rebuildBoard(): Promise<BoardTop> {
  const [rows, total] = await Promise.all([kv.ztop(BOARD, CONFIG.whitelist.winners), kv.zcard(BOARD)]);
  const vals = await kv.mget(rows.map((r) => E(r.member)));
  const value: BoardTop = {
    at: Date.now(),
    total,
    top: rows.map((r, i) => {
      const e = vals[i] ? (JSON.parse(vals[i]!) as Entry) : null;
      return { address: r.member, handle: e?.follow_status === "approved" ? e.x_handle ?? null : null, rank: i + 1, points: pointsFrom(r.score), reward: rewardFor(i + 1) };
    }),
  };
  await kv.set(TOP, JSON.stringify(value));
  return value;
}

// One small saved copy shared by every visitor, so the board costs the same with 100 wallets or 100,000.
export async function getBoard() {
  if (held.value && Date.now() < held.until) return held.value;
  const saved = await kv.get(TOP);
  let value = saved ? (JSON.parse(saved) as BoardTop) : null;
  if ((!value || Date.now() - value.at > BOARD_MAX_AGE) && (await kv.setnx(TOP_LOCK, "1", 60))) {
    value = await rebuildBoard();
    await flushMirror().catch((e) => console.error("Sheet copy failed", e)); // catches anything a busy minute left behind
  }
  value ??= await rebuildBoard();
  held = { until: Date.now() + 60_000, value };
  return value;
}

// One wallet's standing, without loading anyone else.
export async function standing(e: Entry) {
  const [rank, refs, sent, board] = await Promise.all([kv.zrank(BOARD, e.address), kv.scard(REFS(e.address)), kv.scard(INVITES(e.address)), getBoard()]);
  if (rank === null) return null;
  return { rank: rank + 1, points: pointsOf(e, refs), reward: rewardFor(rank + 1), refs, mpts: Object.values(e.missions).reduce((s, m) => s + m.pts, 0), total: Math.max(board.total, rank + 1), sent };
}

// ---------- the admin queue ----------
const QUEUE_SHOWN = 100;
async function entriesIn(set: string) {
  const addrs = (await kv.smembers(set)).slice(0, QUEUE_SHOWN);
  const vals = await kv.mget(addrs.map(E));
  return vals.filter(Boolean).map((v) => JSON.parse(v!) as Entry);
}

export async function adminQueue() {
  const [follows, comments, total, followApproved, commentApproved, followWaiting, commentWaiting] = await Promise.all([
    entriesIn(PENDING.follow), entriesIn(PENDING.comment), kv.zcard(BOARD), kv.scard(APPROVED.follow), kv.scard(APPROVED.comment), kv.scard(PENDING.follow), kv.scard(PENDING.comment),
  ]);
  return { follows, comments, stats: { total, followApproved, commentApproved, followWaiting, commentWaiting } };
}

export const logMission = (address: string, id: string, at: number) => kv.zadd(MISSION_LOG, at, `${address}|${id}`);

// The newest mission comments. Ones removed since simply no longer match their wallet.
export async function recentMissions(count = 300) {
  const log = (await kv.ztop(MISSION_LOG, count)).map((r) => r.member.split("|") as [string, string]);
  const addrs = [...new Set(log.map(([a]) => a))];
  const vals = await kv.mget(addrs.map(E));
  const byAddr = new Map(vals.filter(Boolean).map((v) => JSON.parse(v!) as Entry).map((e) => [e.address, e]));
  return log.flatMap(([address, id]) => {
    const e = byAddr.get(address), m = e?.missions[id];
    return m ? [{ address, x_handle: e?.x_handle ?? null, id, ...m }] : [];
  });
}

export async function everyWallet() {
  return kv.smembers(ENTRIES);
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
