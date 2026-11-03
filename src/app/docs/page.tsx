import type { Metadata } from "next";
import Link from "next/link";
import { DocsShell } from "@/components/DocsShell";

export const metadata: Metadata = { title: "Docs: Getting started" };

export default function Docs() {
  return (
    <DocsShell
      current="/docs"
      title="Getting started"
      lead="Swoldiers is a top-down pixel war MMO. You start at Fort Gainz, the safe base, and fight your way out through five fronts, a raid and two world bosses. The deeper the front, the tougher the enemies and the better the loot."
    >
      <h2>Your first hour</h2>
      <ol>
        <li><b>Look around Fort Gainz.</b> The armory, the gym, the workshop and the black market are all here. Nobody can shoot you inside the walls.</li>
        <li><b>Gear up.</b> Press <kbd>I</kbd> to open your loadout and check your rifle and armor before you deploy.</li>
        <li><b>Hit the gym.</b> Press <kbd>G</kbd> to train Strength, Endurance or Agility with the points you earn.</li>
        <li><b>Deploy to Front 1.</b> Press <kbd>M</kbd>, pick The Outskirts and clear its mission: 6 scavengers.</li>
        <li><b>Use your skills.</b> Keys <kbd>2</kbd> to <kbd>6</kbd> fire your hotbar. Use the Med Kit on <kbd>6</kbd> when your health drops.</li>
        <li><b>Level up and push deeper.</b> Each front has its own mission. Finish it, then pick the next front on the map.</li>
      </ol>

      <h2>Reading the screen</h2>
      <table>
        <thead><tr><th>Where</th><th>What it shows</th></tr></thead>
        <tbody>
          <tr><td>Top left</td><td>Your portrait, health, armor, level and cash.</td></tr>
          <tr><td>Top right</td><td>The minimap and the front&apos;s name.</td></tr>
          <tr><td>Under the minimap</td><td>The front&apos;s mission and how far along you are (for example 3/6).</td></tr>
          <tr><td>Bottom</td><td>Your hotbar and ammo. A shadow on an icon means it is cooling down.</td></tr>
          <tr><td>Over enemies</td><td>Their health. Bosses show BOSS in red.</td></tr>
          <tr><td>Floating numbers</td><td>Damage dealt. Critical hits show CRIT in yellow.</td></tr>
        </tbody>
      </table>

      <h2>Controls</h2>
      <table>
        <thead><tr><th>Key</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></td><td>Move</td></tr>
          <tr><td>Mouse</td><td>Aim</td></tr>
          <tr><td>Left click or <kbd>1</kbd></td><td>Fire your rifle</td></tr>
          <tr><td><kbd>Space</kbd></td><td>Combat roll (dodges shots)</td></tr>
          <tr><td><kbd>Shift</kbd></td><td>Sprint</td></tr>
          <tr><td><kbd>R</kbd></td><td>Reload</td></tr>
          <tr><td><kbd>2</kbd> to <kbd>6</kbd></td><td>Skills on the hotbar</td></tr>
          <tr><td><kbd>I</kbd></td><td>Loadout and inventory</td></tr>
          <tr><td><kbd>G</kbd></td><td>Gym (in Fort Gainz)</td></tr>
          <tr><td><kbd>C</kbd></td><td>Workshop</td></tr>
          <tr><td><kbd>B</kbd></td><td>Black market</td></tr>
          <tr><td><kbd>M</kbd></td><td>War map</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>Close windows</td></tr>
        </tbody>
      </table>

      <h2>Where to next</h2>
      <ul>
        <li><Link href="/docs/world">Fronts</Link>: every front, its enemies and its mission.</li>
        <li><Link href="/docs/enemies">Enemies</Link>: health, damage and XP of every enemy.</li>
        <li><Link href="/docs/combat">Combat and skills</Link>: what each skill does and when to use it.</li>
        <li><Link href="/docs/whitelist">Whitelist</Link>: enlist, earn points and win $SWOL.</li>
      </ul>
    </DocsShell>
  );
}
