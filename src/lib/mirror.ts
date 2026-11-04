import { after } from "next/server";
import { kv } from "./kv";
import type { Entry } from "./wl";

// Upstash is the database. This keeps a readable copy in a Google Sheet.
// Players never wait for the sheet: changed wallets are listed, then sent in batches.
const URL_ = process.env.GOOGLE_SHEETS_WEBAPP_URL;
const SECRET = process.env.SHEETS_WEBHOOK_SECRET;
const DIRTY = "mirror:dirty";
const LOCK = "mirror:lock";
const BATCH = 300;

export const mirrorOn = !!URL_;

let lastTry = 0;

export async function queueMirror(address: string) {
  if (!URL_) return;
  await kv.sadd(DIRTY, address);
  if (Date.now() - lastTry < 30_000) return; // no need to ask for the lock on every save
  lastTry = Date.now();
  after(() => flushMirror().catch((e) => console.error("Sheet copy failed", e)));
}

async function send(rows: unknown[]) {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "bulk", rows, secret: SECRET }),
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Sheets web app returned ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(`Sheets web app: ${data.error}`);
}

// At most one batch every 30 seconds. Anything that fails stays listed for the next one.
export async function flushMirror(force = false) {
  if (!URL_) return { sent: 0, waiting: 0 };
  if (!force && !(await kv.setnx(LOCK, "1", 30))) return { sent: 0, waiting: await kv.scard(DIRTY) };
  const dirty = await kv.smembers(DIRTY);
  const batch = dirty.slice(0, BATCH);
  if (!batch.length) return { sent: 0, waiting: 0 };
  // Off the list first: a save during the send lists the wallet again, so it can't be missed.
  await kv.srem(DIRTY, ...batch);
  try {
    const [vals, scores] = await Promise.all([kv.mget(batch.map((a) => `e:${a}`)), kv.zscores("board", batch)]);
    const rows = batch.flatMap((address, i) => {
      if (!vals[i]) return [];
      // the hashed IP stays in the database
      return [{ ...(JSON.parse(vals[i]!) as Entry), ip: undefined, points: Math.floor(scores[i] ?? 0) }];
    });
    await send(rows);
    return { sent: rows.length, waiting: dirty.length - batch.length };
  } catch (e) {
    await kv.sadd(DIRTY, ...batch);
    throw e;
  }
}

/** Lists every wallet again, for a new sheet or after a long outage. */
export async function resyncMirror(addresses: string[]) {
  for (let i = 0; i < addresses.length; i += 1000) await kv.sadd(DIRTY, ...addresses.slice(i, i + 1000));
  return flushMirror(true);
}
