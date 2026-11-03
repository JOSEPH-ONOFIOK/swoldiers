import { connection } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ranking } from "@/lib/wl";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // keep spreadsheet apps from running formulas
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export async function GET() {
  await connection();
  if (!(await isAdmin())) return new Response("Sign in as admin.", { status: 401 });
  const { rows, entries } = await ranking(true);
  const byAddr = new Map(entries.map((e) => [e.address, e]));
  const head = ["rank", "wallet", "x_handle", "points", "reward", "follow", "comment", "comment_url", "referrals", "mission_points", "joined_utc"];
  const lines = rows.map((r) => {
    const e = byAddr.get(r.address)!;
    return [r.rank, r.address, e.x_handle, r.points, r.reward, e.follow_status, e.status, e.post_url, r.refs, r.mpts, new Date(e.joinedAt).toISOString()]
      .map(cell)
      .join(",");
  });
  return new Response([head.join(","), ...lines].join("\n"), {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="swoldiers-whitelist.csv"' },
  });
}
