import type { Article } from "./types";

export const ARTICLES: Article[] = [
  {
    id: "histoire-des-sciences",
    title: "Histoire des sciences",
    theme: "Culture generale",
    category: "Science humaine",
    relatedArticle: "Philosophie naturelle",
    eraPlace: "Antiquite, Europe",
    difficulty: 3,
    source: "Encyclopedie libre",
    updatedAt: "aujourd'hui",
    sections: [
      {
        heading: "Introduction",
        body: [
          "L'histoire des sciences est l'etude de l'evolution des connaissances scientifiques, des methodes et des institutions qui les produisent.",
          "Elle examine les decouvertes, les controverses et les contextes sociaux qui ont transforme la comprehension du monde naturel."
        ]
      },
      {
        heading: "Histoire et developpement",
        body: [
          "Dans l'Antiquite, les savants grecs, indiens, chinois et arabes ont formule des observations durables sur les astres, la matiere et le vivant.",
          "A l'epoque moderne, l'experimentation, les instruments de mesure et la diffusion imprimee donnent une place nouvelle aux preuves."
        ]
      },
      {
        heading: "Caracteristiques",
        body: [
          "La discipline compare les theories, les pratiques de laboratoire, les reseaux de correspondance et les usages politiques du savoir.",
          "Elle montre que les sciences ne progressent pas seulement par accumulation, mais aussi par changements de paradigmes."
        ]
      }
    ]
  },
  {
    id: "architecture-gothique",
    title: "Architecture gothique",
    theme: "Art et patrimoine",
    category: "Architecture",
    relatedArticle: "Cathedrale Notre-Dame de Paris",
    eraPlace: "Moyen Age, Europe occidentale",
    difficulty: 2,
    source: "Encyclopedie libre",
    updatedAt: "cette semaine",
    sections: [
      {
        heading: "Definition",
        body: [
          "L'architecture gothique est un style architectural apparu en Ile-de-France au milieu du douzieme siecle.",
          "Elle se caracterise par l'arc brise, la croisee d'ogives, l'arc-boutant et une recherche intense de lumiere."
        ]
      },
      {
        heading: "Diffusion",
        body: [
          "Le style se diffuse rapidement dans les cathedrales, les abbayes, les palais urbains et les edifices civils.",
          "Les chantiers mobilisent des maitres d'oeuvre, des tailleurs de pierre, des verriers et de nombreux artisans specialises."
        ]
      },
      {
        heading: "Heritage",
        body: [
          "La periode gothique influence durablement la representation du sacre, l'organisation des villes et l'histoire de l'art europeen.",
          "Au dix-neuvieme siecle, le mouvement neo-gothique ravive l'interet pour ces formes monumentales.",
          "Ces edifices restent des reperes urbains, techniques et symboliques majeurs."
        ]
      }
    ]
  },
  {
    id: "oceanographie",
    title: "Oceanographie",
    theme: "Terre et environnement",
    category: "Sciences de la mer",
    relatedArticle: "Courant marin",
    eraPlace: "Oceans du monde",
    difficulty: 4,
    source: "Encyclopedie libre",
    updatedAt: "hier",
    sections: [
      {
        heading: "Champ d'etude",
        body: [
          "L'oceanographie etudie les mers et les oceans sous leurs aspects physiques, chimiques, biologiques et geologiques.",
          "Elle s'interesse aux courants, aux marees, aux sediments, aux ecosystemes marins et aux interactions avec le climat."
        ]
      },
      {
        heading: "Methodes",
        body: [
          "Les chercheurs utilisent des navires, des bouees, des satellites, des capteurs autonomes et des modeles numeriques.",
          "Ces observations permettent de suivre la temperature, la salinite, l'acidification et la circulation des masses d'eau."
        ]
      },
      {
        heading: "Enjeux",
        body: [
          "La discipline joue un role central dans la comprehension du changement climatique et de la biodiversite marine.",
          "Elle contribue aussi a la gestion des ressources, des risques littoraux et de la pollution.",
          "Ses resultats guident les politiques maritimes et la protection des littoraux."
        ]
      }
    ]
  }
];
