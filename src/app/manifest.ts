import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dartkveld",
    short_name: "Dartkveld",
    description: "Poengføring for dartkvelden: Mickey Mouse, med flere spill på vei.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "nb",
    background_color: "#0a0e15",
    theme_color: "#0a0e15",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
