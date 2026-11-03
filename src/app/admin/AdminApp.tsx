"use client";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { api, ApiError, fmt, short } from "@/lib/client";

type Row = {
  address: string;
  x_handle: string | null;
  follow_status: string;
  status: string;
  post_url: string | null;
  joinedAt: number;
  updatedAt: number;
  points: number;
  rank: number;
};
type Mission = { id: string; title: string; post: string; points: number; active: boolean; createdAt: number };
type MissionPost = { address: string; x_handle: string | null; id: string; url: string; at: number; pts: number };
type Queue = {
  stats: { total: number; followApproved: number; commentApproved: number };
  follows: Row[];
  comments: Row[];
  missionPosts: MissionPost[];
  missions: Mission[];
};

export function AdminApp() {
  const { show, node } = useToast();
  const [q, setQ] = useState<Queue | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [pw, setPw] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ title: "", post: "", points: "20" });

  const load = useCallback(async () => {
    try {
      setQ(await api<Queue>("/api/admin/queue"));
      setNeedLogin(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setNeedLogin(true);
      else show((e as Error).message, true);
    }
  }, [show]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- first load
    load();
  }, [load]);

  const call = async (path: string, body: object, ok?: string) => {
    try {
      await api(path, body);
      if (ok) show(ok);
      await load();
    } catch (e) {
      show((e as Error).message, true);
    }
  };

  const review = (address: string, kind: "follow" | "comment", ok: boolean) =>
    call("/api/admin/review", { address, kind, ok, note: notes[kind + address] || undefined }, ok ? "Approved." : "Rejected.");

  if (needLogin)
    return (
      <form
        className="hud mx-auto mt-20 max-w-sm p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/api/admin/login", { password: pw });
            setPw("");
            load();
          } catch (err) {
            show((err as Error).message, true);
          }
        }}
      >
        <h1 className="text-2xl">Admin</h1>
        <input className="field mt-4" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" autoFocus />
        <button className="btn mt-3 w-full">Sign in</button>
        {node}
      </form>
    );

  if (!q) return <p className="muted p-10">Loading…{node}</p>;

  const reviewList = (rows: Row[], kind: "follow" | "comment") =>
    rows.length ? (
      <div className="grid gap-2">
        {rows.map((r) => (
          <div key={r.address} className="hud grid gap-2 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {r.x_handle ? (
                  <a className="font-bold underline" href={`https://x.com/${r.x_handle}`} target="_blank" rel="noopener">
                    @{r.x_handle}
                  </a>
                ) : null}
                <code className="text-xs">{short(r.address)}</code>
                <span className="muted text-xs">
                  #{r.rank} · {fmt(r.points)} pts
                </span>
              </div>
              {kind === "comment" && r.post_url ? (
                <a className="block truncate text-sm underline" href={r.post_url} target="_blank" rel="noopener">
                  {r.post_url}
                </a>
              ) : null}
              <input
                className="field mt-2 py-1.5! text-sm!"
                placeholder="Reason if rejecting (shown to the player)"
                value={notes[kind + r.address] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [kind + r.address]: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn sm" onClick={() => review(r.address, kind, true)}>
                Approve
              </button>
              <button className="btn sm red" onClick={() => review(r.address, kind, false)}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="muted">Nothing waiting.</p>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">Whitelist admin</h1>
        <div className="ml-auto flex gap-2">
          <button className="btn sm ghost" onClick={load}>
            Refresh
          </button>
          <a className="btn sm ghost" href="/api/admin/export">
            Export CSV
          </a>
          <button
            className="btn sm red"
            onClick={async () => {
              await fetch("/api/admin/login", { method: "DELETE" });
              setQ(null);
              setNeedLogin(true);
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          [q.stats.total, "Enlisted"],
          [q.stats.followApproved, "Follows approved"],
          [q.stats.commentApproved, "Comments approved"],
        ].map(([n, l]) => (
          <div key={l} className="hud py-4">
            <b className="stencil block text-3xl">{fmt(n as number)}</b>
            <span className="font-pixel text-[11px] tracking-wider text-khaki uppercase">{l}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-xl">Follows to check ({q.follows.length})</h2>
      <p className="muted mb-3 text-sm">Open the profile and check that it follows the project account.</p>
      {reviewList(q.follows, "follow")}

      <h2 className="mt-10 mb-3 text-xl">Comments to check ({q.comments.length})</h2>
      <p className="muted mb-3 text-sm">Open the link: it must be a real reply to the announcement post from that account.</p>
      {reviewList(q.comments, "comment")}

      <h2 className="mt-10 mb-3 text-xl">Missions</h2>
      <form
        className="hud grid gap-2 p-4 md:grid-cols-[1fr_1.4fr_100px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          call("/api/admin/missions", { action: "add", ...form }, "Mission added.").then(() => setForm({ title: "", post: "", points: "20" }));
        }}
      >
        <input className="field" placeholder="Title, e.g. Reply to the trailer" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="field" placeholder="https://x.com/…/status/…" value={form.post} onChange={(e) => setForm({ ...form, post: e.target.value })} />
        <input className="field" type="number" min={1} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} aria-label="Points" />
        <button className="btn">Add</button>
      </form>
      <div className="mt-3 grid gap-2">
        {q.missions.map((m) => (
          <div key={m.id} className="hud flex flex-wrap items-center gap-3 px-4 py-3">
            <b>{m.title}</b>
            <span className="chip">{m.points} pts</span>
            {!m.active ? <span className="chip grey">Paused</span> : null}
            <a className="truncate text-sm text-khaki underline" href={m.post} target="_blank" rel="noopener">
              {m.post}
            </a>
            <span className="ml-auto flex gap-2">
              <button className="btn sm ghost" onClick={() => call("/api/admin/missions", { action: "toggle", id: m.id })}>
                {m.active ? "Pause" : "Resume"}
              </button>
              <button
                className="btn sm red"
                onClick={() => confirm("Delete this mission? Points already earned stay.") && call("/api/admin/missions", { action: "remove", id: m.id })}
              >
                Delete
              </button>
            </span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 mb-3 text-xl">Recent mission comments</h2>
      <p className="muted mb-3 text-sm">These count at once. Open them and remove fakes or deleted posts.</p>
      {q.missionPosts.length ? (
        <div className="grid gap-2">
          {q.missionPosts.map((p) => (
            <div key={p.address + p.id} className="hud flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <b>{p.x_handle ? "@" + p.x_handle : short(p.address)}</b>
              <span className="muted">{q.missions.find((m) => m.id === p.id)?.title ?? p.id}</span>
              <a className="min-w-0 flex-1 truncate underline" href={p.url} target="_blank" rel="noopener">
                {p.url}
              </a>
              <button
                className="btn sm red"
                onClick={() => confirm("Remove this comment and its points?") && call("/api/admin/strike", { address: p.address, id: p.id }, "Removed.")}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">None yet.</p>
      )}
      {node}
    </div>
  );
}
