import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/admin";
import { body, Oops, route, str } from "@/lib/http";
import { getMissions, parseStatus, putMissions } from "@/lib/wl";

export async function POST(req: Request) {
  return route(async () => {
    await requireAdmin();
    const b = await body(req);
    const list = await getMissions();
    if (b.action === "add") {
      const post = parseStatus(str(b.post, 300));
      if (!post) throw new Oops("Paste the link of the post to reply to.");
      const points = Math.round(Number(b.points));
      if (!(points > 0 && points <= 10_000)) throw new Oops("Points must be between 1 and 10000.");
      list.push({ id: randomBytes(4).toString("hex"), title: str(b.title, 80) || "Comment on our post", post: post.url, points, active: true, createdAt: Date.now() });
    } else {
      const m = list.find((x) => x.id === str(b.id, 40));
      if (!m) throw new Oops("No such mission.", 404);
      if (b.action === "toggle") m.active = !m.active;
      else if (b.action === "remove") list.splice(list.indexOf(m), 1);
      else throw new Oops("Unknown action.");
    }
    await putMissions(list);
    return { missions: list };
  });
}
