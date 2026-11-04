"use client";
import dynamic from "next/dynamic";

// The game reads localStorage and the canvas, so it only ever renders in the browser.
export const PlayLoader = dynamic(() => import("./PlayApp").then((m) => m.PlayApp), {
  ssr: false,
  loading: () => <div className="grid h-dvh place-items-center font-pixel text-sm tracking-widest text-signal uppercase">Loading the armory…</div>,
});
