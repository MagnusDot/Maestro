import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon Maestro",
  description: "Jeu cooperatif premium inspire de Pedantix, avec rooms temps reel et articles Wikipedia."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
