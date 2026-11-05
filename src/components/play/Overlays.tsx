"use client";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { FaArrowRight, FaBomb, FaCoins, FaCompress, FaDumbbell, FaExpand, FaHandPointer, FaHeart, FaHelicopter, FaHouse, FaKeyboard, FaKitMedical, FaPlaneUp, FaPlay, FaRotateRight, FaSkull, FaVolumeHigh, FaVolumeXmark, FaXmark, FaXTwitter } from "react-icons/fa6";
import { GiShotgun } from "react-icons/gi";
import { sound } from "@/game/audio";
import { GREED, PLATES, RIFLES, type Save } from "@/game/tuning";
import type { Hud } from "@/game/sim";
import { FrontArt } from "./Intro";
import { CONFIG } from "@/lib/config";
import { SKILLS, type Front } from "@/lib/game";

const ICONS: Record<string, IconType> = { "2": GiShotgun, "3": FaBomb, "4": FaDumbbell, "5": FaPlaneUp, "6": FaKitMedical };
export const HOTBAR = SKILLS.filter((s) => s.key !== "1").map((s) => ({ ...s, icon: ICONS[s.key] }));

const SKIP_KEY = "swol_skip_brief";
export const skipsBriefing = () => {
  try {
    return localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
};
const setSkipsBriefing = (on: boolean) => {
  try {
    if (on) localStorage.setItem(SKIP_KEY, "1");
    else localStorage.removeItem(SKIP_KEY);
  } catch {}
};

const KEYBOARD: [string[], string][] = [
  [["W", "A", "S", "D"], "Move"],
  [["Mouse"], "Aim"],
  [["Left click"], "Hold to fire"],
  [["Space"], "Roll, dodges shots"],
  [["Shift"], "Sprint"],
  [["R"], "Reload"],
  [["3", "5"], "Bombs drop where you face"],
  [["P"], "Pause"],
  [["Esc"], "Menu"],
];
const TOUCH: [string, string][] = [
  ["Left thumb", "Drag to move"],
  ["Right thumb", "Drag to aim and fire. Aim pulls toward nearby enemies"],
  ["Runner button", "Roll, dodges shots"],
  ["Arrow button", "Reload"],
  ["Frag and Airstrike", "Tap to drop it the way you are facing, onto the closest enemy there"],
];

const label = "font-pixel text-[11px] tracking-widest text-signal uppercase";

export function Controls({ touch }: { touch: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className={`${label} flex items-center gap-2`}>
          {touch ? <FaHandPointer aria-hidden size={13} /> : <FaKeyboard aria-hidden size={13} />} {touch ? "Touch" : "Keyboard and mouse"}
        </p>
        <dl className="mt-2 grid gap-1.5 text-sm">
          {touch
            ? TOUCH.map(([k, v]) => (
                <div key={k}>
                  <dt className="font-semibold text-sand">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))
            : KEYBOARD.map(([keys, v]) => (
                <div key={v} className="flex items-center justify-between gap-3">
                  <dt className="flex gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="border border-line bg-bg px-1.5 py-0.5 font-pixel text-[10px] text-sand">
                        {k}
                      </kbd>
                    ))}
                  </dt>
                  <dd className="text-right text-muted">{v}</dd>
                </div>
              ))}
        </dl>
      </div>
      <div>
        <p className={label}>Skills</p>
        <ul className="mt-2 grid gap-1.5 text-sm">
          {HOTBAR.map((s) => (
            <li key={s.key} className="grid grid-cols-[30px_minmax(0,1fr)] items-center gap-2">
              <span className="relative grid size-[30px] place-items-center border border-line bg-bg text-sand">
                <s.icon aria-hidden size={15} />
                {touch ? null : <span className="absolute top-0 left-0.5 font-pixel text-[8px] text-muted">{s.key}</span>}
              </span>
              <span className="min-w-0">
                <b className="font-semibold text-sand">{s.name}</b> <span className="text-muted">{s.cooldown}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Screen({ art, children }: { art?: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex touch-pan-y overflow-y-auto bg-black/75 p-3 sm:p-5">
      {art ? (
        <div className="fixed inset-0 -z-10">
          <FrontArt id={art} />
          <div className="absolute inset-0 bg-black/55" />
        </div>
      ) : null}
      <div className="hud rise m-auto w-full max-w-2xl p-4 sm:p-6">{children}</div>
    </div>
  );
}

const payouts = Object.entries(GREED).map(([wave, pay]) => ({ wave, pay }));

export function Briefing({ front, touch, onStart }: { front: Front; touch: boolean; onStart: () => void }) {
  const [skip, setSkip] = useState(skipsBriefing);
  return (
    <Screen art={front.id}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={label}>Briefing · {front.danger} danger</p>
          <h2 className="mt-1 text-[clamp(26px,5vw,38px)]">{front.name}</h2>
        </div>
        <button className="btn" onClick={onStart}>
          Start
          <FaArrowRight aria-hidden size={13} />
        </button>
      </div>
      <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <li className="flex items-start gap-2">
          <FaCoins aria-hidden size={14} className="mt-1 shrink-0 text-signal" />
          <span>Kill enemies and open crates for scrap.</span>
        </li>
        <li className="flex items-start gap-2">
          <FaHelicopter aria-hidden size={14} className="mt-1 shrink-0 text-signal" />
          <span>
            Stand in the chopper zone to leave. It lands after waves {payouts.map((p) => p.wave).join(", ")} and pays {payouts.map((p) => `×${p.pay}`).join(", ")}.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <FaSkull aria-hidden size={14} className="mt-1 shrink-0 text-red" />
          <span>Die and you lose all the scrap you carry.</span>
        </li>
      </ol>
      <div className="mt-4 border-t border-line pt-4">
        <Controls touch={touch} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            className="size-4 accent-[var(--signal)]"
            checked={skip}
            onChange={(e) => {
              setSkip(e.target.checked);
              setSkipsBriefing(e.target.checked);
            }}
          />
          Skip this next time
        </label>
        {touch ? null : <span className="font-pixel text-[10px] tracking-wider text-muted uppercase">Enter or Space to start</span>}
      </div>
    </Screen>
  );
}

// One per run. X doesn't let a site confirm a post, so the button trusts the player.
export function ExtraLife({ front, carried, wave, invite, onRevive, onGiveUp }: { front: Front; carried: number; wave: number; invite: string | null; onRevive: () => void; onGiveUp: () => void }) {
  const [posted, setPosted] = useState(false);
  const link = `${location.origin}/play${invite ? `?ref=${invite}` : ""}`;
  const text = `Down on wave ${wave} in ${front.name} with ${carried} scrap. Using my extra life. @${CONFIG.xAccount} ${CONFIG.token.symbol}`;
  const share = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
  return (
    <Screen>
      <div className="mx-auto max-w-sm text-center">
        <FaHeart aria-hidden size={30} className="mx-auto text-red" />
        <h2 className="mt-3 text-3xl">You are down</h2>
        <p className="muted mt-2">
          Post {CONFIG.token.symbol} on X for 1 extra life and keep your {carried} scrap. One per run.
        </p>
        <div className="mt-5 grid gap-2">
          {posted ? (
            <button className="btn" onClick={onRevive}>
              <FaHeart aria-hidden size={12} /> Back to the fight
            </button>
          ) : (
            <a className="btn" href={share} target="_blank" rel="noopener" onClick={() => setPosted(true)}>
              <FaXTwitter aria-hidden size={13} /> Post for an extra life
            </a>
          )}
          <button className="btn ghost" onClick={onGiveUp}>
            Give up and lose {carried} scrap
          </button>
        </div>
      </div>
    </Screen>
  );
}

export function PauseScreen({ carried, onResume, onMenu }: { carried: number; onResume: () => void; onMenu: () => void }) {
  return (
    <Screen>
      <div className="mx-auto max-w-sm text-center">
        <h2 className="text-3xl">Paused</h2>
        <p className="muted mt-2 flex items-center justify-center gap-2">
          <FaCoins aria-hidden size={13} className="text-signal" /> {carried} scrap carried
        </p>
        <div className="mt-5 grid gap-2">
          <button className="btn" onClick={onResume}>
            <FaPlay aria-hidden size={12} /> Resume
          </button>
          <button className="btn ghost" onClick={onMenu}>
            Menu
          </button>
        </div>
      </div>
    </Screen>
  );
}

type Tab = "run" | "controls" | "intel";
const TABS: [Tab, string][] = [["run", "Run"], ["controls", "Controls"], ["intel", "Intel"]];

export function MenuScreen(p: { front: Front; hud: Hud | null; save: Save; touch: boolean; onResume: () => void; onRestart: () => void; onQuit: () => void }) {
  const [tab, setTab] = useState<Tab>("run");
  const [on, setOn] = useState(sound.on);
  const [full, setFull] = useState(() => !!document.fullscreenElement);
  const [sure, setSure] = useState<"restart" | "quit" | null>(null);
  const h = p.hud;

  useEffect(() => {
    const sync = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const rows: [string, string][] = [
    ["Wave", h?.overrun ? "Overrun" : `${h?.wave ?? 1} of 6`],
    ["Scrap carried", String(h?.carried ?? 0)],
    ["Kills", String(h?.kills ?? 0)],
    ["Health", h ? `${Math.ceil(h.hp)} of ${h.maxHp}` : "—"],
    ["Rifle", RIFLES[p.save.rifle].name],
    ["Plates", PLATES[p.save.plates].name],
  ];
  const lose = (what: "restart" | "quit") => {
    if (!h?.carried || sure === what) return what === "restart" ? p.onRestart() : p.onQuit();
    setSure(what);
  };

  return (
    <Screen>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-3xl">Menu</h2>
        <button className="grid size-9 place-items-center border border-line text-sand hover:border-signal" aria-label="Close menu" onClick={p.onResume}>
          <FaXmark aria-hidden size={16} />
        </button>
      </div>
      <div role="tablist" className="mt-3 flex border-b border-line">
        {TABS.map(([id, name]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-3 py-2 font-pixel text-[11px] tracking-widest uppercase ${tab === id ? "border-signal text-signal" : "border-transparent text-khaki hover:text-signal"}`}>
            {name}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "run" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <dl className="grid content-start gap-1 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-1">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="grid content-start gap-2">
              <button className="btn" onClick={p.onResume}>
                <FaPlay aria-hidden size={12} /> Resume
              </button>
              <button className="btn ghost" onClick={() => lose("restart")}>
                <FaRotateRight aria-hidden size={12} /> {sure === "restart" ? `Lose ${h?.carried} scrap?` : "Restart run"}
              </button>
              <button className="btn ghost" onClick={() => lose("quit")}>
                <FaHouse aria-hidden size={12} /> {sure === "quit" ? `Lose ${h?.carried} scrap?` : "Quit to Fort Gainz"}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn sm ghost"
                  aria-pressed={on}
                  onClick={() => {
                    sound.on = !sound.on;
                    setOn(sound.on);
                  }}
                >
                  {on ? <FaVolumeHigh aria-hidden size={12} /> : <FaVolumeXmark aria-hidden size={12} />}
                  {on ? "Sound on" : "Sound off"}
                </button>
                {document.fullscreenEnabled ? (
                  <button className="btn sm ghost" aria-pressed={full} onClick={() => void (full ? document.exitFullscreen() : document.documentElement.requestFullscreen())}>
                    {full ? <FaCompress aria-hidden size={12} /> : <FaExpand aria-hidden size={12} />}
                    Fullscreen
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : tab === "controls" ? (
          <Controls touch={p.touch} />
        ) : (
          <div className="grid gap-3 text-sm">
            <p>
              <b className="text-sand">{p.front.name}.</b> <span className="text-muted">{p.front.line}</span>
            </p>
            <p>
              <b className="text-sand">Enemies.</b> <span className="text-muted">{p.front.enemies}</span>
            </p>
            <p>
              <b className="text-sand">Tip.</b> <span className="text-muted">{p.front.tip}</span>
            </p>
            <div>
              <b className="text-sand">Chopper payouts</b>
              <ul className="mt-1 grid grid-cols-3 gap-2">
                {payouts.map((c) => (
                  <li key={c.wave} className="border border-line bg-bg px-2 py-1.5 text-center">
                    <span className="block font-pixel text-[10px] tracking-wider text-muted uppercase">Wave {c.wave}</span>
                    <b className="text-signal">×{c.pay}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
