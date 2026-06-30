import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://maestro.pages.dev"),
  applicationName: "Maestro",
  title: "Salon Maestro",
  description: "Jeu cooperatif premium avec rooms temps reel et articles Wikipedia.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  openGraph: {
    title: "Salon Maestro",
    description: "Jeu cooperatif avec rooms temps reel et articles Wikipedia.",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Mascotte Salon Maestro" }],
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Salon Maestro",
    description: "Jeu cooperatif avec rooms temps reel et articles Wikipedia.",
    images: ["/icon-512.png"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
