import type { Metadata, Viewport } from "next";
import { Barlow, Black_Ops_One, Silkscreen } from "next/font/google";
import { CONFIG } from "@/lib/config";
import "./globals.css";

const stencil = Black_Ops_One({ variable: "--font-stencil", weight: "400", subsets: ["latin"] });
const pixel = Silkscreen({ variable: "--font-pixel", weight: ["400", "700"], subsets: ["latin"] });
const body = Barlow({ variable: "--font-body", weight: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

const DESCRIPTION = "Swoldiers is a top-down pixel war MMO: bulk up at Fort Gainz, push through five fronts, raid the Black Site. Join the whitelist.";

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  title: { default: "Swoldiers · A pixel war MMO", template: "%s · Swoldiers" },
  description: DESCRIPTION,
  applicationName: "Swoldiers",
  openGraph: { type: "website", url: "/", siteName: "Swoldiers", title: "Swoldiers · A pixel war MMO", description: DESCRIPTION },
  twitter: { card: "summary_large_image", site: `@${CONFIG.xAccount}`, title: "Swoldiers · A pixel war MMO", description: DESCRIPTION },
};

export const viewport: Viewport = { themeColor: "#14170f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${stencil.variable} ${pixel.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
