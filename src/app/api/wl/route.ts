import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { Oops, route } from "@/lib/http";
import { stateFor } from "@/lib/state";

export async function GET() {
  await connection();
  return route(async () => {
    const s = await getSession();
    if (!s) throw new Oops("Connect your wallet first.", 401);
    return stateFor(s.a);
  });
}
