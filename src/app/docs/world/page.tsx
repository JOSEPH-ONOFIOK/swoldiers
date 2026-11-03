import type { Metadata } from "next";
import { DocsShell } from "@/components/DocsShell";
import { FRONTS } from "@/lib/game";

export const metadata: Metadata = { title: "Docs: Fronts" };

export default function World() {
  return (
    <DocsShell
      current="/docs/world"
      title="Fronts"
      lead="Fort Gainz is the only safe ground. Every front past it is a new map with tougher enemies and better loot. Open the war map with M to deploy."
    >
      <table>
        <thead><tr><th>Front</th><th>Tier</th><th>Threat</th><th>Mission</th></tr></thead>
        <tbody>
          {FRONTS.map((f) => (
            <tr key={f.id}><td><b>{f.name}</b></td><td>{f.tag}</td><td>{f.danger}</td><td>{f.quest}</td></tr>
          ))}
        </tbody>
      </table>
      {FRONTS.map((f) => (
        <section key={f.id}>
          <h2>{f.name} · {f.tag}</h2>
          <p>{f.line}</p>
          <p><b>Enemies.</b> {f.enemies}</p>
          {f.quest !== "—" ? <p><b>Mission.</b> {f.quest}</p> : null}
          <p><b>Tip.</b> {f.tip}</p>
        </section>
      ))}
    </DocsShell>
  );
}
