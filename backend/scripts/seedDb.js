// Données de démonstration : zones d'Antananarivo, réseau routier (Dijkstra), comptes, camions,
// signalements et historique de collectes. Reproductible : même tirage à chaque exécution.
//   npm run db:seed          (base vide)
//   npm run db:reset         (vide la base puis relance ce script)
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')
const config = require('../src/config/env')
const db = require('../src/config/db')
const { haversine, polygoneWkt, carre } = require('../src/utils/geoUtils')
const { optimiser } = require('../src/services/collecteService')

const MOT_DE_PASSE_DEMO = 'Admin2025!'

// Générateur pseudo-aléatoire à graine fixe (mulberry32)
function generateur(graine) {
  let a = graine
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ZONES = [
  { nom: 'Analakely', lat: -18.9137, lng: 47.5361, description: 'Centre-ville, marché et avenue de l’Indépendance', frequence: 2 },
  { nom: 'Isotry', lat: -18.92, lng: 47.53, description: 'Quartier populaire dense, bord du canal Andriantany', frequence: 3 },
  { nom: 'Ampefiloha', lat: -18.905, lng: 47.54, description: 'Quartier résidentiel et administratif', frequence: 5 },
  { nom: 'Ambohipo', lat: -18.918, lng: 47.55, description: 'Cité universitaire et habitations', frequence: 7 },
  { nom: 'Andravoahangy', lat: -18.8985, lng: 47.53, description: 'Grand marché et commerces de gros', frequence: 3 },
]
const COTE_ZONE_KM = 0.7

const UTILISATEURS = [
  { role: 'administrateur', nom: 'Admin', prenom: 'Système', email: 'admin@tananamadio.mg', extras: { niveau: 3 } },
  { role: 'agent_municipal', nom: 'Rabe', prenom: 'Hery', email: 'agent@tananamadio.mg', telephone: '034 11 222 33', extras: { matricule: 'CUA-AG-001', zone: 'Analakely' } },
  { role: 'agent_municipal', nom: 'Randria', prenom: 'Fara', email: 'agent2@tananamadio.mg', extras: { matricule: 'CUA-AG-002', zone: 'Isotry' } },
  { role: 'chauffeur', nom: 'Rakotobe', prenom: 'Naina', email: 'chauffeur@tananamadio.mg', telephone: '033 44 555 66', extras: { numero_permis: 'MG-C-104522', camion: '123DT' } },
  { role: 'chauffeur', nom: 'Andriamasy', prenom: 'Tojo', email: 'chauffeur2@tananamadio.mg', telephone: '034 22 333 44', extras: { numero_permis: 'MG-C-208761', camion: 'BIBILY' } },
  { role: 'chauffeur', nom: 'Razafy', prenom: 'Mamy', email: 'chauffeur3@tananamadio.mg', telephone: '038 66 777 88', extras: { numero_permis: 'MG-C-317004', camion: 'COSOVOO' } },
  { role: 'citoyen', nom: 'Rakoto', prenom: 'Jean', email: 'citoyen@tananamadio.mg', telephone: '032 12 345 67', extras: { quartier: 'Analakely' } },
  { role: 'citoyen', nom: 'Rasoa', prenom: 'Lalao', email: 'lalao.rasoa@example.mg', extras: { quartier: 'Isotry' } },
  { role: 'citoyen', nom: 'Rajaonarison', prenom: 'Mialy', email: 'mialy.r@example.mg', extras: { quartier: 'Ampefiloha' } },
  { role: 'citoyen', nom: 'Ravelo', prenom: 'Fidy', email: 'fidy.ravelo@example.mg', extras: { quartier: 'Ambohipo' } },
  { role: 'citoyen', nom: 'Rahaingo', prenom: 'Voahirana', email: 'voahirana@example.mg', extras: { quartier: 'Andravoahangy' } },
  { role: 'citoyen', nom: 'Andrianina', prenom: 'Toky', email: 'toky.a@example.mg', extras: { quartier: 'Isotry' } },
  { role: 'citoyen', nom: 'Ramanantsoa', prenom: 'Nirina', email: 'nirina.r@example.mg', extras: { quartier: 'Analakely' } },
]

const CAMIONS = [
  { immatriculation: '123DT', modele: 'Renault Maxity', capacite_kg: 1300, lat: -18.9152, lng: 47.5335 },
  { immatriculation: 'BIBILY', modele: 'Suzuki Carry', capacite_kg: 1000, lat: -18.9195, lng: 47.5275 },
  { immatriculation: 'COSOVOO', modele: 'Nissan Condor', capacite_kg: 15000, lat: -18.9015, lng: 47.5325 },
]

const DESCRIPTIONS = [
  'Tas d’ordures devant l’entrée du marché',
  'Bac à ordures plein qui déborde sur le trottoir',
  'Dépôt sauvage au bord du canal, odeur forte',
  'Sacs plastiques et déchets bouchant le caniveau',
  'Déchets de chantier abandonnés (gravats, sacs de ciment)',
  'Ordures ménagères brûlées sur place, fumée',
  'Déchets de légumes et de fruits après le marché',
  'Carcasses et pneus usagés au coin de la rue',
  'Poubelle publique renversée, déchets éparpillés',
  'Tas d’ordures près de l’école primaire',
  'Déchets dans l’escalier entre deux quartiers',
  'Gros dépôt près de l’arrêt de taxi-be',
]
// Photo de démonstration associée à chaque description (photos Unsplash, voir CREDITS.md)
const PHOTOS = {
  'Tas d’ordures devant l’entrée du marché': 'depot-02.jpg',
  'Bac à ordures plein qui déborde sur le trottoir': 'depot-08.jpg',
  'Dépôt sauvage au bord du canal, odeur forte': 'depot-03.jpg',
  'Sacs plastiques et déchets bouchant le caniveau': 'depot-06.jpg',
  'Déchets de chantier abandonnés (gravats, sacs de ciment)': 'depot-01.jpg',
  'Ordures ménagères brûlées sur place, fumée': 'depot-10.jpg',
  'Déchets de légumes et de fruits après le marché': 'depot-04.jpg',
  'Carcasses et pneus usagés au coin de la rue': 'depot-09.jpg',
  'Poubelle publique renversée, déchets éparpillés': 'depot-07.jpg',
  'Gros dépôt près de l’arrêt de taxi-be': 'depot-05.jpg',
}

// Copie les photos de démonstration dans le dossier des envois et les rattache aux signalements
async function photosDemo() {
  const source = path.join(__dirname, 'photos-demo')
  fs.mkdirSync(config.upload.dossier, { recursive: true })
  for (const [description, fichier] of Object.entries(PHOTOS)) {
    const origine = path.join(source, fichier)
    if (!fs.existsSync(origine)) continue
    fs.copyFileSync(origine, path.join(config.upload.dossier, `demo-${fichier}`))
    await db.query('UPDATE signalements SET photo_url = $2 WHERE description = $1', [description, `/uploads/demo-${fichier}`])
  }
}

const RUES = ['Avenue de l’Indépendance', 'Rue Rainitovo', 'Rue Ratsimilaho', 'Lalana Andrianampoinimerina', 'Escalier Ambondrona', 'Rue Ramanantsoa', 'Lalana Rakoto Frah', 'Boulevard Ratsimandrava']

// ── Réseau routier : quadrillage irrégulier, rues manquantes, quelques grands axes en diagonale ──
function reseauRoutier(alea) {
  const PAS = 0.0025 // ≈ 270 m entre deux carrefours
  const lat0 = -18.928
  const lng0 = 47.521
  const lignes = 16
  const colonnes = 16
  const noeuds = []
  const grille = []
  for (let r = 0; r < lignes; r++) {
    grille[r] = []
    for (let c = 0; c < colonnes; c++) {
      // pâtés de maisons sans carrefour (collines, lac, bâtiments)
      if (alea() < 0.07) {
        grille[r][c] = null
        continue
      }
      const n = { index: noeuds.length, nom: `Carrefour ${String.fromCharCode(65 + r)}${c + 1}`, lat: lat0 + r * PAS + (alea() - 0.5) * PAS * 0.35, lng: lng0 + c * PAS + (alea() - 0.5) * PAS * 0.35 }
      noeuds.push(n)
      grille[r][c] = n
    }
  }
  const aretes = []
  const relier = (a, b, sinuosite) => {
    if (!a || !b) return
    const m = haversine(a.lat, a.lng, b.lat, b.lng) * 1000 * sinuosite
    // une rue sur huit est à sens unique
    aretes.push({ source: a.index, dest: b.index, distance_m: Math.round(m * 100) / 100, temps_min: Math.round((m / 1000 / 18) * 60 * 100) / 100, bidirectionnel: alea() > 0.12 })
  }
  for (let r = 0; r < lignes; r++)
    for (let c = 0; c < colonnes; c++) {
      const n = grille[r][c]
      if (!n) continue
      if (c + 1 < colonnes && alea() > 0.1) relier(n, grille[r][c + 1], 1.05 + alea() * 0.3)
      if (r + 1 < lignes && alea() > 0.1) relier(n, grille[r + 1][c], 1.05 + alea() * 0.3)
      if (r + 1 < lignes && c + 1 < colonnes && alea() < 0.12) relier(n, grille[r + 1][c + 1], 1.02 + alea() * 0.1)
    }

  // on ne garde que la plus grande partie connexe (pas de carrefour isolé)
  const voisins = new Map(noeuds.map((n) => [n.index, []]))
  for (const a of aretes) {
    voisins.get(a.source).push(a.dest)
    voisins.get(a.dest).push(a.source)
  }
  const vus = new Set()
  let meilleure = []
  for (const n of noeuds) {
    if (vus.has(n.index)) continue
    const partie = []
    const pile = [n.index]
    vus.add(n.index)
    while (pile.length) {
      const i = pile.pop()
      partie.push(i)
      for (const v of voisins.get(i)) if (!vus.has(v)) vus.add(v) && pile.push(v)
    }
    if (partie.length > meilleure.length) meilleure = partie
  }
  const gardes = new Set(meilleure)
  return { noeuds: noeuds.filter((n) => gardes.has(n.index)), aretes: aretes.filter((a) => gardes.has(a.source) && gardes.has(a.dest)) }
}

const jours = (n) => new Date(Date.now() - n * 86400000)

async function seed({ journal = console.log } = {}) {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM utilisateurs')
  if (rows[0].n > 0) throw new Error('La base contient déjà des données : utilisez « npm run db:reset » pour repartir de zéro')
  const alea = generateur(2026)

  // Zones (polygones) : le trigger de la base affectera chaque signalement à sa zone
  const zones = {}
  for (const z of ZONES) {
    const wkt = polygoneWkt(carre(z.lat, z.lng, COTE_ZONE_KM))
    const r = await db.query(
      `INSERT INTO zones (nom, description, frequence_collecte_jours, geometrie, centroide)
       VALUES ($1, $2, $3, ST_GeogFromText($4), ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography) RETURNING id`,
      [z.nom, z.description, z.frequence, wkt, z.lng, z.lat],
    )
    zones[z.nom] = { ...z, id: r.rows[0].id }
  }
  journal(`${ZONES.length} zones`)

  // Réseau routier (insertion groupée)
  const { noeuds, aretes } = reseauRoutier(alea)
  const idsNoeuds = (
    await db.query(
      `INSERT INTO noeuds_graphe (nom, position)
       SELECT nom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography FROM unnest($1::text[], $2::float8[], $3::float8[]) AS t(nom, lat, lng)
       RETURNING id`,
      [noeuds.map((n) => n.nom), noeuds.map((n) => n.lat), noeuds.map((n) => n.lng)],
    )
  ).rows.map((r) => r.id)
  const idParIndex = new Map(noeuds.map((n, i) => [n.index, idsNoeuds[i]]))
  await db.query(
    `INSERT INTO aretes_graphe (noeud_source, noeud_dest, distance_m, temps_min, bidirectionnel)
     SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::numeric[], $4::numeric[], $5::boolean[])`,
    [aretes.map((a) => idParIndex.get(a.source)), aretes.map((a) => idParIndex.get(a.dest)), aretes.map((a) => a.distance_m), aretes.map((a) => a.temps_min), aretes.map((a) => a.bidirectionnel)],
  )
  await db.query(`UPDATE noeuds_graphe n SET zone_id = z.id FROM zones z WHERE ST_Within(n.position::geometry, z.geometrie::geometry)`)
  journal(`réseau routier : ${noeuds.length} carrefours, ${aretes.length} tronçons`)

  // Camions
  const camions = {}
  for (const c of CAMIONS) {
    const r = await db.query(
      `INSERT INTO camions (immatriculation, modele, capacite_kg, position_actuelle, derniere_maintenance)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6) RETURNING id`,
      [c.immatriculation, c.modele, c.capacite_kg, c.lng, c.lat, jours(20 + Math.floor(alea() * 60)).toISOString()],
    )
    camions[c.immatriculation] = r.rows[0].id
  }

  // Comptes (même mot de passe de démonstration, à changer après la première connexion)
  const hash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 12)
  const comptes = {}
  for (const u of UTILISATEURS) {
    const id = await db.transaction(async (tx) => {
      const r = await tx.query(
        `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [u.nom, u.prenom, u.email, hash, u.role, u.telephone ?? null, jours(45 + Math.floor(alea() * 30)).toISOString()],
      )
      const uid = r.rows[0].id
      if (u.role === 'citoyen') await tx.query('INSERT INTO citoyens (id, quartier) VALUES ($1, $2)', [uid, u.extras.quartier])
      if (u.role === 'agent_municipal') await tx.query('INSERT INTO agents_municipaux (id, matricule, zone_id) VALUES ($1, $2, $3)', [uid, u.extras.matricule, zones[u.extras.zone].id])
      if (u.role === 'administrateur') await tx.query('INSERT INTO administrateurs (id, niveau) VALUES ($1, $2)', [uid, u.extras.niveau])
      if (u.role === 'chauffeur') {
        const camionId = camions[u.extras.camion]
        await tx.query('INSERT INTO chauffeurs (id, numero_permis, camion_id) VALUES ($1, $2, $3)', [uid, u.extras.numero_permis, camionId])
        await tx.query('UPDATE camions SET chauffeur_id = $1 WHERE id = $2', [uid, camionId])
      }
      return uid
    })
    comptes[u.email] = { ...u, id }
  }
  journal(`${UTILISATEURS.length} comptes (mot de passe de démonstration : ${MOT_DE_PASSE_DEMO})`)

  // Signalements : 36, répartis dans les zones, sur les 30 derniers jours
  const citoyens = UTILISATEURS.filter((u) => u.role === 'citoyen').map((u) => comptes[u.email].id)
  const agent = comptes['agent@tananamadio.mg'].id
  const urgences = ['faible', 'moyen', 'moyen', 'eleve', 'eleve', 'critique']
  const signalements = []
  for (let i = 0; i < 36; i++) {
    const z = ZONES[i % ZONES.length]
    const demi = (COTE_ZONE_KM / 2 / 111.32) * 0.85
    const cree = jours(Math.floor(alea() * 30) + alea())
    const r = await db.query(
      `INSERT INTO signalements (citoyen_id, localisation, adresse, description, urgence, created_at)
       VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, $5, $6, $7) RETURNING id`,
      [
        citoyens[i % citoyens.length],
        z.lng + (alea() * 2 - 1) * demi,
        z.lat + (alea() * 2 - 1) * demi,
        `${RUES[Math.floor(alea() * RUES.length)]}, ${z.nom}`,
        DESCRIPTIONS[Math.floor(alea() * DESCRIPTIONS.length)],
        urgences[Math.floor(alea() * urgences.length)],
        cree.toISOString(),
      ],
    )
    signalements.push({ id: r.rows[0].id, cree, zone: z.nom, citoyen: citoyens[i % citoyens.length] })
  }
  signalements.sort((a, b) => a.cree - b.cree)

  // Les plus anciens ont été validés (délai de validation de 1 à 10 h)
  const valider = async (s, statut = 'valide') => {
    const validation = new Date(s.cree.getTime() + (1 + alea() * 9) * 3600000)
    await db.query(`UPDATE signalements SET statut = $2, valide_par = $3, date_validation = $4 WHERE id = $1`, [s.id, statut, agent, validation.toISOString()])
  }
  const historiques = signalements.slice(0, 16) // seront collectés
  const aPlanifier = signalements.slice(16, 28) // validés, en attente de tournée (démonstration de l'optimisation)
  const rejetes = signalements.slice(28, 30)
  // dans la file de validation, deux urgences critiques
  for (const s of signalements.slice(-2)) await db.query(`UPDATE signalements SET urgence = 'critique' WHERE id = $1`, [s.id])
  for (const s of [...historiques, ...aPlanifier]) await valider(s)
  for (const s of rejetes) await valider(s, 'rejete')
  // les 6 derniers restent « en_attente » (file de validation de l'agent)

  // Historique : 4 tournées terminées de 4 points, itinéraires calculés par l'optimiseur
  const immatriculations = Object.keys(camions)
  for (let t = 0; t < 4; t++) {
    const lot = historiques.slice(t * 4, t * 4 + 4)
    const camionId = camions[immatriculations[t % immatriculations.length]]
    const plan = await optimiser({ signalement_ids: lot.map((s) => s.id), camion_id: camionId })
    const debut = new Date(Math.max(...lot.map((s) => s.cree.getTime())) + 24 * 3600000)
    const fin = new Date(debut.getTime() + plan.duree_estimee_min * 60000)
    const r = await db.query(
      `INSERT INTO collectes (camion_id, agent_id, zone_id, statut, date_planifiee, date_debut, date_fin, itineraire, distance_km,
                              nb_signalements_traites, poids_collecte_kg, created_at)
       VALUES ($1, $2, $3, 'terminee', $4, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [camionId, agent, zones[lot[0].zone].id, debut.toISOString(), fin.toISOString(), JSON.stringify(plan), plan.distance_km, lot.length, 180 + Math.round(alea() * 520), new Date(debut.getTime() - 12 * 3600000).toISOString()],
    )
    for (const [i, sid] of plan.ordre_optimal.entries()) {
      await db.query('INSERT INTO collecte_signalements (collecte_id, signalement_id, ordre, collecte_fait) VALUES ($1, $2, $3, TRUE)', [r.rows[0].id, sid, i + 1])
    }
    await db.query(`UPDATE signalements SET statut = 'collecte' WHERE id = ANY($1::uuid[])`, [plan.ordre_optimal])
  }

  // Une tournée planifiée pour demain, affectée au camion du chauffeur de démonstration
  const prochains = aPlanifier.slice(0, 4)
  const planDemain = await optimiser({ signalement_ids: prochains.map((s) => s.id), camion_id: camions['123DT'] })
  const demain = new Date()
  demain.setDate(demain.getDate() + 1)
  demain.setHours(7, 30, 0, 0)
  const prevue = await db.query(
    `INSERT INTO collectes (camion_id, agent_id, zone_id, date_planifiee, itineraire, distance_km, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [camions['123DT'], agent, zones[prochains[0].zone].id, demain.toISOString(), JSON.stringify(planDemain), planDemain.distance_km, 'Commencer avant l’ouverture du marché.'],
  )
  for (const [i, sid] of planDemain.ordre_optimal.entries()) {
    await db.query('INSERT INTO collecte_signalements (collecte_id, signalement_id, ordre) VALUES ($1, $2, $3)', [prevue.rows[0].id, sid, i + 1])
  }
  await db.query(`UPDATE signalements SET statut = 'en_cours' WHERE id = ANY($1::uuid[])`, [planDemain.ordre_optimal])
  await db.query(`UPDATE camions SET statut = 'en_tournee' WHERE id = $1`, [camions['123DT']])

  // Points éco cohérents avec l'historique : +2 soumis, +5 validé, +10 collecté
  await db.query(`
    UPDATE citoyens c SET points_eco = COALESCE((
      SELECT sum(2 + CASE WHEN s.date_validation IS NOT NULL AND s.statut <> 'rejete' THEN 5 ELSE 0 END
                   + CASE WHEN s.statut = 'collecte' THEN 10 ELSE 0 END)
        FROM signalements s WHERE s.citoyen_id = c.id), 0)`)

  await photosDemo()

  // Motifs des signalements rejetés, et quelques « Moi aussi » d'habitants voisins
  await db.query(`UPDATE signalements SET motif_rejet = 'Doublon d’un autre signalement' WHERE statut = 'rejete'`)
  await db.query(`
    INSERT INTO signalement_soutiens (signalement_id, citoyen_id, created_at)
    SELECT s.id, c.id, s.created_at + interval '3 hours'
      FROM (SELECT id, citoyen_id, created_at FROM signalements WHERE statut IN ('en_attente', 'valide') AND urgence IN ('eleve', 'critique') ORDER BY created_at LIMIT 4) s
      JOIN LATERAL (SELECT u.id FROM utilisateurs u WHERE u.role = 'citoyen' AND u.id <> s.citoyen_id ORDER BY u.email LIMIT 2) c ON TRUE
    ON CONFLICT DO NOTHING`)

  // Journal d'activité reconstitué à partir de l'historique (déclarations, validations, tournées)
  await db.query(`
    INSERT INTO logs_activite (user_id, action, entite, entite_id, details, created_at)
    SELECT citoyen_id, 'creation', 'signalement', id, jsonb_build_object('urgence', urgence), created_at FROM signalements
    UNION ALL
    SELECT valide_par, 'changement_statut', 'signalement', id,
           jsonb_strip_nulls(jsonb_build_object('de', 'en_attente', 'vers', CASE WHEN statut = 'rejete' THEN 'rejete' ELSE 'valide' END, 'motif', motif_rejet)),
           date_validation FROM signalements WHERE valide_par IS NOT NULL
    UNION ALL
    SELECT agent_id, 'creation', 'collecte', id, NULL, created_at FROM collectes
    UNION ALL
    SELECT cam.chauffeur_id, 'fin', 'collecte', c.id, jsonb_build_object('points_collectes', c.nb_signalements_traites, 'poids_collecte_kg', c.poids_collecte_kg), c.date_fin
      FROM collectes c JOIN camions cam ON cam.id = c.camion_id WHERE c.statut = 'terminee' AND c.date_fin IS NOT NULL`)

  journal('36 signalements, 5 collectes (4 terminées, 1 planifiée pour demain)')
}

module.exports = { seed, MOT_DE_PASSE_DEMO }

if (require.main === module) {
  const debut = Date.now()
  seed()
    .then(() => console.log(`Données de démonstration créées en ${((Date.now() - debut) / 1000).toFixed(1)} s`))
    .catch((erreur) => {
      console.error(erreur.message)
      process.exitCode = 1
    })
    .finally(() => db.fermer())
}
