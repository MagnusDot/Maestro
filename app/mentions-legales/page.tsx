import type { Metadata } from "next";
import { LegalPage, MissingLegalInfo } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Mentions legales",
  description: "Mentions legales du service Salon Maestro."
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage title="Mentions legales" eyebrow="Cadre legal" updatedAt="30 juin 2026">
      <section>
        <h2>Editeur du service</h2>
        <p>
          Salon Maestro est un projet de jeu cooperatif en ligne. Les informations d'identification de l'editeur
          doivent etre completees avant une mise en production publique.
        </p>
        <dl>
          <dt>Nom ou raison sociale</dt>
          <dd>
            <MissingLegalInfo>A completer</MissingLegalInfo>
          </dd>
          <dt>Adresse</dt>
          <dd>
            <MissingLegalInfo>A completer</MissingLegalInfo>
          </dd>
          <dt>Contact</dt>
          <dd>
            <MissingLegalInfo>A completer</MissingLegalInfo>
          </dd>
        </dl>
      </section>

      <section>
        <h2>Hebergement</h2>
        <p>
          Le site est destine a etre heberge par Cloudflare Pages et Cloudflare Workers, services fournis par
          Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, Etats-Unis.
        </p>
      </section>

      <section>
        <h2>Propriete intellectuelle</h2>
        <p>
          Les textes, interfaces, elements graphiques et le code propres a Salon Maestro sont proteges par le droit
          applicable. Les contenus encyclopediques affiches proviennent de Wikipedia francophone et restent soumis aux
          conditions et licences propres a Wikipedia.
        </p>
      </section>

      <section>
        <h2>Liens externes</h2>
        <p>
          Le service peut contenir des liens vers Wikipedia ou Pedantix. Salon Maestro n'est pas responsable du contenu,
          de la disponibilite ou des traitements realises par ces services tiers.
        </p>
      </section>
    </LegalPage>
  );
}
