# Tanàna Madio

[![CI](https://github.com/juliotjera/Tan-na_Madio/actions/workflows/ci.yml/badge.svg)](https://github.com/juliotjera/Tan-na_Madio/actions/workflows/ci.yml)

Application web de **signalement des dépôts d’ordures** et de **collecte optimisée** pour la Commune urbaine d’Antananarivo.

Les citoyens signalent un dépôt (photo, position GPS, urgence) ; les agents municipaux valident les signalements et planifient des tournées dont l’itinéraire est calculé **par les rues** avec l’algorithme de **Dijkstra**, puis ordonné par un **algorithme glouton amélioré par 2-opt** ; les chauffeurs suivent la tournée et cochent chaque arrêt ; l’administrateur gère comptes, camions et zones, et suit les statistiques.

> Projet de fin d’études — JERA Bevala Juliot, ESMIA Innovation, 2025-2026.

## Fonctionnalités

| Rôle | Ce qu’il peut faire |
| --- | --- |
| **Citoyen** | Actions rapides · carte des signalements (filtres statut et urgence, rafraîchissement automatique, « Me géolocaliser ») · signaler un problème (description, adresse, urgence, latitude/longitude par GPS, carte ou recherche d’adresse, photo réduite avant l’envoi) · **détection des doublons** à moins de 50 m et bouton **« Moi aussi »** · motif affiché si un signalement est rejeté · historique en photos · suivi étape par étape · points éco et paliers (+2 envoi, +5 validation, +10 ramassage) · **classement Top Citoyens Écologiques** |
| **Agent municipal** | Tableau de bord (avec les **zones à desservir** : dépôts validés en attente et dernier passage plus ancien que la fréquence prévue, bouton « Planifier » sur la zone) · valider / rejeter les signalements (avec **motif** transmis au citoyen, nombre d’habitants qui confirment le dépôt) · **planifier une collecte en 4 étapes** : sélection (camion, chauffeur joignable par **WhatsApp ou appel**, zone et nombre de signalements disponibles, **mode mono-tournée Dijkstra ou plusieurs tournées gloutonnes**, date) → signalements (photo, adresse, déclarant, sélection automatique selon la capacité) → aperçu de la route (récapitulatif, carte légendée, gain) → confirmation · suivre et annuler les collectes · état de la flotte |
| **Chauffeur** | Tableau de bord (4 compteurs, tournée du jour, dernières tournées) · mes tournées (compteurs, filtres, en cours / historique) · **exécution de la tournée** : carte légendée avec tracé et arrêts numérotés, prochain arrêt mis en évidence, guidage GPS, « Marquer », progression X/N, fin de tournée avec poids · **mode hors ligne** : sans réseau, les points marqués restent sur le téléphone et partent au retour de la connexion |
| **Administrateur** | Actions rapides, **priorité du mois**, 5 indicateurs avec tendance et mini-graphique, signalements par statut, performance mensuelle, derniers signalements et collectes · comptes (compteurs, création du personnel, modification, activation, **mot de passe oublié** : mot de passe provisoire à changer à la connexion, suppression des comptes sans historique) · camions (CRUD, affectation des chauffeurs) · zones (cartes, tracé du contour dans une fenêtre, activation) · statistiques par période (évolution, zones, **carte des points noirs**, **performance des camions**) · exports CSV · **journal d’activité** filtrable |

Pour tous : interface **en français ou en malagasy**, barre latérale repliable (**Alt+M**), notifications (**Alt+N**), fil d’Ariane, **notifications en temps réel** (flux SSE, sans recharger la page) (signalement validé, rejeté, programmé, ramassé ; tournée confiée, terminée, annulée ; urgence critique), **application installable** sur téléphone et ouverture **hors ligne**, recherche d’adresse pour placer un signalement, exports CSV (ouvrables dans Excel) pour le personnel.

## Algorithmes

Le cœur du projet est dans [`backend/src/algorithms`](backend/src/algorithms) et [`backend/src/services`](backend/src/services) :

1. **Réseau routier** : un graphe pondéré orienté (tables `noeuds_graphe` / `aretes_graphe`) construit à partir des **vraies rues d’Antananarivo** (OpenStreetMap, script [`importerOsm.js`](backend/scripts/importerOsm.js)) : rues praticables par un camion, découpées aux carrefours, sens uniques respectés, forme de chaque rue gardée pour que le tracé affiché suive les courbes.
2. **Dijkstra avec tas binaire** (`dijkstra.js`, O((V + E) log V)) : depuis chaque point de la tournée, distance la plus courte par les rues vers tous les autres → matrice des distances réelles et tracés.
3. **Ordre de visite** (`glouton.js`) : plus proche voisin (glouton), puis amélioration **2-opt** ; le résultat n’est jamais plus long que l’ordre de sélection, et le **gain** est mesuré et affiché.
4. **Sélection par capacité** (glouton) : les signalements les plus urgents d’abord (à urgence égale, les plus confirmés par les habitants), sans dépasser la charge du camion.
5. **Analyse spatiale PostGIS** : doublons par `ST_DWithin` (index GIST) et points noirs par `ST_SnapToGrid`.

Sans réseau routier en base, l’API bascule sur une estimation (vol d’oiseau × 1,3) et l’indique (`methode: "estimation"`).

## Technologies

- **Backend** : Node.js, Express 4, PostgreSQL + **PostGIS** (géométries, trigger d’affectation de zone, vues), JWT (accès 15 min + renouvellement 7 j), bcrypt, Multer, Helmet, limitation de débit.
- **Photos** : sur le disque en développement, dans PostgreSQL en production (`PHOTOS_STOCKAGE=base`) pour survivre aux redémarrages d’un hébergement gratuit.
- **Base de développement** : **PGlite** (PostgreSQL 18 + PostGIS 3.6 compilés en WebAssembly) : le projet démarre **sans installer PostgreSQL**. En production, la même base SQL tourne sur un vrai serveur PostgreSQL/PostGIS.
- **Frontend** : React 18, Vite 5, Tailwind CSS 3, Leaflet / React-Leaflet (fond OpenStreetMap), Recharts, Axios, React Router 6, Framer Motion.
- **Identité visuelle** : vert émeraude (#10B981), fond menthe, cartes blanches, police Inter avec taille optique (coupe « Display » pour les grands titres), logo rond à épingle ; accueil sur une carte sombre animée d’Antananarivo, parcours « du signalement au ramassage » et vues de la ville en photo ; le rouge est réservé à l’urgence critique. Photos libres de droits (Unsplash), détaillées dans [`CREDITS.md`](CREDITS.md) ; les signalements de démonstration ont aussi leurs photos.
- **Application installable (PWA)** : manifeste, icônes, service worker (interface disponible sans réseau ; données toujours lues en direct).
- **Production** : compression des réponses, cache long des fichiers versionnés, journal des requêtes, migrations de base automatiques.
- **Qualité** : ESLint (frontend et backend), intégration continue GitHub Actions (vérification du code, tests de l’API et de l’interface, compilation à chaque envoi).
- **Tests** : Vitest côté interface (13 tests : mode hors ligne, formats, paliers), Jest + Supertest côté API (85 tests : algorithmes, authentification, signalements, collectes, notifications, photos, exports, base de données) et **Playwright de bout en bout** (12 parcours réels dans un navigateur : citoyen qui signale, agent qui valide et rejette, chauffeur qui fait sa tournée, administrateur, téléphone, hors connexion).

## Démarrage rapide

Prérequis : Node.js 20 ou plus récent.

```bash
npm run installer          # dépendances du backend et du frontend
npm run db:reset           # base PGlite + données de démonstration (Antananarivo)
npm run dev:api            # API sur http://localhost:3000
npm run dev:web            # interface sur http://localhost:5173 (autre terminal)
```

Comptes de démonstration (mot de passe `Admin2025!`, à changer hors démonstration) :

| Rôle | E-mail |
| --- | --- |
| Citoyen | citoyen@tananamadio.mg |
| Agent municipal | agent@tananamadio.mg |
| Chauffeur | chauffeur@tananamadio.mg (camion 123DT, tournée prévue demain) |
| Administrateur | admin@tananamadio.mg |

Les données de démonstration comprennent 5 zones (Analakely, Isotry, Ampefiloha, Ambohipo, Andravoahangy), le **réseau routier réel du centre d’Antananarivo** (1 761 carrefours, 2 141 tronçons importés d’OpenStreetMap, sens uniques compris), 3 camions, 13 comptes, 36 signalements et un historique de tournées.

### Avec un vrai PostgreSQL + PostGIS

Copiez `backend/.env.example` en `backend/.env` et renseignez `DATABASE_URL` (ou `DB_HOST`, `DB_USER`…). Le schéma ([`schema.sql`](backend/src/config/schema.sql)) est appliqué automatiquement au premier démarrage.

```bash
npm run db:sync --prefix backend      # vérifie la connexion et crée le schéma
npm run db:seed --prefix backend      # données de démonstration
# ou, en production, un seul administrateur :
ADMIN_EMAIL=... ADMIN_MOT_DE_PASSE=... npm run admin:create --prefix backend
```

## Tests

```bash
npm test
```

Chaque fichier de test démarre sa propre base PGlite en mémoire avec les données de démonstration : rien à configurer.

```bash
npm run build --prefix frontend
npm run e2e --prefix frontend      # parcours complets dans Chromium (Playwright)
npm run demo --prefix frontend     # enregistre une vidéo de démonstration (test-results/)
```

## Structure

```
backend/
  src/algorithms/     dijkstra.js (tas binaire), glouton.js (plus proche voisin, 2-opt, capacité)
  src/services/       grapheService.js (matrice des distances), collecteService.js (optimisation)
  src/config/         env, db (PostgreSQL ou PGlite), schema.sql, app Express
  src/controllers/    auth, signalements, collectes, camions, zones, stats, utilisateurs
  src/middleware/     auth (JWT), validate (rôles, UUID, champs), upload (photos), erreurs
  src/models/         accès SQL paramétré
  scripts/            seedDb, resetDb, syncDb, createAdmin, updateAdminPassword
  tests/              8 fichiers Jest
frontend/
  src/pages/          LandingPage, auth/, citoyen/, agent/, chauffeur/, admin/
  src/components/     map/ (carte, itinéraire, zones), layout/, common/
  src/api/            client Axios (renouvellement automatique du jeton) et appels
docs/API.md           référence de l’API
```

## Améliorations par rapport au cahier des charges

- **Vrai Dijkstra par les rues** : les distances viennent du réseau routier (et non du vol d’oiseau), et le tracé affiché suit les rues ; l’ordre est amélioré par 2-opt et le gain est mesuré.
- **Sélection automatique selon la capacité** du camion (algorithme glouton).
- **Sécurité** : inscription publique limitée aux citoyens (le personnel est créé par l’administrateur) ; jetons de renouvellement dans un **cookie httpOnly** (illisible par un script), stockés **hachés** (SHA-256) et **renouvelés à chaque usage** ; jeton d’accès gardé en mémoire seulement ; compte désactivé bloqué immédiatement ; secrets JWT obligatoires en production ; mots de passe bcrypt (12 tours) ; requêtes SQL paramétrées ; limitation des tentatives de connexion ; en-têtes Helmet ; photos renommées, limitées à 5 Mo et **vérifiées par leur signature** (un faux fichier renommé en .png est refusé) ; mots de passe provisoires générés aléatoirement et à usage unique.
- **Confidentialité** : un citoyen ne voit que ses propres signalements en liste ; le nom du déclarant n’apparaît sur la carte que pour le personnel ; la page d’accueil publique n’expose que des points anonymes.
- **Cohérence des données** : transactions pour chaque changement d’état (collecte, camion, signalements, points éco) ; un signalement ne peut pas être dans deux tournées ; les points non ramassés reviennent « validés » à la fin d’une tournée ; points de validation attribués une seule fois.
- **Journal d’activité** (`logs_activite`) consultable par l’administrateur.
- **Aucune installation de base nécessaire** en développement grâce à PGlite + PostGIS.

## Déploiement

Guide pas à pas : [`docs/DEPLOIEMENT.md`](docs/DEPLOIEMENT.md). Le fichier [`render.yaml`](render.yaml) décrit un service unique (l’API sert aussi l’interface compilée). Il faut une base PostgreSQL avec PostGIS (Neon, Supabase…) dans `DATABASE_URL`. Les photos sont gardées dans PostgreSQL (`PHOTOS_STOCKAGE=base`), donc conservées malgré le disque éphémère de l’offre gratuite.
