import Link from "next/link";
import { Footer } from "./Footer";
import { Nav } from "./Nav";

export const DOCS = [
  { href: "/docs", label: "Getting started" },
  { href: "/docs/world", label: "Fronts" },
  { href: "/docs/enemies", label: "Enemies" },
  { href: "/docs/combat", label: "Combat and skills" },
  { href: "/docs/whitelist", label: "Whitelist" },
];

export function DocsShell({ title, lead, current, children }: { title: string; lead: string; current: string; children: React.ReactNode }) {
  const i = DOCS.findIndex((d) => d.href === current);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  return (
    <>
      <Nav />
      <div className="relative border-b border-line">
        <div className="grid-bg grid-fade absolute inset-0 -z-10 opacity-50" aria-hidden />
        <div className="mx-auto max-w-7xl px-5 pt-14 pb-10">
          <p className="kicker">
            Docs <span className="text-muted">/ {String(i + 1).padStart(2, "0")}</span>
          </p>
          <h1 className="mt-3 text-[clamp(38px,5.5vw,64px)]">{title}</h1>
          <p className="mt-4 max-w-3xl text-lg text-khaki">{lead}</p>
        </div>
      </div>
      <main className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[230px_1fr]">
        <aside className="md:sticky md:top-24 md:self-start">
          <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label="Docs">
            {DOCS.map((p, n) => {
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
          <p className="muted mt-6 hidden text-xs md:block">Swoldiers is in development. Numbers can change before launch.</p>
        </aside>
        <article className="prose-docs min-w-0 max-w-3xl">
          {children}
          <div className="mt-14 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            {prev ? (
              <Link href={prev.href} className="hud block p-4 no-underline! transition-colors hover:border-signal">
                <span className="font-pixel text-[10px] tracking-widest text-muted uppercase">← Previous</span>
                <span className="mt-1 block font-semibold text-sand">{prev.label}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={next.href} className="hud block p-4 text-right no-underline! transition-colors hover:border-signal">
                <span className="font-pixel text-[10px] tracking-widest text-muted uppercase">Next →</span>
                <span className="mt-1 block font-semibold text-sand">{next.label}</span>
              </Link>
            ) : null}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
