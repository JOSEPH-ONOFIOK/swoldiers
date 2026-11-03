import { requireAdmin } from "@/lib/admin";
import { body, Oops, route, str } from "@/lib/http";
import { getEntry, putEntry } from "@/lib/wl";

// Approve or reject a follow or a comment. A rejection can carry a note the player sees.
export async function POST(req: Request) {
  return route(async () => {
    await requireAdmin();
    const b = await body(req);
    const e = await getEntry(str(b.address, 64).toLowerCase());
    if (!e) throw new Oops("No such wallet.", 404);
    const ok = b.ok === true;
    const note = str(b.note, 200) || undefined;
    if (b.kind === "follow") {
      e.follow_status = ok ? "approved" : "rejected";
      e.follow_note = ok ? undefined : note ?? "We could not see the follow. Follow us, then send again.";
    } else if (b.kind === "comment") {
      e.status = ok ? "approved" : "rejected";
      e.note = ok ? undefined : note ?? "We could not find a matching comment. Check the link and send again.";
    } else throw new Oops("Unknown review.");
    await putEntry(e);
    return { ok: true };
  });
}
