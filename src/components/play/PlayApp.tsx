"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCoins, FaDumbbell, FaGun, FaHelicopter, FaLock, FaRotateRight, FaShieldHalved, FaSkull, FaXTwitter } from "react-icons/fa6";
import { api, fmt } from "@/lib/client";
import { CONFIG } from "@/lib/config";
import { unlockAudio } from "@/game/audio";
import { COMBAT_FRONTS, type Result } from "@/game/sim";
import { NEW_SAVE, PLATES, RIFLES, STATS, UNLOCK_WAVE, statPrice, type Save, type StatKey } from "@/game/tuning";
import { Battle } from "./Battle";
import { FrontArt, Title, Wipe } from "./Intro";

const KEY = "swol_game_v1";

function readSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s) return { ...NEW_SAVE, ...s, stats: { ...NEW_SAVE.stats, ...s.stats } };
  } catch {}
  return NEW_SAVE;
}

function readRefFromUrl() {
  try {
    const q = new URLSearchParams(location.search).get("ref")?.toLowerCase();
    if (q && /^[a-z0-9]{6}$/.test(q)) localStorage.setItem("swol_ref", q);
  } catch {}
}

type View = { at: "title" } | { at: "base" } | { at: "run"; frontId: string; id: number; quick?: boolean } | { at: "result"; result: Result; unlocked?: string };

export function PlayApp() {
  const [save, setSave] = useState<Save>(readSave);
  const [view, setView] = useState<View>({ at: "title" });
  const [wipe, setWipe] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [invite, setInvite] = useState<string | null>(null);
  const [front, setFront] = useState(() => Math.max(0, readSave().unlocked - 1));

  useEffect(() => {
    readRefFromUrl();
    // Signed-in players share their own invite link, so a good run also recruits.
    api<{ entry?: { ref_code?: string } | null }>("/api/wl")
      .then((j) => setInvite(j.entry?.ref_code ?? null))
      .catch(() => {});
  }, []);

  const commit = useCallback((next: Save) => {
    setSave(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  // Change screen behind the sweep, so nothing ever just pops.
  const go = useCallback((next: View) => {
    setWipe(Date.now());
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setView(next), 300);
  }, []);
  const toBase = useCallback(() => go({ at: "base" }), [go]);

  const deploy = (frontId: string, quick = false) => {
    unlockAudio();
    go({ at: "run", frontId, id: Date.now(), quick });
  };

  // Nothing else can change the save during a run, so this render's copy is current.
  const onEnd = (result: Result) => {
    const i = COMBAT_FRONTS.findIndex((f) => f.id === result.frontId);
    const opens = result.outcome === "extracted" && result.wave >= UNLOCK_WAVE && i + 1 === save.unlocked && save.unlocked < COMBAT_FRONTS.length;
    commit({ ...save, scrap: save.scrap + result.banked, best: Math.max(save.best, result.banked), runs: save.runs + 1, unlocked: opens ? save.unlocked + 1 : save.unlocked });
    go({ at: "result", result, unlocked: opens ? COMBAT_FRONTS[i + 1].name : undefined });
    if (opens) setFront(i + 1);
  };

  return (
    <>
      {view.at === "title" ? <Title onStart={toBase} /> : null}
      {view.at === "run" ? <Battle key={view.id} frontId={view.frontId} save={save} quick={view.quick} onEnd={onEnd} onRestart={() => deploy(view.frontId, true)} onQuit={toBase} /> : null}
      {view.at === "result" ? <Results result={view.result} unlocked={view.unlocked} best={save.best} invite={invite} onAgain={() => deploy(view.result.frontId, true)} onBase={toBase} /> : null}
      {view.at === "base" ? <Base save={save} commit={commit} front={front} setFront={setFront} deploy={deploy} /> : null}
      {wipe ? <Wipe key={wipe} /> : null}
    </>
  );
}

function Upgrade({ title, sub, price, bank, onBuy }: { title: string; sub: string; price: number | null; bank: number; onBuy: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-0">
      <span className="min-w-0">
        <b className="block font-semibold">{title}</b>
        <span className="block text-sm text-muted">{sub}</span>
      </span>
      {price === null ? (
        <span className="chip grey">Maxed</span>
      ) : (
        <button className="btn sm shrink-0" disabled={bank < price} onClick={onBuy}>
          <FaCoins aria-hidden size={11} />
          {fmt(price)}
        </button>
      )}
    </li>
  );
}

function Base({ save, commit, front, setFront, deploy }: { save: Save; commit: (s: Save) => void; front: number; setFront: (i: number) => void; deploy: (id: string) => void }) {
  const spend = (price: number, change: Partial<Save>) => save.scrap >= price && commit({ ...save, ...change, scrap: save.scrap - price });
  const nextRifle = RIFLES[save.rifle + 1];
  const nextPlates = PLATES[save.plates + 1];
  const f = COMBAT_FRONTS[front];
  return (
    <main className="mx-auto max-w-5xl px-5 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-pixel text-[11px] tracking-widest text-khaki uppercase hover:text-signal">
          <FaArrowLeft aria-hidden size={11} /> Site
        </Link>
        <span className="flex items-center gap-2 font-pixel text-lg text-signal">
          <FaCoins aria-hidden size={16} /> {fmt(save.scrap)}
        </span>
      </div>
      <section className="relative mt-5 overflow-hidden border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/armory.png" alt="" className="pixel absolute inset-0 size-full object-cover object-[50%_28%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/80 to-transparent" />
        <div className="relative max-w-xl p-5 sm:p-8">
          <p className="kicker">Demo · Fort Gainz</p>
          <h1 className="mt-3 text-[clamp(36px,7vw,64px)]">Get in. Get loot. Get out.</h1>
          <p className="mt-3 text-lg text-sand/90">Grab scrap and make the chopper before you are overrun. Die and you lose what you are carrying. Wait for a later chopper and it pays more.</p>
        </div>
      </section>

      <section className="hud mt-7 p-5 sm:p-6">
        <div className="flex items-center gap-2 font-pixel text-[12px] tracking-widest text-signal uppercase">
          <FaHelicopter aria-hidden size={14} /> Choose your front
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COMBAT_FRONTS.map((c, i) => {
            const locked = i >= save.unlocked;
            return (
              <button key={c.id} disabled={locked} onClick={() => setFront(i)} className={`border p-3 text-left transition-colors ${i === front ? "border-signal bg-bg" : "border-line bg-bg/50"} ${locked ? "cursor-not-allowed opacity-50" : "hover:border-signal"}`}>
                <span className="flex items-center justify-between gap-2 font-semibold">
                  {c.name}
                  {locked ? <FaLock aria-hidden size={11} className="shrink-0 text-muted" /> : null}
                </span>
                <span className="font-pixel text-[10px] tracking-widest text-muted uppercase">{locked ? "Locked" : c.danger}</span>
              </button>
            );
          })}
        </div>
        <p className="muted mt-3 text-sm">{f.tip}</p>
        <button className="btn mt-4 w-full sm:w-auto" onClick={() => deploy(f.id)}>
          Deploy to {f.name}
          <FaArrowRight aria-hidden size={13} />
        </button>
        <p className="muted mt-3 text-sm">Extract on wave {UNLOCK_WAVE} or later to open the next front.</p>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="hud p-5 sm:p-6">
          <div className="flex items-center gap-2 font-pixel text-[12px] tracking-widest text-signal uppercase">
            <FaDumbbell aria-hidden size={14} /> Gym
          </div>
          <ul className="mt-2">
            {(Object.keys(STATS) as StatKey[]).map((k) => (
              <Upgrade key={k} title={`${STATS[k].name} ${save.stats[k]}`} sub={STATS[k].what} price={statPrice(save.stats[k])} bank={save.scrap} onBuy={() => spend(statPrice(save.stats[k]), { stats: { ...save.stats, [k]: save.stats[k] + 1 } })} />
            ))}
          </ul>
        </section>
        <section className="hud p-5 sm:p-6">
          <div className="flex items-center gap-2 font-pixel text-[12px] tracking-widest text-signal uppercase">
            <FaGun aria-hidden size={14} /> Armory
          </div>
          <ul className="mt-2">
            <Upgrade title={RIFLES[save.rifle].name} sub={nextRifle ? `Next: ${nextRifle.name}` : "Best rifle in the fort"} price={nextRifle?.price ?? null} bank={save.scrap} onBuy={() => spend(nextRifle.price, { rifle: save.rifle + 1 })} />
            <Upgrade title={PLATES[save.plates].name} sub={nextPlates ? `Next: ${nextPlates.name}` : "Best plates in the fort"} price={nextPlates?.price ?? null} bank={save.scrap} onBuy={() => spend(nextPlates.price, { plates: save.plates + 1 })} />
          </ul>
        </section>
      </div>

      <p className="muted mt-6 text-sm">
        <FaShieldHalved aria-hidden size={12} className="mr-1.5 inline" />
        Demo progress stays on this device and may reset. Scrap is not {CONFIG.token.symbol} and has no value.
      </p>
    </main>
  );
}

function Results({ result: r, unlocked, best, invite, onAgain, onBase }: { result: Result; unlocked?: string; best: number; invite: string | null; onAgain: () => void; onBase: () => void }) {
  const name = COMBAT_FRONTS.find((f) => f.id === r.frontId)?.name ?? "";
  const won = r.outcome === "extracted";
  const X = CONFIG.xAccount;
  const link = `${location.origin}/play${invite ? `?ref=${invite}` : ""}`;
  const text = won
    ? `Extracted from ${name} on wave ${r.wave} with ${fmt(r.banked)} scrap. Get to the chopper, @${X}. ${CONFIG.token.symbol}`
    : `Lost ${fmt(r.carried)} scrap on wave ${r.wave} in ${name}. I should have got on the chopper. @${X} ${CONFIG.token.symbol}`;
  const share = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
  const rows: [string, string][] = [
    ["Wave reached", String(r.wave)],
    ["Kills", fmt(r.kills)],
    ["Scrap carried", fmt(r.carried)],
    ["Chopper bonus", won ? `×${r.greed}` : "—"],
    ["Time", `${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, "0")}`],
  ];
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-5">
      <div className={`absolute inset-0 ${won ? "" : "grayscale"}`}>
        <FrontArt id={r.frontId} />
      </div>
      <div className="absolute inset-0 bg-black/60" />
      <div className="hud rise relative w-full max-w-md p-6 text-center">
        {won ? <FaHelicopter aria-hidden size={36} className="mx-auto text-green" /> : <FaSkull aria-hidden size={36} className="mx-auto text-red" />}
        <h1 className="mt-3 text-[clamp(34px,9vw,48px)]">{won ? "Extracted" : "Overrun"}</h1>
        <p className={`mt-1 text-2xl font-bold ${won ? "text-signal" : "text-red"}`}>{won ? `+${fmt(r.banked)} scrap` : `${fmt(r.carried)} scrap lost`}</p>
        {won && r.banked >= best && best > 0 ? <p className="mt-1 font-pixel text-[11px] tracking-widest text-green uppercase">New best</p> : null}
        {unlocked ? <p className="mt-2 font-pixel text-[12px] tracking-wider text-green uppercase">{unlocked} unlocked</p> : null}
        <dl className="mt-5 grid gap-1 text-left">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line py-1.5">
              <dt className="muted">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 grid gap-2">
          <button className="btn" onClick={onAgain}>
            <FaRotateRight aria-hidden size={13} /> Deploy again
          </button>
          <a className="btn ghost" href={share} target="_blank" rel="noopener">
            <FaXTwitter aria-hidden size={13} /> Share this run
          </a>
          <button className="btn ghost" onClick={onBase}>
            Back to Fort Gainz
          </button>
        </div>
        {invite ? null : (
          <p className="muted mt-4 text-sm">
            Want the full game?{" "}
            <Link href="/whitelist" className="text-signal underline underline-offset-2">
              Join the whitelist
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
