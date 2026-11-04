import type { Metadata } from "next";
import { PlayLoader } from "@/components/play/PlayLoader";

export const metadata: Metadata = {
  title: "Play the demo",
  description: "Drop into a front, grab the loot and make the chopper before you're overrun. Free, in your browser.",
};

export default function PlayPage() {
  return <PlayLoader />;
}
