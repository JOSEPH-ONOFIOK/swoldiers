import { clientIpHash } from "./auth";
import { Oops } from "./http";
import { kv } from "./kv";

// Fixed-window limit per visitor network. Throws when over.
export async function limit(name: string, max: number, windowSec: number) {
  const n = await kv.hit(`rl:${name}:${await clientIpHash()}`, windowSec);
  if (n > max) throw new Oops("Too many tries. Wait a minute and try again.", 429);
}
