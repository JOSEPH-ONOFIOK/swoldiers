import { body, Oops, route, str } from "@/lib/http";
import { limit } from "@/lib/limit";
import { requireEntry, requireOpen, stateFor } from "@/lib/state";
import { claimHandle, parseHandle, putEntry } from "@/lib/wl";

// Send (or change) the X username for the follow check.
export async function POST(req: Request) {
  return route(async () => {
    requireOpen();
    await limit("follow", 20, 600);
    const e = await requireEntry();
    const handle = parseHandle(str((await body(req)).handle, 60));
    if (!handle) throw new Oops("Type your X username, like @yourname.");
    if (e.follow_status === "approved" || e.status === "pending" || e.status === "approved")
      throw new Oops("Your username is locked now.");
    if (!(await claimHandle(handle, e.address, e.x_handle))) throw new Oops("That X account is already used by another wallet.");
    e.x_handle = handle;
    e.follow_status = "pending";
    e.follow_note = undefined;
    await putEntry(e);
    return stateFor(e.address, e);
  });
}
