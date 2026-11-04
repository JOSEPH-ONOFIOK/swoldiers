import { body, Oops, route, str } from "@/lib/http";
import { limit } from "@/lib/limit";
import { requireEntry, requireOpen, stateFor } from "@/lib/state";
import { claimPost, getMissions, isNewer, logMission, parseStatus, putEntry } from "@/lib/wl";

// Extra missions: reply to one of our posts. Points count at once and are checked later.
export async function POST(req: Request) {
  return route(async () => {
    requireOpen();
    await limit("mission", 30, 600);
    const e = await requireEntry();
    if (e.follow_status !== "approved") throw new Oops("Missions open once your follow is approved.");
    const b = await body(req);
    const m = (await getMissions()).find((x) => x.id === str(b.id, 40));
    if (!m || !m.active) throw new Oops("That mission is over.");
    if (e.missions[m.id]) throw new Oops("You already did this mission.");
    const p = parseStatus(str(b.post_url, 300));
    if (!p) throw new Oops("Paste the link of your comment. It looks like x.com/you/status/123…");
    if (p.author.toLowerCase() !== e.x_handle?.toLowerCase()) throw new Oops(`The comment must come from @${e.x_handle}.`);
    const target = parseStatus(m.post);
    if (target && !isNewer(p.id, target.id)) throw new Oops("That post is older than ours. Comment on our post, then paste that link.");
    if (!(await claimPost(p.id, e.address))) throw new Oops("That post was already sent.");
    e.missions[m.id] = { url: p.url, at: Date.now(), pts: m.points };
    await putEntry(e);
    await logMission(e.address, m.id, e.missions[m.id].at);
    return stateFor(e.address, e);
  });
}
