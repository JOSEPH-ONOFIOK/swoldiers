import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminPasswordOk, startAdmin } from "@/lib/auth";
import { body, Oops, route, str } from "@/lib/http";
import { limit } from "@/lib/limit";

export async function POST(req: Request) {
  return route(async () => {
    await limit("admin", 10, 600);
    if (!process.env.ADMIN_PASSWORD) throw new Oops("Set ADMIN_PASSWORD on the server first.");
    if (!adminPasswordOk(str((await body(req)).password, 200))) throw new Oops("Wrong password.", 401);
    await startAdmin();
    return { ok: true };
  });
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
