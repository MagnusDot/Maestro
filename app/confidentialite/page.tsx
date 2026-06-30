import type { Metadata } from "next";
import { LegalPage, MissingLegalInfo } from "../_components/LegalPage";

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
          Le responsable du traitement doit etre complete avant publication publique du service :
          {" "}
          <MissingLegalInfo>A completer</MissingLegalInfo>.
        </p>
      </section>

      <section>
        <h2>Donnees traitees</h2>
        <p>Salon Maestro limite les donnees au fonctionnement du jeu :</p>
        <ul>
          <li>nom visible choisi par le joueur ;</li>
          <li>identifiant local de joueur stocke dans le navigateur ;</li>
          <li>code de room, score, propositions et progression de la manche ;</li>
          <li>messages techniques WebSocket necessaires au temps reel.</li>
        </ul>
      </section>

      <section>
        <h2>Stockage local</h2>
        <p>
          Le navigateur peut conserver un identifiant de joueur et le nom visible via localStorage afin de reconnaitre
          un joueur lorsqu'il rejoint une room. Ces informations peuvent etre supprimees depuis les reglages du
          navigateur.
        </p>
      </section>

      <section>
        <h2>Rooms et conservation</h2>
        <p>
          En production Cloudflare, l'etat d'une room peut etre conserve par le Durable Object associe a son code. La
          duree de conservation operationnelle doit etre fixee avant publication :
          {" "}
          <MissingLegalInfo>A completer</MissingLegalInfo>.
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
          Selon le cadre applicable, les utilisateurs peuvent demander l'acces, la rectification ou la suppression de
          leurs donnees. L'adresse de contact dediee doit etre renseignee ici :
          {" "}
          <MissingLegalInfo>A completer</MissingLegalInfo>.
        </p>
      </section>
    </LegalPage>
  );
}
