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
