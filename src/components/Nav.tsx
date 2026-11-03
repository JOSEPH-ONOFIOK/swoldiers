"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api, short } from "@/lib/client";
import { xUrl } from "@/lib/config";

const LINKS = [
  { href: "/#orders", label: "Orders" },
  { href: "/#ranks", label: "Ranks" },
  { href: "/#campaign", label: "Campaign" },
  { href: "/docs", label: "Docs" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<string | null>(null);
  const path = usePathname();

  useEffect(() => {
    api<{ signedIn: boolean; address: string | null }>("/api/me").then((m) => setMe(m.signedIn ? m.address : null)).catch(() => {});
  }, []);

  const logout = async () => {
    try {
      await api("/api/logout", {});
    } catch {}
    location.reload();
  };

  const link = "px-3 py-2 font-pixel text-[12px] tracking-[0.14em] uppercase transition-colors hover:text-signal";
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <nav className="mx-auto flex h-[64px] max-w-7xl items-center gap-3 px-5">
        <Link href="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/recruit.jpg" alt="" width={34} height={34} className="pixel rounded-full ring-2 ring-signal" />
          <span className="stencil text-[20px] tracking-wide">
            SWOL<span className="text-signal">DIERS</span>
          </span>
        </Link>
        <button className="ml-auto font-pixel text-xs tracking-widest text-signal uppercase md:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Menu"}
        </button>
        <div
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-[64px] flex-col gap-1 border-b border-line bg-bg p-5 md:static md:ml-auto md:flex md:flex-row md:items-center md:gap-0 md:border-0 md:bg-transparent md:p-0`}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`${link} ${path.startsWith(l.href) && l.href !== "/" ? "text-signal" : "text-khaki"}`}
            >
              {l.label}
            </Link>
          ))}
          <a href={xUrl} target="_blank" rel="noopener" className={`${link} text-khaki`}>
            X ↗
          </a>
          {me ? (
            <span className="flex items-center gap-2 md:ml-3">
              <span className="font-pixel text-[11px] text-muted">{short(me)}</span>
              <button className="btn sm ghost" onClick={logout}>
                Log out
              </button>
            </span>
          ) : null}
          <Link href="/whitelist" className="btn sm md:ml-3" onClick={() => setOpen(false)}>
            Enlist
          </Link>
        </div>
      </nav>
    </header>
  );
}
