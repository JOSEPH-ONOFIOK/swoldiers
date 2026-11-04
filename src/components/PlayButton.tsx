"use client";
import Link from "next/link";
import { utc } from "@/lib/client";
import { useSite } from "@/lib/hooks";

// Opens the demo until launch day, then the game.
export function PlayButton({ className = "" }: { className?: string }) {
  const { site } = useSite();
  return (
    <Link href="/play" className={`btn ${site?.launched ? "" : "ghost"} ${className}`} title={site?.launchAt && !site.launched ? "Full game opens " + utc(site.launchAt) : undefined}>
      {site?.launched ? "Play now" : "Play the demo"}
    </Link>
  );
}
