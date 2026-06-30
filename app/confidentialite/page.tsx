import type { Metadata } from "next";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Politique de confidentialite",
  description: "Politique de confidentialite de Salon Maestro."
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialite" eyebrow="Donnees personnelles" updatedAt="30 juin 2026">
      <section>
        <h2>Responsable du traitement</h2>
        <p>
          Salon Maestro est un projet personnel publie sous le nom Maestro. Le service ne cree pas de compte utilisateur
          et ne met pas en place de suivi publicitaire ou analytique.
        </p>
      </section>

      <section>
        <h2>Donnees utilisees pendant une partie</h2>
        <p>Salon Maestro utilise uniquement les informations necessaires au fonctionnement immediat du jeu :</p>
        <ul>
          <li>nom visible choisi par le joueur ;</li>
          <li>identifiant local de joueur conserve dans le navigateur ;</li>
          <li>code de room, score, propositions et progression de la manche ;</li>
          <li>messages techniques WebSocket necessaires au temps reel.</li>
        </ul>
      </section>

      <section>
        <h2>Stockage local</h2>
        <p>
          Salon Maestro conserve un identifiant de joueur dans le localStorage du navigateur afin de reconnaitre un
          joueur lorsqu'il recharge une room. Le nom visible et l'historique de partie ne sont pas conserves
          volontairement dans le localStorage.
        </p>
      </section>

      <section>
        <h2>Conservation cote serveur</h2>
        <p>
          Aucune base de donnees de joueurs n'est constituee. L'etat d'une room peut etre conserve dans le stockage du
          Durable Object associe a son code afin de maintenir la partie pendant un rechargement ou une courte
          interruption. Il est supprime automatiquement apres 600 secondes d'inactivite.
        </p>
      </section>

      <section>
        <h2>Cookies et mesure d'audience</h2>
        <p>
          Salon Maestro ne depose pas de cookies de suivi et n'integre pas d'outil de mesure d'audience publicitaire ou
          comportementale.
        </p>
      </section>

      <section>
        <h2>Services tiers</h2>
        <p>
          Le service recupere des articles depuis l'API Wikipedia francophone. L'hebergement cible repose sur
          Cloudflare Pages, Cloudflare Workers et Durable Objects.
        </p>
      </section>

      <section>
        <h2>Droits des utilisateurs</h2>
        <p>
          Comme aucune base de comptes ou d'historique nominatif n'est maintenue, l'essentiel des donnees de jeu
          disparait avec la room. L'identifiant local peut etre efface depuis les reglages du navigateur.
        </p>
      </section>
    </LegalPage>
  );
}
