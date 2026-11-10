// Fonctionnalités reprises de la version d'origine : classement des citoyens, performance des camions,
// compteurs d'utilisateurs, tendances du tableau de bord, répartition sur plusieurs camions
const { app, request, db, preparer, connecter } = require('./aide')

let citoyen, agent, admin
beforeAll(async () => {
  await preparer()
  citoyen = await connecter('citoyen@tananamadio.mg')
  agent = await connecter('agent@tananamadio.mg')
  admin = await connecter('admin@tananamadio.mg')
})
afterAll(() => db.fermer())

test('classement des citoyens : 5 au plus, triés, sans nom complet ni e-mail', async () => {
  const r = await request(app).get('/api/stats/top-citoyens').set(citoyen.entete)
  expect(r.status).toBe(200)
  const c = r.body.citoyens
  expect(c.length).toBeGreaterThan(0)
  expect(c.length).toBeLessThanOrEqual(5)
  expect(c.map((x) => x.points_eco)).toEqual([...c.map((x) => x.points_eco)].sort((a, b) => b - a))
  expect(c[0].nom).toMatch(/^\S+ \S\.$/) // « Jean R. »
  expect(JSON.stringify(r.body)).not.toMatch(/@|"id"/)
  expect(c.some((x) => x.moi)).toBe(true) // le citoyen de démonstration figure au classement
})

test('performance des camions : efficacité entre 0 et 100 %', async () => {
  const r = await request(app).get('/api/stats/camions').set(admin.entete)
  expect(r.status).toBe(200)
  expect(r.body.camions).toHaveLength(3)
  for (const c of r.body.camions) {
    expect(c.efficacite_pct).toBeGreaterThanOrEqual(0)
    expect(c.efficacite_pct).toBeLessThanOrEqual(100)
    expect(c.points_collectes).toBeLessThanOrEqual(c.points_planifies)
  }
  expect((await request(app).get('/api/stats/camions').set(citoyen.entete)).status).toBe(403)
})

test('tableau de bord : tendance du mois et série des 14 derniers jours', async () => {
  const r = await request(app).get('/api/stats/dashboard').set(admin.entete)
  expect(r.body.serie_14_jours).toHaveLength(14)
  expect(r.body.signalements_mois).toBeGreaterThanOrEqual(0)
})

test('utilisateurs : compteurs par rôle', async () => {
  const r = await request(app).get('/api/utilisateurs').set(admin.entete)
  expect(r.body.compteurs).toMatchObject({ total: 13, actifs: 13, agents: 2, chauffeurs: 3, citoyens: 7, administrateurs: 1 })
})

test('camions : téléphone du chauffeur pour le contact, zones : signalements validés', async () => {
  const camions = (await request(app).get('/api/camions').set(agent.entete)).body.camions
  expect(camions.find((c) => c.immatriculation === '123DT').chauffeur_telephone).toBe('033 44 555 66')
  const zones = (await request(app).get('/api/zones').set(agent.entete)).body.zones
  expect(zones.every((z) => Number.isInteger(z.nb_valides))).toBe(true)
})

test('plusieurs tournées : répartition gloutonne sur les camions disponibles, sans dépasser leur capacité', async () => {
  const valides = (await request(app).get('/api/signalements?statut=valide&limit=100').set(agent.entete)).body.signalements
  const r = await request(app).post('/api/collectes/repartition').set(agent.entete).send({ signalement_ids: valides.map((s) => s.id) })
  expect(r.status).toBe(200)
  const attribues = r.body.tournees.flatMap((t) => t.plan.ordre_optimal)
  expect(new Set(attribues).size).toBe(attribues.length) // aucun signalement dans deux tournées
  expect(attribues.length + r.body.non_attribues.length).toBe(valides.length)
  for (const t of r.body.tournees) {
    expect(t.charge_estimee_kg).toBeLessThanOrEqual(t.camion.capacite_kg)
    expect(t.plan.methode).toBe('dijkstra')
  }
})
