import { connection } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { route } from "@/lib/http";
import { kv } from "@/lib/kv";
import { mirrorOn } from "@/lib/mirror";
import { adminQueue, BOARD, getMissions, pointsFrom, recentMissions, type Entry } from "@/lib/wl";

// Only the wallets waiting for review are read, so approving thousands stays cheap.
export async function GET() {
  await connection();
  return route(async () => {
    await requireAdmin();
    const { follows, comments, stats } = await adminQueue();
    const everyone = [...follows, ...comments];
    const scores = await kv.zscores(BOARD, everyone.map((e) => e.address));
    const points = new Map(everyone.map((e, i) => [e.address, pointsFrom(scores[i])]));
    const view = (e: Entry) => ({
      address: e.address,
      x_handle: e.x_handle ?? null,
      follow_status: e.follow_status,
      status: e.status,
      post_url: e.post_url ?? null,
      joinedAt: e.joinedAt,
      updatedAt: e.updatedAt,
      points: points.get(e.address) ?? 0,
      missions: e.missions,
    });
    const byTime = (a: { updatedAt: number }, b: { updatedAt: number }) => a.updatedAt - b.updatedAt;
    return {
      stats,
      follows: [...follows].sort(byTime).map(view),
      comments: [...comments].sort(byTime).map(view),
      missionPosts: await recentMissions(),
      missions: await getMissions(),
      sheet: mirrorOn,
    };
  });
}
