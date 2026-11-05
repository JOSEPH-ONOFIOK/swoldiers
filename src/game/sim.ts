// The run itself: no canvas, no DOM, so it can also be driven by a test bot.
import { ENEMIES, FRONTS, SKILLS, type Enemy as EnemyData, type Front } from "../lib/game";
import {
  BOSS_SOLO_HP, CHOPPER_INBOUND, CHOPPER_LANDED, EXTRACT_TIME, FIRST_WAVE, GREED, KINDS, LAST_WAVE, LZ_RADIUS, PILL_EVERY, PILL_HEAL, PLATES, RELOAD_TIME, REVIVE_HEALTH, REVIVE_SAFE, RIFLES, ROSTERS, SPEED_RAMP, WAVE_TIME, WORLD,
  type Kind, type Save,
} from "./tuning";

export const COMBAT_FRONTS: Front[] = FRONTS.filter((f) => f.id !== "base");

export type Input = {
  moveX: number;
  moveY: number;
  aimX: number; // world position
  aimY: number;
  fire: boolean;
  sprint: boolean;
  roll: boolean;
  reload: boolean;
  skills: Set<string>;
  assist: boolean; // touch aiming pulls toward the nearest enemy along the stick
};

export type Role = "hunter" | "flanker" | "patient";
export type Foe = {
  id: number; data: EnemyData; kind: Kind; x: number; y: number; hp: number; maxHp: number;
  cd: number; aim: number; flash: number; dir: number; walk: number;
  role: Role; awake: boolean; waited: number; back: number; called: boolean;
};
export type Shot = { x: number; y: number; vx: number; vy: number; t: number; dmg: number; mine: boolean; over: boolean; splash: number; flame: boolean };
export type Loot = { x: number; y: number; v: number; t: number };
export type Pill = { x: number; y: number; t: number };
export type Crate = { x: number; y: number; v: number };
export type Blast = { x: number; y: number; t: number; dmg: number; r: number; kind: "frag" | "strike"; ticks: number; fromX?: number; fromY?: number; life?: number };
export type Fire = { x: number; y: number; r: number; t: number };
export type Spark = { x: number; y: number; vx: number; vy: number; t: number; c: string };
export type Puff = { x: number; y: number; vx: number; vy: number; t: number; life: number; r: number; c: string };
export type Decal = { x: number; y: number; kind: "blood" | "scorch" | "casing" };
export type Pop = { x: number; y: number; text: string; c: string; t: number };
export type Chopper = { state: "inbound" | "landed" | "gone"; t: number; x: number; y: number; hold: number; greed: number; last: boolean; wave: number };
export type GameEvent = "shot" | "shotgun" | "boom" | "pickup" | "hurt" | "kill" | "wave" | "chopper" | "reload" | "heal" | "flex" | "dead" | "extract";

export type Result = { outcome: "extracted" | "died"; frontId: string; wave: number; kills: number; carried: number; greed: number; banked: number; seconds: number };

export type Hud = {
  hp: number; maxHp: number; ammo: number; mag: number; reloading: boolean; wave: number; carried: number; kills: number; banner: string;
  cds: number[]; roll: number; flex: boolean; chopper: "none" | "inbound" | "landed" | "gone"; chopperT: number; greed: number; last: boolean; hold: number; overrun: boolean;
};

const WAVE_SIZE = (wave: number) => 3 + 4.4 * wave;
const BITE_RETREAT = 0.55;
const ROLES: Role[] = ["hunter", "flanker", "patient", "hunter", "flanker"];
const PATIENT_RING = 150; // how far off a patient enemy waits
const PATIENT_WAIT = 14; // seconds before it stops waiting anyway

const THROW: Record<string, { range: number; r: number }> = { "3": { range: 170, r: 42 }, "5": { range: 240, r: 30 } };
const BOMB_AHEAD = 100; // how far a bomb lands when nobody is in front of you
const BOMB_CONE = 0.75; // radians either side of where you're facing

const SKILL_CD = Object.fromEntries(SKILLS.map((s) => [s.key, parseFloat(s.cooldown) || 0]));
const LZS = [[120, 110], [456, 80], [792, 110], [120, 530], [456, 560], [792, 530]];

function mulberry(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = Math.ceil(WORLD.w / WORLD.cell);
const ROWS = Math.ceil(WORLD.h / WORLD.cell);

export class Run {
  front: Front;
  rand: () => number;
  grid = new Uint8Array(COLS * ROWS);
  time = 0;
  shake = 0;

  // player
  x = WORLD.w / 2; y = WORLD.h / 2; dir = 0; walk = 0; hurt = 0;
  hp: number; maxHp: number; armor: number; speed: number; dmg: number; reloadTime: number; rollCd: number;
  rifle: (typeof RIFLES)[number];
  ammo: number; fireCd = 0; reloadT = 0; rollT = 0; rollLeft = 0; rollX = 0; rollY = 0; burn = 0;
  flexT = 0; cds: Record<string, number> = { "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };

  // run
  wave = 0; waveT = 0; toSpawn = 0; spawnCd = 0; breather = 0; overrun = false; overrunAt = 0;
  carried = 0; kills = 0; bannerText = ""; bannerT = 0;
  chopper: Chopper | null = null;
  result: Result | null = null; deadT = 0;
  down = false; lifeUsed = false; safeT = 0; // the one extra life

  foes: Foe[] = []; shots: Shot[] = []; loot: Loot[] = []; pills: Pill[] = []; crates: Crate[] = []; blasts: Blast[] = []; fires: Fire[] = [];
  sparks: Spark[] = []; pops: Pop[] = []; puffs: Puff[] = []; decals: Decal[] = []; flash = 0; shotFlash = 0; lightT = 0;
  blobs: { c: number; r: number; w: number; h: number }[] = [];
  events: GameEvent[] = [];
  private nextId = 1;
  private spawned = 0;
  private headX = 1; // the way the player is heading
  private headY = 0;
  private roomy = new Uint8Array(COLS * ROWS); // 1 where something wide can stand
  private huntField = new Int16Array(COLS * ROWS);
  private wideField = new Int16Array(COLS * ROWS);
  private aheadField = new Int16Array(COLS * ROWS);
  private ahead = { x: 0, y: 0 };
  private pathT = 0;

  constructor(frontId: string, save: Save, seed = Date.now()) {
    this.front = COMBAT_FRONTS.find((f) => f.id === frontId) ?? COMBAT_FRONTS[0];
    this.rand = mulberry(seed);
    const { str, end, agi } = save.stats;
    this.rifle = RIFLES[save.rifle] ?? RIFLES[0];
    this.dmg = this.rifle.dmg * (1 + 0.1 * str);
    this.maxHp = this.hp = 100 + 15 * end;
    this.armor = Math.min(0.6, (PLATES[save.plates]?.armor ?? 0) + 0.02 * end);
    this.speed = 74 * (1 + 0.04 * agi);
    this.reloadTime = RELOAD_TIME * 0.95 ** agi;
    this.rollCd = 1.6 * 0.95 ** agi;
    this.ammo = this.rifle.mag;
    this.buildMap();
    this.buildPaths();
    this.startWave();
  }

  // ---------- map ----------
  solid(x: number, y: number) {
    const c = Math.floor(x / WORLD.cell), r = Math.floor(y / WORLD.cell);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    return this.grid[r * COLS + c] === 1;
  }

  private buildMap() {
    const near = (x: number, y: number, d: number) => Math.hypot(x - WORLD.w / 2, y - WORLD.h / 2) < d || LZS.some(([a, b]) => Math.hypot(x - a, y - b) < d);
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (c === 0 || r === 0 || c === COLS - 1 || r === ROWS - 1) this.grid[r * COLS + c] = 1;
    for (let i = 0; i < 34; i++) {
      const w = 1 + Math.floor(this.rand() * 4), h = 1 + Math.floor(this.rand() * 3);
      const c0 = 2 + Math.floor(this.rand() * (COLS - 8)), r0 = 2 + Math.floor(this.rand() * (ROWS - 7));
      const cx = (c0 + w / 2) * WORLD.cell, cy = (r0 + h / 2) * WORLD.cell;
      if (near(cx, cy, 72)) continue;
      for (let c = c0; c < c0 + w; c++) for (let r = r0; r < r0 + h; r++) this.grid[r * COLS + c] = 1;
      this.blobs.push({ c: c0, r: r0, w, h });
    }
    for (let i = 0; i < 9; ) {
      const x = 40 + this.rand() * (WORLD.w - 80), y = 40 + this.rand() * (WORLD.h - 80);
      if (this.solid(x, y) || Math.hypot(x - this.x, y - this.y) < 110) continue;
      this.crates.push({ x, y, v: Math.round((10 + this.rand() * 10) * (1 + COMBAT_FRONTS.indexOf(this.front) * 0.6)) });
      i++;
    }
  }

  private blocked(x: number, y: number, r: number) {
    return this.solid(x - r, y - r) || this.solid(x + r, y - r) || this.solid(x - r, y + r) || this.solid(x + r, y + r);
  }

  private move<T extends { x: number; y: number }>(o: T, dx: number, dy: number, r: number) {
    if (!this.blocked(o.x + dx, o.y, r)) o.x += dx;
    if (!this.blocked(o.x, o.y + dy, r)) o.y += dy;
  }

  sees(ax: number, ay: number, bx: number, by: number) {
    const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 8);
    for (let i = 1; i < n; i++) if (this.solid(ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n)) return false;
    return true;
  }

  // ---------- finding a way ----------
  private cell(x: number, y: number) {
    const c = Math.max(0, Math.min(COLS - 1, Math.floor(x / WORLD.cell)));
    const r = Math.max(0, Math.min(ROWS - 1, Math.floor(y / WORLD.cell)));
    return r * COLS + c;
  }

  private buildPaths() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        let wide = 1;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (this.grid[Math.max(0, Math.min(ROWS - 1, r + a)) * COLS + Math.max(0, Math.min(COLS - 1, c + b))]) wide = 0;
        this.roomy[r * COLS + c] = wide;
      }
    this.refreshPaths();
  }

  // Steps from every cell to `seed`. One sweep serves every enemy with that target.
  private sweep(field: Int16Array, seed: number, open: (i: number) => boolean) {
    field.fill(-1);
    field[seed] = 0;
    const queue = new Int32Array(COLS * ROWS);
    let head = 0, tail = 0;
    queue[tail++] = seed;
    while (head < tail) {
      const i = queue[head++], c = i % COLS, step = field[i] + 1;
      const next = [c > 0 ? i - 1 : -1, c < COLS - 1 ? i + 1 : -1, i - COLS, i + COLS];
      for (const n of next)
        if (n >= 0 && n < field.length && field[n] < 0 && open(n)) {
          field[n] = step;
          queue[tail++] = n;
        }
    }
  }

  private refreshPaths() {
    const dist = 96; // a few steps in front of the player
    this.ahead = {
      x: Math.max(24, Math.min(WORLD.w - 24, this.x + this.headX * dist)),
      y: Math.max(24, Math.min(WORLD.h - 24, this.y + this.headY * dist)),
    };
    const walk = (i: number) => this.grid[i] === 0, wide = (i: number) => this.roomy[i] === 1;
    this.sweep(this.huntField, this.cell(this.x, this.y), walk);
    this.sweep(this.wideField, this.cell(this.x, this.y), wide);
    this.sweep(this.aheadField, this.cell(this.ahead.x, this.ahead.y), walk);
  }

  private fieldFor(k: Kind) {
    return k.r > 7 ? this.wideField : this.huntField;
  }

  private reachable(x: number, y: number, k: Kind) {
    return k.flies || this.fieldFor(k)[this.cell(x, y)] >= 0;
  }

  // The next step down the field. Corners can't be cut, so nothing clips a building.
  private stepAlong(field: Int16Array, f: Foe, tx: number, ty: number) {
    const i = this.cell(f.x, f.y), c = i % COLS, r = Math.floor(i / COLS);
    let best = field[i] < 0 ? 32767 : field[i], bx = -1, by = -1;
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const nc = c + b, nr = r + a;
        if ((!a && !b) || nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        const v = field[nr * COLS + nc];
        if (v < 0 || v >= best) continue;
        if (a && b && (field[r * COLS + nc] < 0 || field[nr * COLS + c] < 0)) continue;
        best = v;
        bx = (nc + 0.5) * WORLD.cell;
        by = (nr + 0.5) * WORLD.cell;
      }
    const gx = bx < 0 ? tx : bx, gy = bx < 0 ? ty : by;
    const d = Math.hypot(gx - f.x, gy - f.y) || 1;
    return [(gx - f.x) / d, (gy - f.y) / d];
  }

  private wakeNearest() {
    let best: Foe | null = null, bestD = 1e9;
    for (const f of this.foes)
      if (!f.awake && f.hp > 0) {
        const d = Math.hypot(f.x - this.x, f.y - this.y);
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
    if (best) best.awake = true;
  }

  // ---------- waves ----------
  private banner(text: string, t = 2.2) {
    this.bannerText = text;
    this.bannerT = t;
  }

  private startWave() {
    this.wave++;
    this.waveT = WAVE_TIME;
    this.breather = 0;
    if (this.wave > LAST_WAVE) {
      this.overrun = true;
      this.overrunAt = this.time;
      this.banner("OVERRUN", 3);
      this.events.push("wave");
      return;
    }
    const roster = ROSTERS[this.front.id];
    this.toSpawn = this.wave === 1 ? FIRST_WAVE : Math.round(WAVE_SIZE(this.wave) * roster.density);
    this.spawnCd = 0.3;
    const boss = roster.boss?.[this.wave];
    if (boss) this.spawn(boss);
    this.banner(boss ? `WAVE ${this.wave}: ${boss.toUpperCase()}` : `WAVE ${this.wave}`);
    this.events.push("wave");
  }

  private endWave() {
    const greed = GREED[this.wave];
    if (greed) this.callChopper(greed);
    if (this.wave % PILL_EVERY === 0) this.dropPill();
    this.startWave();
  }

  // Lands beside the player so it can be seen, then comes to them on its own.
  private dropPill() {
    const a = this.rand() * 6.28;
    this.pills.push({ x: this.x + Math.cos(a) * 34, y: this.y + Math.sin(a) * 34, t: 0 });
  }

  private callChopper(greed: number) {
    const spots = LZS.filter(([a, b]) => Math.hypot(a - this.x, b - this.y) > 170);
    const pick = spots.length ? spots : LZS;
    const [x, y] = pick[Math.floor(this.rand() * pick.length)];
    this.chopper = { state: "inbound", t: CHOPPER_INBOUND, x, y, hold: 0, greed, last: this.wave === LAST_WAVE, wave: this.wave };
    this.events.push("chopper");
  }

  private pickFoe() {
    const { mix, opener } = ROSTERS[this.front.id];
    if (this.wave === 1 && opener) return opener;
    let n = this.rand() * mix.reduce((s, m) => s + m[1], 0);
    for (const [name, w] of mix) if ((n -= w) <= 0) return name;
    return mix[0][0];
  }

  private spawn(name: string, near?: { x: number; y: number }) {
    const data = ENEMIES.find((e) => e.name === name)!;
    const kind = KINDS[name];
    let x = 0, y = 0;
    for (let i = 0; i < 40; i++) {
      const a = this.rand() * Math.PI * 2, d = near ? 40 + this.rand() * 30 : 230 + this.rand() * 90;
      x = (near ?? this).x + Math.cos(a) * d;
      y = (near ?? this).y + Math.sin(a) * d;
      if (x > 20 && y > 20 && x < WORLD.w - 20 && y < WORLD.h - 20 && !this.blocked(x, y, kind.r) && this.reachable(x, y, kind)) break;
    }
    if (this.blocked(x, y, kind.r)) ({ x, y } = { x: WORLD.w / 2, y: 30 });
    const hp = data.hp * this.scale(0.1) * (data.boss ? BOSS_SOLO_HP : 1);
    // Heavy units and snipers each have one job, so only the rank and file get roles.
    const plain = !data.boss && !kind.armored && kind.attack !== "snipe";
    const role = plain ? ROLES[this.spawned++ % ROLES.length] : "hunter";
    this.foes.push({
      id: this.nextId++, data, kind, x, y, hp, maxHp: hp, cd: 0.5 + this.rand() * kind.cd, aim: 0, flash: 0, dir: 0, walk: 0,
      role, awake: role !== "patient", waited: 0, back: 0, called: false,
    });
  }

  // Later waves hit harder, and once overrun the pressure climbs until you fall.
  private scale(rate: number) {
    return (1 + rate * Math.min(this.wave - 1, LAST_WAVE - 1)) * (this.overrun ? 1 + (this.time - this.overrunAt) * 0.1 : 1);
  }

  // ---------- combat ----------
  private bonus() {
    return this.flexT > 0 ? 1.4 : 1;
  }

  private shoot(a: number, spread: number, speed: number, life: number, dmg: number) {
    const b = a + (this.rand() - 0.5) * spread;
    const ox = Math.cos(a) * 9, oy = Math.sin(a) * 9;
    this.shots.push({ x: this.x + ox, y: this.y - 3 + oy, vx: Math.cos(b) * speed, vy: Math.sin(b) * speed, t: life, dmg, mine: true, over: false, splash: 0, flame: false });
  }

  private hit(f: Foe, dmg: number, explosive: boolean) {
    if (f.hp <= 0) return;
    const crit = this.rand() < 0.2;
    let d = dmg * (crit ? 2 : 1);
    if (f.kind.armored && !explosive) d *= 0.25;
    f.hp -= d;
    f.flash = 0.08;
    f.awake = true;
    if (crit) {
      this.pops.push({ x: f.x, y: f.y - 12, text: "CRIT", c: "#f4c430", t: 0.5 });
      this.shake = Math.max(this.shake, 2);
    }
    if (!f.kind.armored && f.kind.sprite !== "drone") this.decals.push({ x: f.x + (Math.random() - 0.5) * 8, y: f.y + 2, kind: "blood" });
    this.burst(f.x, f.y, 3, f.kind.sprite === "drone" || f.kind.armored ? "#c9ccc2" : "#a8321f");
    if (f.data.name === "Iron Colonel" && !f.called && f.hp < f.maxHp / 2) {
      f.called = true;
      for (let i = 0; i < 5; i++) this.spawn("Shock trooper", f);
      this.banner("REINFORCEMENTS");
    }
    if (f.hp <= 0) this.killed(f);
  }

  private killed(f: Foe) {
    this.kills++;
    this.wakeNearest();
    this.events.push("kill");
    this.burst(f.x, f.y, f.data.boss ? 40 : 9, f.kind.armored ? "#f4c430" : "#a8321f");
    const worth = Math.max(1, Math.round(f.data.xp * 0.5));
    const parts = f.data.boss ? 12 : Math.min(4, 1 + Math.floor(worth / 8));
    for (let i = 0; i < parts; i++) this.loot.push({ x: f.x + (this.rand() - 0.5) * 16, y: f.y + (this.rand() - 0.5) * 16, v: Math.ceil(worth / parts), t: 0 });
    if (f.data.boss) {
      this.shake = 8;
      this.banner(`${f.data.name.toUpperCase()} DOWN`, 3);
    }
  }

  private burst(x: number, y: number, n: number, c: string) {
    if (this.sparks.length > 240) return;
    for (let i = 0; i < n; i++) {
      const a = this.rand() * 6.28, s = 20 + this.rand() * 70;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.2 + this.rand() * 0.3, c });
    }
  }

  /** The soldier hits the ground at the end of the chopper drop. */
  land() {
    this.shake = 5;
    this.smoke(this.x, this.y + 3, 9, 9, "#8a7a58", 0.8);
    this.events.push("boom");
  }

  private smoke(x: number, y: number, n: number, r: number, c: string, life: number) {
    if (this.puffs.length > 90) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = 6 + Math.random() * 18, t = life * (0.6 + Math.random() * 0.5);
      this.puffs.push({ x: x + Math.cos(a) * r * 0.5, y: y + Math.sin(a) * r * 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 10, t, life: t, r: r * (0.6 + Math.random() * 0.6), c });
    }
  }

  private explode(x: number, y: number, r: number, dmg: number, mine: boolean) {
    this.shake = Math.max(this.shake, mine ? 4 : 3);
    this.events.push("boom");
    this.blasts.push({ x, y, t: 0.22, dmg: 0, r, kind: "frag", ticks: 0 });
    this.decals.push({ x, y, kind: "scorch" });
    this.lightT = 0.14;
    this.smoke(x, y, 7, r * 0.5, "#2c2822", 1.5);
    this.smoke(x, y, 4, r * 0.35, "#8a5a2a", 0.5);
    this.burst(x, y, 14, "#f08c2e");
    if (mine) {
      for (const f of [...this.foes]) if (Math.hypot(f.x - x, f.y - y) < r + f.kind.r) this.hit(f, dmg, true);
    } else if (Math.hypot(this.x - x, this.y - y) < r + 6) {
      this.damage(dmg);
    }
  }

  private damage(d: number) {
    if (this.rollT > 0 || this.safeT > 0 || this.result || this.hp <= 0) return;
    this.hp -= d * (1 - this.armor);
    this.hurt = 0.14;
    this.shake = Math.max(this.shake, 3);
    this.events.push("hurt");
    if (this.hp <= 0) {
      this.hp = 0;
      this.deadT = 1;
      this.burst(this.x, this.y, 30, "#a8321f");
      this.events.push("dead");
      if (this.lifeUsed) this.banner(`${this.carried} SCRAP LOST`, 3);
    }
  }

  // Bombs go the way you're facing: onto the closest enemy in front, or straight ahead.
  private landing(key: string) {
    const { range, r } = THROW[key], a = this.dir;
    let best = range, x = this.x + Math.cos(a) * BOMB_AHEAD, y = this.y + Math.sin(a) * BOMB_AHEAD;
    for (const f of this.foes) {
      const d = Math.hypot(f.x - this.x, f.y - this.y), to = Math.atan2(f.y - this.y, f.x - this.x);
      if (d < best && Math.abs(Math.atan2(Math.sin(to - a), Math.cos(to - a))) < BOMB_CONE) {
        best = d;
        x = f.x;
        y = f.y;
      }
    }
    return { x, y, r, a };
  }

  private useSkills(inp: Input, a: number) {
    const go = (k: string) => {
      if (!inp.skills.has(k) || this.cds[k] > 0) return false;
      this.cds[k] = SKILL_CD[k];
      return true;
    };
    if (go("2")) {
      for (let i = 0; i < 7; i++) this.shoot(a, 0.75, 300 + this.rand() * 60, 0.3, this.dmg * 1.5 * this.bonus());
      this.shake = Math.max(this.shake, 3);
      this.events.push("shotgun");
    }
    if (go("3")) {
      const t = this.landing("3");
      this.blasts.push({ x: t.x, y: t.y, t: 0.55, life: 0.55, fromX: this.x, fromY: this.y - 8, dmg: this.dmg * 1.3 * 3 * this.bonus(), r: t.r, kind: "frag", ticks: 1 });
    }
    if (go("4")) {
      this.flexT = 5;
      this.events.push("flex");
      this.pops.push({ x: this.x, y: this.y - 16, text: "FLEX", c: "#f4c430", t: 1 });
    }
    if (go("5")) {
      const t = this.landing("5");
      for (let i = 0; i < 6; i++) {
        const s = (i - 2.5) * 24;
        this.blasts.push({ x: t.x + Math.cos(t.a) * s, y: t.y + Math.sin(t.a) * s, t: 1 + i * 0.09, dmg: this.dmg * 2.5 * 2 * this.bonus(), r: 30, kind: "strike", ticks: 1 });
      }
    }
    if (this.hp < this.maxHp && go("6")) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.35);
      this.events.push("heal");
      this.pops.push({ x: this.x, y: this.y - 16, text: "+HP", c: "#9bc53d", t: 0.9 });
    }
    // One press, one use. The input layer only ever adds, so a tap shorter than a frame still counts.
    inp.skills.clear();
  }

  private aimAngle(inp: Input) {
    const a = Math.atan2(inp.aimY - (this.y - 3), inp.aimX - this.x);
    if (!inp.assist) return a;
    let best = a, bestD = 210;
    for (const f of this.foes) {
      const d = Math.hypot(f.x - this.x, f.y - this.y);
      const to = Math.atan2(f.y - 3 - this.y, f.x - this.x);
      const off = Math.abs(Math.atan2(Math.sin(to - a), Math.cos(to - a)));
      if (off < 0.6 && d < bestD && this.sees(this.x, this.y, f.x, f.y)) {
        best = to;
        bestD = d;
      }
    }
    return best;
  }

  private stepPlayer(dt: number, inp: Input) {
    const a = this.aimAngle(inp);
    this.dir = a;
    this.flexT = Math.max(0, this.flexT - dt);
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
    this.rollLeft = Math.max(0, this.rollLeft - dt);
    this.fireCd -= dt;
    if (this.burn > 0) {
      this.burn -= dt;
      this.hp -= 4 * dt;
      if (this.hp <= 0) this.damage(1);
    }

    let mx = inp.moveX, my = inp.moveY;
    const m = Math.hypot(mx, my);
    if (m > 1) {
      mx /= m;
      my /= m;
    }
    if (inp.roll && this.rollT <= 0 && this.rollLeft <= 0) {
      this.rollT = 0.32;
      this.rollLeft = this.rollCd;
      const dirX = m > 0.1 ? mx : Math.cos(a), dirY = m > 0.1 ? my : Math.sin(a);
      this.rollX = dirX;
      this.rollY = dirY;
    }
    if (this.rollT > 0) {
      this.rollT -= dt;
      this.move(this, this.rollX * 210 * dt, this.rollY * 210 * dt, 5);
    } else {
      const sp = this.speed * (inp.sprint ? 1.35 : 1) * dt;
      this.move(this, mx * sp, my * sp, 5);
      if (m > 0.1) {
        this.headX = mx / (m > 1 ? 1 : m);
        this.headY = my / (m > 1 ? 1 : m);
        const was = Math.floor(this.walk / 2);
        this.walk += dt * 10;
        if (Math.floor(this.walk / 2) !== was) this.smoke(this.x, this.y + 4, 1, 2.5, "#a8987088", 0.35);
      }
    }

    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) this.ammo = this.rifle.mag;
    } else if ((inp.reload && this.ammo < this.rifle.mag) || this.ammo <= 0) {
      this.reloadT = this.reloadTime;
      this.events.push("reload");
    }
    if (inp.fire && this.fireCd <= 0 && this.reloadT <= 0 && this.ammo > 0 && this.rollT <= 0) {
      this.fireCd = this.rifle.rate;
      this.ammo--;
      this.shotFlash = 0.05;
      this.decals.push({ x: this.x - Math.cos(a) * 4, y: this.y + 3, kind: "casing" });
      this.shoot(a, 0.07, 380, 0.75, this.dmg * this.bonus());
      this.events.push("shot");
    }
    this.useSkills(inp, a);

    for (const c of this.crates) {
      if (Math.hypot(c.x - this.x, c.y - this.y) < 14) {
        for (let i = 0; i < 5; i++) this.loot.push({ x: c.x + (this.rand() - 0.5) * 18, y: c.y + (this.rand() - 0.5) * 18, v: Math.ceil(c.v / 5), t: 0 });
        c.v = 0;
      }
    }
    this.crates = this.crates.filter((c) => c.v > 0);
  }

  private stepFoes(dt: number) {
    const foes = this.foes;
    this.pathT -= dt;
    if (this.pathT <= 0) {
      this.pathT = 0.2;
      this.refreshPaths();
    }
    if (foes.length && !foes.some((f) => f.awake)) this.wakeNearest();
    for (const f of foes) {
      f.cd -= dt;
      f.flash -= dt;
      const dx = this.x - f.x, dy = this.y - f.y, d = Math.hypot(dx, dy) || 1;
      const k = f.kind;
      const clear = k.flies || (d < k.range + 40 && this.sees(f.x, f.y, this.x, this.y));
      const inRange = k.range > 0 && d < k.range && clear;

      // Where this enemy wants to be. Flankers cut the player off, then close in.
      const flanking = f.role === "flanker" && d > 56 && !k.flies;
      const tx = flanking ? this.ahead.x : this.x, ty = flanking ? this.ahead.y : this.y;
      const field = flanking ? this.aheadField : this.fieldFor(k);
      const dt2 = Math.hypot(tx - f.x, ty - f.y) || 1;
      let vx = (tx - f.x) / dt2, vy = (ty - f.y) / dt2;
      if (!k.flies && !(dt2 < 130 && k.r <= 7 && this.sees(f.x, f.y, tx, ty))) [vx, vy] = this.stepAlong(field, f, tx, ty);
      f.dir = inRange || d < 70 ? Math.atan2(dy, dx) : Math.atan2(vy, vx);

      const hold = k.attack === "snipe" ? d < 200 : k.attack === "melee" ? false : d < k.range * 0.7;
      const ramp = k.attack === "melee" ? SPEED_RAMP.melee : SPEED_RAMP.other;
      let speed = k.speed * (1 + ramp * Math.min(this.wave - 1, LAST_WAVE - 1));
      if (inRange && hold) speed = 0;
      if (!f.awake) {
        // Waits at a distance. Another death sends it in; time and being shot do too.
        f.waited += dt;
        if (f.waited > PATIENT_WAIT) f.awake = true;
        else if (this.fieldFor(k)[this.cell(f.x, f.y)] * WORLD.cell <= PATIENT_RING && d < PATIENT_RING + 40) speed = 0;
      }
      if (k.attack === "melee") {
        // Biters lunge, then break off, and never stand inside the player.
        f.back -= dt;
        if (f.back > 0) {
          vx = -dx / d;
          vy = -dy / d;
        } else if (d < k.r + 7) {
          speed = 0;
        }
      }
      if (k.attack === "snipe" && d < 90) {
        // snipers keep their distance
        vx = -dx / d;
        vy = -dy / d;
        speed = k.speed;
      }
      if (f.aim > 0) speed = 0;

      if (k.flies) {
        f.x += vx * speed * dt;
        f.y += vy * speed * dt;
      } else {
        this.move(f, vx * speed * dt, vy * speed * dt, k.r);
      }
      if (speed > 0) f.walk += dt * 8;

      if (k.attack === "melee") {
        if (d < k.r + 9 && f.cd <= 0 && f.back <= 0) {
          f.cd = k.cd;
          f.back = BITE_RETREAT;
          this.damage(f.data.dmg * this.scale(0.1));
        }
      } else if (k.attack === "snipe") {
        if (f.aim > 0) {
          f.aim -= dt;
          if (f.aim <= 0) {
            f.cd = k.cd;
            if (this.sees(f.x, f.y, this.x, this.y)) this.enemyShot(f, 460, 0.8, 0);
          }
        } else if (inRange && f.cd <= 0) {
          f.aim = 1.1;
        }
      } else if (inRange && f.cd <= 0) {
        f.cd = k.cd * (0.85 + this.rand() * 0.3);
        if (k.attack === "flame") {
          for (let i = 0; i < 4; i++) this.enemyShot(f, 110, 0.4, 0, true, 0.5);
        } else if (k.attack === "shell") {
          this.enemyShot(f, 130, 2, 26);
        } else {
          this.enemyShot(f, 170, 1.4, 0);
        }
      }
    }

    // keep them from stacking on one pixel
    for (let i = 0; i < foes.length; i++)
      for (let j = i + 1; j < foes.length; j++) {
        const a = foes[i], b = foes[j];
        const dx = b.x - a.x, dy = b.y - a.y, m = a.kind.r + b.kind.r;
        if (Math.abs(dx) >= m || Math.abs(dy) >= m) continue;
        const d = Math.hypot(dx, dy) || 1;
        if (d < m) {
          const p = ((m - d) / d) * 0.5;
          if (!a.kind.armored) this.move(a, -dx * p, -dy * p, a.kind.r);
          if (!b.kind.armored) this.move(b, dx * p, dy * p, b.kind.r);
        }
      }

    // Crowding can't shove anything onto the player: this runs after everything else has moved.
    for (const f of foes) {
      if (f.kind.flies) continue;
      const dx = f.x - this.x, dy = f.y - this.y, d = Math.hypot(dx, dy) || 1, room = f.kind.r + 6;
      if (d < room) this.move(f, (dx / d) * (room - d), (dy / d) * (room - d), f.kind.r);
    }
  }

  private enemyShot(f: Foe, speed: number, life: number, splash: number, flame = false, spreadScale = 0.12) {
    const a = f.dir + (this.rand() - 0.5) * spreadScale;
    const dmg = (flame ? f.data.dmg / 4 : f.data.dmg) * this.scale(0.1);
    this.shots.push({ x: f.x, y: f.y - 3, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, t: life, dmg, mine: false, over: !!f.kind.flies, splash, flame });
  }

  private stepShots(dt: number) {
    for (const s of this.shots) {
      s.t -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const wall = this.solid(s.x, s.y);
      if (s.mine) {
        const f = this.foes.find((f) => f.hp > 0 && Math.abs(f.x - s.x) < f.kind.r + 3 && Math.abs(f.y - 3 - s.y) < f.kind.r + 4);
        if (f) {
          this.hit(f, s.dmg, false);
          s.t = 0;
        } else if (wall) {
          this.burst(s.x, s.y, 2, "#b9b08c");
          s.t = 0;
        }
      } else {
        const touching = Math.abs(this.x - s.x) < 6 && Math.abs(this.y - 3 - s.y) < 8;
        if (touching && this.rollT <= 0) {
          if (s.flame) this.burn = 1.5;
          if (s.splash) this.explode(s.x, s.y, s.splash, s.dmg, false);
          else this.damage(s.dmg);
          s.t = 0;
        } else if (s.splash && (s.t <= 0 || wall)) {
          this.explode(s.x, s.y, s.splash, s.dmg, false);
          if (this.foes.some((f) => f.data.name === "The Mammoth")) this.fires.push({ x: s.x, y: s.y, r: 20, t: 3.5 });
          s.t = 0;
        } else if (wall && !s.over) {
          s.t = 0;
        }
      }
    }
    this.shots = this.shots.filter((s) => s.t > 0);

    for (const b of this.blasts) {
      b.t -= dt;
      if (b.ticks && b.t <= 0) {
        b.ticks = 0;
        this.explode(b.x, b.y, b.r, b.dmg, true);
      }
    }
    this.blasts = this.blasts.filter((b) => b.t > 0);

    for (const f of this.fires) {
      f.t -= dt;
      if (Math.hypot(f.x - this.x, f.y - this.y) < f.r) this.burn = Math.max(this.burn, 1);
    }
    this.fires = this.fires.filter((f) => f.t > 0);
    this.foes = this.foes.filter((f) => f.hp > 0);
  }

  private stepLoot(dt: number) {
    for (const l of this.loot) {
      l.t += dt;
      const dx = this.x - l.x, dy = this.y - l.y, d = Math.hypot(dx, dy) || 1;
      if (d < 44) {
        l.x += (dx / d) * 200 * dt;
        l.y += (dy / d) * 200 * dt;
      }
      if (d < 8 && this.hp > 0) {
        this.carried += l.v;
        l.v = 0;
        this.events.push("pickup");
      }
    }
    this.loot = this.loot.filter((l) => l.v > 0);

    for (const p of this.pills) {
      p.t += dt;
      if (p.t < 0.6) continue;
      const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
      p.x += (dx / d) * 150 * dt;
      p.y += (dy / d) * 150 * dt;
      if (d < 8 && this.hp > 0) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * PILL_HEAL);
        this.burn = 0;
        p.t = -1;
        this.events.push("heal");
        this.pops.push({ x: this.x, y: this.y - 16, text: "+HP", c: "#9bc53d", t: 0.9 });
      }
    }
    this.pills = this.pills.filter((p) => p.t >= 0);
  }

  private stepChopper(dt: number) {
    const c = this.chopper;
    if (!c || c.state === "gone") return;
    c.t -= dt;
    if (c.state === "inbound") {
      if (c.t <= 0) {
        c.state = "landed";
        c.t = CHOPPER_LANDED;
        this.banner(c.last ? "LAST CHOPPER" : "CHOPPER DOWN");
      }
      return;
    }
    const on = Math.hypot(this.x - c.x, this.y - c.y) < LZ_RADIUS && this.hp > 0;
    c.hold = on ? c.hold + dt : Math.max(0, c.hold - dt * 2);
    if (c.hold >= EXTRACT_TIME) {
      this.finish("extracted", c.greed);
      this.events.push("extract");
    } else if (c.t <= 0) {
      c.state = "gone";
      this.banner(c.last ? "NO MORE CHOPPERS" : "CHOPPER GONE");
    }
  }

  private stepWaves(dt: number) {
    if (this.overrun) {
      this.spawnCd -= dt;
      if (this.spawnCd <= 0 && this.foes.length < 80) {
        this.spawn(this.pickFoe());
        this.spawnCd = 0.22;
      }
      return;
    }
    this.waveT -= dt;
    if (this.toSpawn > 0) {
      this.spawnCd -= dt;
      if (this.spawnCd <= 0 && this.foes.length < 60) {
        this.spawn(this.pickFoe());
        this.toSpawn--;
        this.spawnCd = this.wave === 1 ? 2.2 : 13 / WAVE_SIZE(this.wave);
      }
    }
    const cleared = this.toSpawn === 0 && this.foes.length === 0;
    if (cleared) this.breather += dt;
    if (this.waveT <= 0 || this.breather > 2.5) this.endWave();
  }

  private finish(outcome: Result["outcome"], greed: number) {
    this.result = {
      outcome, frontId: this.front.id, wave: outcome === "extracted" ? this.chopper!.wave : Math.min(this.wave, LAST_WAVE), kills: this.kills,
      carried: this.carried, greed, banked: Math.round(this.carried * greed), seconds: Math.round(this.time),
    };
  }

  /** The one extra life of a run: back on your feet with half health and a moment of cover. */
  revive() {
    if (!this.down || this.lifeUsed) return;
    this.down = false;
    this.lifeUsed = true;
    this.hp = this.maxHp * REVIVE_HEALTH;
    this.safeT = REVIVE_SAFE;
    this.burn = 0;
    this.shake = 5;
    this.smoke(this.x, this.y + 3, 9, 9, "#8a7a58", 0.8);
    this.pops.push({ x: this.x, y: this.y - 16, text: "BACK IN", c: "#9bc53d", t: 1.2 });
    this.events.push("heal");
    for (const f of this.foes) if (f.kind.attack === "melee") f.back = 1;
  }

  giveUp() {
    if (!this.down) return;
    this.down = false;
    this.finish("died", 0);
  }

  step(dt: number, inp: Input) {
    if (this.result || this.down) return;
    this.safeT = Math.max(0, this.safeT - dt);
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 16);
    this.hurt -= dt;
    this.bannerT -= dt;
    this.shotFlash -= dt;

    if (this.deadT > 0) {
      this.deadT -= dt;
      if (this.deadT <= 0) {
        if (this.lifeUsed) this.finish("died", 0);
        else this.down = true;
      }
    } else {
      this.stepPlayer(dt, inp);
      this.stepChopper(dt);
      if (this.result) return;
      this.stepWaves(dt);
    }
    this.stepFoes(dt);
    this.stepShots(dt);
    this.stepLoot(dt);

    for (const s of this.sparks) {
      s.t -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.92;
      s.vy *= 0.92;
    }
    this.sparks = this.sparks.filter((s) => s.t > 0);
    for (const p of this.pops) {
      p.t -= dt;
      p.y -= 18 * dt;
    }
    this.pops = this.pops.filter((p) => p.t > 0);
    for (const p of this.puffs) {
      p.t -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
    }
    this.puffs = this.puffs.filter((p) => p.t > 0);
    this.lightT -= dt;
  }

  hud(): Hud {
    const c = this.chopper;
    return {
      hp: this.hp, maxHp: this.maxHp, ammo: this.ammo, mag: this.rifle.mag, reloading: this.reloadT > 0,
      wave: Math.min(this.wave, LAST_WAVE), carried: this.carried, kills: this.kills, banner: this.bannerT > 0 ? this.bannerText : "",
      cds: ["2", "3", "4", "5", "6"].map((k) => this.cds[k] / SKILL_CD[k]), roll: this.rollLeft / this.rollCd, flex: this.flexT > 0,
      chopper: c?.state ?? "none", chopperT: c ? Math.ceil(c.t) : 0, greed: c?.greed ?? 1, last: !!c?.last, hold: c ? c.hold / EXTRACT_TIME : 0, overrun: this.overrun,
    };
  }
}
