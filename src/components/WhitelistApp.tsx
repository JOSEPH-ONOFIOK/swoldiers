"use client";
import { useCallback, useEffect, useState } from "react";
import { FaArrowUpRightFromSquare, FaCheck, FaCircle, FaWallet } from "react-icons/fa6";
import { api, ApiError, fmt, left, short, utc } from "@/lib/client";
import { CONFIG, gradeFor } from "@/lib/config";
import { useBoard, useNow, useSite } from "@/lib/hooks";
import { discoverWallets, signIn, walletError, type Wallet } from "@/lib/wallet";
import { Insignia } from "./Insignia";
import { PayGrades } from "./PayGrades";
import { RollTable } from "./RollTable";
import { useToast } from "./Toast";

type Review = "none" | "pending" | "approved" | "rejected";
type Joined = {
  joined: true;
  running: boolean;
  entry: {
    address: string;
    ref_code: string;
    x_handle: string | null;
    follow_status: Review;
    follow_note: string | null;
    status: Review;
    post_url: string | null;
    note: string | null;
  };
  score: { rank: number; points: number; reward: number; refs: number; mpts: number; total: number } | null;
  invites: { sent: number; approved: number };
  missions: { id: string; title: string; post: string; points: number; active: boolean; done: string | null }[];
};
type WL = { joined: false; running: boolean } | Joined;

const P = CONFIG.whitelist.points;
const X = CONFIG.xAccount;
const T = CONFIG.token.symbol;
type Toast = (t: string, bad?: boolean) => void;
type Send = (key: string, path: string, payload: object, okText: string) => Promise<boolean>;

// Invite code from ?ref=, kept until the wallet joins.
function readRef() {
  try {
    const q = new URLSearchParams(location.search).get("ref")?.toLowerCase();
    if (q && /^[a-z0-9]{6}$/.test(q)) localStorage.setItem("swol_ref", q);
    return localStorage.getItem("swol_ref");
  } catch {
    return null;
  }
}

const postId = (post: string) => /\/status\/(\d+)/.exec(post)?.[1];
const replyUrl = (post: string, text?: string) => {
  const id = postId(post);
  return id ? `https://x.com/intent/post?in_reply_to=${id}${text ? `&text=${encodeURIComponent(text)}` : ""}` : `https://x.com/${X}`;
};
const repostUrl = (post: string) => {
  const id = postId(post);
  return id ? `https://x.com/intent/retweet?tweet_id=${id}` : `https://x.com/${X}`;
};

function StatusChip({ st, pts }: { st: Review; pts: number }) {
  if (st === "approved") return <span className="chip">+{fmt(pts)} pts</span>;
  if (st === "pending") return <span className="chip gold">In review</span>;
  if (st === "rejected") return <span className="chip red">Rejected</span>;
  return <span className="chip grey">+{fmt(pts)} pts</span>;
}

function Order({ n, done, locked, title, chip, children }: { n: string; done?: boolean; locked?: boolean; title: React.ReactNode; chip: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className={`grid grid-cols-[40px_minmax(0,1fr)] gap-3 border-b border-line py-5 sm:gap-4 sm:py-6 last:border-0 ${locked ? "opacity-50" : ""}`}>
      <span
        className={`grid size-10 place-items-center font-pixel text-xs ${done ? "bg-green text-ink" : "text-signal ring-1 ring-line"}`}
        aria-label={done ? "Done" : undefined}
      >
        {done ? <FaCheck aria-hidden size={14} /> : n}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg sm:text-xl">{title}</h3>
          {chip}
        </div>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 border-l-2 border-red bg-red/10 px-3 py-2 text-sm font-semibold text-[#ffb4a4]">{children}</p>;
}

// ---------- the dog tag ID card ----------
function DogTag({ j, address, onConnect, busy, progress }: { j: Joined | null; address: string | null; onConnect: () => void; busy: boolean; progress: string }) {
  const grade = j?.score ? gradeFor(j.score.rank) : null;
  const prize = j?.score ? CONFIG.whitelist.prizes.find((p) => j.score!.rank >= p.from && j.score!.rank <= p.to) : null;
  return (
    <div className="tag relative px-5 pt-8 pb-5 sm:px-6 sm:pb-6">
      <span className="absolute top-4 left-1/2 size-4 -translate-x-1/2 rounded-full bg-[#7c7f75] shadow-[inset_0_2px_3px_#0006]" aria-hidden />
      <div className="mt-3 flex items-center justify-between font-pixel text-[10px] tracking-[0.18em] uppercase">
        <span>Swoldiers · ID</span>
        <span>{j ? "Enlisted" : "Unassigned"}</span>
      </div>
      <div className="mt-4 flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/recruit.jpg" alt="" width={64} height={64} className={`pixel size-16 rounded-xl border-2 border-[#6f7268] ${j ? "" : "grayscale"}`} />
        <div className="min-w-0">
          <div className="stencil text-2xl leading-tight">{j?.entry.x_handle && j.entry.follow_status === "approved" ? "@" + j.entry.x_handle : j ? "Recruit" : "— — —"}</div>
          <div className="font-pixel text-[11px] tracking-wider">{address ? short(address) : "Serial pending"}</div>
        </div>
      </div>
      {j?.score ? (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ["#" + fmt(j.score.rank), "Rank"],
              [fmt(j.score.points), "Points"],
              [j.score.reward ? fmt(j.score.reward) : "—", CONFIG.token.symbol],
            ].map(([v, l]) => (
              <div key={l} className="rounded-lg bg-black/10 py-2.5">
                <b className="stencil block text-xl">{v}</b>
                <span className="font-pixel text-[9px] tracking-widest uppercase">{l}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-ink px-3 py-2.5 text-sand">
            <span className="font-pixel text-[10px] tracking-widest text-muted uppercase">Grade</span>
            <span className="flex items-center gap-2">
              <Insignia grade={grade!} stars={prize?.stars} size={13} />
              <b className="stencil">{grade}</b>
            </span>
          </div>
        </>
      ) : !j ? (
        <div className="mt-6">
          <button className="btn w-full" disabled={busy} onClick={onConnect}>
            {busy ? "Connecting…" : "Connect wallet"}
          </button>
          <p className="muted mt-3 text-center text-sm">{progress || "A free signed message. No transaction, no gas."}</p>
        </div>
      ) : null}
    </div>
  );
}

export function WhitelistApp() {
  const { site, skew } = useSite();
  const now = useNow(skew, !!site?.end);
  const board = useBoard();
  const { show, node } = useToast();

  const [phase, setPhase] = useState<"loading" | "out" | "in">("loading");
  const [address, setAddress] = useState<string | null>(null);
  const [wl, setWl] = useState<WL | null>(null);
  const [loadError, setLoadError] = useState("");
  const [ref, setRef] = useState<string | null>(null);
  const [inviter, setInviter] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const load = useCallback(async () => {
    try {
      const me = await api<{ signedIn: boolean; address: string | null }>("/api/me");
      if (!me.signedIn) {
        setPhase("out");
        return;
      }
      setAddress(me.address);
      setWl(await api<WL>("/api/wl"));
      setPhase("in");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setPhase("out");
      else setLoadError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const r = readRef();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the invite once on mount
    setRef(r);
    if (r)
      api<{ valid: boolean; handle: string | null }>(`/api/ref?code=${r}`)
        .then((x) => setInviter(x.valid ? (x.handle ? "@" + x.handle : "a fellow soldier") : null))
        .catch(() => {});
    load();
  }, [load]);

  const dropRef = () => {
    try {
      localStorage.removeItem("swol_ref");
    } catch {}
    setRef(null);
    setInviter(null);
  };

  const connect = async (w: Wallet) => {
    setWallets(null);
    setBusy(true);
    try {
      const r = await signIn(w, setProgress, inviter ? ref : null);
      if (r.joined) dropRef();
      setProgress("");
      await load();
    } catch (e) {
      setProgress(walletError(e));
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    setProgress("Looking for wallets…");
    const found = await discoverWallets();
    setProgress("");
    if (!found.length) return show("No wallet found. Install MetaMask, Rabby or Phantom, then refresh.", true);
    if (found.length === 1) connect(found[0]);
    else setWallets(found);
  };

  const logout = async () => {
    try {
      await api("/api/logout", {});
    } catch {}
    setWl(null);
    setAddress(null);
    setPhase("out");
  };

  const j = wl?.joined ? wl : null;
  const done = j ? 1 + (j.entry.follow_status === "approved" ? 1 : 0) + (j.entry.status === "approved" ? 1 : 0) : 0;

  return (
    <div className="relative">
      <div className="grid-bg grid-fade absolute inset-x-0 top-0 -z-10 h-[520px] opacity-50" aria-hidden />
      <div className="mx-auto max-w-7xl px-5 py-10 sm:py-14">
        <p className="kicker">Enlistment office</p>
        <h1 className="mt-3 text-[clamp(40px,6vw,72px)]">Report for duty</h1>
        <p className="mt-3 max-w-2xl text-base text-khaki sm:text-lg">
          Connect your wallet to enlist, then complete your orders to climb the roster. Free. The top {CONFIG.whitelist.winners} split{" "}
          {fmt(CONFIG.whitelist.prizeTotal)} {CONFIG.token.symbol}.
        </p>

        {site && !site.ready ? (
          <div className="hud mt-6 p-4">
            <b>The enlistment office is not open yet.</b> <span className="muted">The database is not connected. Check back soon.</span>
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] items-start gap-6 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="grid min-w-0 gap-6">
            <div className="lg:hidden">
              <DogTag j={j} address={address} onConnect={pick} busy={busy} progress={progress} />
            </div>
            {inviter && phase === "out" ? (
              <div className="hud flex items-center justify-between gap-3 px-5 py-3">
                <span>
                  Recruited by <b className="text-signal">{inviter}</b>
                </span>
                <button className="btn sm ghost" onClick={dropRef}>
                  Remove
                </button>
              </div>
            ) : null}

            {phase === "loading" ? (
              <div className="hud muted p-6">{loadError || "Opening your file…"}</div>
            ) : phase === "out" ? (
              <div className="hud p-5 sm:p-8">
                <p className="kicker bare">Orders · locked</p>
                <ol className="mt-2">
                  <Order n="01" title="Connect your wallet" chip={<span className="chip grey">+{P.joined} pts</span>}>
                    <p className="muted">Use the ID card to sign in. You are enlisted at once.</p>
                  </Order>
                  <Order n="02" locked title={`Follow @${X} on X`} chip={<span className="chip grey">+{P.follow} pts</span>}>
                    <p className="muted">Unlocks after you connect.</p>
                  </Order>
                  <Order n="03" locked title="Comment on our post" chip={<span className="chip grey">+{P.comment} pts</span>}>
                    <p className="muted">Unlocks after you connect.</p>
                  </Order>
                </ol>
              </div>
            ) : wl && !j ? (
              <div className="hud p-5 sm:p-8">
                <h2 className="text-2xl">The roster is closed</h2>
                <p className="muted mt-2">This wallet did not enlist in time. Follow @{X} on X for the next round.</p>
                <div className="mt-5 flex gap-3">
                  <a className="btn" href={`https://x.com/${X}`} target="_blank" rel="noopener">
                    Open X
                  </a>
                  <button className="btn ghost" onClick={logout}>
                    Use another wallet
                  </button>
                </div>
              </div>
            ) : j ? (
              <SignedIn j={j} onChange={setWl} toast={show} onLogout={logout} done={done} />
            ) : null}
          </div>

          <aside className="grid min-w-0 gap-6 lg:sticky lg:top-24">
            <div className="hidden lg:block">
              <DogTag j={j} address={address} onConnect={pick} busy={busy} progress={progress} />
            </div>
            <div className="hud p-5">
              <div className="rows text-[15px]">
                <div>
                  <span className="muted">Roster</span>
                  {site ? site.open ? <span className="chip">Open</span> : <span className="chip red">Closed</span> : <span className="chip grey">…</span>}
                </div>
                {site?.open && site.end ? (
                  <>
                    <div>
                      <span className="muted">Closes in</span>
                      <b className="stencil text-signal tabular-nums">{now ? left(site.end - now) : "…"}</b>
                    </div>
                    <div>
                      <span className="muted">Closes</span>
                      <b>{utc(site.end)}</b>
                    </div>
                  </>
                ) : null}
                <div>
                  <span className="muted">Cost</span>
                  <b>Free</b>
                </div>
              </div>
            </div>
            <PayGrades compact />
          </aside>
        </div>

        {board?.top.length ? (
          <section id="roll" className="hud mt-12 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="kicker bare">
                <FaCircle aria-hidden size={9} className="blink text-red" /> {board.final ? "Final roster" : "Full roster"}
              </span>
              <span className="muted text-sm">
                {board.final ? `Final. Paid in ${CONFIG.token.symbol} inside the game at launch.` : `${fmt(board.total)} enlisted · ties go to whoever enlisted first`}
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <RollTable board={board} />
            </div>
          </section>
        ) : null}
      </div>

      {wallets ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setWallets(null)}>
          <div className="hud w-full max-w-sm p-6" role="dialog" aria-label="Choose a wallet" onClick={(e) => e.stopPropagation()}>
            <p className="kicker bare">Choose a wallet</p>
            <div className="mt-4 grid gap-2">
              {wallets.map((w) => (
                <button key={w.id} className="flex items-center gap-3 border border-line bg-bg px-4 py-3 text-left font-semibold transition-colors hover:border-signal" onClick={() => connect(w)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {w.icon ? <img src={w.icon} alt="" width={26} height={26} /> : <FaWallet aria-hidden size={26} className="text-muted" />}
                  {w.name}
                </button>
              ))}
            </div>
            <p className="muted mt-4 text-sm">Signing in is a free message. It is not a transaction.</p>
          </div>
        </div>
      ) : null}
      {node}
    </div>
  );
}

function SignedIn({ j, onChange, toast, onLogout, done }: { j: Joined; onChange: (w: WL) => void; toast: Toast; onLogout: () => void; done: number }) {
  const [editHandle, setEditHandle] = useState(false);
  const [handle, setHandle] = useState("");
  const [post, setPost] = useState("");
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refill the inputs from the server copy
    setHandle(j.entry.x_handle ? "@" + j.entry.x_handle : "");
    setPost(j.entry.post_url ?? "");
  }, [j.entry.x_handle, j.entry.post_url]);

  const e = j.entry;
  const closed = !j.running;
  const fs = e.follow_status;
  const cs = e.status;
  const hasHandle = !!e.x_handle;
  const handleLocked = fs === "approved" || cs === "pending" || cs === "approved";
  const editing = !hasHandle || fs === "rejected" || (editHandle && !handleLocked);
  const canFollow = editing && !closed;

  const send: Send = async (key, path, payload, okText) => {
    setSending(key);
    try {
      onChange(await api<WL>(path, payload));
      setEditHandle(false);
      toast(okText);
      return true;
    } catch (err) {
      toast((err as Error).message, true);
      return false;
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      <div className="hud p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker bare">Orders</p>
            <h2 className="mt-2 text-3xl">You are enlisted</h2>
          </div>
          <button className="btn sm ghost" onClick={onLogout}>
            Use another wallet
          </button>
        </div>
        <div className="mt-5" aria-label={`${done} of 3 orders complete`}>
          <div className="flex justify-between font-pixel text-[10px] tracking-widest text-muted uppercase">
            <span>Progress</span>
            <span className="text-signal">{done}/3 complete</span>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-2 flex-1 ${i < done ? "bg-signal" : "bg-line"}`} />
            ))}
          </div>
        </div>

        <ol className="mt-4">
          <Order n="01" done title="Connect your wallet" chip={<StatusChip st="approved" pts={P.joined} />}>
            <p className="muted">Done. You are on the roster.</p>
          </Order>

          <Order
            n="02"
            done={fs === "approved"}
            title={
              <>
                Follow{" "}
                <a className="text-signal underline underline-offset-4" href={`https://x.com/${X}`} target="_blank" rel="noopener">
                  @{X}
                </a>
              </>
            }
            chip={<StatusChip st={fs} pts={P.follow} />}
          >
            <p className="muted">
              {fs === "approved" ? (
                <>
                  Approved as <b className="text-sand">@{e.x_handle}</b>. Stay followed until launch.
                </>
              ) : fs === "pending" && !editing ? (
                <>
                  Sent as <b className="text-sand">@{e.x_handle}</b>. We check that you follow us.
                </>
              ) : closed ? (
                "The roster is closed."
              ) : (
                "Follow us, then type your X username and send it."
              )}
            </p>
            {fs === "rejected" && e.follow_note ? <Note>{e.follow_note}</Note> : null}
            {canFollow ? (
              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  send("follow", "/api/wl/follow", { handle }, "Sent. We will check your follow soon.");
                }}
              >
                <a className="btn sm ghost self-start sm:self-auto" href={`https://x.com/intent/follow?screen_name=${encodeURIComponent(X)}`} target="_blank" rel="noopener">
                  Follow
                  <FaArrowUpRightFromSquare aria-hidden size={11} />
                </a>
                <input
                  className="field"
                  value={handle}
                  onChange={(ev) => setHandle(ev.target.value)}
                  placeholder="@yourname"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={40}
                  aria-label="Your X username"
                />
                <button className="btn" disabled={sending === "follow"}>
                  {sending === "follow" ? "Sending…" : fs === "none" ? "Send" : "Send again"}
                </button>
              </form>
            ) : fs === "pending" && !handleLocked && !closed ? (
              <button className="btn sm ghost mt-3" onClick={() => setEditHandle(true)}>
                Change username
              </button>
            ) : null}
          </Order>

          <Order n="03" done={cs === "approved"} locked={!hasHandle} title={`Comment ${T} and repost`} chip={<StatusChip st={cs} pts={P.comment} />}>
            <p className="muted">
              {cs === "approved"
                ? "Approved."
                : cs === "pending"
                  ? "Sent. You can change the link while it is in review."
                  : !hasHandle
                    ? "Send your X username in order 02 first: the comment and repost must come from that account."
                    : closed
                      ? "The roster is closed."
                      : `Comment ${T} on our post and repost it from your account, then paste the link of your comment here.`}
            </p>
            {cs === "rejected" && e.note ? <Note>{e.note}</Note> : null}
            {cs !== "approved" && !closed && hasHandle ? (
              <form
                className="mt-4 flex flex-col gap-2 sm:flex-row"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (!post.trim()) return toast("Paste the link of your comment first.", true);
                  send("submit", "/api/wl/submit", { post_url: post }, "Sent. We will check your comment and repost soon.");
                }}
              >
                <a className="btn sm ghost self-start sm:self-auto" href={replyUrl(CONFIG.xPost, T)} target="_blank" rel="noopener">
                  Comment {T}
                  <FaArrowUpRightFromSquare aria-hidden size={11} />
                </a>
                <a className="btn sm ghost self-start sm:self-auto" href={repostUrl(CONFIG.xPost)} target="_blank" rel="noopener">
                  Repost
                  <FaArrowUpRightFromSquare aria-hidden size={11} />
                </a>
                <input
                  className="field"
                  type="url"
                  inputMode="url"
                  value={post}
                  onChange={(ev) => setPost(ev.target.value)}
                  placeholder={`https://x.com/${e.x_handle}/status/…`}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Link to your comment"
                />
                <button className="btn" disabled={sending === "submit"}>
                  {sending === "submit" ? "Sending…" : cs === "pending" ? "Update" : cs === "rejected" ? "Send again" : "Send"}
                </button>
              </form>
            ) : null}
          </Order>
        </ol>
      </div>

      <Missions j={j} closed={closed} send={send} sending={sending} />
      {!closed ? <Recruit j={j} toast={toast} /> : null}
      {j.score ? <Breakdown j={j} /> : null}
    </>
  );
}

function Missions({ j, closed, send, sending }: { j: Joined; closed: boolean; send: Send; sending: string | null }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  if (!j.missions.length) return null;
  const unlocked = j.entry.follow_status === "approved";
  return (
    <div className="hud p-5 sm:p-8">
      <p className="kicker bare">Bonus missions</p>
      <p className="muted mt-2 text-sm">
        {unlocked ? "Reply from the account you enlisted with and paste the link. Points count at once. We check them: fakes lose their points." : "Bonus missions open once your follow is approved."}
      </p>
      <div className="mt-4 grid gap-3">
        {j.missions.map((m) => (
          <div key={m.id} className="border border-line bg-bg p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b>{m.title}</b>
              {m.done ? <span className="chip">+{fmt(m.points)} pts</span> : <span className="chip grey">+{fmt(m.points)} pts</span>}
            </div>
            {m.done ? (
              <a className="mt-1 block truncate text-sm text-khaki underline" href={m.done} target="_blank" rel="noopener">
                {m.done}
              </a>
            ) : unlocked && !closed && m.active ? (
              <form
                className="mt-3 flex flex-col gap-2 sm:flex-row"
                onSubmit={async (ev) => {
                  ev.preventDefault();
                  const ok = await send("m" + m.id, "/api/wl/mission", { id: m.id, post_url: links[m.id] ?? "" }, `+${m.points} points.`);
                  if (ok) setLinks((l) => ({ ...l, [m.id]: "" }));
                }}
              >
                <a className="btn sm ghost self-start sm:self-auto" href={replyUrl(m.post)} target="_blank" rel="noopener">
                  Comment
                  <FaArrowUpRightFromSquare aria-hidden size={11} />
                </a>
                <input
                  className="field py-2!"
                  type="url"
                  value={links[m.id] ?? ""}
                  onChange={(ev) => setLinks((l) => ({ ...l, [m.id]: ev.target.value }))}
                  placeholder={`https://x.com/${j.entry.x_handle}/status/…`}
                  aria-label={`Link for ${m.title}`}
                />
                <button className="btn sm" disabled={sending === "m" + m.id}>
                  {sending === "m" + m.id ? "…" : "Send"}
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Recruit({ j, toast }: { j: Joined; toast: Toast }) {
  const link = `${location.origin}/whitelist?ref=${j.entry.ref_code}`;
  const share =
    "https://x.com/intent/post?text=" +
    encodeURIComponent(`Enlist with me on the @${X} whitelist. A pixel war MMO: five fronts, one war. 💪`) +
    "&url=" +
    encodeURIComponent(link);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Copied.");
    } catch {
      toast("Could not copy. Select the link and copy it.", true);
    }
  };
  return (
    <div className="hud p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="kicker bare">Recruit your squad</p>
        <span className="chip gold">+{fmt(P.referral)} each</span>
      </div>
      <p className="muted mt-2 text-sm">Each friend who enlists with your link and gets the follow approved counts. Friends on your own network do not.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <code className="field min-w-0 truncate text-sm">{link}</code>
        <button className="btn sm" onClick={copy}>
          Copy
        </button>
        <a className="btn sm ghost" href={share} target="_blank" rel="noopener">
          Share
          <FaArrowUpRightFromSquare aria-hidden size={11} />
        </a>
      </div>
      <p className="mt-3 font-pixel text-[11px] tracking-wider text-muted uppercase">
        Recruited {j.invites.sent} · approved {j.invites.approved}
      </p>
    </div>
  );
}

function Breakdown({ j }: { j: Joined }) {
  const s = j.score!;
  const e = j.entry;
  const rows: [string, string][] = [
    ["Enlisted", "+" + fmt(P.joined)],
    ["Follow", e.follow_status === "approved" ? "+" + fmt(P.follow) : "—"],
    ["Comment", e.status === "approved" ? "+" + fmt(P.comment) : "—"],
    [`Squad (${s.refs})`, "+" + fmt(s.refs * P.referral)],
    ["Bonus missions", "+" + fmt(s.mpts)],
  ];
  return (
    <div className="hud p-5 sm:p-8">
      <p className="kicker bare">Points breakdown</p>
      <div className="rows mt-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <span className="muted">{k}</span>
            <b className="tabular-nums">{v}</b>
          </div>
        ))}
        <div>
          <span>Total</span>
          <b className="stencil text-xl text-signal">{fmt(s.points)}</b>
        </div>
      </div>
      {!s.reward ? (
        <p className="muted mt-3 text-sm">
          The top {CONFIG.whitelist.winners} get paid. Do bonus missions and recruit to climb.
        </p>
      ) : CONFIG.whitelist.perkTop && s.rank <= CONFIG.whitelist.perkTop ? (
        <p className="muted mt-3 text-sm">Your rank also earns {CONFIG.whitelist.perk}.</p>
      ) : null}
    </div>
  );
}
