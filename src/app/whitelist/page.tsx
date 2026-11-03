import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { WhitelistApp } from "@/components/WhitelistApp";

export const metadata: Metadata = {
  title: "Whitelist",
  description: "Connect your wallet to enlist, complete missions on X and climb the leaderboard.",
};

export default function WhitelistPage() {
  return (
    <>
      <Nav />
      <main>
        <WhitelistApp />
      </main>
      <Footer />
    </>
  );
}
