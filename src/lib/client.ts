// Browser helpers shared by the client components.

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  let j: (T & { error?: string }) | null = null;
  try {
    j = await r.json();
  } catch {}
  if (!j) throw new ApiError("Could not reach the server. Try again.", r.status);
  if (!r.ok) throw new ApiError(j.error || "Something went wrong. Try again.", r.status);
  return j;
}

export const fmt = (n: number) => Number(n).toLocaleString("en-US");

// Times are always UTC and say so.
export const utc = (t: number) =>
  new Date(t).toLocaleString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) +
  " UTC";

export function left(ms: number) {
  if (ms <= 0) return "0m";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60, s = Math.floor(ms / 1e3) % 60;
  return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

export const short = (a: string) => a.slice(0, 6) + "…" + a.slice(-4);

export type SiteState = { now: number; open: boolean; end: number | null; launchAt: number | null; launched: boolean; ready: boolean };
export type BoardRow = { rank: number; handle: string | null; points: number; reward: number; me: boolean };
export type Board = { final: boolean; total: number; top: BoardRow[] };
