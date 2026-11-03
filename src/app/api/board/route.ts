import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { CONFIG, whitelistOpen } from "@/lib/config";
import { route } from "@/lib/http";
import { ranking } from "@/lib/wl";

export async function GET() {
  await connection();
  return route(async () => {
    const [{ rows }, s] = await Promise.all([ranking(), getSession()]);
    return {
      final: !whitelistOpen() && process.env.WHITELIST_FINAL === "1",
      total: rows.length,
      top: rows.slice(0, CONFIG.whitelist.winners).map((r) => ({
        rank: r.rank,
        handle: r.handle,
        points: r.points,
        reward: r.reward,
        me: r.address === s?.a,
      })),
    };
  });
}
