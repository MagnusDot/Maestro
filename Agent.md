# Agent.md

Briefing projet pour les prochains agents IA intervenant sur ce repo.

## Vue d'ensemble

Salon Maestro est un jeu de mots cooperatif. Les joueurs creent une room, rejoignent via un lien d'invitation, puis proposent des mots pour reveler progressivement un article Wikipedia francophone masque. Le titre de l'article est la reponse finale.

Le projet cible Cloudflare Pages avec une app Next.js exportee en statique, des Pages Functions pour router les endpoints de room, et un Worker Cloudflare avec Durable Object pour porter l'etat temps reel et les WebSockets.

## Stack

- Next.js 16 avec App Router, React 19, TypeScript strict.
- UI client-side dans `app/page.tsx`, styles globaux dans `app/globals.css`.
- Export statique Next via `output: "export"` dans `next.config.ts`.
- Cloudflare Pages pour servir le dossier `out/`.
- Cloudflare Pages Functions dans `functions/api/rooms`.
- Cloudflare Worker + Durable Object dans `worker/src/index.ts`.
- WebSockets pour les rooms temps reel.
- Wikipedia API francophone pour les articles aleatoires.
- Serveur WebSocket local en Node dans `scripts/local-room-server.ts`.

## Fichiers importants

- `app/page.tsx` : experience principale, ecran de depart, article masque, proposition de mots, historique, score, indices, modale de parametres.
- `src/hooks/useSalonRoom.ts` : hook client qui gere la room, le player local, le WebSocket, les notices, les actions de jeu et l'URL d'invitation.
- `src/game/types.ts` : contrats partages entre client, serveur local, Pages Functions et Worker.
- `src/game/engine.ts` : logique metier du jeu, etat de room, joueurs, scoring, guesses, indices, snapshots envoyes au client.
- `src/game/normalize.ts` : normalisation francaise, tokenisation, Levenshtein et similarite orthographique.
- `src/game/wiki.ts` : chargement d'articles Wikipedia, filtrage des articles jouables, fallback hors-ligne.
- `functions/api/rooms/[room].ts` : endpoint HTTP Pages Function qui transfere la requete au Durable Object `ROOMS`.
- `functions/api/rooms/[room]/ws.ts` : endpoint WebSocket Pages Function qui transfere aussi au Durable Object `ROOMS`.
- `worker/src/index.ts` : Worker Cloudflare et classe Durable Object `PedantixRoom`.
- `scripts/local-room-server.ts` : equivalent local en memoire du Durable Object pour le dev.
- `wrangler.toml` : config Cloudflare Pages, binding `ROOMS` vers le Worker.
- `worker/wrangler.toml` : config du Worker Durable Object et migration Durable Object.
- `public/maestro-mascot.png` : visuel de marque utilise par l'interface.

## Commandes locales

Installation :

```bash
npm install
```

Developpement :

```bash
npm run dev
```

Cette commande lance en parallele :

- Next.js sur `http://localhost:3000`
- le serveur WebSocket local sur `ws://localhost:8787/api/rooms/:room/ws`

Build statique :

```bash
npm run build
```

Verification TypeScript :

```bash
npm run typecheck
```

Preview Cloudflare Pages local apres build :

```bash
npm run build
npm run preview
```

Worker local seul :

```bash
npm run cf:worker:dev
```

## Architecture runtime

En local, `useSalonRoom.ts` detecte `localhost:3000` et ouvre les sockets vers `ws://localhost:8787/api/rooms/:code/ws`. L'etat des rooms vit en memoire dans `scripts/local-room-server.ts`.

En production Cloudflare, le client ouvre le WebSocket sur le meme host Pages :

```text
wss://<site>/api/rooms/:code/ws
```

Cloudflare Pages Functions recoit la requete, resolve le Durable Object par nom de room via `env.ROOMS.idFromName(code)`, puis transfere la requete au stub Durable Object. Le Durable Object garde l'etat de la room dans `state.storage` sous la cle `room`, avec une alarm de cleanup apres 600 secondes d'inactivite.

## Flux de jeu

1. Le client cree ou rejoint une room.
2. Le hook `useSalonRoom` ouvre un WebSocket et envoie un message `join`.
3. Le serveur cree ou charge un `RoomState`.
4. Si l'article est en chargement ou fallback, le serveur tente de charger un nouvel article Wikipedia.
5. Le serveur diffuse des `RoomSnapshot` personnalises par joueur.
6. Une proposition de mot passe par `submitGuess`.
7. Les mots exacts sont reveles, les mots proches sont affiches au-dessus du mot masque cible, et une proposition exacte du titre marque le joueur comme gagnant.
8. Quand un joueur a trouve le titre, les autres peuvent demander la revelation du titre dans leur champ de saisie, mais leur snapshot ne devoile pas automatiquement tout l'article.

## Cloudflare

Configuration Pages dans `wrangler.toml` :

```toml
name = "maestro"
compatibility_date = "2026-06-30"
pages_build_output_dir = "out"
```

Binding Pages vers le Durable Object :

```toml
[[durable_objects.bindings]]
name = "ROOMS"
class_name = "PedantixRoom"
script_name = "maestro-room-worker"
```

Configuration Worker dans `worker/wrangler.toml` :

```toml
name = "maestro-room-worker"
main = "src/index.ts"
compatibility_date = "2026-06-30"

[[durable_objects.bindings]]
name = "ROOMS"
class_name = "PedantixRoom"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["PedantixRoom"]
```

Deploiement typique :

```bash
npm run cf:worker:deploy
npm run build
wrangler pages deploy out
```

Dans Cloudflare Pages, verifier que le binding Durable Object `ROOMS` pointe vers `maestro-room-worker` et la classe `PedantixRoom`.

## Article Wikipedia

`src/game/wiki.ts` interroge `https://fr.wikipedia.org/w/api.php` avec `generator=random`, demande un extrait introductif, les categories, infos et liens, puis reconstruit un `Article` interne.

Contraintes actuelles :

- namespace Wikipedia `0`, donc articles encyclopediques seulement.
- taille minimale Wikipedia demandee via `grnminsize=5000`.
- cible d'environ 100 mots jouables, mais paragraphes entiers conserves.
- maximum 12 tentatives pour trouver un article jouable.
- fallback `Wikipedia indisponible` si aucun article admissible ou erreur reseau.

Un article est jouable si son titre est assez long, contient au moins un paragraphe, depasse la cible de mots et fournit au moins 22 mots candidats.

## Etat et messages temps reel

Les types partages sont dans `src/game/types.ts`.

Messages client vers serveur :

- `join`
- `guess`
- `setMode`
- `reset`
- `ping`
- `revealTitle`

Messages serveur vers client :

- `state`
- `notice`
- `guessResult`
- `revealTitle`

Le serveur garde au plus 80 guesses dans l'etat de la room active, mais les snapshots clients exposent les 30 plus recentes.

## Regles et scoring

- Le premier joueur d'une room devient host.
- Seul le host peut changer le mode ou relancer un article.
- Un mot exact non trouve donne des points et augmente le streak.
- Un doublon ne rapporte rien et casse le streak.
- Un mot proche donne une petite recompense et memorise l'indice de proximite sur le mot cible.
- Une reponse exacte du titre donne 1000 points et marque le joueur comme gagnant.
- Les indices se debloquent progressivement a 0, 2, 4, 6, 8, 10 et 12 minutes apres le debut de la manche.

## Points d'attention

- Ne pas mettre l'etat temps reel dans Next.js ou Pages statique. Il doit rester cote Worker/Durable Object ou serveur local.
- Garder `src/game/types.ts` compatible avec le client, le serveur local et le Worker Cloudflare.
- `next.config.ts` utilise `images.unoptimized: true` car le build est exporte en statique.
- Les routes avec crochets doivent etre quotees dans le shell, par exemple `sed -n '1,120p' 'functions/api/rooms/[room].ts'`.
- `node_modules`, `.next`, `out`, `.wrangler`, `.vercel`, `.dev.vars`, `dist` et `.DS_Store` sont ignores par Git.
- `tsconfig.tsbuildinfo` est actuellement present dans le repo local. S'il n'est pas voulu dans l'historique, l'ajouter a `.gitignore` avant commit.
- Les accents sont normalises pour les guesses via `normalizeWord`, donc les joueurs peuvent saisir sans accents.
- Le serveur local garde les rooms en memoire uniquement. Le Worker Cloudflare persiste les rooms dans Durable Object storage et les supprime apres 600 secondes d'inactivite.

## Verification recommandee apres changement

Pour une modification TypeScript ou gameplay :

```bash
npm run typecheck
npm run build
```

Pour une modification WebSocket ou Cloudflare :

```bash
npm run dev
```

Puis tester :

- creation de room
- copie/reouverture du lien `?room=...`
- deux onglets dans la meme room
- proposition d'un mot trouve
- proposition d'un mot proche
- proposition exacte du titre
- relance d'article par le host

## Convention de travail

Preferer des changements localises :

- UI dans `app/page.tsx` et `app/globals.css`
- logique partagee dans `src/game/*`
- transport client dans `src/hooks/useSalonRoom.ts`
- runtime Cloudflare dans `worker/src/index.ts` et `functions/api/rooms/*`
- runtime local dans `scripts/local-room-server.ts`

Si une regle de jeu change, mettre a jour a la fois `engine.ts`, les types si necessaire, et verifier que le serveur local et le Worker continuent a importer le meme contrat.
