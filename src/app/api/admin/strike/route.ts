import { requireAdmin } from "@/lib/admin";
import { body, Oops, route, str } from "@/lib/http";
import { getEntry, parseStatus, putEntry, releasePost } from "@/lib/wl";

// Remove a fake or deleted mission comment and its points. The player can send a new one.
export async function POST(req: Request) {
  return route(async () => {
    await requireAdmin();
    const b = await body(req);
    const e = await getEntry(str(b.address, 64).toLowerCase());
    const id = str(b.id, 40);
    if (!e || !e.missions[id]) throw new Oops("Nothing to remove.", 404);
    const p = parseStatus(e.missions[id].url);
    if (p) await releasePost(p.id);
    delete e.missions[id];
    await putEntry(e);
    return { ok: true };
  });
}
