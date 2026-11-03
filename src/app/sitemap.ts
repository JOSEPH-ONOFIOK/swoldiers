import type { MetadataRoute } from "next";
import { CONFIG } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/whitelist", "/docs", "/docs/world", "/docs/enemies", "/docs/combat", "/docs/whitelist"].map((p) => ({ url: CONFIG.siteUrl + p }));
}
