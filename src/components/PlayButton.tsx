"use client";
import { utc } from "@/lib/client";
import { useSite } from "@/lib/hooks";

// "Play · Soon" until launch day.
export function PlayButton({ className = "" }: { className?: string }) {
  const { site } = useSite();
  if (site?.launched)
    return (
      <a href="/play" className={`btn ${className}`}>
        Play now
      </a>
    );
  return (
    <span className={`btn ghost off ${className}`} aria-disabled title={site?.launchAt ? "Opens " + utc(site.launchAt) : "Opens soon"}>
      Play · Soon
    </span>
  );
}
