import Link from "next/link";
import { FaXTwitter } from "react-icons/fa6";
import { xUrl } from "@/lib/config";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-bg2">
      <div className="mx-auto grid max-w-7xl gap-6 px-5 pt-12 pb-6 md:grid-cols-[1fr_auto] md:gap-8 md:pt-14">
        <div>
          <p className="kicker">End of transmission</p>
          <p className="mt-3 max-w-md text-khaki">Bulk up. Gear up. Push the line. Follow the war on X for drops, missions and the launch date.</p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 self-end font-pixel text-[12px] tracking-[0.14em] text-khaki uppercase">
          <Link href="/whitelist" className="hover:text-signal">Whitelist</Link>
          <Link href="/docs" className="hover:text-signal">Docs</Link>
          <a href={xUrl} target="_blank" rel="noopener" aria-label="Swoldiers on X" className="hover:text-signal"><FaXTwitter aria-hidden size={15} /></a>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-5">
        <div className="stencil -mb-[0.18em] text-[clamp(40px,12vw,200px)] leading-none text-panel select-none" aria-hidden>
          SWOLDIERS
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-5 py-4 text-sm text-muted">© 2026 Swoldiers. Stay swol.</p>
      </div>
    </footer>
  );
}
