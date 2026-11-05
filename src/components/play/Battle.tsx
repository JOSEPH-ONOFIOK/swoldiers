"use client";
import { useEffect, useRef, useState } from "react";
import { FaBars, FaCoins, FaHelicopter, FaPause, FaPersonRunning, FaRotateRight } from "react-icons/fa6";
import { play, resetSfx, unlockAudio } from "@/game/audio";
import { D, DROP, draw, paintWorld } from "@/game/render";
import { COMBAT_FRONTS, Run, type Hud, type Input, type Result } from "@/game/sim";
import { GREED, type Save } from "@/game/tuning";
import { Flyover } from "./Intro";
import { Briefing, ExtraLife, HOTBAR, MenuScreen, PauseScreen, skipsBriefing } from "./Overlays";

type Mode = "fly" | "brief" | "drop" | "play" | "pause" | "menu" | "down";
type Stick = { x0: number; y0: number; x: number; y: number };
const KEYS: Record<string, [number, number]> = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const STEP = 1 / 60;
const STICK = 42;

// A button that stays pressed for as long as a finger or the mouse is on it.
function Hold({ label, className, onHold, onTouch, children }: { label: string; className: string; onHold: (on: boolean) => void; onTouch: () => void; children: React.ReactNode }) {
  return (
    <button
      title={label}
      aria-label={label}
      className={`relative grid size-11 touch-none place-items-center overflow-hidden border sm:size-12 ${className}`}
      onPointerDown={(e) => {
        e.preventDefault();
        if (e.pointerType !== "mouse") onTouch();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
    >
      {children}
    </button>
  );
}

export function Battle({ frontId, save, quick, invite, onEnd, onRestart, onQuit }: { frontId: string; save: Save; quick?: boolean; invite: string | null; onEnd: (r: Result) => void; onRestart: () => void; onQuit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<Input>({ moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, sprint: false, roll: false, reload: false, skills: new Set(), assist: false });
  const [mode, setModeState] = useState<Mode>(() => (!quick ? "fly" : skipsBriefing() ? "drop" : "brief"));
  const modeRef = useRef(mode); // read by the game loop and key handlers
  const runRef = useRef<Run | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [touch, setTouch] = useState(() => matchMedia("(pointer: coarse)").matches);
  const front = COMBAT_FRONTS.find((f) => f.id === frontId) ?? COMBAT_FRONTS[0];

  const setMode = (m: Mode) => {
    if (m === "drop") play(["chopper"]);
    modeRef.current = m;
    setModeState(m);
  };
  const afterFly = () => {
    if (modeRef.current === "fly") setMode(skipsBriefing() ? "drop" : "brief");
  };

  useEffect(() => {
    const el = canvas.current!;
    const x = el.getContext("2d")!;
    const run = new Run(frontId, save);
    runRef.current = run;
    const world = paintWorld(run);
    const keys = new Set<string>();
    const inp = input.current;
    const sticks: { move: Stick | null; aim: Stick | null } = { move: null, aim: null };
    const pointers = new Map<number, "move" | "aim">();
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-pixel").trim() || "monospace";
    const font = `4px ${family}`;
    let vw = 0, vh = 0, scale = 1, mouseX = 0, mouseY = 0, mouseSeen = false;
    let cam = { ox: 0, oy: 0 };

    const size = () => {
      const w = el.clientWidth, h = el.clientHeight;
      scale = Math.max(1.5, Math.min(w, h) / 215);
      vw = Math.ceil(w / scale);
      vh = Math.ceil(h / scale);
      el.width = vw * D;
      el.height = vh * D;
      x.imageSmoothingEnabled = false;
    };
    size();
    const moveFromKeys = () => {
      if (sticks.move) return;
      let mx = 0, my = 0;
      for (const k of keys) {
        const v = KEYS[k];
        if (v) {
          mx += v[0];
          my += v[1];
        }
      }
      inp.moveX = mx;
      inp.moveY = my;
    };
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const now = modeRef.current;
      if (now === "fly") return afterFly();
      if (now === "brief") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          setMode("drop");
        }
        return;
      }
      if (now === "drop" || now === "down") return;
      if (e.code === "Escape") return setMode(now === "play" ? "menu" : "play");
      if (e.code === "KeyP") return setMode(now === "play" ? "pause" : "play");
      if (e.code in KEYS) keys.add(e.code);
      if (e.code === "Space") inp.roll = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") inp.sprint = true;
      if (e.code === "KeyR") inp.reload = true;
      if (e.key === "1") inp.fire = true;
      if (now === "play" && "23456".includes(e.key)) inp.skills.add(e.key);
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      moveFromKeys();
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.code);
      if (e.code === "Space") inp.roll = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") inp.sprint = false;
      if (e.code === "KeyR") inp.reload = false;
      if (e.key === "1") inp.fire = false;
      moveFromKeys();
    };
    const blur = () => {
      keys.clear();
      Object.assign(inp, { moveX: 0, moveY: 0, fire: false, roll: false, sprint: false, reload: false });
      inp.skills.clear();
      if (!run.result && modeRef.current === "play") setMode("pause");
    };
    const pdown = (e: PointerEvent) => {
      unlockAudio();
      if (e.pointerType === "mouse") {
        inp.fire = true;
        return;
      }
      setTouch(true);
      inp.assist = true;
      el.setPointerCapture(e.pointerId);
      const which = e.clientX < el.clientWidth / 2 ? "move" : "aim";
      if (sticks[which]) return;
      pointers.set(e.pointerId, which);
      const p = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
      sticks[which] = p;
      if (which === "aim") inp.fire = true;
    };
    const pmove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        mouseX = e.clientX;
        mouseY = e.clientY;
        mouseSeen = true;
        return;
      }
      const which = pointers.get(e.pointerId);
      if (!which) return;
      const s = sticks[which]!;
      s.x = e.clientX;
      s.y = e.clientY;
      const dx = s.x - s.x0, dy = s.y - s.y0, d = Math.hypot(dx, dy);
      if (which === "move") {
        const m = Math.min(1, d / STICK) / (d || 1);
        inp.moveX = dx * m;
        inp.moveY = dy * m;
      } else if (d > 6) {
        inp.aimX = run.x + (dx / d) * 110;
        inp.aimY = run.y + (dy / d) * 110;
      }
    };
    const pup = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        inp.fire = false;
        return;
      }
      const which = pointers.get(e.pointerId);
      if (!which) return;
      pointers.delete(e.pointerId);
      sticks[which] = null;
      if (which === "move") inp.moveX = inp.moveY = 0;
      else inp.fire = false;
    };
    const menu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    window.addEventListener("resize", size);
    el.addEventListener("pointerdown", pdown);
    window.addEventListener("pointermove", pmove);
    window.addEventListener("pointerup", pup);
    window.addEventListener("pointercancel", pup);
    el.addEventListener("contextmenu", menu);

    inp.aimX = run.x + 40;
    inp.aimY = run.y;
    let raf = 0, last = performance.now(), acc = 0, hudT = 0, ended = false, dropT = 0, landed = false;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (modeRef.current === "drop" || landed) dropT += dt;
      if (modeRef.current === "drop" && dropT >= DROP.land && !landed) {
        landed = true;
        run.land();
        setMode("play");
      }
      if (modeRef.current === "play") {
        if (mouseSeen) {
          inp.aimX = mouseX / scale + cam.ox;
          inp.aimY = mouseY / scale + cam.oy;
        } else {
          // Touch: face the aim stick, or the way you walk when you aren't aiming.
          const walking = !sticks.aim && sticks.move && Math.hypot(inp.moveX, inp.moveY) > 0.25;
          const a = walking ? Math.atan2(inp.moveY, inp.moveX) : Math.atan2(inp.aimY - run.y, inp.aimX - run.x);
          inp.aimX = run.x + Math.cos(a) * 110;
          inp.aimY = run.y + Math.sin(a) * 110;
        }
        acc += dt;
        while (acc >= STEP) {
          run.step(STEP, inp);
          acc -= STEP;
        }
        play(run.events);
        run.events.length = 0;
      }
      cam = draw(x, run, world, vw, vh, font, modeRef.current === "drop" || (landed && dropT < DROP.end) ? { t: dropT } : undefined);
      for (const s of [sticks.move, sticks.aim]) {
        if (!s) continue;
        x.strokeStyle = "#ece4cc66";
        x.lineWidth = 2;
        x.beginPath();
        x.arc(s.x0 / scale, s.y0 / scale, STICK / scale, 0, 6.29);
        x.stroke();
        const dx = s.x - s.x0, dy = s.y - s.y0, m = Math.min(1, STICK / (Math.hypot(dx, dy) || 1));
        x.fillStyle = "#f4c430aa";
        x.beginPath();
        x.arc((s.x0 + dx * m) / scale, (s.y0 + dy * m) / scale, 14 / scale, 0, 6.29);
        x.fill();
      }
      hudT -= dt;
      if (hudT <= 0) {
        hudT = 0.08;
        setHud(run.hud());
      }
      if (run.down && modeRef.current === "play") {
        setMode("down");
        setHud(run.hud());
      }
      if (run.result && !ended) {
        ended = true;
        onEnd(run.result);
      }
    };
    resetSfx();
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      window.removeEventListener("resize", size);
      window.removeEventListener("pointermove", pmove);
      window.removeEventListener("pointerup", pup);
      window.removeEventListener("pointercancel", pup);
    };
    // A run is created once for the life of this component; the parent remounts it for a new one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tap = (k: string, on: boolean) => {
    unlockAudio();
    if (on) input.current.skills.add(k);
  };
  const flag = (k: "roll" | "reload", on: boolean) => {
    unlockAudio();
    input.current[k] = on;
  };
  const h = hud;
  const landed = h?.chopper === "landed";
  const inbound = h?.chopper === "inbound";
  const nextCall = h ? Object.keys(GREED).map(Number).find((w) => w >= h.wave) : undefined;
  return (
    <div className="fixed inset-0 overflow-hidden bg-bg select-none">
      <canvas ref={canvas} className="pixel size-full cursor-crosshair touch-none" />

      {h ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/media/recruit.jpg" alt="" width={40} height={40} className="pixel size-10 rounded-full ring-2 ring-signal" />
              <div className="w-[min(36vw,220px)]">
              <div className="h-3 border border-black bg-black/60">
                <div className={`h-full ${h.hp < h.maxHp * 0.3 ? "bg-red" : "bg-green"}`} style={{ width: `${(h.hp / h.maxHp) * 100}%` }} />
              </div>
              <div className="mt-1 font-pixel text-[11px] text-sand drop-shadow-[1px_1px_0_#000]">
                {Math.ceil(h.hp)}/{h.maxHp} · {h.reloading ? "Reloading" : `${h.ammo}/${h.mag}`}
              </div>
              </div>
            </div>
            <div className="text-right font-pixel text-[11px] tracking-wider text-sand uppercase drop-shadow-[1px_1px_0_#000]">
              <div className="flex items-center justify-end gap-1.5 text-[15px] text-signal">
                <FaCoins aria-hidden size={13} />
                {h.carried}
              </div>
              <div>{h.overrun ? "Overrun" : `Wave ${h.wave}/6`}</div>
              {h.greed > 1 && (landed || inbound) ? <div className="text-green">Pays ×{h.greed}</div> : null}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-16 flex flex-col items-center gap-1 text-center">
            {landed || inbound ? (
              <div className={`flex items-center gap-2 bg-black/70 px-3 py-1 font-pixel text-[12px] tracking-wider uppercase ${h.hold > 0 ? "text-green" : "text-signal"}`}>
                <FaHelicopter aria-hidden size={14} />
                {inbound ? `Chopper in ${h.chopperT}` : h.hold > 0 ? `Boarding ${Math.round(h.hold * 100)}%` : `${h.last ? "Last chopper" : "Chopper leaves"}: ${h.chopperT}s`}
              </div>
            ) : !h.overrun && nextCall ? (
              <div className="font-pixel text-[10px] tracking-wider text-sand/70 uppercase drop-shadow-[1px_1px_0_#000]">Next chopper after wave {nextCall}</div>
            ) : null}
            {h.banner ? <div className="stencil mt-2 text-[clamp(22px,5vw,44px)] text-signal drop-shadow-[2px_3px_0_#000]">{h.banner}</div> : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-1.5 p-2 pb-[max(8px,env(safe-area-inset-bottom))]">
            {HOTBAR.map((s, i) => (
              <Hold key={s.key} label={s.name} onTouch={() => setTouch(true)} onHold={(on) => tap(s.key, on)} className={`bg-black/70 text-sand ${s.key === "4" && h.flex ? "border-signal" : "border-line"}`}>
                <s.icon aria-hidden size={20} />
                <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${h.cds[i] * 100}%` }} />
                <span className="absolute top-0 left-1 font-pixel text-[9px] text-muted">{s.key}</span>
              </Hold>
            ))}
            <Hold label="Roll" onTouch={() => setTouch(true)} onHold={(on) => flag("roll", on)} className="border-signal bg-black/70 text-signal">
              <FaPersonRunning aria-hidden size={20} />
              <span className="absolute inset-x-0 bottom-0 bg-black/70" style={{ height: `${h.roll * 100}%` }} />
            </Hold>
            {touch ? (
              <Hold label="Reload" onTouch={() => setTouch(true)} onHold={(on) => flag("reload", on)} className="border-line bg-black/70 text-sand">
                <FaRotateRight aria-hidden size={18} />
              </Hold>
            ) : (
              <span className="ml-2 hidden self-center font-pixel text-[10px] text-sand/70 uppercase lg:block">P pause · Esc menu</span>
            )}
          </div>

          <div className="absolute top-14 right-3 flex flex-col gap-2 sm:top-16">
            <button className="grid size-10 place-items-center border border-line bg-black/70 text-sand" aria-label="Pause" title="Pause (P)" onClick={() => setMode("pause")}>
              <FaPause aria-hidden size={14} />
            </button>
            <button className="grid size-10 place-items-center border border-line bg-black/70 text-sand" aria-label="Menu" title="Menu (Esc)" onClick={() => setMode("menu")}>
              <FaBars aria-hidden size={15} />
            </button>
          </div>
        </>
      ) : null}

      {mode === "fly" ? <Flyover front={front} onDone={afterFly} /> : null}
      {mode === "brief" ? <Briefing front={front} touch={touch} onStart={() => setMode("drop")} /> : null}
      {mode === "pause" ? <PauseScreen carried={hud?.carried ?? 0} onResume={() => setMode("play")} onMenu={() => setMode("menu")} /> : null}
      {mode === "down" ? (
        <ExtraLife
          front={front}
          carried={hud?.carried ?? 0}
          wave={hud?.wave ?? 1}
          invite={invite}
          onRevive={() => {
            runRef.current?.revive();
            setMode("play");
          }}
          onGiveUp={() => runRef.current?.giveUp()}
        />
      ) : null}
      {mode === "menu" ? <MenuScreen front={front} hud={hud} save={save} touch={touch} onResume={() => setMode("play")} onRestart={onRestart} onQuit={onQuit} /> : null}
    </div>
  );
}
