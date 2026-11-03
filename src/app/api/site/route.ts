import { connection } from "next/server";
import { CONFIG, whitelistOpen } from "@/lib/config";
import { storage } from "@/lib/kv";

export async function GET() {
  await connection();
  const w = CONFIG.whitelist;
  return Response.json({
    now: Date.now(),
    open: whitelistOpen(),
    end: w.end,
    launchAt: CONFIG.launchAt,
    launched: !!CONFIG.launchAt && Date.now() >= CONFIG.launchAt,
    ready: storage !== "none",
  });
}
