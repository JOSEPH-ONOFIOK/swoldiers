import type { Metadata } from "next";
import { DocsShell } from "@/components/DocsShell";
import { SKILLS } from "@/lib/game";

export const metadata: Metadata = { title: "Docs: Combat and skills" };

export default function Combat() {
  return (
    <DocsShell
      current="/docs/combat"
      title="Combat and skills"
      lead="Fights are fast. You aim with the mouse, fire your rifle and have five skills on your hotbar, each with its own cooldown, shown as a shadow on the icon."
    >
      <h2>Hotbar</h2>
      <table>
        <thead><tr><th>Key</th><th>Skill</th><th>Cooldown</th><th>Power vs. rifle</th><th>What it does</th></tr></thead>
        <tbody>
          {SKILLS.map((s) => (
            <tr key={s.key}><td><kbd>{s.key}</kbd></td><td><b>{s.name}</b></td><td>{s.cooldown}</td><td>{s.power}</td><td>{s.what}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Gains</h2>
      <p>Train at the Fort Gainz gym with the points you earn from levels.</p>
      <table>
        <thead><tr><th>Stat</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><b>Strength</b></td><td>More damage from every weapon and skill.</td></tr>
          <tr><td><b>Endurance</b></td><td>More health and more armor.</td></tr>
          <tr><td><b>Agility</b></td><td>Faster movement, shorter roll cooldown, quicker reloads.</td></tr>
        </tbody>
      </table>

      <h2>Rules of the fight</h2>
      <p><b>Critical hits.</b> About 1 hit in 5 is critical and deals double damage. It shows as CRIT in yellow and shakes the screen.</p>
      <p><b>Cover.</b> Walls and wrecks stop bullets, yours and theirs. Drones fly over cover.</p>
      <p><b>Armor.</b> Tanks only take full damage from explosives: Frag Grenade and Airstrike.</p>
      <p><b>Rolling.</b> A combat roll makes you dodge shots for a moment. Use it on sniper lasers.</p>
      <p><b>Health pills.</b> Every 2 waves a pill drops next to you and comes to you on its own. It heals 30% of your health.</p>
      <p><b>Extra life.</b> When you go down, post $SWOL on X to get back up with half your health and keep your scrap. You get 1 per run.</p>
      <p><b>Levels.</b> Every kill gives XP. A new level shows LEVEL UP in green and gives you a gym point.</p>

      <h2>A simple rotation</h2>
      <ol>
        <li>Open with a Frag Grenade on the biggest group.</li>
        <li>Flex when they rush you, then Shotgun Blast while it lasts.</li>
        <li>Save Airstrike for tanks and bosses.</li>
        <li>Below 50% health? Roll out and use the Med Kit.</li>
      </ol>
    </DocsShell>
  );
}
