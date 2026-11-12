# API Tanàna Madio

Base : `/api` · Authentification : `Authorization: Bearer <token>` · Corps : JSON (sauf envoi de photo : `multipart/form-data`).

Erreurs : `{ "message": "…", "code": "CODE" }` avec les statuts 400 (données invalides), 401 (jeton absent, expiré `TOKEN_EXPIRE` ou invalide), 403 (rôle insuffisant `ROLE_INSUFFISANT`), 404, 409 (doublon), 422 (règle métier), 429 (trop de tentatives), 500.

## Authentification — `/api/auth`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| POST | `/register` | public | Inscription **citoyen** : `{ nom, prenom, email, mot_de_passe, telephone?, extras: { quartier? } }` → `{ token, refreshToken, user }`. Tout autre rôle → 403 `ROLE_NON_AUTORISE`. |
| POST | `/login` | public | `{ email, mot_de_passe }` → `{ token, refreshToken, user }` (20 essais / 15 min / adresse IP). `user.mdp_provisoire` : mot de passe donné par l’administrateur, à changer. |
| POST | `/refresh` | public | `{ refreshToken }` → `{ token, refreshToken }` : l’ancien jeton est révoqué (rotation) |
| POST | `/logout` | connecté | `{ refreshToken? }` : révoque ce jeton, ou toutes les sessions |
| GET | `/profil` | connecté | Profil complet (points éco, matricule, camion…) |
| PATCH | `/mot-de-passe` | connecté | `{ ancien, nouveau }` (différent de l’ancien) : ferme les autres sessions, lève `mdp_provisoire` |

Mot de passe : 8 caractères minimum, au moins une lettre et un chiffre.

## Signalements — `/api/signalements`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | connecté | Filtres `statut`, `urgence`, `zone_id`, `page`, `limit` (≤ 100). Urgences critiques en tête. Un citoyen ne reçoit que les siens. → `{ signalements, total, page, limit }` |
| GET | `/carte` | connecté | Signalements non rejetés (vue `signalements_carte`) ; `citoyen_nom` réservé au personnel |
| GET | `/mes` | citoyen | Signalements du citoyen connecté |
| GET | `/proximite` | connecté | `latitude`, `longitude`, `rayon?` (10 à 200 m, 50 par défaut) : signalements encore ouverts à proximité, avec `distance_m`, `nb_soutiens`, `deja_soutenu` (index GIST, `ST_DWithin`) |
| GET | `/motifs-rejet` | connecté | Motifs de rejet proposés aux agents |
| GET | `/:id` | connecté | Détail (un citoyen : seulement les siens), `nb_soutiens`, `motif_rejet` |
| POST | `/:id/soutien` | citoyen | « Moi aussi » : confirme le dépôt signalé par un autre habitant (une fois par personne, pas sur le sien). À urgence égale, les dépôts les plus confirmés passent d’abord dans la sélection des tournées. |
| POST | `/` | citoyen | multipart : `latitude`, `longitude`, `urgence` (faible, moyen, eleve, critique), `description?`, `adresse?`, `photo?` (JPEG/PNG/WebP, 5 Mo, contenu vérifié par signature). Photo ou description obligatoire. Zone affectée par trigger PostGIS. +2 points. |
| PATCH | `/:id/statut` | agent, admin | `{ statut, motif? }` : en_attente ↔ valide ↔ rejete. Validation : +5 points (une seule fois). Le motif de rejet est montré au citoyen. |
| DELETE | `/:id` | citoyen (le sien, en attente), admin | Supprime le signalement et sa photo |

## Collectes — `/api/collectes`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | agent, admin, chauffeur | Filtres `statut`, `camion_id`, `zone_id`, `page`. Un chauffeur ne voit que les tournées de son camion. |
| GET | `/:id` | agent, admin, chauffeur | Détail, itinéraire et signalements dans l’ordre de passage |
| POST | `/suggestion` | agent, admin | `{ camion_id, zone_id? }` → sélection gloutonne des validés les plus urgents dans la capacité du camion |
| POST | `/optimiser` | agent, admin | `{ signalement_ids, camion_id? }` → `{ ordre_optimal, distance_km, distance_naive_km, gain_pourcent, duree_estimee_min, methode, depart, itineraire, trace, trace_naive }`. Rien n’est enregistré. |
| POST | `/` | agent, admin | `{ camion_id, date_planifiee, signalement_ids, zone_id?, notes? }` : itinéraire recalculé côté serveur ; camion → en_tournee, signalements → en_cours |
| PATCH | `/:id/demarrer` | chauffeur du camion, admin | planifiee → en_cours |
| PATCH | `/:id/signalements/:sid` | chauffeur du camion, admin | Point collecté : signalement → collecte, +10 points au citoyen |
| PATCH | `/:id/terminer` | chauffeur du camion, admin | `{ poids_collecte_kg?, distance_km? }` : camion → disponible, points non ramassés → valide |
| PATCH | `/:id/annuler` | agent, admin | Seulement si planifiée : camion et signalements libérés |

## Camions — `/api/camions`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | personnel | Filtre `statut` → `{ camions }` |
| GET | `/:id` | personnel | Détail |
| POST | `/` | admin | `{ immatriculation, capacite_kg, modele?, chauffeur_id?, latitude?, longitude? }` |
| PUT | `/:id` | admin | Champs modifiables, affectation du chauffeur (les deux côtés tenus à jour) ; « en_tournee » est réservé aux collectes |
| DELETE | `/:id` | admin | Refusé si en tournée ou s’il a un historique |

## Zones — `/api/zones`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | connecté | `{ zones }` avec contour GeoJSON, centre, `nb_signalements`, `nb_a_traiter` |
| GET | `/:id` | connecté | Détail |
| POST | `/` | admin | `{ nom, description?, frequence_collecte_jours?, points: [[lat, lng], …] }` (3 points minimum) |
| PUT | `/:id` | admin | Mêmes champs, `actif` |
| DELETE | `/:id` | admin | Les signalements sont conservés, sans zone |

## Statistiques — `/api/stats`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/public` | public | Chiffres globaux, points anonymes (statut, urgence, position arrondie), meilleure tournée |
| GET | `/dashboard` | agent, admin | Compteurs, `taux_reussite`, `delai_moyen_heures`, poids et distance totaux |
| GET | `/zones` | agent, admin | Vue `statistiques_zones` |
| GET | `/points-noirs` | agent, admin | `jours` (7 à 365, 90 par défaut) : signalements regroupés sur une grille d’environ 200 m (`ST_SnapToGrid`), cases d’au moins 2 signalements, avec `total`, `ouverts`, `urgents`, zone et date du dernier |
| GET | `/top-citoyens` | connecté | 5 meilleurs citoyens (prénom et initiale, points éco) |
| GET | `/camions` | agent, admin | Performance des camions (collectes, km, kg, efficacité) |
| GET | `/periode` | admin | `debut`, `fin` (30 derniers jours par défaut) : séries par jour (par semaine au-delà de 90 jours) et répartition des urgences |

## Utilisateurs — `/api/utilisateurs`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | admin | Filtres `role`, `q` (recherche), `page`, `limit` |
| GET | `/journal` | admin | Journal d’activité : filtres `action`, `entite`, `q` (auteur), `page` → `{ logs, total, actions }` |
| POST | `/` | admin | Création d’un compte de tout rôle : `extras.matricule` (agent), `extras.numero_permis` et `extras.camion_id?` (chauffeur) |
| GET | `/:id` | admin | Profil complet |
| PUT | `/:id` | admin, ou l’utilisateur lui-même | `nom`, `prenom`, `telephone`, `quartier` ; `zone_id` (admin) |
| PATCH | `/:id/activer` | admin | `{ actif }` : un compte désactivé est déconnecté immédiatement |
| POST | `/:id/mot-de-passe` | admin | Mot de passe oublié : génère un mot de passe provisoire (renvoyé une seule fois), ferme les sessions ; la personne devra le changer |
| DELETE | `/:id` | admin | Compte sans historique uniquement (sinon : désactiver), jamais le sien |

## Notifications — `/api/notifications`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | connecté | `limit` (≤ 50), `non_lues=true` → `{ notifications, non_lues }` |
| PATCH | `/:id/lu` | connecté | Marque une notification comme lue (seulement les siennes) |
| PATCH | `/tout-lu` | connecté | Marque tout comme lu |

Envoyées automatiquement : urgence critique (agents et admins), signalement validé / rejeté / programmé / ramassé (citoyen), tournée confiée / annulée (chauffeur), tournée terminée (agent qui l’a planifiée).

## Exports CSV — `/api/exports`

Réservés aux agents et administrateurs. Fichiers UTF-8 avec séparateur « ; » (ouverture directe dans Excel).

| Méthode | Route | Filtres |
| --- | --- | --- |
| GET | `/signalements.csv` | `statut`, `urgence`, `zone_id`, `debut`, `fin` |
| GET | `/collectes.csv` | `statut`, `debut`, `fin` (distances, gain, poids, horaires) |

## Divers

- `GET /api/sante` : état de l’API et de la base.
- `GET /uploads/<fichier>` : photos des signalements.
