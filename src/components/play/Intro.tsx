"use client";
import { useEffect, useRef } from "react";
import { FaPlay } from "react-icons/fa6";
import { play, unlockAudio } from "@/game/audio";
import { chopperCanvas } from "@/game/render";
import { CONFIG } from "@/lib/config";
import type { Front } from "@/lib/game";

// Each front is the same key art under a different colour grade until it gets its own.
const GRADES: Record<string, string> = {
  f1: "sepia(.25) brightness(.85)",
  f2: "sepia(.7) hue-rotate(-14deg) saturate(1.4) brightness(.8)",
  f3: "grayscale(.85) brightness(.72)",
  f4: "sepia(.5) brightness(.68)",
  raid: "hue-rotate(150deg) saturate(.8) brightness(.5)",
  f5: "hue-rotate(-32deg) saturate(1.7) brightness(.62)",
};

export function FrontArt({ id, className = "" }: { id: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/media/frontline.jpg" alt="" className={`pixel absolute inset-0 size-full object-cover ${className}`} style={{ filter: GRADES[id] }} />;
}

export function ChopperArt({ width }: { width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const src = chopperCanvas(), c = ref.current!;
    c.width = src.width;
    c.height = src.height;
    c.getContext("2d")!.drawImage(src, 0, 0);
  }, []);
  return (
    <div className="relative" style={{ width }}>
      <div className="rotor absolute inset-x-[6%] top-[-3%] h-[5%] rounded-full bg-ink/70" />
      <canvas ref={ref} className="pixel block w-full" />
    </div>
  );
}

function Embers() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 26 }, (_, i) => (
        <span key={i} className="ember" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i * 0.53) % 6}s`, animationDuration: `${4 + (i % 5)}s` }} />
      ))}
    </div>
  );
}

function Letterbox() {
  return (
    <>
      <div className="letterbox top-0 origin-top" />
      <div className="letterbox bottom-0 origin-bottom" />
    </>
  );
}

// The first thing a player sees.
export function Title({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const go = (e: KeyboardEvent) => {
      if (e.repeat) return;
      unlockAudio();
      play(["chopper"]);
      onStart();
    };
    window.addEventListener("keydown", go);
    return () => window.removeEventListener("keydown", go);
  }, [onStart]);
  return (
    <div
      className="fixed inset-0 cursor-pointer overflow-hidden bg-black select-none"
      onPointerDown={() => {
        unlockAudio();
        play(["chopper"]);
        onStart();
      }}
    >
      <div className="title-bg absolute inset-0">
        <FrontArt id="f1" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,5,3,.55)_0%,rgba(6,5,3,.45)_45%,rgba(6,5,3,.88)_100%)]" />
      <div className="fly-across absolute top-[9%]">
        <ChopperArt width={200} />
      </div>
      <Embers />
      <Letterbox />
      <div className="absolute inset-0 grid place-items-center p-5 text-center">
        <div>
          <p className="rise font-pixel text-[12px] tracking-[0.3em] text-sand uppercase drop-shadow-[1px_1px_0_#000]" style={{ animationDelay: ".5s" }}>
            Five fronts. One war.
          </p>
          <h1 className="mt-2 text-[clamp(52px,min(15vw,21vh),168px)] leading-[0.86] drop-shadow-[0_6px_0_#000] sm:mt-3">
            <span className="slam block" style={{ animationDelay: ".9s" }}>
              SWOL
            </span>
            <span className="slam block text-signal" style={{ animationDelay: "1.2s" }}>
              DIERS
            </span>
          </h1>
          <p className="rise mx-auto mt-[2.5vh] max-w-md text-lg font-semibold text-sand drop-shadow-[1px_2px_0_#000]" style={{ animationDelay: "1.8s" }}>
            Bulk up. Grab the loot. Make the chopper.
          </p>
          <p className="rise mt-[2.5vh] flex items-center justify-center gap-2 font-pixel text-[13px] tracking-widest text-signal uppercase drop-shadow-[1px_1px_0_#000]" style={{ animationDelay: "2.2s" }}>
            <FaPlay aria-hidden size={11} className="blink" /> Tap or press any key
          </p>
        </div>
      </div>
      <p className="rise absolute inset-x-0 bottom-[11%] hidden text-center [@media(min-height:560px)]:block font-pixel text-[10px] tracking-widest text-sand/80 uppercase drop-shadow-[1px_1px_0_#000]" style={{ animationDelay: "2.2s" }}>
        Free browser demo · {CONFIG.token.symbol}
      </p>
    </div>
  );
}

// Between Fort Gainz and the briefing.
export function Flyover({ front, onDone }: { front: Front; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
    // Only the first timer matters; it should not restart if the parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="absolute inset-0 z-20 cursor-pointer overflow-hidden bg-black select-none" onPointerDown={onDone}>
      <div className="fly-bg absolute inset-0">
        <FrontArt id={front.id} />
      </div>
      <div className="absolute inset-0 bg-black/30" />
      <div className="fly-across absolute top-[22%]" style={{ animationDuration: "2.6s" }}>
        <ChopperArt width={340} />
      </div>
      <Embers />
      <Letterbox />
      <div className="absolute inset-x-0 bottom-[17%] px-6 text-center">
        <p className="rise font-pixel text-[12px] tracking-[0.3em] text-signal uppercase" style={{ animationDelay: ".3s" }}>
          Inbound · {front.tag}
        </p>
        <h2 className="rise mt-2 text-[clamp(38px,8vw,84px)] drop-shadow-[0_4px_0_#000]" style={{ animationDelay: ".55s" }}>
          {front.name}
        </h2>
      </div>
    </div>
  );
}

// A diagonal sweep that hides the jump between two screens.
export function Wipe() {
  return <div aria-hidden className="wipe fixed inset-0 z-50" />;
}
