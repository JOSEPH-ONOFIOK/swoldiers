import type { Metadata } from "next";
import Link from "next/link";
import { DocsShell } from "@/components/DocsShell";
import { fmt } from "@/lib/client";
import { CONFIG } from "@/lib/config";

export const metadata: Metadata = { title: "Docs: Whitelist" };

export default function WhitelistDocs() {
  const w = CONFIG.whitelist;
  const P = w.points;
  const T = CONFIG.token.symbol;
  return (
    <DocsShell
      current="/docs/whitelist"
      title="Whitelist"
      lead={`Your wallet is your spot. Connect it and you are enlisted. Then complete missions to earn points: the top ${w.winners} share ${fmt(w.prizeTotal)} ${T}${w.perkTop ? ` and the top ${fmt(w.perkTop)} get ${w.perk}` : ""}.`}
    >
      <h2>Enlist and climb</h2>
      <ol>
        <li><b>Connect your wallet.</b> Any EVM wallet in your browser: MetaMask, Rabby, Phantom, Coinbase Wallet, Backpack. You sign a free message. It is not a transaction. You are enlisted at once.</li>
        <li><b>Follow us on X.</b> Follow <a href={`https://x.com/${CONFIG.xAccount}`} target="_blank" rel="noopener">@{CONFIG.xAccount}</a>, type your X username and send it. Stay followed.</li>
        <li><b>Comment on our post.</b> Comment from that same account, then paste the link of your comment on the whitelist page.</li>
      </ol>
      <p><b>Each mission on its own.</b> We review the follow and the comment separately, in any order. Each one adds its points when approved.</p>
      <p><b>In review.</b> You can change your username or link while it is in review.</p>
      <p><b>Rejected.</b> You see the reason on the page. Fix it and send it again.</p>

      <h2>Points</h2>
      <table>
        <thead><tr><th>How</th><th>Points</th><th>When they count</th></tr></thead>
        <tbody>
          <tr><td>Connect your wallet</td><td>+{P.joined}</td><td>At once</td></tr>
          <tr><td>Follow us on X</td><td>+{P.follow}</td><td>When we approve it</td></tr>
          <tr><td>Comment on our post</td><td>+{P.comment}</td><td>When we approve it</td></tr>
          <tr><td>Each friend who enlists with your link</td><td>+{P.referral}</td><td>When your friend&apos;s follow is approved</td></tr>
          <tr><td>More missions (comment on our posts)</td><td>Shown on each</td><td>As soon as you send your link</td></tr>
        </tbody>
      </table>
      <p><b>Invite link.</b> You get it on the whitelist page as soon as you connect. Copy it or share it on X.</p>
      <p><b>More missions.</b> They open once your follow is approved. Press Comment on X, reply from the account you enlisted with, and paste the link.</p>
      <p><b>Checks.</b> We check mission comments. A fake or deleted comment is removed with its points, and you can send a new one.</p>
      <p><b>Same network.</b> A friend who enlists from your own internet connection does not count.</p>

      <h2>Rewards</h2>
      <table>
        <thead><tr><th>Rank</th><th>Reward</th></tr></thead>
        <tbody>
          {w.prizes.map((p) => (
            <tr key={p.from}><td>{p.from === p.to ? `#${p.from}` : `#${p.from} – #${p.to}`}</td><td>{fmt(p.amount)} {T}{p.to > p.from ? " each" : ""}</td></tr>
          ))}
          <tr><td><b>Top {w.winners}</b></td><td><b>{fmt(w.prizeTotal)} {T}</b></td></tr>
          {w.perkTop ? <tr><td>Top {fmt(w.perkTop)}</td><td>{w.perk}</td></tr> : null}
        </tbody>
      </table>
      <p><b>Ties.</b> Whoever enlisted first ranks higher.</p>
      <p><b>Final ranking.</b> Points stop when the whitelist closes. After the last checks the ranking is frozen and shown as final.</p>
      <p><b>Payment.</b> {T} goes to the wallet you enlisted with, when the game launches.</p>

      <h2>Rules</h2>
      <p><b>One X account per wallet.</b> The same account cannot be used by two wallets.</p>
      <p><b>Your own posts.</b> Each post counts once and must be newer than the post it answers.</p>
      <p><b>Times in UTC.</b> The closing time is shown on the whitelist page in UTC.</p>
      <p><Link href="/whitelist">Go to the whitelist →</Link></p>
    </DocsShell>
  );
}
