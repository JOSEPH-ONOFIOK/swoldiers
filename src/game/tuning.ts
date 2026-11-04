// Prototype numbers. Enemy health, damage and XP come from lib/game.ts; this file
// adds what the design doc doesn't cover: movement, attack patterns, prices.

export const WORLD = { w: 912, h: 640, cell: 16 };

export type Attack = "melee" | "rifle" | "snipe" | "flame" | "shell";
export type Kind = { speed: number; r: number; attack: Attack; range: number; cd: number; sprite: string; flies?: boolean; armored?: boolean };

export const KINDS: Record<string, Kind> = {
  "Feral dog": { speed: 58, r: 6, attack: "melee", range: 0, cd: 1, sprite: "dog" },
  Scavenger: { speed: 52, r: 6, attack: "melee", range: 0, cd: 0.9, sprite: "scavenger" },
  Raider: { speed: 48, r: 6, attack: "rifle", range: 130, cd: 1.3, sprite: "raider" },
  "Scrap drone": { speed: 60, r: 6, attack: "rifle", range: 110, cd: 1.5, sprite: "drone", flies: true },
  Rifleman: { speed: 46, r: 6, attack: "rifle", range: 150, cd: 1.1, sprite: "rifleman" },
  Sniper: { speed: 30, r: 6, attack: "snipe", range: 260, cd: 3.2, sprite: "sniper" },
  Flamer: { speed: 52, r: 7, attack: "flame", range: 46, cd: 0.45, sprite: "flamer" },
  "Light tank": { speed: 26, r: 13, attack: "shell", range: 190, cd: 3, sprite: "tank", armored: true },
  "Shock trooper": { speed: 68, r: 7, attack: "rifle", range: 90, cd: 0.9, sprite: "shock" },
  "Iron Colonel": { speed: 40, r: 11, attack: "rifle", range: 170, cd: 0.35, sprite: "colonel" },
  "The Mammoth": { speed: 22, r: 20, attack: "shell", range: 230, cd: 1.8, sprite: "mammoth", armored: true },
};

type Roster = { mix: [string, number][]; density: number; opener?: string; boss?: Record<number, string> };

export const ROSTERS: Record<string, Roster> = {
  f1: { mix: [["Feral dog", 3], ["Scavenger", 2]], density: 1, opener: "Feral dog" },
  f2: { mix: [["Raider", 3], ["Scrap drone", 2], ["Scavenger", 1]], density: 1 },
  f3: { mix: [["Rifleman", 4], ["Sniper", 1], ["Raider", 1]], density: 0.75 },
  f4: { mix: [["Flamer", 3], ["Rifleman", 2], ["Light tank", 1]], density: 0.72 },
  raid: { mix: [["Shock trooper", 1]], density: 0.72 },
  f5: { mix: [["Shock trooper", 3], ["Light tank", 1]], density: 0.65, boss: { 4: "Iron Colonel", 6: "The Mammoth" } },
};

// Bosses are balanced for a squad, so a solo run sees more of their health bar.
export const BOSS_SOLO_HP = 3;

// The push-your-luck hook: the chopper comes after these waves, and waiting pays more.
export const GREED: Record<number, number> = { 2: 1, 4: 1.5, 6: 2 };
export const LAST_WAVE = 6;
export const UNLOCK_WAVE = 4;

export const FIRST_WAVE = 5; // enemies in wave 1 on every front
// Speed gained per wave. Melee enemies ramp hardest: slow enough to outrun early, not late.
export const SPEED_RAMP = { melee: 0.11, other: 0.04 };

export const RELOAD_TIME = 0.8; // seconds, before Agility
export const PILL_EVERY = 2; // a health pill after this many waves
export const PILL_HEAL = 0.3; // share of max health

export const WAVE_TIME = 20;
export const CHOPPER_INBOUND = 3;
export const CHOPPER_LANDED = 15;
export const EXTRACT_TIME = 2;
export const LZ_RADIUS = 34;

export const RIFLES = [
  { name: "Service Rifle", dmg: 10, rate: 0.13, mag: 30, price: 0 },
  { name: "Swol AR", dmg: 13, rate: 0.115, mag: 36, price: 450 },
  { name: "Heavy Carbine", dmg: 17, rate: 0.105, mag: 40, price: 1500 },
  { name: "Gainz LMG", dmg: 20, rate: 0.085, mag: 75, price: 3900 },
];

export const PLATES = [
  { name: "No plates", armor: 0, price: 0 },
  { name: "Steel plates", armor: 0.1, price: 330 },
  { name: "Ceramic plates", armor: 0.18, price: 1200 },
  { name: "Titan plates", armor: 0.26, price: 3300 },
];

export const STATS = {
  str: { name: "Strength", what: "+10% damage" },
  end: { name: "Endurance", what: "+15 health, +2% armor" },
  agi: { name: "Agility", what: "+4% speed, faster reload and roll" },
} as const;
export type StatKey = keyof typeof STATS;
export const statPrice = (level: number) => Math.round(75 * 1.45 ** level);

export type Save = {
  scrap: number;
  stats: Record<StatKey, number>;
  rifle: number;
  plates: number;
  unlocked: number; // how many of COMBAT_FRONTS are open
  best: number; // biggest single extraction
  runs: number;
};

export const NEW_SAVE: Save = { scrap: 0, stats: { str: 0, end: 0, agi: 0 }, rifle: 0, plates: 0, unlocked: 1, best: 0, runs: 0 };
