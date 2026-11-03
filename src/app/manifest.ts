import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Swoldiers",
    short_name: "Swoldiers",
    description: "A top-down pixel war MMO in five fronts.",
    start_url: "/",
    display: "standalone",
    background_color: "#14170f",
    theme_color: "#14170f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
