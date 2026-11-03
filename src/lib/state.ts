import { getSession } from "./auth";
import { whitelistOpen } from "./config";
import { Oops } from "./http";
import { getEntry, getMissions, publicEntry, ranking, type Entry } from "./wl";

export async function requireEntry() {
  const s = await getSession();
  if (!s) throw new Oops("Connect your wallet first.", 401);
  const e = await getEntry(s.a);
  if (!e) throw new Oops("This wallet is not on the whitelist.", 403);
  return e;
}

export function requireOpen() {
  if (!whitelistOpen()) throw new Oops("The whitelist is closed.");
}

// Everything the whitelist page shows for a signed-in wallet.
export async function stateFor(address: string, entry?: Entry | null) {
  const e = entry === undefined ? await getEntry(address) : entry;
  const running = whitelistOpen();
  if (!e) return { joined: false, running };
  const { rows, entries } = await ranking(true);
  const me = rows.find((r) => r.address === address);
  const invited = entries.filter((x) => x.referredBy === address);
  const missions = (await getMissions())
    .filter((m) => m.active || e.missions[m.id])
    .map((m) => ({ id: m.id, title: m.title, post: m.post, points: m.points, active: m.active, done: e.missions[m.id]?.url ?? null }));
  return {
    joined: true,
    running,
    entry: publicEntry(e),
    score: me ? { rank: me.rank, points: me.points, reward: me.reward, refs: me.refs, mpts: me.mpts, total: rows.length } : null,
    invites: { sent: invited.length, approved: me?.refs ?? 0 },
    missions,
  };
}
