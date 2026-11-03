import { connection } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  await connection();
  const s = await getSession();
  return Response.json({ signedIn: !!s, address: s?.a ?? null });
}
