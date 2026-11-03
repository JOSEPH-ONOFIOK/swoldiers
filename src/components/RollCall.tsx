"use client";
import Link from "next/link";
import { CONFIG } from "@/lib/config";
import { useBoard } from "@/lib/hooks";
import { RollTable } from "./RollTable";

export function RollCall() {
  const board = useBoard();
  return (
    <div className="hud p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="kicker bare">
          <span className="blink text-red">●</span> {board?.final ? "Final roll call" : "Live roll call"}
        </span>
        <span className="font-pixel text-[11px] text-muted">Pay in {CONFIG.token.symbol}</span>
      </div>
      <div className="mt-4">
        {!board ? (
          <p className="muted">Reading the roster…</p>
        ) : !board.top.length ? (
          <p className="muted">No one on the roster yet. Enlist first and take the top spot.</p>
        ) : (
          <>
            <RollTable board={board} limit={10} />
            <p className="muted mt-4 text-sm">
              <Link href="/whitelist#roll" className="text-signal underline underline-offset-2">
                Full roster, top {CONFIG.whitelist.winners}
              </Link>{" "}
              · Ties go to whoever enlisted first.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
