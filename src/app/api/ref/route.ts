import { connection, type NextRequest } from "next/server";
import { route } from "@/lib/http";
import { getEntry, refOwner } from "@/lib/wl";

export async function GET(req: NextRequest) {
  await connection();
  return route(async () => {
    const owner = await refOwner(req.nextUrl.searchParams.get("code") ?? "");
    const e = owner ? await getEntry(owner) : null;
    return { valid: !!e, handle: e?.follow_status === "approved" ? e.x_handle ?? null : null };
  });
}
