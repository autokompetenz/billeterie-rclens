# Billetterie RC Lens

Application de billetterie complète pour le RC Lens : catalogue des matchs, plan du stade, panier avec pré-réservation des places, paiement simulé, e-billets, cession nominative, bourse d'échange et liste d'attente pour les abonnements.

Le projet dispose d'un **vrai backend** : API REST Express + base **PostgreSQL/Neon**. Il ajoute un **catalogue d'événements administrable**, l'**achat sans compte**, l'**envoi d'e-mails** (client + admin) et la **vérification par numéro de bon de commande**. Les données ne sont plus stockées dans le navigateur (seuls le thème et le jeton de session y sont conservés).

---

## Sommaire

- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Comptes et accès](#comptes-et-accès)
- [Scripts disponibles](#scripts-disponibles)
- [Architecture du projet](#architecture-du-projet)
- [Parcours client](#parcours-client)
- [Espace administrateur](#espace-administrateur)
- [API REST](#api-rest)
- [Règles métier](#règles-métier)
- [Codes promo et options](#codes-promo-et-options)
- [Base de données et réinitialisation](#base-de-données-et-réinitialisation)
- [E-mails SMTP Hostinger](#e-mails-smtp-hostinger)
- [Déploiement Vercel + Neon](#déploiement-vercel--neon)
- [Production locale](#production-locale)
- [Limites connues](#limites-connues)

---

## Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Motion, Lucide |
| Backend | Node.js 24, Express 4, TypeScript exécuté via `tsx` |
| Base de données | PostgreSQL 16+ (Neon en production) via le pilote `pg` |
| Authentification | Hachage `scrypt`, jetons de session opaques (SHA-256 en base), `Authorization: Bearer` |
| Espace admin | Code secret (`ADMIN_CODE`) + cookie HttpOnly signé (HMAC), 12 h |
| E-mails | Nodemailer + SMTP Hostinger, journalisation dans `email_log` |
| Build serveur | esbuild → `server.js` autonome |
| Hébergement | Vercel (frontend statique + fonction serverless `api/[...path].ts`) |

> **Prérequis : Node.js 24 ou supérieur** et une base PostgreSQL accessible (locale, Docker/Podman ou Neon).

---

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
#   → renseigner DATABASE_URL, ADMIN_CODE, SMTP_*…

# 3. Lancer l'API et le frontend en parallèle
npm run dev
```

- Frontend : <http://localhost:3000>
- API : <http://localhost:3001> (le frontend passe par le proxy Vite `/api`)

Au premier démarrage, le schéma est créé automatiquement puis amorcé avec les matchs, tribunes, secteurs, sièges, visites, comptes, annonces **et les événements de démonstration**.

### PostgreSQL local (Podman)

```bash
podman run -d --name rclens-pg \
  -e POSTGRES_USER=rclens -e POSTGRES_PASSWORD=rclens -e POSTGRES_DB=billeterie \
  -p 5433:5432 docker.io/library/postgres:16-alpine
```

Puis dans `.env` :

```dotenv
DATABASE_URL="postgresql://rclens:rclens@127.0.0.1:5433/billeterie"
```

Pour lancer les deux processus séparément :

```bash
npm run dev:api   # API seule (port 3001)
npm run dev:web   # frontend seul (port 3000)
```

---

## Comptes et accès

| Rôle | Accès |
| --- | --- |
| Supporter principal | `supporter@rclens.fr` / `Bollaert2026!` |
| Espace administrateur | `/admin` + code défini par `ADMIN_CODE` |

Le mot de passe des comptes de démonstration peut être changé **avant le premier amorçage** via la variable `SEED_PASSWORD`.

Les comptes vendeurs (`g.dubois@example.com`, `m.fournier@example.com`, `a.benoit@example.com`) utilisent le même mot de passe et servent uniquement à alimenter la bourse d'échange.

> L'achat de billets d'événement **ne nécessite aucun compte**. L'espace admin est masqué : aucun lien public ne pointe vers `/admin`.

---

## Scripts disponibles

| Commande | Description |
| --- | --- |
| `npm run dev` | Lance l'API (avec rechargement) et le frontend Vite |
| `npm run dev:api` | Lance uniquement l'API sur le port 3001 |
| `npm run dev:web` | Lance uniquement le frontend sur le port 3000 |
| `npm run build` | Compile le frontend dans `dist/` |
| `npm run build:server` | Bundle l'API dans `server.js` |
| `npm run build:all` | Compile le frontend **et** le serveur |
| `npm start` | Démarre le serveur de production (`server.js`) |
| `npm run lint` | Vérification TypeScript du frontend et du backend |
| `npm run db:reset` | Supprime toutes les tables PostgreSQL ; recréées au prochain démarrage |
| `npm run clean` | Supprime `dist/` et `server.js` |

---

## Architecture du projet

```text
billeterie/
├── api/
│   └── [...path].ts           # Entrée serverless Vercel (réexporte l'app Express)
├── scripts/
│   ├── dev.mjs                # Lanceur API + Vite en parallèle
│   └── db-reset.mjs           # Réinitialisation de la base PostgreSQL
├── server/
│   ├── app.ts                 # Application Express partagée (local + Vercel)
│   ├── index.ts               # Serveur local (listen + balayage des holds)
│   ├── db.ts                  # Pool pg, schéma, amorçage, transactions
│   ├── seed-data.ts           # Données de référence et tarifs
│   ├── auth.ts                # Sessions utilisateur, middlewares Bearer
│   ├── admin-auth.ts          # Cookie admin signé + limitation des essais
│   ├── http.ts                # Erreurs HTTP et utilitaires de validation
│   ├── mailer.ts              # Nodemailer, templates client/admin, email_log
│   ├── catalog.ts             # Matchs, secteurs, sièges, visites
│   ├── commerce.ts            # Holds, commandes, billets, bourse, liste d'attente
│   ├── events.ts              # Événements publics, commandes invité, vérification
│   ├── admin.ts               # CRUD événements/billets, commandes, check-in, stats
│   └── account.ts             # Inscription, connexion, profil
├── src/
│   ├── App.tsx                # Application historique (matchs, plan, bourse…)
│   ├── pages/
│   │   ├── EventsPage.tsx     # /evenements — catalogue + achat invité
│   │   ├── VerifyPage.tsx     # /verifier — bon de commande et code billet
│   │   └── AdminPage.tsx      # /admin — espace organisateur masqué
│   ├── components/            # Interface (catalogue, panier, paiement, billets…)
│   ├── services/api.ts        # Client HTTP typé (ticketing, events, admin)
│   └── types/ticketing.ts     # Types partagés
├── vite.config.ts             # Proxy /api → http://localhost:3001
├── vercel.json                # Build Vite + fonction serverless
└── .env.example               # Configuration documentée
```

Le montant est stocké en **centimes** dans PostgreSQL et converti en euros aux frontières de l'API.

---

## Parcours client

### Accueil et événements — `/` et `/evenements`

1. Le client choisit un événement publié et une catégorie de billet (stock et maximum par commande contrôlés côté serveur).
2. Il saisit son nom, son e-mail et éventuellement son téléphone.
3. `POST /api/orders/guest` crée une commande **en attente de virement**, génère un numéro de bon de commande (`BC-AAAA-XXXXXX`), une référence de virement unique (`RCL-AAAA-XXXXXXXX`) et un code par billet.
4. Le site et l'e-mail client affichent le titulaire, l'IBAN, le BIC, le montant et le motif de virement. Une notification est envoyée à l'admin (`ADMIN_EMAIL`).
5. Les billets restent en attente jusqu'à confirmation manuelle du virement dans `/admin`.

### Vérification — `/verifier`

- **Par bon de commande** (`BC-…`) : affiche l'événement, le total, les billets et leur statut. Les données personnelles sont **masquées** (`J*** T***`, `j********@example.com`).
- **Par code billet** (`RCL-…`) : affiche la catégorie, le bénéficiaire masqué et le statut (`valid`, `used`, `cancelled`).
- Un numéro inconnu renvoie une erreur 404 explicite.

La page d'accueil affiche désormais le catalogue des événements publiés enregistrés en base, avec leurs catégories de billets actives. Le parcours historique de matchs n'est plus affiché sur la page d'accueil.

À la commande, le client renseigne son nom, son e-mail et éventuellement son téléphone. Une commande en attente est créée et le site/e-mail affichent les coordonnées bancaires, le montant et le motif de virement `RCL-…`. Les billets sont activés lorsque l'admin confirme la réception du virement. Le numéro de commande permet de vérifier son statut sur `/verifier`.

Les réservations invitées utilisent l'en-tête `X-Guest-Id` généré et conservé par le navigateur. Pour envoyer les e-mails, configurez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` et `ADMIN_EMAIL`. Sans configuration SMTP, les messages sont consignés dans les logs et dans `email_log` mais ne sont pas délivrés.

---

## Espace administrateur

Accessible uniquement via **`/admin`** (aucun lien dans la navigation publique).

- **Connexion** : code secret `ADMIN_CODE`, cookie `rcl_admin` HttpOnly + `SameSite=Lax` (+ `Secure` en production), valable 12 h. Limitation à 8 tentatives par IP et par fenêtre de 15 minutes.
- **Tableau de bord** : nombre d'événements, commandes, billets vendus, recette, contrôles d'accès.
- **Événements** : création, modification, publication/annulation, suppression (refusée si des commandes existent).
- **Coordonnées bancaires** : titulaire, IBAN et BIC utilisés pour les virements instantanés SEPA.
- **Commandes** : la référence de virement est affichée ; confirmez la réception du paiement pour activer les billets.
- **Images** : URL externe ou import d'un fichier local (JPG, PNG, WebP). Le navigateur redimensionne et compresse l'image en JPEG, puis l'API la stocke dans `event_images` et renvoie une URL `/api/images/:id`.
- **Catégories de billets** : nom, description, prix, stock, maximum par commande, activation/désactivation, suppression (refusée si des ventes existent).
- **Commandes** : recherche par bon de commande, nom ou e-mail, détail complet et billets.
- **Contrôle d'accès** : validation d'un billet par code (`used`), refus des doublons, réinitialisation possible.

> Le stock est décrémenté de façon atomique (`sold + quantité <= stock`) dans la transaction de commande : deux acheteurs simultanés ne peuvent pas survendre une catégorie.

---

## API REST

Toutes les routes sont préfixées par `/api`. Les réponses d'erreur ont la forme :

```json
{ "error": "Message lisible", "code": "CODE_METIER" }
```

Les routes marquées 🔒 nécessitent `Authorization: Bearer <token>`.
Les routes marquées 🛡️ nécessitent le cookie de session administrateur.

### Santé et catalogue

| Méthode | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | État du service et de la base |
| `GET` | `/matches` | Liste des matchs avec places disponibles |
| `GET` | `/matches/:id` | Détail d'un match |
| `GET` | `/matches/:id/sectors` | Secteurs et tarifs du match |
| `GET` | `/sectors/:id/seats` | Statut temps réel des sièges (auth optionnelle) |
| `GET` | `/tours` | Visites et expériences du stade |
| `GET` | `/resale` | Annonces actives de la bourse d'échange |

### Événements et commandes invité

| Méthode | Route | Corps | Description |
| --- | --- | --- | --- |
| `GET` | `/events` | — | Événements publiés avec catégories, prix et stock |
| `GET` | `/events/:idOrSlug` | — | Détail d'un événement publié |
| `GET` | `/images/:id` | — | Image d'événement importée (cache long) |
| `POST` | `/orders/guest` | voir ci-dessous | Commande sans compte + e-mails |
| `GET` | `/orders/verify/:orderNumber` | — | Vérification publique d'un bon de commande (données masquées) |
| `GET` | `/tickets/verify/:code` | — | Vérification publique d'un billet (données masquées) |

Exemple de commande invité :

```json
{
  "eventId": "evt-lens-marseille",
  "buyer": { "name": "Jean Dupont", "email": "jean@example.com", "phone": "0612345678" },
  "items": [
    { "ticketTypeId": "evt-lens-marseille-tt-1", "quantity": 2, "beneficiaries": ["Jean Dupont", "Marie Dupont"] }
  ],
  "payment": { "reference": "SIM-123456" }
}
```

Réponse (extrait) :

```json
{
  "success": true,
  "orderNumber": "BC-2026-123456",
  "total": 58,
  "event": { "id": "evt-lens-marseille", "title": "…", "formattedDate": "…", "venue": "…" },
  "tickets": [{ "code": "RCL-2026-123456", "typeName": "Tribune Marek / Xercès", "beneficiaryName": "Jean Dupont", "price": 29 }],
  "verificationUrl": "/verifier?commande=BC-2026-123456"
}
```

### Authentification et compte

| Méthode | Route | Corps | Description |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | `{ name, email, password }` | Crée un compte et ouvre une session |
| `POST` | `/auth/login` | `{ email, password }` | Connexion (limitation du nombre d'essais) |
| `GET` | `/auth/me` 🔒 | — | Profil courant |
| `PATCH` | `/auth/me` 🔒 | `{ name }` | Met à jour le nom |
| `POST` | `/auth/logout` 🔒 | — | Révoque la session courante |

La connexion renvoie `{ token, expiresAt, user }`. Les sessions durent **30 jours**.

### Pré-réservation et commande sans compte

| Méthode | Route | Corps | Description |
| --- | --- | --- | --- |
| `POST` | `/holds` | `{ seatIds: string[] }` | Bloque les places pendant 15 minutes (`X-Guest-Id`) |
| `DELETE` | `/holds/:id` | — | Libère une pré-réservation (`X-Guest-Id`) |
| `POST` | `/orders` | voir ci-dessous | Crée la commande et envoie les e-mails client/admin |
| `GET` | `/tickets/my` 🔒 | — | Billets de l'utilisateur |
| `POST` | `/tickets/:id/transfer` 🔒 | `{ recipientName }` | Cession nominative |
| `POST` | `/resale/list` 🔒 | `{ ticketId }` | Met un billet en vente |
| `DELETE` | `/resale/:id` 🔒 | — | Retire une annonce |
| `POST` | `/season/waitlist` | `{ email, preferredStand? }` | Inscription à la liste d'attente |

Exemple de commande historique :

```json
{
  "items": [
    {
      "type": "seat",
      "seatId": "rcl-om-2026__sec-marek-centrale-R2-S8",
      "tariff": "full",
      "beneficiary": { "firstName": "Jean", "lastName": "Dupont", "email": "jean@example.com" }
    },
    { "type": "tour", "tourId": "tour-coulisses", "date": "Samedi 28 Novembre 2026 - 11h00" },
    { "type": "resale", "listingId": "resale-seed-1" }
  ],
  "addons": { "insurance": true, "scarf": false, "parkingPass": "none" },
  "promoCode": "LENSOIS10",
  "payment": { "cardholder": "Jean Dupont", "email": "jean@example.com" }
}
```

> Les prix ne sont **jamais** transmis par le client : le serveur les recalcule à partir du siège, du tarif, des options et du code promo.

### Administration 🛡️

| Méthode | Route | Description |
| --- | --- | --- |
| `POST` | `/admin/login` | `{ code }` → cookie de session |
| `POST` | `/admin/logout` | Supprime le cookie |
| `GET` | `/admin/session` | État de la session |
| `GET` | `/admin/stats` | Indicateurs globaux |
| `GET` | `/admin/bank-transfer` | Coordonnées de virement configurées |
| `PUT` | `/admin/bank-transfer` | Enregistre titulaire, IBAN et BIC |
| `GET` | `/admin/events` | Tous les événements (brouillons inclus) |
| `POST` | `/admin/events` | Crée un événement |
| `POST` | `/admin/images` | `{ dataUrl }` → stocke une image (`{ id, url }`) |
| `PATCH` | `/admin/events/:id` | Modifie un événement |
| `DELETE` | `/admin/events/:id` | Supprime un événement sans commande |
| `POST` | `/admin/events/:id/ticket-types` | Ajoute une catégorie de billet |
| `PATCH` | `/admin/ticket-types/:id` | Modifie prix, stock, activation… |
| `DELETE` | `/admin/ticket-types/:id` | Supprime une catégorie sans vente |
| `GET` | `/admin/orders?search=&eventId=` | Liste/recherche des commandes |
| `GET` | `/admin/orders/:orderNumber` | Détail d'une commande |
| `POST` | `/admin/orders/:orderNumber/confirm-payment` | Confirme le virement et active les billets |
| `GET` | `/admin/tickets/:code` | Recherche d'un billet |
| `POST` | `/admin/tickets/:code/check-in` | Valide un billet (une seule fois) |
| `POST` | `/admin/tickets/:code/reset-check-in` | Réinitialise un contrôle |

---

## Règles métier

### Pré-réservation (hold)

- Durée : **15 minutes**, avec compte à rebours affiché côté client.
- Un utilisateur ne peut avoir qu'**une seule pré-réservation active** : toute nouvelle demande libère la précédente.
- Toutes les places d'un hold doivent appartenir au **même match** (`MIXED_MATCHES`).
- Maximum **10 places** par commande.
- Les holds expirés sont libérés à chaque requête concernée et par un balayage toutes les minutes (serveur local uniquement).
- Le siège passe en `held` en base ; il apparaît `occupied` pour les autres supporters.

### Commande (compte)

- La commande est **transactionnelle** (`BEGIN` / `COMMIT` / `ROLLBACK`).
- Une place encore bloquée par l'utilisateur peut être achetée ; une place bloquée par un autre est refusée (`SEAT_UNAVAILABLE`).
- Les tarifs sont recalculés côté serveur : `u16` = −25 %, `student` = −15 %, `full` = plein tarif.
- La commande consomme le hold de l'utilisateur et génère un e-billet par place.
- L'assurance est facturée **par billet** ; le foulard et le parking sont des options uniques.

### Commande invité (événements)

- Maximum **10 billets** par commande, et `maxPerOrder` par catégorie.
- Stock vérifié et décrémenté atomiquement : `NOT_ENOUGH_STOCK` si épuisé entre-temps.
- Événement non publié ou déjà passé : vente refusée (`EVENT_CLOSED`).
- Numéro de commande et codes billets générés côté serveur, uniques en base.
- Les e-mails ne bloquent jamais une commande payée : en cas d'échec SMTP, l'erreur est journalisée dans `email_log`.

### Bourse d'échange

- Seul un billet `valid` peut être mis en vente.
- Le vendeur choisit implicitement le prix d'origine ; l'annonce est vérifiée (`verified`).
- L'achat d'une annonce passe par `POST /orders` avec un item `type: "resale"`.
- Le billet du vendeur passe en `used`, l'acheteur reçoit un nouveau billet.
- Les places en vente apparaissent `occupied` dans le plan du stade.

### Cession nominative

- Seul le propriétaire d'un billet `valid` peut le céder.
- Le nom du bénéficiaire est mis à jour et le billet passe en `transferred`.

### Liste d'attente abonnements

- Inscription idempotente par e-mail : un e-mail déjà inscrit est accepté avec `alreadyRegistered: true`.
- La position renvoyée correspond au nombre total d'inscrits.
- Tribunes acceptées : `MAREK_XERCES`, `LEPAGNOT`, `DELACOURT`, `TRANNIN`.

---

## Codes promo et options

| Code | Effet |
| --- | --- |
| `LENSOIS10` | −10 % sur le total |
| `CORONS` | −15,00 € sur le total |

| Option | Tarif |
| --- | --- |
| Assurance billet | 2,50 € par billet |
| Foulard collector | 18,00 € |
| Parking | 10,00 € |

---

## Base de données et réinitialisation

Les tables sont créées automatiquement au démarrage (`CREATE TABLE IF NOT EXISTS`) :

`users`, `sessions`, `matches`, `stands`, `sectors`, `seats`, `holds`, `hold_seats`, `orders`, `tickets`, `resale_listings`, `waitlist`, `tours`, `events`, `event_ticket_types`, `guest_orders`, `guest_order_items`, `guest_tickets`, `email_log`.

```bash
# Arrêter l'API puis :
npm run db:reset
npm run dev
```

`db:reset` supprime toutes les tables du schéma `public`. La base est recréée et réamorcée au démarrage suivant. En production, le script exige `FORCE_RESET=true`.

Pour ne pas amorcer les données de démonstration en production :

```dotenv
SEED_DEMO_DATA="false"
```

Variables d'environnement principales (voir `.env.example`) :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3001` | Port de l'API locale |
| `DATABASE_URL` | — | Chaîne PostgreSQL/Neon (**obligatoire**) |
| `PGSSL` | auto | Force (`true`) ou désactive (`false`) SSL |
| `PGSSL_REJECT_UNAUTHORIZED` | `true` | Vérifie le certificat SSL (mettre `false` pour un certificat auto-signé) |
| `PG_POOL_MAX` | `5` | Connexions maximales du pool |
| `SEED_DEMO_DATA` | `true` | Amorçage des données de démonstration |
| `SEED_PASSWORD` | `Bollaert2026!` | Mot de passe des comptes de démo |
| `ADMIN_CODE` | — | Code d'accès à `/admin` (**obligatoire**) |
| `ADMIN_SESSION_SECRET` | code admin | Secret de signature du cookie admin |
| `ADMIN_EMAIL` | `SMTP_USER` | Destinataire des notifications de commande |
| `SMTP_HOST` | `smtp.hostinger.com` | Serveur SMTP |
| `SMTP_PORT` | `465` | Port SMTP |
| `SMTP_SECURE` | `true` si 465 | TLS direct |
| `SMTP_USER` / `SMTP_PASS` | — | Identifiants SMTP Hostinger |
| `MAIL_FROM` | dérivé de `SMTP_USER` | Expéditeur affiché |
| `APP_URL` | `http://localhost:3000` | URL publique (e-mails, QR codes) |
| `CORS_ORIGIN` | *(vide)* | Origines autorisées, séparées par des virgules |
| `VITE_API_URL` | `/api` | Base d'appel de l'API côté frontend |
| `VITE_API_PROXY` | `http://localhost:3001` | Cible du proxy Vite en développement |

---

## E-mails SMTP Hostinger

1. Dans hPanel Hostinger, créez la boîte `billetterie@votre-domaine.fr` (ou utilisez une boîte existante).
2. Renseignez dans `.env` / Vercel :

```dotenv
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="billetterie@votre-domaine.fr"
SMTP_PASS="mot-de-passe-de-la-boite"
MAIL_FROM="Billetterie RC Lens <billetterie@votre-domaine.fr>"
ADMIN_EMAIL="billetterie@votre-domaine.fr"
APP_URL="https://votre-domaine.fr"
```

3. Sans `SMTP_USER`/`SMTP_PASS`, les e-mails sont **écrits dans les logs** et journalisés avec le statut `skipped` dans `email_log` : la commande aboutit quand même.

Chaque commande génère deux messages :

- **client** : récapitulatif, numéro de bon de commande, codes billets, lien de vérification ;
- **admin** : notification avec client, montant et billets.

Le statut de chaque envoi est consultable dans la table `email_log` (`sent`, `failed`, `skipped`).

---

## Déploiement Vercel + Neon

1. **Neon** : créez un projet PostgreSQL et copiez la chaîne de connexion (`postgresql://…?sslmode=require`). Le SSL est détecté automatiquement.
2. **Vercel** : importez le dépôt. `vercel.json` définit déjà :
   - `buildCommand: npm run build` (frontend Vite → `dist/`) ;
   - la fonction serverless `api/[...path].ts` qui réexporte l'application Express ;
   - la réécriture SPA vers `index.html` (hors `/api`) ;
   - une réécriture explicite `/api/(.*)` vers la fonction serverless. Elle est indispensable : le routage automatique généré par Vercel ne transmet que les chemins à **un seul segment** (`/api/health`), et renvoie un 404 pour les routes imbriquées (`/api/admin/login`, `/api/orders/guest`, `/api/events/:slug`).
3. **Variables d'environnement Vercel** : `DATABASE_URL`, `ADMIN_CODE`, `ADMIN_SESSION_SECRET`, `SMTP_*`, `MAIL_FROM`, `ADMIN_EMAIL`, `APP_URL`, `SEED_DEMO_DATA=false`.
4. Déployez. Au premier appel API, le schéma est créé automatiquement (initialisation mémoïsée, sans `setInterval` en serverless).

> Les URLs `/evenements`, `/verifier` et `/admin` sont servies par la réécriture SPA ; `/api/*` est routé vers la fonction serverless.

---

## Production locale

```bash
npm run build:all
npm start
```

`server.js` sert l'API **et** le frontend compilé depuis `dist/` sur le port `PORT`. Le serveur applique quelques en-têtes de sécurité de base (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).

Pour un déploiement réel, pensez à :

- servir l'application derrière HTTPS (cookie admin `Secure` automatique en production) ;
- définir `CORS_ORIGIN` si le frontend et l'API sont sur des domaines différents ;
- sauvegarder la base PostgreSQL (sauvegardes Neon) ;
- remplacer le paiement simulé par un prestataire (Stripe, Adyen…).

---

## Limites connues

- **Aucun paiement réel** : la commande est validée sans appel à un prestataire bancaire.
- Les comptes vendeurs et les annonces initiales sont des données de démonstration.
- Les QR codes contiennent une URL de vérification ; le scan à l'entrée se fait par saisie du code dans l'espace admin (pas de lecteur caméra intégré).
- L'application est prévue pour une démonstration avancée ; un audit de sécurité complémentaire reste recommandé avant une exploitation à grande échelle.
