"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

// Docs menu. On phones it is a sideways strip, so bring the current page into view.
export function DocsNav({ pages, current }: { pages: { href: string; label: string }[]; current: string }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = nav.current;
    const on = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && on && el.scrollWidth > el.clientWidth) el.scrollLeft = on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2;
  }, [current]);
  return (
    <nav ref={nav} className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:flex-col md:px-0" aria-label="Docs">
      {pages.map((p, n) => {
        const on = p.href === current;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 border-l-2 px-3 py-2 text-[15px] font-semibold transition-colors ${on ? "border-signal bg-panel text-sand" : "border-line text-khaki hover:border-khaki hover:text-sand"}`}
          >
            <span className={`font-pixel text-[10px] ${on ? "text-signal" : "text-muted"}`}>{String(n + 1).padStart(2, "0")}</span>
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
