import type { Metadata } from "next";
import { DocsShell } from "@/components/DocsShell";
import { ENEMIES } from "@/lib/game";

export const metadata: Metadata = { title: "Docs: Enemies" };

export default function Enemies() {
  const grunts = ENEMIES.filter((e) => !e.boss);
  const bosses = ENEMIES.filter((e) => e.boss);
  const table = (list: typeof ENEMIES) => (
    <table>
      <thead><tr><th>Enemy</th><th>Where</th><th>Health</th><th>Damage</th><th>XP</th><th>Notes</th></tr></thead>
      <tbody>
        {list.map((e) => (
          <tr key={e.name}>
            <td><b>{e.name}</b>{e.boss ? <span className="chip red ml-2">Boss</span> : null}</td>
            <td>{e.where}</td><td>{e.hp}</td><td>{e.dmg}</td><td>{e.xp}</td><td>{e.note ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  return (
    <DocsShell
      current="/docs/enemies"
      title="Enemies"
      lead="Every enemy in Swoldiers, from the first feral dog to the world bosses. Health is how much damage it takes, damage is how hard it hits you, XP is what it gives."
    >
      <h2>On the fronts</h2>
      {table(grunts)}
      <h2>World bosses</h2>
      {table(bosses)}
    </DocsShell>
  );
}
