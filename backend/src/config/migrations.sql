-- Évolutions du schéma, rejouées sans risque à chaque démarrage (IF NOT EXISTS) :
-- une base déjà créée reçoit ainsi les nouvelles tables sans perdre ses données.

-- Notifications : le citoyen est prévenu de l'avancement de son signalement,
-- le chauffeur d'une tournée qui lui est confiée, les agents des urgences critiques.
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type       VARCHAR(40)  NOT NULL,
  titre      VARCHAR(150) NOT NULL,
  message    TEXT,
  lien       VARCHAR(255),
  lu         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, lu, created_at DESC);

-- Motif de rejet : le citoyen sait pourquoi son signalement n'a pas été retenu
ALTER TABLE signalements ADD COLUMN IF NOT EXISTS motif_rejet VARCHAR(255);

-- « Moi aussi » : un autre habitant confirme un dépôt déjà signalé au lieu de créer un doublon
CREATE TABLE IF NOT EXISTS signalement_soutiens (
  signalement_id UUID NOT NULL REFERENCES signalements(id) ON DELETE CASCADE,
  citoyen_id     UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (signalement_id, citoyen_id)
);

-- Mot de passe provisoire (compte créé ou réinitialisé par l'administrateur) : à changer à la connexion
ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS mdp_provisoire BOOLEAN NOT NULL DEFAULT FALSE;

-- Carte : nombre d'habitants concernés (déclarant + soutiens)
CREATE OR REPLACE VIEW signalements_carte AS
SELECT s.id, s.statut, s.urgence, s.description, s.photo_url, s.created_at,
  ST_X(s.localisation::geometry) AS longitude,
  ST_Y(s.localisation::geometry) AS latitude,
  z.nom AS zone_nom,
  u.nom || ' ' || u.prenom AS citoyen_nom,
  (SELECT count(*) FROM signalement_soutiens ss WHERE ss.signalement_id = s.id)::int AS nb_soutiens
FROM signalements s
LEFT JOIN zones z ON z.id = s.zone_id
LEFT JOIN utilisateurs u ON u.id = s.citoyen_id
WHERE s.statut != 'rejete';

-- Photos gardées dans la base (PHOTOS_STOCKAGE=base) : indispensable sur un hébergement
-- dont le disque est effacé à chaque redémarrage
CREATE TABLE IF NOT EXISTS photos (
  nom        VARCHAR(80) PRIMARY KEY,
  type       VARCHAR(30) NOT NULL,
  contenu    BYTEA NOT NULL,
  taille     INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Forme réelle de la rue entre deux carrefours ([[lat, lng], …], réseau OpenStreetMap) :
-- le tracé affiché suit les courbes au lieu d'aller en ligne droite d'un carrefour à l'autre
ALTER TABLE aretes_graphe ADD COLUMN IF NOT EXISTS trace JSONB;
