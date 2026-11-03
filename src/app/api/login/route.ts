import { checkChallenge, clientIpHash, startSession } from "@/lib/auth";
import { whitelistOpen } from "@/lib/config";
import { body, Oops, route, str } from "@/lib/http";
import { kv } from "@/lib/kv";
import { limit } from "@/lib/limit";
import { createEntry, getEntry } from "@/lib/wl";

// Verify the signed message, start a session and, while the whitelist is open, join.
export async function POST(req: Request) {
  return route(async () => {
    await limit("login", 20, 600);
    const b = await body(req);
    let who: { address: string; nonce: string };
    try {
      who = await checkChallenge(str(b.id, 2000), str(b.signature, 2000));
    } catch (e) {
      throw new Oops((e as Error).message);
    }
    if (!(await kv.setnx(`nonce:${who.nonce}`, "1", 900))) throw new Oops("That sign-in was already used. Try again.");
    let entry = await getEntry(who.address);
    if (!entry && whitelistOpen()) entry = await createEntry(who.address, await clientIpHash(), str(b.ref, 6).toLowerCase());
    await startSession(who.address);
    return { signedIn: true, address: who.address, joined: !!entry };
  });
}
