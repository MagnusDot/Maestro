import type { Metadata } from "next";
import { LegalPage } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d'utilisation",
  description: "Conditions d'utilisation de Salon Maestro."
};

export default function ConditionsUtilisationPage() {
  return (
    <LegalPage title="Conditions d'utilisation" eyebrow="Regles du service" updatedAt="30 juin 2026">
      <section>
        <h2>Objet</h2>
        <p>
          Salon Maestro est un jeu cooperatif gratuit permettant de deviner progressivement un article Wikipedia masque
          dans une room solo ou multijoueur.
        </p>
      </section>

      <section>
        <h2>Utilisation du service</h2>
        <p>
          L'utilisateur s'engage a choisir un nom visible approprie, a ne pas perturber volontairement les rooms et a ne
          pas utiliser le service pour publier des contenus illicites, injurieux ou portant atteinte aux droits de tiers.
        </p>
      </section>

      <section>
        <h2>Disponibilite</h2>
        <p>
          Le service est fourni sans garantie de disponibilite permanente. Des interruptions peuvent survenir,
          notamment lors du chargement d'articles Wikipedia, de maintenances Cloudflare ou de mises a jour du projet.
        </p>
      </section>

      <section>
        <h2>Articles et sources</h2>
        <p>
          Les articles sont selectionnes automatiquement depuis Wikipedia francophone. Salon Maestro ne controle pas le
          contenu encyclopedique source et ne garantit pas l'exactitude de ces contenus tiers.
        </p>
      </section>

      <section>
        <h2>Modification des conditions</h2>
        <p>
          Ces conditions peuvent evoluer avec le projet. La date de mise a jour indiquee en haut de page permet
          d'identifier la version applicable.
        </p>
      </section>
    </LegalPage>
  );
}
