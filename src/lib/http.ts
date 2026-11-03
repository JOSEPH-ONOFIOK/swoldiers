import { NotConfigured } from "./kv";

// An error whose message is safe to show the visitor.
export class Oops extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function route(fn: () => Promise<unknown>) {
  try {
    return Response.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof Oops) return Response.json({ error: e.message }, { status: e.status });
    if (e instanceof NotConfigured) return Response.json({ error: e.message }, { status: 503 });
    console.error(e);
    return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
