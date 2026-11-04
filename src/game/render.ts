// Draws a Run. All art is painted here at startup, so there is nothing to download.
// The world is 2 canvas pixels per game unit, which leaves room for real sprite detail.
import { LZ_RADIUS, WORLD } from "./tuning";
import type { Foe, Run } from "./sim";

export const D = 2;
type G = CanvasRenderingContext2D;

const cv = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
};
const ctx = (c: HTMLCanvasElement) => c.getContext("2d", { willReadFrequently: false })!;
const rnd = (a = 1, b?: number) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];

function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const rect = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
};
const oval = (g: G, x: number, y: number, rx: number, ry: number, c: string) => {
  g.fillStyle = c;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, 6.29);
  g.fill();
};
const poly = (g: G, pts: number[][], c: string) => {
  g.fillStyle = c;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
};

// Paint with soft shapes, then snap to hard pixels and add a dark outline.
function art(w: number, h: number, paint: (g: G) => void) {
  const pad = 1;
  const c = cv(w + pad * 2, h + pad * 2);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.translate(pad, pad);
  paint(g);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data, W = c.width, H = c.height;
  const solid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    solid[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    d[i * 4 + 3] = solid[i] ? 255 : 0;
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (solid[y * W + x]) continue;
      const near = (x > 0 && solid[y * W + x - 1]) || (x < W - 1 && solid[y * W + x + 1]) || (y > 0 && solid[(y - 1) * W + x]) || (y < H - 1 && solid[(y + 1) * W + x]);
      if (near) {
        const i = (y * W + x) * 4;
        d[i] = 18; d[i + 1] = 15; d[i + 2] = 11; d[i + 3] = 255;
      }
    }
  g.putImageData(img, 0, 0);
  return c;
}

const silhouette = (src: HTMLCanvasElement) => {
  const c = cv(src.width, src.height), g = ctx(c);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  rect(g, 0, 0, c.width, c.height, "#fff");
  return c;
};

// ---------- people ----------
type Look = { skin: string; shirt: string; vest: string; pants: string; boots: string; head: "hair" | "helmet" | "mask" | "cap" | "hood" | "bandana" | "beanie"; hat: string; bare?: boolean; pack?: string; eye?: string };

const humanW = 34, humanH = 42;
function human(look: Look, frame: number, back: boolean) {
  return art(humanW, humanH, (g) => {
    const cx = 17, step = [-3, 0, 3, 0][frame], bob = frame % 2 ? 1 : 0;
    const { skin, shirt, vest, pants, boots, hat } = look;
    if (look.pack) {
      rect(g, cx - 12, 14 + bob, 7, 14, look.pack);
      rect(g, cx - 12, 14 + bob, 2, 14, shade(look.pack, 0.12));
      oval(g, cx - 8.5, 14 + bob, 3.5, 2, shade(look.pack, 0.2));
    }
    for (const [lx, s] of [[cx - 6, step], [cx + 1, -step]]) {
      rect(g, lx, 25, 6, 11 + s * 0.4, pants);
      rect(g, lx + 3.5, 25, 2.5, 11 + s * 0.4, shade(pants, -0.07));
      rect(g, lx - 0.5, 35 + s * 0.4, 7.5, 4, boots);
      rect(g, lx - 0.5, 35 + s * 0.4, 7.5, 1, shade(boots, 0.1));
    }
    const y = bob;
    rect(g, cx - 3, 10 + y, 6, 5, shade(skin, -0.06));
    poly(g, [[cx - 11, 14 + y], [cx + 11, 14 + y], [cx + 8, 27 + y], [cx - 8, 27 + y]], shirt);
    poly(g, [[cx + 2, 14 + y], [cx + 11, 14 + y], [cx + 8, 27 + y], [cx + 3, 27 + y]], shade(shirt, -0.07));
    if (look.bare) {
      oval(g, cx - 10.5, 16 + y, 3.8, 3.8, skin);
      oval(g, cx + 10.5, 16 + y, 3.8, 3.8, shade(skin, -0.05));
      rect(g, cx - 12.5, 15 + y, 2, 1, shade(skin, 0.1));
    }
    rect(g, cx - 7, 15 + y, 14, 11, vest);
    rect(g, cx + 2, 15 + y, 5, 11, shade(vest, -0.06));
    rect(g, cx - 7, 15 + y, 14, 1, shade(vest, 0.1));
    if (!back) {
      rect(g, cx - 6, 21 + y, 4, 4, shade(vest, -0.11));
      rect(g, cx - 1, 21 + y, 4, 4, shade(vest, -0.11));
      rect(g, cx + 4, 21 + y, 3, 4, shade(vest, -0.11));
      rect(g, cx - 3, 16 + y, 1, 5, shade(vest, 0.14));
    } else {
      rect(g, cx - 4, 17 + y, 8, 6, shade(vest, -0.1));
    }
    rect(g, cx - 8, 26 + y, 16, 2, "#262017");
    rect(g, cx - 1, 26 + y, 2, 2, "#8a7a4a");

    const hy = y;
    oval(g, cx, 7 + hy, 6.2, 6.6, back ? shade(skin, -0.08) : skin);
    if (!back) {
      oval(g, cx + 2.8, 8.5 + hy, 3.2, 4.4, shade(skin, -0.06));
      rect(g, cx - 2, 11.5 + hy, 6, 1, shade(skin, -0.12));
    }
    const eye = look.eye ?? "#14170f";
    switch (look.head) {
      case "hair":
        oval(g, cx + 0.5, 3 + hy, 6.8, 3.4, hat);
        oval(g, cx + 3, 2 + hy, 3.5, 2.2, shade(hat, 0.08));
        rect(g, cx - 6, 3 + hy, 3, 6, shade(hat, -0.08));
        if (back) oval(g, cx, 6 + hy, 6.2, 5.6, hat);
        else {
          rect(g, cx - 3, 6 + hy, 9, 2.6, eye);
          rect(g, cx + 2, 6.4 + hy, 2, 1, "#7fb4c4");
        }
        break;
      case "helmet":
        oval(g, cx, 4 + hy, 7.4, 5.4, hat);
        oval(g, cx - 2, 2.5 + hy, 3, 1.8, shade(hat, 0.08));
        rect(g, cx - 7.4, 4.5 + hy, 15, 2, shade(hat, -0.08));
        if (!back) rect(g, cx - 2, 7.6 + hy, 7, 1.4, eye);
        break;
      case "mask":
        oval(g, cx, 4.5 + hy, 7.2, 5.6, hat);
        if (!back) {
          rect(g, cx - 4, 6 + hy, 10, 3, eye);
          rect(g, cx - 3, 9 + hy, 8, 3.5, shade(hat, -0.04));
        }
        break;
      case "cap":
        rect(g, cx - 7, 0.5 + hy, 14, 4, hat);
        rect(g, cx - 7, 4 + hy, 15, 1.6, "#14170f");
        rect(g, cx - 1, 1.4 + hy, 2.4, 2, "#f4c430");
        if (!back) rect(g, cx - 2, 7 + hy, 7, 1.4, eye);
        break;
      case "hood":
        oval(g, cx, 6 + hy, 7.6, 7.6, hat);
        if (!back) {
          oval(g, cx + 1.4, 7.5 + hy, 4.4, 4.6, "#14170f");
          rect(g, cx, 7 + hy, 3.5, 1.2, eye);
        }
        break;
      case "bandana":
        oval(g, cx, 3 + hy, 6.8, 3.6, hat);
        if (!back) {
          rect(g, cx - 5.4, 8 + hy, 11, 5, shade(hat, -0.05));
          rect(g, cx - 1, 6 + hy, 5, 1.4, eye);
        }
        break;
      case "beanie":
        oval(g, cx, 3.4 + hy, 6.8, 4, hat);
        rect(g, cx - 6.8, 4 + hy, 13.6, 2, shade(hat, 0.08));
        if (!back) rect(g, cx - 1, 7 + hy, 5, 1.4, eye);
        break;
    }
  });
}

const skinA = "#c98a5a", skinB = "#a56a42", grey = "#8f8f82";
const LOOKS: Record<string, Look> = {
  player: { skin: skinA, shirt: "#39432a", vest: "#55633a", pants: "#4a5636", boots: "#2a2318", head: "hair", hat: "#5a3418", bare: true },
  scavenger: { skin: skinB, shirt: "#6e5a3c", vest: "#7a5a3a", pants: "#4c4034", boots: "#2c2318", head: "beanie", hat: "#5e4228", eye: "#2c2318" },
  raider: { skin: skinA, shirt: "#3a2a26", vest: "#6d3528", pants: "#3a3230", boots: "#1e1a16", head: "bandana", hat: "#a8321f" },
  rifleman: { skin: skinB, shirt: "#3f4552", vest: "#555c6e", pants: "#3a3f4c", boots: "#1e2026", head: "helmet", hat: "#4a4e5c" },
  sniper: { skin: skinB, shirt: "#222c22", vest: "#2c3a2c", pants: "#222c22", boots: "#181c18", head: "hood", hat: "#2c3a2c", eye: "#d9472b" },
  flamer: { skin: grey, shirt: "#7a3a18", vest: "#c0642a", pants: "#5c3018", boots: "#241a12", head: "mask", hat: "#6e5a48", eye: "#f08c2e", pack: "#a8491c" },
  shock: { skin: grey, shirt: "#20262e", vest: "#2c3440", pants: "#20262e", boots: "#14181c", head: "mask", hat: "#343c48", eye: "#62d0e8" },
  colonel: { skin: skinB, shirt: "#44474e", vest: "#6c7078", pants: "#44474e", boots: "#14141a", head: "cap", hat: "#3a3d44", eye: "#d9472b" },
};

// ---------- machines and animals ----------
const dog = (frame: number) =>
  art(38, 22, (g) => {
    const c = "#7c5a38", dark = "#5a4028";
    const front = [4, 0, -4, 0][frame], rear = [-4, 0, 4, 0][frame], arch = frame % 2 ? -1 : 0;
    rect(g, 6 + rear, 13, 3, 8, dark);
    rect(g, 22 - front, 13, 3, 8, dark);
    poly(g, [[2, 7], [5, 9], [4, 11]], c);
    oval(g, 12, 10 + arch, 8, 5.2, c);
    oval(g, 21, 9 + arch, 7, 5.6, c);
    oval(g, 16, 13 + arch, 8, 2.2, "#a88a5e");
    rect(g, 10 + rear, 13, 3, 8, c);
    rect(g, 26 - front, 13, 3, 8, c);
    oval(g, 29, 6 + arch, 4.6, 4, c);
    poly(g, [[31, 4 + arch], [37, 6 + arch], [37, 9 + arch], [31, 9 + arch]], "#6a4c30");
    rect(g, 36, 6.4 + arch, 1.4, 1.4, "#14100c");
    poly(g, [[25, 3 + arch], [27, -1 + arch], [29, 3 + arch]], dark);
    rect(g, 30, 4.6 + arch, 1.4, 1.4, "#d9472b");
    rect(g, 32, 9 + arch, 4, 1, "#ece4cc");
  });

const drone = () =>
  art(32, 20, (g) => {
    for (const x of [2, 24]) {
      rect(g, x, 8, 6, 2, "#3a3e38");
      oval(g, x + 3, 5, 3, 2, "#2a2c28");
    }
    rect(g, 7, 7, 18, 3, "#54584e");
    oval(g, 16, 10, 7.5, 5.5, "#b4b8ac");
    oval(g, 17.5, 11.5, 5.5, 3.5, "#6e7268");
    oval(g, 14, 8, 3, 1.6, "#ece4cc");
    oval(g, 16, 12, 2.2, 2.2, "#14100c");
    oval(g, 16, 12, 1.1, 1.1, "#d9472b");
  });

const hull = (a: string, b: string, frame: number) =>
  art(58, 36, (g) => {
    rect(g, 1, 3, 56, 8, "#23241c");
    rect(g, 1, 26, 56, 8, "#23241c");
    for (let i = (frame % 2) * 3; i < 56; i += 6) {
      rect(g, 1 + i, 3, 2, 8, "#3c3d30");
      rect(g, 1 + i, 26, 2, 8, "#3c3d30");
    }
    rect(g, 3, 8, 52, 21, a);
    rect(g, 3, 8, 52, 2, shade(a, 0.1));
    rect(g, 3, 25, 52, 4, shade(a, -0.08));
    rect(g, 8, 11, 42, 14, b);
    rect(g, 3, 8, 5, 21, shade(a, -0.05));
    rect(g, 46, 12, 7, 4, "#23241c");
    rect(g, 46, 20, 7, 4, "#23241c");
    for (let i = 0; i < 6; i++) rect(g, rnd(10, 46), rnd(12, 24), 3, 1, shade(b, 0.06));
  });

const turret = (a: string) =>
  art(30, 22, (g) => {
    oval(g, 15, 11, 13, 10, a);
    oval(g, 13, 8, 8, 5, shade(a, 0.08));
    rect(g, 11, 6, 8, 2, "#23241c");
    oval(g, 10, 13, 3, 3, shade(a, -0.1));
  });

const rifle = (c = "#1c1e18") =>
  art(26, 8, (g) => {
    rect(g, 0, 2, 7, 4, "#3a2a1c");
    rect(g, 6, 1, 11, 5, c);
    rect(g, 8, 5, 3, 3, "#14140f");
    rect(g, 14, 2, 11, 2, c);
    rect(g, 6, 1, 11, 1, shade(c, 0.14));
  });

const chopperArt = () =>
  art(128, 48, (g) => {
    const a = "#47533a", b = "#343f2b", lit = "#616e4b";
    poly(g, [[62, 18], [122, 13], [122, 18], [64, 30]], b);
    poly(g, [[62, 18], [122, 13], [122, 15], [62, 22]], a);
    poly(g, [[114, 13], [122, 2], [127, 2], [124, 16]], a);
    oval(g, 124, 8, 3, 3, "#23241c");
    poly(g, [[8, 26], [14, 14], [32, 8], [64, 8], [76, 20], [72, 36], [20, 36], [10, 33]], a);
    poly(g, [[14, 14], [32, 8], [64, 8], [68, 12], [30, 13]], lit);
    poly(g, [[10, 33], [72, 33], [72, 36], [20, 36]], b);
    poly(g, [[10, 26], [15, 15], [30, 11], [32, 26]], "#7fb4c4");
    poly(g, [[12, 26], [16, 16], [22, 14], [20, 26]], "#a6d0dc");
    rect(g, 30.5, 11, 1.5, 15, b);
    rect(g, 38, 13, 26, 20, "#14170f");
    rect(g, 38, 13, 26, 1.5, b);
    rect(g, 42, 16, 3, 15, "#23241c");
    rect(g, 56, 16, 3, 15, "#23241c");
    rect(g, 40, 29, 22, 2, "#3a2a1c");
    rect(g, 70, 18, 22, 2.5, "#f4c430");
    rect(g, 44, 2, 12, 7, b);
    rect(g, 49, 0, 3, 3, "#23241c");
    rect(g, 16, 41, 64, 2.5, "#23241c");
    rect(g, 26, 35, 2.5, 7, "#23241c");
    rect(g, 66, 35, 2.5, 7, "#23241c");
    rect(g, 12, 39, 5, 2, "#23241c");
  });

// ---------- stamps ----------
type Sheet = { front: HTMLCanvasElement[]; back: HTMLCanvasElement[]; hitF: HTMLCanvasElement[]; hitB: HTMLCanvasElement[]; scale: number };
type Pack = {
  people: Record<string, Sheet>; dog: HTMLCanvasElement[]; dogHit: HTMLCanvasElement[]; drone: HTMLCanvasElement; droneHit: HTMLCanvasElement;
  tank: HTMLCanvasElement[]; tankHit: HTMLCanvasElement; mammoth: HTMLCanvasElement[]; mammothHit: HTMLCanvasElement; turretA: HTMLCanvasElement; turretB: HTMLCanvasElement;
  rifle: HTMLCanvasElement; rifleE: HTMLCanvasElement; chopper: HTMLCanvasElement; crate: HTMLCanvasElement; pill: HTMLCanvasElement; bits: HTMLCanvasElement[]; glow: Record<string, HTMLCanvasElement>; shadow: HTMLCanvasElement;
};

function softDisc(size: number, stops: [number, string][]) {
  const c = cv(size, size), g = ctx(c);
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([p, s]) => r.addColorStop(p, s));
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

let pack: Pack | null = null;
function sprites(): Pack {
  if (pack) return pack;
  const people: Record<string, Sheet> = {};
  for (const [k, look] of Object.entries(LOOKS)) {
    const front = [0, 1, 2, 3].map((f) => human(look, f, false));
    const back = [0, 1, 2, 3].map((f) => human(look, f, true));
    people[k] = { front, back, hitF: front.map(silhouette), hitB: back.map(silhouette), scale: k === "colonel" ? 1.5 : 1 };
  }
  const dogs = [0, 1, 2, 3].map(dog);
  const tank = [0, 1].map((f) => hull("#5c6636", "#737e44", f));
  const mammoth = [0, 1].map((f) => hull("#4a3a30", "#655044", f));
  const d = drone();
  pack = {
    people, dog: dogs, dogHit: dogs.map(silhouette), drone: d, droneHit: silhouette(d), tank, tankHit: silhouette(tank[0]), mammoth, mammothHit: silhouette(mammoth[0]),
    turretA: turret("#4c5630"), turretB: turret("#3e3026"), rifle: rifle(), rifleE: rifle("#2a2c28"), chopper: chopperArt(),
    crate: art(26, 22, (g) => {
      rect(g, 1, 5, 24, 16, "#5a4a2a");
      rect(g, 1, 1, 24, 7, "#7a6638");
      rect(g, 1, 7, 24, 1, "#3a2e1a");
      for (const x of [1, 12, 23]) rect(g, x, 1, 2, 20, "#3a2e1a");
      rect(g, 5, 11, 16, 5, "#f4c430");
      rect(g, 6, 12, 14, 3, "#3a2e1a");
      rect(g, 8, 13, 10, 1, "#f4c430");
    }),
    pill: art(24, 12, (g) => {
      oval(g, 7, 6, 5.5, 5.5, "#d9472b");
      oval(g, 17, 6, 5.5, 5.5, "#ece4cc");
      rect(g, 7, 0.5, 5, 11, "#d9472b");
      rect(g, 12, 0.5, 5, 11, "#ece4cc");
      rect(g, 5, 2, 14, 1.5, "rgba(255,255,255,.55)");
    }),
    bits: ["#c9a648", "#d8c070", "#a8a494"].map((c) =>
      art(7, 7, (g) => {
        oval(g, 3.5, 3.5, 3, 3, c);
        oval(g, 3.5, 3.5, 1, 1, "#3a3224");
        rect(g, 2, 1, 2, 1, "#fff4b0");
      }),
    ),
    glow: {
      warm: softDisc(128, [[0, "rgba(255,214,130,.9)"], [0.3, "rgba(255,150,60,.35)"], [1, "rgba(255,120,30,0)"]]),
      white: softDisc(128, [[0, "rgba(255,244,200,.8)"], [1, "rgba(255,220,140,0)"]]),
      blue: softDisc(128, [[0, "rgba(98,208,232,.6)"], [1, "rgba(98,208,232,0)"]]),
      dust: softDisc(128, [[0, "rgba(176,156,116,.6)"], [0.6, "rgba(160,140,104,.3)"], [1, "rgba(150,130,96,0)"]]),
      dark: softDisc(128, [[0, "rgba(10,8,6,.55)"], [0.6, "rgba(10,8,6,.3)"], [1, "rgba(10,8,6,0)"]]),
      red: softDisc(128, [[0, "rgba(217,71,43,.7)"], [1, "rgba(217,71,43,0)"]]),
    },
    shadow: softDisc(64, [[0, "rgba(0,0,0,.6)"], [0.6, "rgba(0,0,0,.35)"], [1, "rgba(0,0,0,0)"]]),
  };
  return pack;
}

/** The chopper as a plain canvas, for the intro screens. */
export function chopperCanvas() {
  return sprites().chopper;
}

// ---------- the map ----------
type Theme = { ramp: string[]; road?: string; wall: string; roof: string; tint: string; ash: string; edge: string[] };
const THEMES: Record<string, Theme> = {
  f1: { ramp: ["#2f3a1f", "#3f4a26", "#54582f", "#6a6238"], road: "#6e5a3a", wall: "#6e4a30", roof: "#2a2118", tint: "rgba(120,70,20,.16)", ash: "#d8c8a0", edge: ["#1f2a18", "#2a3620", "#18200f"] },
  f2: { ramp: ["#3a2c20", "#4a3828", "#5c4630", "#6e5238"], road: "#35291f", wall: "#7a4a2a", roof: "#4a3020", tint: "rgba(150,70,20,.2)", ash: "#e0a060", edge: ["#2a1c14", "#3a2618", "#1e140e"] },
  f3: { ramp: ["#2c2e32", "#36383c", "#404246", "#4a4c50"], road: "#26282c", wall: "#5e6066", roof: "#38393e", tint: "rgba(40,60,90,.2)", ash: "#b8bcc4", edge: ["#1c1e22", "#26282c", "#141518"] },
  f4: { ramp: ["#33291a", "#433620", "#524428", "#3a2e1c"], road: "#2a2216", wall: "#6a5e3e", roof: "#3a3320", tint: "rgba(120,60,20,.22)", ash: "#d8a060", edge: ["#231c10", "#2e2616", "#1a140c"] },
  raid: { ramp: ["#1c2226", "#20282c", "#242c30", "#283236"], wall: "#3a4650", roof: "#242c34", tint: "rgba(20,70,90,.26)", ash: "#62d0e8", edge: ["#0e1216", "#141a1e", "#0a0e12"] },
  f5: { ramp: ["#2a1c18", "#38241e", "#452c24", "#2e201c"], road: "#1e1412", wall: "#4e3a34", roof: "#2e201c", tint: "rgba(140,30,20,.24)", ash: "#f08c2e", edge: ["#1a100e", "#241614", "#120a08"] },
};

function noiseField(w: number, h: number) {
  const size = 64, table = Float32Array.from({ length: size * size }, () => Math.random());
  const at = (x: number, y: number) => table[((y & (size - 1)) * size + (x & (size - 1)))];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), u = smooth(x - xi), v = smooth(y - yi);
    return (at(xi, yi) * (1 - u) + at(xi + 1, yi) * u) * (1 - v) + (at(xi, yi + 1) * (1 - u) + at(xi + 1, yi + 1) * u) * v;
  };
  void w; void h;
  return (x: number, y: number) => value(x / 64, y / 64) * 0.55 + value(x / 26, y / 26) * 0.3 + value(x / 9, y / 9) * 0.15;
}

const hexRGB = (h: string) => {
  const n = parseInt(h.slice(1, 7), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};

function paintGround(g: G, t: Theme, id: string) {
  const W = WORLD.w, H = WORLD.h, noise = noiseField(W, H);
  const img = g.createImageData(W, H), d = img.data;
  const ramp = t.ramp.map(hexRGB), road = t.road ? hexRGB(t.road) : null;
  const roadY = (x: number) => H * 0.5 + Math.sin(x / 150) * 70 + Math.sin(x / 61) * 22;
  const roadX = (y: number) => W * 0.46 + Math.sin(y / 120) * 60;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = Math.min(0.999, Math.max(0, (noise(x, y) - 0.25) * 2));
      const f = n * (ramp.length - 1), i = Math.floor(f), k = f - i;
      let [r, gg, b] = [0, 1, 2].map((c) => ramp[i][c] * (1 - k) + ramp[i + 1][c] * k);
      if (road) {
        const dist = Math.min(Math.abs(y - roadY(x)), Math.abs(x - roadX(y))) + noise(x + 300, y) * 16;
        const m = Math.max(0, Math.min(1, (26 - dist) / 8));
        r = r * (1 - m) + road[0] * m;
        gg = gg * (1 - m) + road[1] * m;
        b = b * (1 - m) + road[2] * m;
      }
      const grain = (Math.random() - 0.5) * 9, p = (y * W + x) * 4;
      d[p] = r + grain; d[p + 1] = gg + grain; d[p + 2] = b + grain; d[p + 3] = 255;
    }
  const base = cv(W, H);
  ctx(base).putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(base, 0, 0);

  if (id === "raid") {
    g.fillStyle = "rgba(0,0,0,.35)";
    for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 0.5, H);
    for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 0.5);
  }
  for (let i = 0; i < 2600; i++) detail(g, id, rnd(W), rnd(H));
  for (let i = 0; i < 14; i++) crater(g, rnd(W), rnd(H), rnd(8, id === "f4" ? 26 : 16), t);
}

function detail(g: G, id: string, x: number, y: number) {
  const r = Math.random();
  if (id === "f1") {
    if (r < 0.7) {
      const c = pick(["#6e7a3a", "#88884a", "#4e5e2c", "#a39a58"]);
      for (let i = 0; i < 4; i++) rect(g, x + i * 0.6, y - rnd(1, 3), 0.5, 3, c);
    } else if (r < 0.74) rect(g, x, y, 1, 1, pick(["#d8c070", "#c0604a", "#ece4cc"]));
    else rect(g, x, y, rnd(0.5, 2), 0.5, "#2a2418");
  } else if (id === "f2") {
    if (r < 0.1) oval(g, x, y, rnd(3, 11), rnd(1.5, 5), "rgba(14,12,10,.3)");
    else if (r < 0.6) rect(g, x, y, rnd(0.5, 2.5), 0.5, pick(["#8a5a30", "#a8682c", "#2a2018", "#6e6e68"]));
  } else if (id === "f3") {
    if (r < 0.08) crack(g, x, y);
    else if (r < 0.45) rect(g, x, y, rnd(0.5, 2), rnd(0.5, 1), pick(["#55575c", "#1e1f22", "#6a6a6a"]));
  } else if (id === "f4") {
    if (r < 0.08) oval(g, x, y, rnd(2, 7), rnd(1, 3), "rgba(90,110,120,.22)");
    else if (r < 0.6) rect(g, x, y, rnd(1, 4), 0.5, pick(["#2a2014", "#5e4c2c", "#1e180e"]));
  } else if (id === "raid") {
    if (r < 0.03) crack(g, x, y);
    else if (r < 0.08) rect(g, x, y, 1, 1, "#3f8fa8");
  } else if (r < 0.1) crack(g, x, y);
  else if (r < 0.5) rect(g, x, y, rnd(0.5, 2), 0.5, pick(["#100a08", "#5a3a2a", "#8a3a1e"]));
}

function crack(g: G, x: number, y: number) {
  g.strokeStyle = "rgba(10,8,6,.55)";
  g.lineWidth = 0.5;
  g.beginPath();
  g.moveTo(x, y);
  for (let i = 0; i < 4; i++) {
    x += rnd(-7, 7);
    y += rnd(-5, 5);
    g.lineTo(x, y);
  }
  g.stroke();
}

function crater(g: G, x: number, y: number, r: number, t: Theme) {
  oval(g, x, y + 1, r * 1.08, r * 0.7, "rgba(255,240,200,.05)");
  oval(g, x, y, r, r * 0.66, shade(t.ramp[0], -0.05));
  oval(g, x, y + r * 0.08, r * 0.72, r * 0.44, shade(t.ramp[0], -0.1));
  for (let i = 0; i < 14; i++) {
    const a = rnd(6.28);
    rect(g, x + Math.cos(a) * r * 1.1, y + Math.sin(a) * r * 0.74, rnd(0.5, 2), 0.5, shade(t.ramp[2], rnd(-0.06, 0.06)));
  }
}

// Building materials
function bricks(g: G, x: number, y: number, w: number, h: number, c: string) {
  rect(g, x, y, w, h, shade(c, -0.14));
  for (let j = 0, row = 0; j < h; j += 2.5, row++)
    for (let i = row % 2 ? -2 : 0; i < w; i += 5) {
      const bx = Math.max(x, x + i), bw = Math.min(4.5, x + w - bx);
      if (bw > 0) rect(g, bx, y + j, bw, 2, shade(c, rnd(-0.04, 0.04)));
    }
}
function corrugated(g: G, x: number, y: number, w: number, h: number, c: string) {
  rect(g, x, y, w, h, c);
  for (let i = 0; i < w; i += 2) rect(g, x + i, y, 1, h, shade(c, -0.06));
  for (let i = 0; i < w * h * 0.02; i++) oval(g, x + rnd(w), y + rnd(h), rnd(1, 3), rnd(1, 3), "rgba(120,60,20,.5)");
}
function concrete(g: G, x: number, y: number, w: number, h: number, c: string) {
  rect(g, x, y, w, h, c);
  for (let i = 0; i < w * h * 0.15; i++) rect(g, x + rnd(w), y + rnd(h), 1, 0.5, shade(c, rnd(-0.08, 0.08)));
}
function bags(g: G, x: number, y: number, w: number, h: number) {
  rect(g, x, y, w, h, "#3e3722");
  const c = ["#8a7c52", "#7a6e48", "#968860"];
  for (let j = 0, row = 0; j < h; j += 4, row++)
    for (let i = row % 2 ? -3 : 0; i < w; i += 7) {
      if (x + i < x - 1) continue;
      const bw = Math.min(3.4, (x + w - (x + i)) / 2);
      if (bw <= 0.5) continue;
      oval(g, x + i + bw, y + j + 2, bw, 2.1, pick(c));
      rect(g, x + i + 1, y + j + 1, bw, 0.5, "rgba(255,255,255,.1)");
    }
}

function block(g: G, x: number, y: number, w: number, h: number, tall: number, top: (x: number, y: number, w: number, h: number) => void, face: (x: number, y: number, w: number, h: number) => void) {
  // shadow falls down and to the right, the same way as everything else
  g.fillStyle = "rgba(0,0,0,.34)";
  g.beginPath();
  g.moveTo(x + w, y - tall + 3);
  g.lineTo(x + w + tall * 0.7, y + 2);
  g.lineTo(x + w + tall * 0.7, y + h + tall * 0.5);
  g.lineTo(x + 5, y + h + tall * 0.5);
  g.lineTo(x, y + h);
  g.lineTo(x + w, y + h);
  g.closePath();
  g.fill();
  face(x, y + h - tall, w, tall);
  rect(g, x, y + h - tall, w, 1, "rgba(255,240,210,.12)");
  rect(g, x, y + h - 2, w, 2, "rgba(0,0,0,.28)");
  top(x, y - tall, w, h);
}

function obstacle(g: G, b: { c: number; r: number; w: number; h: number }, id: string, t: Theme) {
  const s = WORLD.cell, x = b.c * s, y = b.r * s, w = b.w * s, h = b.h * s, big = b.w * b.h >= 4;
  if (id === "f1") {
    if (big)
      block(g, x, y, w, h, 18,
        (a, c, e, f) => {
          rect(g, a, c, e, f, t.roof);
          for (let j = 0; j < f; j += 3)
            for (let i = (j / 3) % 2 ? -2 : 0; i < e; i += 5) {
              const bx = Math.max(a, a + i), bw = Math.min(4.4, a + e - bx);
              if (bw > 0) rect(g, bx, c + j, bw, 2.4, shade(t.roof, rnd(-0.02, 0.06)));
            }
          const hx = a + rnd(6, Math.max(7, e - 12)), hy = c + rnd(4, Math.max(5, f - 10));
          rect(g, hx, hy, rnd(5, 9), rnd(4, 7), "#17100a");
          for (let i = 0; i < 3; i++) rect(g, hx - 1, hy + 1 + i * 2, rnd(6, 11), 0.8, "#4a3220");
        },
        (a, c, e, f) => {
          bricks(g, a, c, e, f, t.wall);
          rect(g, a + e / 2 - 4, c + 4, 8, f - 4, "#100c08");
          for (let i = 0; i < 6; i++) rect(g, a + rnd(e), c, rnd(2, 6), rnd(1, 4), "rgba(10,8,6,.6)");
        });
    else if (b.w * b.h === 1) {
      g.drawImage(hay(), x, y - 6, s, s + 6);
    } else
      block(g, x, y, w, h, 10,
        (a, c, e, f) => {
          rect(g, a, c, e, f, "#5a4228");
          for (let i = 0; i < f; i += 3) rect(g, a, c + i, e, 2, shade("#5a4228", rnd(-0.03, 0.05)));
        },
        (a, c, e, f) => {
          rect(g, a, c, e, f, "#4a3620");
          for (let i = 0; i < e; i += 4) rect(g, a + i, c, 1, f, "#2a1e12");
        });
  } else if (id === "f2") {
    if (big)
      block(g, x, y, w, h, 14,
        (a, c, e, f) => corrugated(g, a, c, e, f, "#6a4a30"),
        (a, c, e, f) => {
          corrugated(g, a, c, e, f, "#7a4a2a");
          rect(g, a, c + f - 3, e, 3, "#1e1812");
          for (const wx of [a + 7, a + e - 7]) {
            oval(g, wx, c + f - 2, 4.5, 4.5, "#14120e");
            oval(g, wx, c + f - 2, 1.8, 1.8, "#5a5448");
          }
          rect(g, a + 3, c + 2, Math.min(10, e / 4), 5, "#1e2a30");
        });
    else
      block(g, x, y, w, h, 10,
        (a, c, e, f) => {
          rect(g, a, c, e, f, "#1e1c18");
          for (let i = 0; i + 8 <= e + 1; i += 8) for (let j = 0; j + 8 <= f + 1; j += 8) {
            oval(g, a + i + 4, c + j + 4, 3.8, 3.8, "#2c2a26");
            oval(g, a + i + 4, c + j + 4, 1.8, 1.8, "#0e0c0a");
          }
        },
        (a, c, e, f) => {
          rect(g, a, c, e, f, "#23211c");
          for (let i = 0; i < f; i += 3) rect(g, a, c + i, e, 1, "#100e0c");
        });
  } else if (id === "f3") {
    if (big)
      block(g, x, y, w, h, 24,
        (a, c, e, f) => {
          concrete(g, a, c, e, f, t.roof);
          rect(g, a, c, e, 1.5, shade(t.roof, 0.08));
          for (let i = 0; i < 5; i++) rect(g, a + rnd(e), c + rnd(f), rnd(2, 6), rnd(2, 4), shade(t.wall, rnd(-0.08, 0)));
        },
        (a, c, e, f) => {
          concrete(g, a, c, e, f, t.wall);
          for (let i = 3; i + 5 < e; i += 8) for (let j = 3; j + 6 < f; j += 9) rect(g, a + i, c + j, 5, 6, Math.random() < 0.2 ? "#d8a048" : "#14161a");
        });
    else
      block(g, x, y, w, h, 7, (a, c, e, f) => concrete(g, a, c, e, f, "#5a5c60"), (a, c, e, f) => concrete(g, a, c, e, f, "#3e4044"));
  } else if (id === "f4") {
    block(g, x, y, w, h, big ? 13 : 9,
      (a, c, e, f) => bags(g, a, c, e, f),
      (a, c, e, f) => {
        bags(g, a, c, e, f);
        rect(g, a, c, e, f, "rgba(0,0,0,.26)");
        if (big) rect(g, a + e / 2 - 8, c + 2, 16, 4, "#100c08");
      });
  } else if (id === "raid") {
    block(g, x, y, w, h, big ? 16 : 11,
      (a, c, e, f) => {
        rect(g, a, c, e, f, t.roof);
        rect(g, a + 2, c + 2, e - 4, f - 4, shade(t.roof, 0.04));
        for (let i = 0; i < 4; i++) rect(g, a + rnd(e - 2), c + rnd(f - 2), 2, 1, pick(["#62d0e8", "#d9472b", "#9bc53d"]));
      },
      (a, c, e, f) => {
        rect(g, a, c, e, f, t.wall);
        for (let i = 2; i + 9 < e; i += 12) {
          rect(g, a + i, c + 2, 9, Math.max(3, f - 6), "#0a1e26");
          rect(g, a + i + 1, c + 3, rnd(3, 7), 1, "#62d0e8");
        }
        for (let i = 0; i < e; i += 6) rect(g, a + i, c + f - 2, 3, 2, i % 12 ? "#14181c" : "#f4c430");
      });
  } else {
    block(g, x, y, w, h, big ? 20 : 11,
      (a, c, e, f) => {
        concrete(g, a, c, e, f, t.roof);
        for (let i = 0; i < 4; i++) crack(g, a + rnd(e), c + rnd(f));
      },
      (a, c, e, f) => {
        bricks(g, a, c, e, f, t.wall);
        if (big) rect(g, a + 4, c + f / 2, e - 8, 1.5, "#f08c2e");
      });
  }
}

let hayArt: HTMLCanvasElement | null = null;
function hay() {
  hayArt ??= art(32, 44, (g) => {
    oval(g, 16, 24, 15, 19, "#a8883e");
    oval(g, 16, 24, 11, 14, "#c0a050");
    oval(g, 16, 24, 6, 8, "#8a6e30");
    oval(g, 16, 24, 2, 3, "#5e4a20");
  });
  return hayArt;
}

function edges(g: G, t: Theme) {
  const s = WORLD.cell, W = WORLD.w, H = WORLD.h;
  const band = (x: number, y: number, w: number, h: number) => {
    rect(g, x, y, w, h, t.edge[2]);
    for (let i = 0; i < (w * h) / 16; i++) oval(g, x + rnd(w), y + rnd(h), rnd(4, 12), rnd(3, 9), pick(t.edge));
  };
  band(0, 0, W, s);
  band(0, H - s, W, s);
  band(0, 0, s, H);
  band(W - s, 0, s, H);
}

export type World = { canvas: HTMLCanvasElement; g: G; id: string };

export function paintWorld(run: Run): World {
  const id = run.front.id, t = THEMES[id] ?? THEMES.f1;
  const canvas = cv(WORLD.w * D, WORLD.h * D), g = ctx(canvas);
  g.imageSmoothingEnabled = false;
  g.scale(D, D);
  paintGround(g, t, id);
  edges(g, t);
  [...run.blobs].sort((a, b) => a.r + a.h - (b.r + b.h)).forEach((b) => obstacle(g, b, id, t));
  return { canvas, g, id };
}

function stamp(world: World, run: Run) {
  const g = world.g;
  for (const d of run.decals) {
    if (d.kind === "blood") {
      for (let i = 0; i < 5; i++) oval(g, d.x + rnd(-4, 4), d.y + rnd(-2, 3), rnd(0.6, 2.2), rnd(0.5, 1.4), pick(["rgba(96,20,14,.8)", "rgba(66,14,10,.8)"]));
    } else if (d.kind === "scorch") {
      oval(g, d.x, d.y, 20, 13, "rgba(14,11,8,.5)");
      oval(g, d.x, d.y, 12, 8, "rgba(10,8,6,.6)");
      for (let i = 0; i < 14; i++) {
        const a = rnd(6.28), r = rnd(10, 24);
        rect(g, d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.66, 1, 0.5, "#14100c");
      }
    } else {
      rect(g, d.x + rnd(-4, 4), d.y + rnd(-2, 3), 1, 0.5, "#c0a050");
    }
  }
  run.decals.length = 0;
}

// ---------- drawing a frame ----------
function shadow(x: G, px: number, py: number, w: number, h = w * 0.36) {
  x.drawImage(sprites().shadow, px - w / 2, py - h / 2, w, h);
}

function person(x: G, name: string, px: number, py: number, a: number, walk: number, hit: boolean, tilt = 0) {
  const s = sprites().people[name];
  const back = Math.sin(a) < -0.45, frame = Math.floor(walk) & 3;
  const img = hit ? (back ? s.hitB : s.hitF)[frame] : (back ? s.back : s.front)[frame];
  const w = (humanW / D) * s.scale, h = (humanH / D) * s.scale;
  x.save();
  x.translate(px, py);
  if (tilt) x.rotate(tilt);
  if (Math.cos(a) < 0) x.scale(-1, 1);
  x.drawImage(img, -w / 2, -h + 3, w, h);
  x.restore();
}

function held(x: G, img: HTMLCanvasElement, px: number, py: number, a: number, len: number) {
  const left = Math.cos(a) < 0;
  x.save();
  x.translate(px, py);
  x.rotate(a);
  if (left) x.scale(1, -1);
  x.drawImage(img, -2, -2, len, (len * img.height) / img.width);
  x.restore();
}

function arm(x: G, px: number, py: number, a: number, c: string) {
  const hx = px + Math.cos(a) * 6, hy = py + Math.sin(a) * 6;
  x.lineCap = "round";
  x.strokeStyle = "#12100c";
  x.lineWidth = 2.6;
  x.beginPath();
  x.moveTo(px, py);
  x.lineTo(hx, hy);
  x.stroke();
  x.strokeStyle = c;
  x.lineWidth = 1.7;
  x.stroke();
  x.lineCap = "butt";
}

function drawFoe(x: G, run: Run, f: Foe) {
  const p = sprites();
  const hit = f.flash > 0, k = f.kind.sprite;
  if (k === "drone") {
    const up = 7 + Math.sin(run.time * 6 + f.id) * 2;
    shadow(x, f.x, f.y + 3, 15);
    x.drawImage(hit ? p.droneHit : p.drone, f.x - 8, f.y - up - 5, 17, 10.6);
    x.fillStyle = "rgba(220,224,212,.32)";
    const spin = Math.abs(Math.sin(run.time * 40 + f.id));
    for (const o of [-6.5, 6.5]) x.fillRect(f.x + o - 3.5 * spin, f.y - up - 4, 7 * spin + 1, 0.8);
  } else if (k === "dog") {
    shadow(x, f.x, f.y + 3, 17);
    x.save();
    x.translate(f.x, f.y);
    if (Math.cos(f.dir) < 0) x.scale(-1, 1);
    const frame = Math.floor(f.walk) & 3;
    x.drawImage(hit ? p.dogHit[frame] : p.dog[frame], -10, -8, 20, 12);
    x.restore();
  } else if (k === "tank" || k === "mammoth") {
    const big = k === "mammoth" ? 1.7 : 1, w = 30 * big, h = 19 * big;
    shadow(x, f.x + 2, f.y + 6 * big, w * 1.15, h * 0.75);
    x.save();
    x.translate(f.x, f.y);
    if (Math.cos(f.dir) < 0) x.scale(-1, 1);
    const sheet = k === "tank" ? p.tank : p.mammoth;
    x.drawImage(hit ? (k === "tank" ? p.tankHit : p.mammothHit) : sheet[Math.floor(f.walk) & 1], -w / 2, -h / 2 - 3, w, h);
    x.restore();
    x.save();
    x.translate(f.x, f.y - 6 * big);
    x.rotate(f.dir);
    x.fillStyle = "#23241c";
    x.fillRect(4 * big, -1.3 * big, 15 * big, 2.6 * big);
    x.fillStyle = "#3c3d30";
    x.fillRect(4 * big, -1.3 * big, 15 * big, 0.8 * big);
    x.fillRect(17 * big, -1.8 * big, 3 * big, 3.6 * big);
    x.drawImage(k === "tank" ? p.turretA : p.turretB, -8 * big, -6 * big, 16 * big, 12 * big);
    x.restore();
  } else {
    const s = p.people[k], lift = s.scale;
    shadow(x, f.x, f.y + 3, 14 * s.scale);
    const a = f.dir, back = Math.sin(a) < -0.45;
    if (back && f.kind.attack !== "melee") held(x, p.rifleE, f.x, f.y - 8 * lift, a, f.kind.attack === "snipe" ? 17 : 12);
    person(x, k, f.x, f.y, a, f.walk, hit);
    if (!back && f.kind.attack !== "melee") {
      held(x, p.rifleE, f.x, f.y - 7 * lift, a, f.kind.attack === "snipe" ? 17 : 12);
      arm(x, f.x, f.y - 8 * lift, a, LOOKS[k].skin);
    }
  }
  if (f.data.boss || f.hp < f.maxHp) {
    const w = f.data.boss ? 46 : f.kind.r * 2 + 4, top = f.y - (f.data.boss ? 30 : 17);
    rect(x, f.x - w / 2 - 0.5, top - 0.5, w + 1, 2.5, "#000b");
    rect(x, f.x - w / 2, top, (w * Math.max(0, f.hp)) / f.maxHp, 1.5, f.data.boss ? "#d9472b" : "#9bc53d");
  }
}

function chopperAt(x: G, run: Run, px: number, py: number, alt: number, tilt: number) {
  const p = sprites();
  shadow(x, px, py + 7, Math.max(34, 62 - alt * 0.2), 15);
  const w = 66, h = 25;
  x.save();
  x.translate(px, py - alt);
  x.rotate(tilt);
  x.drawImage(p.chopper, -w / 2 - 4, -h, w, h);
  const spin = Math.abs(Math.cos(run.time * 30)) * 42 + 6;
  x.fillStyle = "rgba(20,23,15,.34)";
  x.fillRect(-spin - 2, -h - 1.5, spin * 2 + 4, 1);
  x.fillStyle = "rgba(200,204,190,.16)";
  x.beginPath();
  x.ellipse(-2, -h - 1, 48, 2.4, 0, 0, 6.29);
  x.fill();
  const tail = run.time * 60;
  x.fillStyle = "rgba(20,23,15,.5)";
  x.fillRect(58 / 2 + 1.5 - Math.cos(tail) * 3.5, -h + 3.5, Math.cos(tail) * 7 || 1, 0.8);
  x.restore();
}

function chopper(x: G, run: Run, font: string) {
  const c = run.chopper;
  if (!c || c.state === "gone") return;
  const p = sprites();
  x.globalCompositeOperation = "lighter";
  const flick = 26 + Math.sin(run.time * 13) * 4;
  x.drawImage(p.glow.red, c.x - LZ_RADIUS + 4 - flick / 2, c.y + 6 - flick / 2, flick, flick);
  x.globalCompositeOperation = "source-over";
  x.strokeStyle = c.hold > 0 ? "#9bc53d" : "#f4c430";
  x.lineWidth = 1.2;
  x.setLineDash([5, 5]);
  x.lineDashOffset = -run.time * 16;
  x.beginPath();
  x.ellipse(c.x, c.y, LZ_RADIUS, LZ_RADIUS * 0.72, 0, 0, 6.29);
  x.stroke();
  x.setLineDash([]);
  if (c.hold > 0) {
    x.strokeStyle = "#9bc53d";
    x.lineWidth = 2;
    x.beginPath();
    x.ellipse(c.x, c.y, LZ_RADIUS + 3, (LZ_RADIUS + 3) * 0.72, 0, -1.57, -1.57 + (c.hold / 2) * 6.29);
    x.stroke();
  }
  const alt = c.state === "inbound" ? c.t * 42 : 0;
  chopperAt(x, run, c.x, c.y, alt, c.state === "inbound" ? -0.06 : 0);
  if (c.state === "landed") {
    x.font = font;
    x.textAlign = "center";
    rect(x, c.x - 7, c.y + 16.5, 14, 6, "#000a");
    x.fillStyle = "#f4c430";
    x.fillText("LZ", c.x, c.y + 21);
  }
}

// One overlay per screen size: a soft vignette and the front's colour grade.
let gradeKey = "";
let grade: HTMLCanvasElement | null = null;
function gradeFor(id: string, vw: number, vh: number) {
  const key = `${id}:${vw}x${vh}`;
  if (grade && gradeKey === key) return grade;
  gradeKey = key;
  grade = cv(vw, vh);
  const g = ctx(grade), t = THEMES[id] ?? THEMES.f1;
  rect(g, 0, 0, vw, vh, t.tint);
  const r = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.42, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
  r.addColorStop(0, "rgba(6,5,3,0)");
  r.addColorStop(1, "rgba(6,5,3,.72)");
  g.fillStyle = r;
  g.fillRect(0, 0, vw, vh);
  return grade;
}

let hurtKey = "";
let hurtArt: HTMLCanvasElement | null = null;
function hurtFor(vw: number, vh: number) {
  const key = `${vw}x${vh}`;
  if (hurtArt && hurtKey === key) return hurtArt;
  hurtKey = key;
  hurtArt = cv(vw, vh);
  const g = ctx(hurtArt);
  const r = g.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.38, vw / 2, vh / 2, Math.max(vw, vh) * 0.66);
  r.addColorStop(0, "rgba(170,24,12,0)");
  r.addColorStop(1, "rgba(170,24,12,.8)");
  g.fillStyle = r;
  g.fillRect(0, 0, vw, vh);
  return hurtArt;
}

const motes = Array.from({ length: 36 }, () => ({ x: Math.random(), y: Math.random(), s: 0.3 + Math.random() * 0.7, p: Math.random() * 6.28 }));
const clouds = Array.from({ length: 3 }, (_, i) => ({ x: i * 330, y: 60 + i * 190, r: 170 + i * 50 }));

export type Drop = { t: number };
/** Chopper in, soldier jumps, soldier lands, chopper leaves. Times in seconds. */
export const DROP = { jump: 1, land: 1.5, leave: 1.9, end: 2.7 };

export function draw(x: G, run: Run, world: World, vw: number, vh: number, font: string, drop?: Drop) {
  const p = sprites();
  stamp(world, run);
  const cx = Math.max(0, Math.min(WORLD.w - vw, run.x - vw / 2)), cy = Math.max(0, Math.min(WORLD.h - vh, run.y - vh / 2));
  const sx = run.shake ? (Math.random() - 0.5) * run.shake : 0, sy = run.shake ? (Math.random() - 0.5) * run.shake : 0;
  const ox = Math.round((cx + sx) * D) / D, oy = Math.round((cy + sy) * D) / D;
  x.setTransform(D, 0, 0, D, 0, 0);
  x.imageSmoothingEnabled = false;
  x.drawImage(world.canvas, ox * D, oy * D, vw * D, vh * D, 0, 0, vw, vh);

  x.save();
  x.translate(-ox, -oy);
  for (const f of run.fires) {
    const size = f.r * 3 + Math.sin(run.time * 11 + f.x) * 5;
    x.globalCompositeOperation = "lighter";
    x.drawImage(p.glow.warm, f.x - size / 2, f.y - size / 2, size, size * 0.72);
    x.globalCompositeOperation = "source-over";
  }
  chopper(x, run, font);
  for (const c of run.crates) {
    shadow(x, c.x + 1, c.y + 4, 16);
    x.drawImage(p.crate, c.x - 7, c.y - 8, 14, 12);
  }
  for (const l of run.loot) {
    const up = Math.abs(Math.sin(run.time * 5 + l.x)) * 1.6;
    shadow(x, l.x, l.y + 2, 5);
    x.drawImage(p.bits[Math.floor(l.x) % 3], l.x - 2.2, l.y - 2.2 - up, 4.4, 4.4);
    if ((run.time * 2 + l.y) % 1 < 0.12) rect(x, l.x - 0.5, l.y - 3 - up, 1, 1, "#fff");
  }
  for (const f of run.pills) {
    const size = 24 + Math.sin(run.time * 9) * 3, up = 3 + Math.sin(run.time * 6) * 1.5;
    shadow(x, f.x, f.y + 3, 10);
    x.globalCompositeOperation = "lighter";
    x.drawImage(p.glow.red, f.x - size / 2, f.y - up - size / 2, size, size);
    x.globalCompositeOperation = "source-over";
    x.drawImage(p.pill, f.x - 6, f.y - up - 3, 12, 6);
  }
  for (const f of run.foes)
    if (f.aim > 0) {
      x.strokeStyle = `rgba(255,60,40,${0.45 + Math.sin(run.time * 30) * 0.35})`;
      x.lineWidth = 0.6;
      x.beginPath();
      x.moveTo(f.x, f.y - 7);
      x.lineTo(run.x, run.y - 6);
      x.stroke();
    }
  for (const b of run.blasts)
    if (b.ticks) {
      x.strokeStyle = b.kind === "strike" ? "#d9472b" : "#f4c430";
      x.lineWidth = 0.7;
      x.beginPath();
      x.ellipse(b.x, b.y, b.r * Math.max(0.4, 1 - b.t), b.r * 0.7 * Math.max(0.4, 1 - b.t), 0, 0, 6.29);
      x.stroke();
      if (b.life && b.fromX !== undefined) {
        // the grenade itself, flying in an arc to where it was thrown
        const k = Math.min(1, (b.life - b.t) / (b.life * 0.8)), gx = b.fromX + (b.x - b.fromX) * k, gy = b.fromY! + (b.y - b.fromY!) * k;
        shadow(x, gx, gy + 6 * k + 2, 5);
        oval(x, gx, gy - Math.sin(k * Math.PI) * 26, 1.8, 2, "#2a3020");
        rect(x, gx - 0.5, gy - Math.sin(k * Math.PI) * 26 - 2.4, 1, 1, "#c9ccc2");
      }
    }

  // The soldier falling during the drop is handled below, on top of everything.
  const dead = run.deadT > 0 || run.hp <= 0;
  const landed = !drop || drop.t >= DROP.land;
  type Item = { y: number; go: () => void };
  const items: Item[] = run.foes.map((f) => ({ y: f.y, go: () => drawFoe(x, run, f) }));
  if (!dead && landed)
    items.push({
      y: run.y,
      go: () => {
        shadow(x, run.x, run.y + 3, 15);
        if (run.flexT > 0) {
          x.globalCompositeOperation = "lighter";
          x.drawImage(p.glow.warm, run.x - 18, run.y - 26, 36, 36);
          x.globalCompositeOperation = "source-over";
        }
        const a = run.dir, back = Math.sin(a) < -0.45, rolling = run.rollT > 0;
        if (back && !rolling) held(x, p.rifle, run.x, run.y - 8, a, 13);
        person(x, "player", run.x, run.y, a, run.walk, run.hurt > 0, rolling ? run.time * 26 : 0);
        if (!back && !rolling) {
          held(x, p.rifle, run.x, run.y - 7, a, 13);
          arm(x, run.x, run.y - 8.5, a, LOOKS.player.skin);
        }
      },
    });
  items.sort((a, b) => a.y - b.y).forEach((i) => i.go());

  for (const s of run.shots) {
    if (s.flame) {
      const size = 5 + Math.random() * 4;
      x.globalCompositeOperation = "lighter";
      x.drawImage(p.glow.warm, s.x - size / 2, s.y - size / 2, size, size);
      x.globalCompositeOperation = "source-over";
    } else if (s.splash) {
      oval(x, s.x, s.y, 1.8, 1.8, "#14100c");
      rect(x, s.x - 0.5, s.y - 0.5, 1, 1, "#f08c2e");
    } else {
      x.strokeStyle = s.mine ? "#fff2b8" : "#ff7a54";
      x.lineWidth = s.mine ? 0.7 : 0.8;
      x.beginPath();
      x.moveTo(s.x, s.y);
      x.lineTo(s.x - s.vx * 0.016, s.y - s.vy * 0.016);
      x.stroke();
    }
  }
  x.globalCompositeOperation = "lighter";
  for (const b of run.blasts)
    if (!b.ticks) {
      const k = b.t / 0.22, size = b.r * (3.4 - k * 1.2);
      x.globalAlpha = Math.min(1, k * 1.6);
      x.drawImage(p.glow.warm, b.x - size / 2, b.y - size / 2, size, size);
      x.drawImage(p.glow.white, b.x - size / 4, b.y - size / 4, size / 2, size / 2);
    }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  for (const f of run.puffs) {
    x.globalAlpha = Math.min(1, (f.t / f.life) * 1.3) * 0.75;
    const size = f.r * (2.4 - f.t / f.life);
    x.drawImage(f.c === "#2c2822" ? p.glow.dark : p.glow.dust, f.x - size, f.y - size, size * 2, size * 2);
  }
  x.globalAlpha = 1;
  for (const s of run.sparks) rect(x, s.x, s.y, 1, 1, s.c);

  x.globalCompositeOperation = "lighter";
  if (run.shotFlash > 0) {
    x.drawImage(p.glow.warm, run.x + Math.cos(run.dir) * 13 - 13, run.y - 8 + Math.sin(run.dir) * 13 - 13, 26, 26);
  }
  x.globalCompositeOperation = "source-over";
  if (run.shotFlash > 0) rect(x, run.x + Math.cos(run.dir) * 13 - 1.5, run.y - 8 + Math.sin(run.dir) * 13 - 1.5, 3, 3, "#fff4c8");

  if (drop) {
    const t = drop.t;
    const hoverX = run.x + 6, hoverY = run.y - 2;
    const inK = Math.min(1, t / DROP.jump), ease = 1 - (1 - inK) ** 3;
    const outK = t > DROP.leave ? (t - DROP.leave) / (DROP.end - DROP.leave) : 0;
    const px = hoverX - 260 * (1 - ease) + 320 * outK ** 2, alt = 30 + (1 - ease) * 12 + outK * 40;
    chopperAt(x, run, px, hoverY, alt, (1 - ease) * 0.14 - outK * 0.18);
    if (t >= DROP.jump && t < DROP.land) {
      const k = (t - DROP.jump) / (DROP.land - DROP.jump), height = 26 * (1 - k * k);
      shadow(x, run.x, run.y + 3, 6 + 9 * k);
      person(x, "player", run.x, run.y - height, 0, 0, false, (1 - k) * 0.5);
    }
  }

  x.font = font;
  x.textAlign = "center";
  for (const c of run.pops) {
    x.fillStyle = "#000";
    x.fillText(c.text, c.x + 0.5, c.y + 0.5);
    x.fillStyle = c.c;
    x.fillText(c.text, c.x, c.y);
  }
  x.restore();

  // drifting cloud shadow, weather, and the colour grade
  x.globalAlpha = 0.42;
  for (const c of clouds) {
    const px = ((c.x + run.time * 7) % (WORLD.w + c.r * 2)) - c.r - ox, py = c.y - oy;
    if (px + c.r > 0 && px - c.r < vw) x.drawImage(p.glow.dark, px - c.r, py - c.r * 0.7, c.r * 2, c.r * 1.4);
  }
  x.globalAlpha = 1;
  const ash = (THEMES[world.id] ?? THEMES.f1).ash;
  for (const m of motes) {
    const px = ((m.x * vw + run.time * 9 * m.s + Math.sin(run.time + m.p) * 3) % vw + vw) % vw;
    const py = ((m.y * vh + run.time * 6 * m.s) % vh + vh) % vh;
    x.globalAlpha = 0.25 + m.s * 0.4;
    rect(x, px, py, m.s, m.s, ash);
  }
  x.globalAlpha = 1;
  x.drawImage(gradeFor(world.id, Math.round(vw), Math.round(vh)), 0, 0, vw, vh);
  if (run.lightT > 0) {
    x.globalAlpha = run.lightT * 3;
    rect(x, 0, 0, vw, vh, "#fff0c8");
    x.globalAlpha = 1;
  }

  const c = run.chopper;
  if (c && c.state !== "gone") {
    const px = c.x - ox, py = c.y - oy;
    if (px < 0 || py < 0 || px > vw || py > vh) {
      const a = Math.atan2(py - vh / 2, px - vw / 2);
      const m = Math.min((vw / 2 - 16) / Math.abs(Math.cos(a) || 1e-3), (vh / 2 - 22) / Math.abs(Math.sin(a) || 1e-3));
      x.save();
      x.translate(vw / 2 + Math.cos(a) * m, vh / 2 + Math.sin(a) * m);
      x.rotate(a);
      x.fillStyle = "#14100c";
      x.beginPath();
      x.moveTo(10, 0);
      x.lineTo(-6, -7);
      x.lineTo(-6, 7);
      x.fill();
      x.fillStyle = Math.floor(run.time * 6) % 2 ? "#f4c430" : "#fff4b0";
      x.beginPath();
      x.moveTo(8, 0);
      x.lineTo(-5, -5.5);
      x.lineTo(-5, 5.5);
      x.fill();
      x.restore();
    }
  }
  if (run.hurt > 0 || run.hp < run.maxHp * 0.25) {
    x.globalAlpha = run.hurt > 0 ? 0.85 : 0.45 + Math.sin(run.time * 6) * 0.2;
    x.drawImage(hurtFor(Math.round(vw), Math.round(vh)), 0, 0, vw, vh);
    x.globalAlpha = 1;
  }
  return { ox, oy };
}
