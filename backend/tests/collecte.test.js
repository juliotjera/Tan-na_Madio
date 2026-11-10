// Collectes : optimisation (Dijkstra + glouton + 2-opt), planification, tournée du chauffeur, annulation
const { app, request, db, preparer, connecter } = require('./aide')

let agent, chauffeur, chauffeur2, valides, camionLibre
beforeAll(async () => {
  await preparer()
  agent = await connecter('agent@tananamadio.mg')
  chauffeur = await connecter('chauffeur2@tananamadio.mg') // camion BIBILY
  chauffeur2 = await connecter('chauffeur3@tananamadio.mg') // camion COSOVOO
  valides = (await request(app).get('/api/signalements?statut=valide&limit=100').set(agent.entete)).body.signalements
  const camions = (await request(app).get('/api/camions?statut=disponible').set(agent.entete)).body.camions
  camionLibre = camions.find((c) => c.immatriculation === 'BIBILY')
})
afterAll(() => db.fermer())

const statutSignalement = async (id) => (await db.query('SELECT statut FROM signalements WHERE id = $1', [id])).rows[0].statut
const statutCamion = async (id) => (await db.query('SELECT statut FROM camions WHERE id = $1', [id])).rows[0].statut
const pointsEco = async (id) => (await db.query('SELECT points_eco FROM citoyens WHERE id = $1', [id])).rows[0].points_eco

describe('optimisation', () => {
  test('itinéraire par le réseau routier (Dijkstra), jamais plus long que l’ordre de sélection', async () => {
    const ids = valides.map((s) => s.id)
    expect(ids.length).toBeGreaterThanOrEqual(4)
    const r = await request(app).post('/api/collectes/optimiser').set(agent.entete).send({ signalement_ids: ids, camion_id: camionLibre.id })
    expect(r.status).toBe(200)
    expect(r.body.methode).toBe('dijkstra')
    expect([...r.body.ordre_optimal].sort()).toEqual([...ids].sort())
    expect(r.body.distance_km).toBeGreaterThan(0)
    expect(r.body.distance_km).toBeLessThanOrEqual(r.body.distance_naive_km)
    expect(r.body.trace.length).toBeGreaterThan(ids.length) // le tracé suit les rues
    expect(r.body.itineraire.map((p) => p.ordre)).toEqual(ids.map((_, i) => i + 1))
    expect(r.body.duree_estimee_min).toBeGreaterThan(0)
  })

  test('refuse un signalement non validé', async () => {
    const attente = (await request(app).get('/api/signalements?statut=en_attente').set(agent.entete)).body.signalements[0]
    const r = await request(app).post('/api/collectes/optimiser').set(agent.entete).send({ signalement_ids: [attente.id] })
    expect(r.status).toBe(422)
  })

  test('suggestion gloutonne : respecte la capacité du camion', async () => {
    const r = await request(app).post('/api/collectes/suggestion').set(agent.entete).send({ camion_id: camionLibre.id })
    expect(r.status).toBe(200)
    expect(r.body.charge_estimee_kg).toBeLessThanOrEqual(camionLibre.capacite_kg)
    expect(r.body.signalement_ids.length).toBeGreaterThan(0)
  })

  test('réservé au personnel', async () => {
    const r = await request(app).post('/api/collectes/optimiser').set(chauffeur.entete).send({ signalement_ids: [valides[0].id] })
    expect(r.status).toBe(403)
  })
})

describe('tournée complète', () => {
  let collecte
  const lot = () => valides.slice(0, 3).map((s) => s.id)

  test('planification : camion en tournée, signalements en cours', async () => {
    const r = await request(app)
      .post('/api/collectes')
      .set(agent.entete)
      .send({ camion_id: camionLibre.id, date_planifiee: new Date(Date.now() + 3600000).toISOString(), signalement_ids: lot(), notes: 'Test' })
    expect(r.status).toBe(201)
    collecte = r.body
    expect(collecte).toMatchObject({ statut: 'planifiee', nb_points: 3, nb_faits: 0 })
    expect(collecte.signalements.map((s) => s.ordre)).toEqual([1, 2, 3])
    expect(await statutCamion(camionLibre.id)).toBe('en_tournee')
    for (const id of lot()) expect(await statutSignalement(id)).toBe('en_cours')
  })

  test('un camion déjà en tournée ne peut pas être replanifié', async () => {
    const r = await request(app)
      .post('/api/collectes')
      .set(agent.entete)
      .send({ camion_id: camionLibre.id, date_planifiee: new Date().toISOString(), signalement_ids: [valides[3].id] })
    expect(r.status).toBe(422)
    expect(r.body.code).toBe('CAMION_INDISPONIBLE')
  })

  test('seul le chauffeur du camion peut démarrer', async () => {
    expect((await request(app).patch(`/api/collectes/${collecte.id}/demarrer`).set(chauffeur2.entete)).status).toBe(403)
    const r = await request(app).patch(`/api/collectes/${collecte.id}/demarrer`).set(chauffeur.entete)
    expect(r.status).toBe(200)
    expect(r.body.statut).toBe('en_cours')
    expect(r.body.date_debut).toBeTruthy()
  })

  test('point collecté : +10 points pour le citoyen, pas deux fois', async () => {
    const point = collecte.signalements[0]
    const avant = await pointsEco(point.citoyen_id)
    const r = await request(app).patch(`/api/collectes/${collecte.id}/signalements/${point.id}`).set(chauffeur.entete)
    expect(r.status).toBe(200)
    expect(r.body.nb_faits).toBe(1)
    expect(await statutSignalement(point.id)).toBe('collecte')
    expect(await pointsEco(point.citoyen_id)).toBe(avant + 10)
    expect((await request(app).patch(`/api/collectes/${collecte.id}/signalements/${point.id}`).set(chauffeur.entete)).status).toBe(409)
  })

  test('fin de tournée : camion disponible, points non ramassés de nouveau à planifier', async () => {
    const r = await request(app).patch(`/api/collectes/${collecte.id}/terminer`).set(chauffeur.entete).send({ poids_collecte_kg: 320 })
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ statut: 'terminee', poids_collecte_kg: 320, nb_signalements_traites: 1 })
    expect(await statutCamion(camionLibre.id)).toBe('disponible')
    expect(await statutSignalement(collecte.signalements[1].id)).toBe('valide')
    expect((await request(app).patch(`/api/collectes/${collecte.id}/terminer`).set(chauffeur.entete)).status).toBe(422)
  })

  test('le chauffeur ne voit que les tournées de son camion', async () => {
    const r = await request(app).get('/api/collectes').set(chauffeur.entete)
    expect(r.body.collectes.length).toBeGreaterThan(0)
    expect(r.body.collectes.every((c) => c.chauffeur_id === chauffeur.user.id)).toBe(true)
  })
})

describe('annulation', () => {
  test('tournée planifiée annulée : tout est libéré', async () => {
    const encoreValides = (await request(app).get('/api/signalements?statut=valide').set(agent.entete)).body.signalements
    const ids = encoreValides.slice(0, 2).map((s) => s.id)
    const c = (
      await request(app).post('/api/collectes').set(agent.entete).send({ camion_id: camionLibre.id, date_planifiee: new Date().toISOString(), signalement_ids: ids })
    ).body
    const r = await request(app).patch(`/api/collectes/${c.id}/annuler`).set(agent.entete)
    expect(r.status).toBe(200)
    expect(r.body.statut).toBe('annulee')
    expect(await statutCamion(camionLibre.id)).toBe('disponible')
    for (const id of ids) expect(await statutSignalement(id)).toBe('valide')
    expect((await request(app).patch(`/api/collectes/${c.id}/annuler`).set(agent.entete)).status).toBe(422)
  })
})
