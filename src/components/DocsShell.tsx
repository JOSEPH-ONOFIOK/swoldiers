import Link from "next/link";
import { DocsNav } from "./DocsNav";
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
        <div className="mx-auto max-w-7xl px-5 pt-10 pb-8 md:pt-14 md:pb-10">
          <p className="kicker">
            Docs <span className="text-muted">/ {String(i + 1).padStart(2, "0")}</span>
          </p>
          <h1 className="mt-3 text-[clamp(38px,5.5vw,64px)]">{title}</h1>
          <p className="mt-4 max-w-3xl text-base text-khaki sm:text-lg">{lead}</p>
        </div>
      </div>
      <main className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-8 px-5 py-8 md:grid-cols-[230px_minmax(0,1fr)] md:gap-10 md:py-12">
        <aside className="sticky top-[64px] z-30 -mx-5 min-w-0 border-b border-line bg-bg/95 px-5 py-2 backdrop-blur md:top-24 md:mx-0 md:self-start md:border-0 md:bg-transparent md:p-0">
          <DocsNav pages={DOCS} current={current} />
          <p className="muted mt-6 hidden text-xs md:block">Swoldiers is in development. Numbers can change before launch.</p>
        </aside>
        <article className="prose-docs min-w-0 max-w-3xl">
          {children}
          <div className="mt-14 grid grid-cols-2 gap-3 border-t border-line pt-6">
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
