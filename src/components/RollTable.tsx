"use client";
import { fmt, type Board } from "@/lib/client";
import { gradeFor } from "@/lib/config";

export function RollTable({ board, limit }: { board: Board; limit?: number }) {
  const rows = limit ? board.top.slice(0, limit) : board.top;
  return (
    <table className="roll">
      <thead>
        <tr>
          <th>#</th>
          <th>Soldier</th>
          <th className="hidden sm:table-cell">Grade</th>
          <th className="r">Points</th>
          <th className="r">Pay</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.rank} className={r.me ? "me" : ""}>
            <td className="font-pixel text-xs text-signal">{String(r.rank).padStart(2, "0")}</td>
            <td>
              {r.handle ? "@" + r.handle : <span className="text-muted">Recruit</span>}
              {r.me ? <span className="chip gold ml-2">You</span> : null}
            </td>
            <td className="hidden text-khaki sm:table-cell">{gradeFor(r.rank)}</td>
            <td className="r">{fmt(r.points)}</td>
            <td className="r">{r.reward ? `${fmt(r.reward)}` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
