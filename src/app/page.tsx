import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PayGrades } from "@/components/PayGrades";
import { PlayButton } from "@/components/PlayButton";
import { RollCall } from "@/components/RollCall";
import { Ticker } from "@/components/Ticker";
import { fmt } from "@/lib/client";
import { CONFIG, xUrl } from "@/lib/config";
import { FEATURES, FRONTS, type Front } from "@/lib/game";

const THREAT: Record<Front["danger"], number> = { None: 0, Low: 1, Medium: 2, High: 4, "Very high": 5 };

const code = (f: Front) => (f.id === "base" ? "HQ" : f.id === "raid" ? "RX" : f.tag.replace(/\D/g, "").padStart(2, "0"));

const FAQ: [string, string][] = [
  ["What is Swoldiers?", "A top-down pixel war MMO. You start at Fort Gainz, the safe base, bulk up, gear up, and fight through five fronts, a raid and two world bosses."],
  ["How do I join the whitelist?", "Connect your wallet: you are enlisted. Then follow us on X and comment on our post to earn points. We review each one."],
  ["Does joining cost anything?", "No. Signing in is a free message in your wallet. It is not a transaction and costs no gas."],
  ["Which wallets work?", "Any EVM wallet in your browser: MetaMask, Rabby, Phantom, Coinbase Wallet, Backpack and others."],
  ["When can I play?", "The launch date is announced on X. The Play button opens on launch day."],
];

function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="kicker">{kicker}</p>
      <h2 className="mt-3 text-[clamp(34px,5vw,58px)]">{title}</h2>
      {children ? <p className="mt-3 text-lg text-khaki">{children}</p> : null}
    </div>
  );
}

export default function Home() {
  const w = CONFIG.whitelist;
  const P = w.points;
  const orders = [
    { n: "01", title: "Connect your wallet", pts: `+${P.joined}`, text: "Sign a free message. You are on the whitelist at once." },
    { n: "02", title: `Follow @${CONFIG.xAccount}`, pts: `+${P.follow}`, text: "Follow on X and send your username. We check it." },
    { n: "03", title: "Answer the call", pts: `+${P.comment}`, text: "Comment on our post from that account and paste the link." },
    { n: "04", title: "Recruit your squad", pts: `+${P.referral} each`, text: "Share your invite link. Each friend with an approved follow counts." },
  ];

  return (
    <>
      <Nav />
      <main>
        {/* ---------- Hero ---------- */}
        <section className="scan relative isolate flex min-h-[min(88svh,820px)] items-end overflow-hidden">
          <div className="pixel drift absolute inset-0 -z-10 bg-cover bg-[62%_30%]" style={{ backgroundImage: "url(/media/frontline.jpg)" }} aria-hidden />
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(0deg, var(--bg) 2%, rgba(14,17,11,.75) 38%, rgba(14,17,11,.1) 75%), linear-gradient(90deg, rgba(14,17,11,.85) 0%, rgba(14,17,11,0) 60%)",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute top-24 right-[6%] hidden md:block" aria-hidden>
            <span className="stamp">NOW RECRUITING</span>
          </div>
          <div className="mx-auto w-full max-w-7xl px-5 pt-32 pb-14 sm:pb-20">
            <p className="kicker">
              Pixel war MMO <span className="text-khaki">·</span> In development
            </p>
            <h1 className="mt-4 text-[clamp(64px,13vw,176px)] leading-[0.86] drop-shadow-[0_6px_0_#000]">
              SWOL
              <br />
              <span className="text-signal">DIERS</span>
            </h1>
            <p className="mt-6 max-w-xl text-[clamp(17px,1.8vw,20px)] font-medium text-sand/90">{CONFIG.tagline}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/whitelist" className="btn">
                Enlist now →
              </Link>
              <PlayButton />
            </div>
          </div>
          <div className="pointer-events-none absolute right-5 bottom-6 hidden text-right font-pixel text-[10px] leading-5 tracking-[0.2em] text-khaki/70 uppercase lg:block" aria-hidden>
            Grid 47-N · 12-E
            <br />
            Front 03 · Dead City
            <br />
            Status: contested
          </div>
        </section>

        <Ticker />

        {/* ---------- Orders ---------- */}
        <section id="orders" className="relative">
          <div className="grid-bg grid-fade absolute inset-0 -z-10 opacity-60" aria-hidden />
          <div className="mx-auto max-w-7xl px-5 py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHead kicker="Whitelist" title="Your orders">
                Four missions, all free. Every one moves you up the roster.
              </SectionHead>
              <Link href="/whitelist" className="btn">
                Start your orders
              </Link>
            </div>
            <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {orders.map((o) => (
                <li key={o.n} className="hud flex flex-col p-6">
                  <div className="flex items-start justify-between">
                    <span className="stencil text-5xl text-line">{o.n}</span>
                    <span className="chip gold">{o.pts}</span>
                  </div>
                  <h3 className="mt-6 text-xl">{o.title}</h3>
                  <p className="muted mt-2 text-[15px]">{o.text}</p>
                </li>
              ))}
            </ol>
            <p className="muted mt-6 text-sm">
              <span className="text-signal">+</span> Bonus missions drop on X after your follow is approved.
            </p>
          </div>
        </section>

        {/* ---------- Ranks ---------- */}
        <section id="ranks" className="border-y border-line bg-bg2">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <SectionHead kicker="Rewards" title="Earn your rank">
                The top {w.winners} split {fmt(w.prizeTotal)} {CONFIG.token.symbol}, paid inside the game at launch.
              </SectionHead>
              <div className="mt-8">
                <PayGrades />
              </div>
            </div>
            <div className="lg:pt-[132px]">
              <RollCall />
            </div>
          </div>
        </section>

        {/* ---------- Armory ---------- */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-[1fr_1.05fr]">
          <div className="order-2 lg:order-1">
            <SectionHead kicker="Fort Gainz" title="Gear up. Get swol.">
              Every run starts in the armory and ends at the gym. Plates on, rifle checked, grenades packed. Then train the stats that carry you through the war.
            </SectionHead>
            <dl className="mt-8 grid gap-4">
              {[
                ["Strength", "Hit harder with every weapon", 4],
                ["Endurance", "More health, more armor", 3],
                ["Agility", "Move, roll and reload faster", 2],
              ].map(([k, v, n]) => (
                <div key={k as string} className="grid grid-cols-[110px_1fr] items-center gap-4">
                  <dt className="font-pixel text-xs tracking-widest text-signal uppercase">{k}</dt>
                  <dd>
                    <span className="flex gap-1" aria-hidden>
                      {Array.from({ length: 6 }, (_, i) => (
                        <span key={i} className={`h-2.5 flex-1 ${i < (n as number) ? "bg-signal" : "bg-line"}`} />
                      ))}
                    </span>
                    <span className="muted mt-1 block text-sm">{v}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <Link href="/docs/combat" className="btn ghost mt-8">
              Read the combat docs
            </Link>
          </div>
          <figure className="hud order-1 p-2 lg:order-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/armory.png" alt="A Swoldier straps on a plate carrier in the Fort Gainz armory" className="pixel block w-full" loading="lazy" />
            <figcaption className="flex justify-between px-2 pt-2 font-pixel text-[10px] tracking-widest text-muted uppercase">
              <span>Armory · Fort Gainz</span>
              <span>Safe zone</span>
            </figcaption>
          </figure>
        </section>

        {/* ---------- Campaign ---------- */}
        <section id="campaign" className="relative border-t border-line">
          <div className="grid-bg grid-fade absolute inset-0 -z-10 opacity-40" aria-hidden />
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-24 lg:grid-cols-[.8fr_1.2fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionHead kicker="The campaign" title="Five fronts. One war.">
                Every front is a new map with tougher enemies and better loot. Fort Gainz is the only safe ground.
              </SectionHead>
              <Link href="/docs/world" className="btn ghost mt-8">
                Front intel
              </Link>
            </div>
            <ol className="relative">
              <span className="absolute top-3 bottom-3 left-[27px] w-px bg-line" aria-hidden />
              {FRONTS.map((f) => {
                const t = THREAT[f.danger];
                const hot = t >= 4;
                return (
                  <li key={f.id} className="relative grid grid-cols-[56px_1fr] gap-5 pb-8 last:pb-0">
                    <span
                      className={`relative z-10 grid size-14 place-items-center font-pixel text-sm ${f.id === "base" ? "bg-green text-ink" : hot ? "bg-red text-white" : "bg-panel text-signal ring-1 ring-line"}`}
                    >
                      {code(f)}
                    </span>
                    <div className="border-b border-line pb-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl">{f.name}</h3>
                        <span className="font-pixel text-[10px] tracking-widest text-muted uppercase">{f.tag}</span>
                      </div>
                      <p className="mt-2 text-khaki">{f.line}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="font-pixel text-[10px] tracking-widest text-muted uppercase">Threat</span>
                        <span className="flex gap-1" aria-label={`Threat: ${f.danger}`}>
                          {Array.from({ length: 5 }, (_, n) => (
                            <span key={n} className={`h-2 w-6 ${n < t ? (hot ? "bg-red" : "bg-signal") : "bg-line"}`} />
                          ))}
                        </span>
                        <span className={`text-sm font-semibold ${hot ? "text-red" : "text-khaki"}`}>{f.danger}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ---------- Briefing ---------- */}
        <section className="border-t border-line bg-bg2">
          <div className="mx-auto max-w-7xl px-5 py-24">
            <SectionHead kicker="Briefing" title="More than shooting" />
            <ol className="mt-12 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <li key={f.title} className="border-t border-line py-6">
                  <span className="font-pixel text-xs text-signal">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-xl">{f.title}</h3>
                  <p className="muted mt-2">{f.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Token + FAQ ---------- */}
        <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <SectionHead kicker="Token" title={CONFIG.token.symbol + (CONFIG.token.chain ? ` on ${CONFIG.token.chain}` : "")}>
              One token for Swoldiers. Only copy the contract address from this site or our X account.
            </SectionHead>
            <div className="hud mt-8 p-5">
              <div className="font-pixel text-[10px] tracking-widest text-muted uppercase">Contract address</div>
              {CONFIG.token.ca ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code className="break-all text-sm font-bold text-signal">{CONFIG.token.ca}</code>
                  {CONFIG.token.explorer ? (
                    <a className="btn sm ghost" href={`${CONFIG.token.explorer}/token/${CONFIG.token.ca}`} target="_blank" rel="noopener">
                      Explorer ↗
                    </a>
                  ) : null}
                </div>
              ) : (
                <div className="stencil mt-2 text-2xl text-khaki">
                  Classified<span className="blink text-signal">_</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="kicker">FAQ</p>
            <div className="mt-5 border-t border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group border-b border-line">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold">
                    {q}
                    <span className="font-pixel text-signal transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="muted -mt-1 pb-5">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- Final call ---------- */}
        <section className="relative overflow-hidden border-t border-line">
          <div className="tape" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 md:grid-cols-[auto_1fr_auto]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/media/recruit.jpg" alt="" width={160} height={160} className="pixel size-32 rounded-full ring-4 ring-signal md:size-40" />
            <div>
              <h2 className="text-[clamp(34px,5vw,56px)]">Fort Gainz is waiting, recruit.</h2>
              <p className="mt-2 text-lg text-khaki">The roster closes soon. Enlist free and start climbing.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/whitelist" className="btn">
                Enlist now →
              </Link>
              <a href={xUrl} target="_blank" rel="noopener" className="btn ghost">
                Follow on X
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
