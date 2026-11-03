"use client";
import { fmt, left } from "@/lib/client";
import { CONFIG } from "@/lib/config";
import { useBoard, useNow, useSite } from "@/lib/hooks";

// Status strip that scrolls under the hero.
export function Ticker() {
  const { site, skew } = useSite();
  const now = useNow(skew, !!site?.end);
  const board = useBoard(60_000);
  const w = CONFIG.whitelist;
  const items = [
    site ? (site.open ? "Recruitment open" : "Recruitment closed") : "Recruitment office",
    site?.open && site.end && now ? `Closes in ${left(site.end - now)}` : null,
    `${fmt(w.prizeTotal)} ${CONFIG.token.symbol} for the top ${w.winners}`,
    board ? `${fmt(board.total)} enlisted` : null,
    w.perkTop ? `Top ${fmt(w.perkTop)}: ${w.perk}` : null,
    "Free to join · wallet + X",
  ].filter(Boolean) as string[];
  const run = (k: string) =>
    items.map((t, i) => (
      <span key={k + i} className="flex items-center gap-6 px-6">
        {t}
        <span aria-hidden>✦</span>
      </span>
    ));
  return (
    <div className="ticker border-y border-black bg-signal py-2.5 font-pixel text-[13px] tracking-[0.12em] text-ink uppercase" role="marquee" aria-label={items.join(". ")}>
      <div>
        {run("a")}
        {run("b")}
      </div>
    </div>
  );
}
