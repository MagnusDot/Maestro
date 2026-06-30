import Link from "next/link";
import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  eyebrow: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalPage({ title, eyebrow, updatedAt, children }: LegalPageProps) {
  return (
    <main className="legal-shell">
      <article className="legal-document">
        <nav className="legal-nav" aria-label="Navigation legale">
          <Link href="/">Maestro</Link>
          <span aria-hidden="true">/</span>
          <Link href="/mentions-legales">Mentions legales</Link>
          <Link href="/confidentialite">Confidentialite</Link>
          <Link href="/conditions-utilisation">Conditions</Link>
        </nav>

        <header className="legal-header">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>Derniere mise a jour : {updatedAt}</p>
        </header>

        <div className="legal-content">{children}</div>

        <footer className="legal-footer">
          <Link href="/">Retour au jeu</Link>
        </footer>
      </article>
    </main>
  );
}
