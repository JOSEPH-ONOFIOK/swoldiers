// Everything a non-developer may want to change lives here or in the environment.
// NEXT_PUBLIC_* values are read at build time, so redeploy after changing them.

const env = (v: string | undefined) => (v && v.trim()) || "";
const time = (v: string | undefined) => {
  const t = Date.parse(env(v));
  return Number.isFinite(t) ? t : null;
};

// grade: the military rank shown for that prize band (stars = insignia size)
export type Prize = { from: number; to: number; amount: number; grade: string; stars: number };

const PRIZES: Prize[] = [
  { from: 1, to: 1, amount: 1_000_000, grade: "General", stars: 4 },
  { from: 2, to: 2, amount: 750_000, grade: "Colonel", stars: 3 },
  { from: 3, to: 3, amount: 500_000, grade: "Major", stars: 2 },
  { from: 4, to: 10, amount: 250_000, grade: "Captain", stars: 1 },
  { from: 11, to: 50, amount: 150_000, grade: "Lieutenant", stars: 0 },
];

export const CONFIG = {
  name: "Swoldiers",
  tagline: "A top-down pixel war MMO. Bulk up at Fort Gainz, push through five fronts, raid the Black Site and topple the Citadel.",
  siteUrl: (env(process.env.NEXT_PUBLIC_SITE_URL) || "http://localhost:3000").replace(/\/$/, ""),
  // X account without the @, and the announcement post people reply to
  xAccount: env(process.env.NEXT_PUBLIC_X_ACCOUNT) || "swoldiers",
  xPost: env(process.env.NEXT_PUBLIC_X_POST),
  token: {
    symbol: "$SWOL",
    chain: env(process.env.NEXT_PUBLIC_TOKEN_CHAIN), // e.g. "Base"
    ca: env(process.env.NEXT_PUBLIC_TOKEN_CA),
    explorer: env(process.env.NEXT_PUBLIC_TOKEN_EXPLORER), // e.g. https://basescan.org
  },
  launchAt: time(process.env.NEXT_PUBLIC_LAUNCH_AT),
  whitelist: {
    // ISO time, e.g. 2026-11-20T20:00:00Z. Empty = open with no end.
    end: time(process.env.NEXT_PUBLIC_WHITELIST_END),
    closed: env(process.env.NEXT_PUBLIC_WHITELIST_CLOSED) === "1",
    points: { joined: 100, follow: 50, comment: 50, referral: 50 },
    prizes: PRIZES,
    winners: PRIZES[PRIZES.length - 1].to,
    prizeTotal: PRIZES.reduce((s, p) => s + p.amount * (p.to - p.from + 1), 0),
    perkTop: 200,
    perk: "1 free recruit mint",
    perkGrade: "Sergeant",
  },
};

export const xUrl = `https://x.com/${CONFIG.xAccount}`;

export function gradeFor(rank: number) {
  const w = CONFIG.whitelist;
  return w.prizes.find((p) => rank >= p.from && rank <= p.to)?.grade ?? (w.perkTop && rank <= w.perkTop ? w.perkGrade : "Private");
}

export function rewardFor(rank: number) {
  return CONFIG.whitelist.prizes.find((p) => rank >= p.from && rank <= p.to)?.amount ?? 0;
}

export function whitelistOpen(now = Date.now()) {
  const w = CONFIG.whitelist;
  return !w.closed && (!w.end || now < w.end);
}
