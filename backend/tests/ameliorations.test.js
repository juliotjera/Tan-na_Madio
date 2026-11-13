// Améliorations : motif de rejet, doublons et « Moi aussi », mot de passe provisoire, journal filtré
const { app, request, db, preparer, connecter, PNG } = require('./aide')

let citoyen, voisin, agent, admin
beforeAll(async () => {
  await preparer()
  citoyen = await connecter('citoyen@tananamadio.mg')
  voisin = await connecter('fidy.ravelo@example.mg')
  agent = await connecter('agent@tananamadio.mg')
  admin = await connecter('admin@tananamadio.mg')
})
afterAll(() => db.fermer())

const signaler = (qui, lat, lng) =>
  request(app).post('/api/signalements').set(qui.entete).field('latitude', String(lat)).field('longitude', String(lng)).field('description', 'Tas d’ordures').field('urgence', 'eleve')

test('rejet avec motif : enregistré, notifié au citoyen, effacé si le signalement est revalidé', async () => {
  const s = (await signaler(citoyen, -18.9101, 47.5251)).body
  const r = await request(app).patch(`/api/signalements/${s.id}/statut`).set(agent.entete).send({ statut: 'rejete', motif: 'Dépôt déjà ramassé' })
  expect(r.status).toBe(200)
  expect(r.body.motif_rejet).toBe('Dépôt déjà ramassé')
  const notifs = (await request(app).get('/api/notifications').set(citoyen.entete)).body.notifications
  expect(notifs[0].message).toContain('Motif : Dépôt déjà ramassé')
  const revalide = await request(app).patch(`/api/signalements/${s.id}/statut`).set(agent.entete).send({ statut: 'valide' })
  expect(revalide.body.motif_rejet).toBeNull()
  expect((await request(app).get('/api/signalements/motifs-rejet').set(agent.entete)).body.motifs.length).toBeGreaterThan(2)
})

test('doublons : un signalement ouvert à moins de 50 m est retrouvé, pas au-delà', async () => {
  const s = (await signaler(citoyen, -18.9201, 47.5301)).body
  const pres = await request(app).get('/api/signalements/proximite').query({ latitude: -18.92014, longitude: 47.53012 }).set(voisin.entete)
  expect(pres.status).toBe(200)
  const trouve = pres.body.signalements.find((x) => x.id === s.id)
  expect(trouve.distance_m).toBeLessThan(50)
  expect(trouve.moi).toBe(false)
  expect(trouve.citoyen_nom).toBeUndefined() // nom du déclarant caché aux citoyens
  const loin = await request(app).get('/api/signalements/proximite').query({ latitude: -18.9230, longitude: 47.5301 }).set(voisin.entete)
  expect(loin.body.signalements.some((x) => x.id === s.id)).toBe(false)
})

test('« Moi aussi » : compté une fois par habitant, refusé sur son propre signalement', async () => {
  const s = (await signaler(citoyen, -18.9301, 47.5101)).body
  expect((await request(app).post(`/api/signalements/${s.id}/soutien`).set(voisin.entete)).body.nb_soutiens).toBe(1)
  expect((await request(app).post(`/api/signalements/${s.id}/soutien`).set(voisin.entete)).body.nb_soutiens).toBe(1)
  expect((await request(app).post(`/api/signalements/${s.id}/soutien`).set(citoyen.entete)).body.code).toBe('PROPRE_SIGNALEMENT')
  expect((await request(app).get(`/api/signalements/${s.id}`).set(agent.entete)).body.nb_soutiens).toBe(1)
  const proche = (await request(app).get('/api/signalements/proximite').query({ latitude: -18.9301, longitude: 47.5101 }).set(voisin.entete)).body.signalements
  expect(proche.find((x) => x.id === s.id).deja_soutenu).toBe(true)
})

test('mot de passe oublié : l’administrateur génère un mot de passe provisoire, à changer ensuite', async () => {
  const cible = await connecter('toky.a@example.mg')
  const r = await request(app).post(`/api/utilisateurs/${cible.user.id}/mot-de-passe`).set(admin.entete)
  expect(r.status).toBe(200)
  expect(r.body.mot_de_passe).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-\d{2}$/)
  // les anciennes sessions sont fermées
  expect((await request(app).post('/api/auth/refresh').send({ refreshToken: cible.refreshToken })).status).toBe(401)
  const nouvelle = await connecter('toky.a@example.mg', r.body.mot_de_passe)
  expect(nouvelle.user.mdp_provisoire).toBe(true)
  const change = await request(app).patch('/api/auth/mot-de-passe').set(nouvelle.entete).send({ ancien: r.body.mot_de_passe, nouveau: 'Nouveau2026x' })
  expect(change.status).toBe(200)
  expect((await connecter('toky.a@example.mg', 'Nouveau2026x')).user.mdp_provisoire).toBe(false)
  expect((await request(app).post(`/api/utilisateurs/${cible.user.id}/mot-de-passe`).set(agent.entete)).status).toBe(403)
})

test('modification d’un compte : le téléphone peut être effacé', async () => {
  const r = await request(app).put(`/api/utilisateurs/${voisin.user.id}`).set(admin.entete).send({ telephone: '' })
  expect(r.body.telephone).toBeNull()
})

test('points noirs : signalements regroupés, au moins 2 par case, triés', async () => {
  const r = await request(app).get('/api/stats/points-noirs').set(agent.entete)
  expect(r.status).toBe(200)
  expect(r.body.points.length).toBeGreaterThan(0)
  for (const p of r.body.points) {
    expect(p.total).toBeGreaterThanOrEqual(2)
    expect(p.latitude).toBeLessThan(-18.8)
    expect(p.latitude).toBeGreaterThan(-19.0)
  }
  expect(r.body.points.map((p) => p.total)).toEqual([...r.body.points.map((p) => p.total)].sort((a, b) => b - a))
  expect((await request(app).get('/api/stats/points-noirs').set(citoyen.entete)).status).toBe(403)
})

test('photo : un faux PNG (texte renommé) est refusé, un vrai PNG accepté', async () => {
  const faux = await request(app).post('/api/signalements').set(citoyen.entete).field('latitude', '-18.91').field('longitude', '47.52').field('description', 'Test photo')
    .attach('photo', Buffer.from('<?php echo 1; ?>'), { filename: 'photo.png', contentType: 'image/png' })
  expect(faux.status).toBe(400)
  expect(faux.body.code).toBe('PHOTO_INVALIDE')
  const vrai = await request(app).post('/api/signalements').set(citoyen.entete).field('latitude', '-18.91').field('longitude', '47.52').field('description', 'Test photo')
    .attach('photo', PNG, { filename: 'photo.png', contentType: 'image/png' })
  expect(vrai.status).toBe(201)
})

test('zones : dernier ramassage, dépôts à planifier et retard sur la fréquence prévue', async () => {
  const r = await request(app).get('/api/stats/zones').set(agent.entete)
  expect(r.status).toBe(200)
  for (const z of r.body.zones) {
    expect(typeof z.a_planifier).toBe('number')
    expect(typeof z.en_retard).toBe('boolean')
    if (z.en_retard) expect(z.a_planifier).toBeGreaterThan(0)
    if (z.en_retard && z.jours_depuis_collecte !== null) expect(z.jours_depuis_collecte).toBeGreaterThan(z.frequence_collecte_jours)
  }
  expect(r.body.zones.some((z) => z.derniere_collecte)).toBe(true)
})

test('journal : filtre par action et total', async () => {
  const r = await request(app).get('/api/utilisateurs/journal').query({ action: 'soutien' }).set(admin.entete)
  expect(r.status).toBe(200)
  expect(r.body.total).toBeGreaterThan(0)
  expect(r.body.logs.every((l) => l.action === 'soutien')).toBe(true)
  expect(r.body.actions).toContain('connexion')
})

test('les tuiles OpenStreetMap reçoivent l’origine du site (politique Referer compatible)', async () => {
  const r = await request(app).get('/api/sante')
  expect(r.headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
})
