# Salon Maestro

Jeu de mots coop inspiré de Pedantix, pensé pour Cloudflare Pages.

## Fonctionnalités

- Entrée explicite : créer une room coop ou jouer seul.
- Rooms avec lien d'invitation et WebSocket temps réel.
- Articles chargés automatiquement depuis Wikipédia francophone, avec environ 100 mots jouables.
- Des paragraphes complets sont affiches jusqu'a atteindre la taille cible.
- Tous les mots sont masqués au départ.
- Propositions proches affichées directement au-dessus du mot caviardé ciblé, avec rapprochement lexical francais prioritaire puis orthographe en secours.
- Indices progressifs : thème, catégorie, premières lettres, article lié, époque/lieu, titre, lettres révélées.
- Input sticky en bas de l'article pour proposer un mot sans perdre le texte de vue.

## Local

```bash
npm install
npm run dev
```

Ouvrir `http://localhost:3000`.

En local, `npm run dev` lance :

- Next.js sur `3000`
- un serveur WebSocket de rooms sur `8787`

## Build Cloudflare Pages

```bash
npm run build
```

Le projet utilise `output: "export"` et produit `out/`.

Configuration Cloudflare Pages :

- Project name: `maestro`
- Build command: `npm run build`
- Output directory: `out`
- Node version: `24`

## WebSocket sur Cloudflare

Cloudflare Pages ne doit pas porter directement l'etat temps reel. Le projet utilise :

- Pages statique pour l'app Next.js.
- Pages Functions dans `functions/api/rooms`.
- Durable Object Worker `maestro-room-worker` dans `worker/src/index.ts` pour l'etat des rooms et les WebSockets.

Deploiement typique :

```bash
npm run cf:worker:deploy
npm run build
wrangler pages deploy out
```

Le Durable Object doit etre deploye et bindé au projet Pages sous le nom `ROOMS`.
