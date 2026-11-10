# API Tanàna Madio

Base : `/api` · Authentification : `Authorization: Bearer <token>` · Corps : JSON (sauf envoi de photo : `multipart/form-data`).

Erreurs : `{ "message": "…", "code": "CODE" }` avec les statuts 400 (données invalides), 401 (jeton absent, expiré `TOKEN_EXPIRE` ou invalide), 403 (rôle insuffisant `ROLE_INSUFFISANT`), 404, 409 (doublon), 422 (règle métier), 429 (trop de tentatives), 500.

## Authentification — `/api/auth`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| POST | `/register` | public | Inscription **citoyen** : `{ nom, prenom, email, mot_de_passe, telephone?, extras: { quartier? } }` → `{ token, refreshToken, user }`. Tout autre rôle → 403 `ROLE_NON_AUTORISE`. |
| POST | `/login` | public | `{ email, mot_de_passe }` → `{ token, refreshToken, user }` (20 essais / 15 min / adresse IP) |
| POST | `/refresh` | public | `{ refreshToken }` → `{ token, refreshToken }` : l’ancien jeton est révoqué (rotation) |
| POST | `/logout` | connecté | `{ refreshToken? }` : révoque ce jeton, ou toutes les sessions |
| GET | `/profil` | connecté | Profil complet (points éco, matricule, camion…) |
| PATCH | `/mot-de-passe` | connecté | `{ ancien, nouveau }` : ferme les autres sessions |

Mot de passe : 8 caractères minimum, au moins une lettre et un chiffre.

## Signalements — `/api/signalements`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | connecté | Filtres `statut`, `urgence`, `zone_id`, `page`, `limit` (≤ 100). Urgences critiques en tête. Un citoyen ne reçoit que les siens. → `{ signalements, total, page, limit }` |
| GET | `/carte` | connecté | Signalements non rejetés (vue `signalements_carte`) ; `citoyen_nom` réservé au personnel |
| GET | `/mes` | citoyen | Signalements du citoyen connecté |
| GET | `/:id` | connecté | Détail (un citoyen : seulement les siens) |
| POST | `/` | citoyen | multipart : `latitude`, `longitude`, `urgence` (faible, moyen, eleve, critique), `description?`, `adresse?`, `photo?` (JPEG/PNG/WebP, 5 Mo). Photo ou description obligatoire. Zone affectée par trigger PostGIS. +2 points. |
| PATCH | `/:id/statut` | agent, admin | `{ statut }` : en_attente ↔ valide ↔ rejete. Validation : +5 points (une seule fois). |
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
| GET | `/periode` | admin | `debut`, `fin` (30 derniers jours par défaut) : séries par jour (par semaine au-delà de 90 jours) et répartition des urgences |

## Utilisateurs — `/api/utilisateurs`

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/` | admin | Filtres `role`, `q` (recherche), `page`, `limit` |
| GET | `/journal` | admin | Journal d’activité (`logs_activite`) |
| POST | `/` | admin | Création d’un compte de tout rôle : `extras.matricule` (agent), `extras.numero_permis` et `extras.camion_id?` (chauffeur) |
| GET | `/:id` | admin | Profil complet |
| PUT | `/:id` | admin, ou l’utilisateur lui-même | `nom`, `prenom`, `telephone`, `quartier` ; `zone_id` (admin) |
| PATCH | `/:id/activer` | admin | `{ actif }` : un compte désactivé est déconnecté immédiatement |

## Divers

- `GET /api/sante` : état de l’API et de la base.
- `GET /uploads/<fichier>` : photos des signalements.
