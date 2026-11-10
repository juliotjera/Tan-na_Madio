// Base de données : schéma, PostGIS, trigger de zone, vues, réseau routier de démonstration
const { db, preparer } = require('./aide')

beforeAll(() => preparer())
afterAll(() => db.fermer())

test('les 14 tables du projet existent (15 avec spatial_ref_sys de PostGIS)', async () => {
  const { rows } = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`)
  const tables = rows.map((r) => r.table_name)
  expect(tables).toHaveLength(15)
  expect(tables).toEqual(
    expect.arrayContaining([
      'utilisateurs', 'citoyens', 'agents_municipaux', 'chauffeurs', 'administrateurs', 'zones', 'camions', 'signalements',
      'noeuds_graphe', 'aretes_graphe', 'collectes', 'collecte_signalements', 'refresh_tokens', 'logs_activite', 'spatial_ref_sys',
    ]),
  )
})

test('PostGIS est actif (version 3)', async () => {
  const { rows } = await db.query(`SELECT extversion FROM pg_extension WHERE extname = 'postgis'`)
  expect(rows[0].extversion).toMatch(/^3\./)
})

test('trigger : chaque signalement est dans la zone qui lui est affectée', async () => {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM signalements WHERE zone_id IS NOT NULL')
  expect(rows[0].n).toBeGreaterThan(0)
  const { rows: hors } = await db.query(`
    SELECT count(*)::int AS n FROM signalements s JOIN zones z ON z.id = s.zone_id
     WHERE NOT ST_Within(s.localisation::geometry, z.geometrie::geometry)`)
  expect(hors[0].n).toBe(0)
})

test('trigger : déplacer un signalement change sa zone', async () => {
  const s = (await db.query(`SELECT s.id FROM signalements s JOIN zones z ON z.id = s.zone_id WHERE z.nom = 'Analakely' LIMIT 1`)).rows[0]
  await db.query(`UPDATE signalements SET localisation = ST_SetSRID(ST_MakePoint(47.53, -18.92), 4326)::geography WHERE id = $1`, [s.id])
  const { rows } = await db.query(`SELECT z.nom FROM signalements s JOIN zones z ON z.id = s.zone_id WHERE s.id = $1`, [s.id])
  expect(rows[0].nom).toBe('Isotry')
})

test('vues signalements_carte et statistiques_zones', async () => {
  const carte = await db.query('SELECT latitude, longitude FROM signalements_carte LIMIT 1')
  expect(Number(carte.rows[0].latitude)).toBeLessThan(0)
  const stats = await db.query('SELECT * FROM statistiques_zones')
  expect(stats.rows).toHaveLength(5)
})

test('distance PostGIS cohérente avec Haversine (≈ 0,94 km Analakely → Isotry)', async () => {
  const { rows } = await db.query(
    `SELECT ST_Distance(ST_SetSRID(ST_MakePoint(47.5361, -18.9137), 4326)::geography, ST_SetSRID(ST_MakePoint(47.53, -18.92), 4326)::geography) / 1000 AS km`,
  )
  expect(Number(rows[0].km)).toBeCloseTo(0.94, 1)
})

test('réseau routier connexe et pondéré', async () => {
  const { rows } = await db.query(`SELECT (SELECT count(*) FROM noeuds_graphe)::int AS noeuds, (SELECT count(*) FROM aretes_graphe)::int AS aretes,
                                          (SELECT min(distance_m) FROM aretes_graphe)::float AS min_m`)
  expect(rows[0].noeuds).toBeGreaterThan(100)
  expect(rows[0].aretes).toBeGreaterThan(rows[0].noeuds)
  expect(rows[0].min_m).toBeGreaterThan(0)
})

test('contraintes : e-mail unique, urgence hors énumération refusée', async () => {
  await expect(
    db.query(`INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role) VALUES ('a', 'b', 'admin@tananamadio.mg', 'x', 'citoyen')`),
  ).rejects.toThrow()
  await expect(db.query(`UPDATE signalements SET urgence = 'enorme' WHERE id = (SELECT id FROM signalements LIMIT 1)`)).rejects.toThrow()
})
