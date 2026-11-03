import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { route } from "@/lib/http";
import { getMissions, ranking } from "@/lib/wl";

export async function GET() {
  await connection();
  return route(async () => {
    await requireAdmin();
    const { entries, rows } = await ranking(true);
    const rank = new Map(rows.map((r) => [r.address, r]));
    const view = (e: (typeof entries)[number]) => ({
      address: e.address,
      x_handle: e.x_handle ?? null,
      follow_status: e.follow_status,
      status: e.status,
      post_url: e.post_url ?? null,
      joinedAt: e.joinedAt,
      updatedAt: e.updatedAt,
      points: rank.get(e.address)?.points ?? 0,
      rank: rank.get(e.address)?.rank ?? 0,
      missions: e.missions,
    });
    const byTime = (a: { updatedAt: number }, b: { updatedAt: number }) => a.updatedAt - b.updatedAt;
    return {
      stats: {
        total: entries.length,
        followApproved: entries.filter((e) => e.follow_status === "approved").length,
        commentApproved: entries.filter((e) => e.status === "approved").length,
      },
      follows: entries.filter((e) => e.follow_status === "pending").sort(byTime).map(view),
      comments: entries.filter((e) => e.status === "pending").sort(byTime).map(view),
      missionPosts: entries
        .flatMap((e) => Object.entries(e.missions).map(([id, m]) => ({ address: e.address, x_handle: e.x_handle ?? null, id, ...m })))
        .sort((a, b) => b.at - a.at)
        .slice(0, 300),
      missions: await getMissions(),
    };
  });
}
