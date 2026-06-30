import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Salon Maestro",
    short_name: "Maestro",
    description: "Jeu cooperatif inspire de Pedantix avec rooms temps reel et articles Wikipedia.",
    start_url: "/",
    display: "standalone",
    background_color: "#04141a",
    theme_color: "#08202a",
    lang: "fr",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
