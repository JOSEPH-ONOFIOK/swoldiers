import { makeChallenge } from "@/lib/auth";
import { body, Oops, route, str } from "@/lib/http";
import { limit } from "@/lib/limit";

export async function POST(req: Request) {
  return route(async () => {
    await limit("challenge", 30, 600);
    try {
      return makeChallenge(str((await body(req)).address, 64));
    } catch (e) {
      throw new Oops((e as Error).message);
    }
  });
}
