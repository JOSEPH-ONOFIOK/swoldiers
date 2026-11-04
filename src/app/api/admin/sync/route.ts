import { requireAdmin } from "@/lib/admin";
import { route } from "@/lib/http";
import { resyncMirror } from "@/lib/mirror";
import { everyWallet } from "@/lib/wl";

// Sends every wallet to the Google Sheet again, for a new sheet or after an outage.
export async function POST() {
  return route(async () => {
    await requireAdmin();
    return resyncMirror(await everyWallet());
  });
}
