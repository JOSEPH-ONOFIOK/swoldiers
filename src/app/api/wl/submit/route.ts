import { CONFIG } from "@/lib/config";
import { body, Oops, route, str } from "@/lib/http";
import { limit } from "@/lib/limit";
import { requireEntry, requireOpen, stateFor } from "@/lib/state";
import { claimPost, isNewer, parseStatus, putEntry, releasePost } from "@/lib/wl";

// The reply to the announcement post. It goes to review.
export async function POST(req: Request) {
  return route(async () => {
    requireOpen();
    await limit("submit", 20, 600);
    const e = await requireEntry();
    if (!e.x_handle) throw new Oops("Send your X username first.");
    if (e.status === "approved") throw new Oops("Your comment is already approved.");
    const p = parseStatus(str((await body(req)).post_url, 300));
    if (!p) throw new Oops("Paste the link of your comment. It looks like x.com/you/status/123…");
    if (p.author.toLowerCase() !== e.x_handle.toLowerCase()) throw new Oops(`The comment must come from @${e.x_handle}.`);
    const target = parseStatus(CONFIG.xPost);
    if (target && p.id === target.id) throw new Oops("That is our post. Paste the link of your own comment.");
    if (target && !isNewer(p.id, target.id)) throw new Oops("That post is older than ours. Comment on our post, then paste that link.");
    if (!(await claimPost(p.id, e.address))) throw new Oops("That post was already sent.");
    const old = e.post_url ? parseStatus(e.post_url) : null;
    if (old && old.id !== p.id) await releasePost(old.id);
    e.post_url = p.url;
    e.status = "pending";
    e.note = undefined;
    await putEntry(e);
    return stateFor(e.address, e);
  });
}
