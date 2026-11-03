import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { isAddress, verifyMessage } from "viem";

const SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-only-secret");
const secure = process.env.NODE_ENV === "production";
const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };

export const SESSION_COOKIE = "swol_session";
export const ADMIN_COOKIE = "swol_admin";
const SESSION_DAYS = 30;

// ---------- signed values: base64url(json).hmac ----------
export function sign(data: object) {
  if (!SECRET) throw new Error("SESSION_SECRET is not set.");
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${body}.${createHmac("sha256", SECRET).update(body).digest("base64url")}`;
}

export function unsign<T>(value: string | undefined | null): T | null {
  if (!value || !SECRET) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", SECRET).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

// ---------- wallet sign-in (a signed message, no transaction) ----------
type Challenge = { a: string; n: string; t: number };
const CHALLENGE_MIN = 10;

const challengeText = (c: Challenge) =>
  [
    "Sign in to the Swoldiers whitelist.",
    "",
    "This is a free message. It is not a transaction and costs no gas.",
    "",
    `Wallet: ${c.a}`,
    `Nonce: ${c.n}`,
    `Issued: ${new Date(c.t).toISOString()}`,
  ].join("\n");

export function makeChallenge(address: string) {
  if (!isAddress(address)) throw new Error("That is not a wallet address.");
  const c: Challenge = { a: address, n: randomBytes(12).toString("hex"), t: Date.now() };
  return { id: sign(c), message: challengeText(c) };
}

// Returns the lowercased address and nonce when the signature matches the challenge.
export async function checkChallenge(id: string, signature: string) {
  const c = unsign<Challenge>(id);
  if (!c || Date.now() - c.t > CHALLENGE_MIN * 60e3) throw new Error("The sign-in expired. Try again.");
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) throw new Error("The signature is not valid.");
  const ok = await verifyMessage({
    address: c.a as `0x${string}`,
    message: challengeText(c),
    signature: signature as `0x${string}`,
  }).catch(() => false);
  if (!ok) throw new Error("The signature does not match this wallet.");
  return { address: c.a.toLowerCase(), nonce: c.n };
}

// ---------- session ----------
type Session = { a: string; iat: number };

export async function getSession() {
  const s = unsign<Session>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s || Date.now() - s.iat > SESSION_DAYS * 864e5) return null;
  return s;
}

export async function startSession(address: string) {
  (await cookies()).set({ name: SESSION_COOKIE, value: sign({ a: address, iat: Date.now() }), ...base, maxAge: SESSION_DAYS * 86400 });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

// ---------- admin ----------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

export function adminPasswordOk(pw: string) {
  if (!ADMIN_PASSWORD) return false;
  const a = createHash("sha256").update(pw).digest();
  const b = createHash("sha256").update(ADMIN_PASSWORD).digest();
  return timingSafeEqual(a, b);
}

export async function startAdmin() {
  (await cookies()).set({ name: ADMIN_COOKIE, value: sign({ admin: true, iat: Date.now() }), ...base, maxAge: 7 * 86400 });
}

export async function isAdmin() {
  const s = unsign<{ admin: boolean; iat: number }>((await cookies()).get(ADMIN_COOKIE)?.value);
  return !!s?.admin && !!ADMIN_PASSWORD && Date.now() - s.iat < 7 * 864e5;
}

// ---------- request helpers ----------
export async function clientIpHash() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  return createHmac("sha256", SECRET || "x").update(ip).digest("base64url").slice(0, 16);
}
