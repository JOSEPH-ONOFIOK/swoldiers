import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { whitelistOpen } from "@/lib/config";
import { route } from "@/lib/http";
import { getBoard } from "@/lib/wl";

export async function GET() {
  await connection();
  return route(async () => {
    const [board, s] = await Promise.all([getBoard(), getSession()]);
    return {
      final: !whitelistOpen() && process.env.WHITELIST_FINAL === "1",
      total: board.total,
      top: board.top.map(({ address, ...r }) => ({ ...r, me: address === s?.a })),
    };
  });
}
