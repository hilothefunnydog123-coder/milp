import type { MetadataRoute } from "next";

// PWA manifest — lets YNorth be "added to home screen" like a real app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YNorth — Find your way home",
    short_name: "YNorth",
    description: "A compass out of homelessness — researched, called, and walked with you.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e17",
    theme_color: "#0a0e17",
    icons: [
      { src: "/star.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/star.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
