import { fmt } from "@/lib/client";
import { CONFIG } from "@/lib/config";
import { Insignia } from "./Insignia";

// The prize table as a ladder of military ranks.
export function PayGrades({ compact = false }: { compact?: boolean }) {
  const w = CONFIG.whitelist;
  const T = CONFIG.token.symbol;
  const span = (p: (typeof w.prizes)[number]) => (p.from === p.to ? `#${p.from}` : `#${p.from}–${p.to}`);
  return (
    <ol className="grid gap-px overflow-hidden border border-line bg-line">
      {w.prizes.map((p) => (
        <li key={p.from} className={`grid grid-cols-[72px_1fr_auto] items-center gap-3 bg-panel ${compact ? "px-3 py-2.5" : "px-4 py-3.5"}`}>
          <span className="flex justify-center">
            <Insignia grade={p.grade} stars={p.stars} size={compact ? 13 : 16} />
          </span>
          <span>
            <b className={`stencil block ${compact ? "text-base" : "text-lg"}`}>{p.grade}</b>
            <span className="font-pixel text-[10px] tracking-widest text-muted">{span(p)}</span>
          </span>
          <span className="text-right">
            <b className="tabular-nums">{fmt(p.amount)}</b>
            <span className="block text-xs text-muted">
              {T}
              {p.to > p.from ? " each" : ""}
            </span>
          </span>
        </li>
      ))}
      {w.perkTop ? (
        <li className={`grid grid-cols-[72px_1fr_auto] items-center gap-3 bg-bg2 ${compact ? "px-3 py-2.5" : "px-4 py-3.5"}`}>
          <span className="flex justify-center">
            <Insignia grade={w.perkGrade} size={compact ? 16 : 20} />
          </span>
          <span>
            <b className={`stencil block ${compact ? "text-base" : "text-lg"}`}>{w.perkGrade}</b>
            <span className="font-pixel text-[10px] tracking-widest text-muted">Top {fmt(w.perkTop)}</span>
          </span>
          <b className="text-right text-green">{w.perk}</b>
        </li>
      ) : null}
    </ol>
  );
}
