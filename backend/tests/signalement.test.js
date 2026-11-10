// Signalements : envoi avec photo et GPS, zone automatique, validation, points éco, confidentialité
const { app, request, db, preparer, connecter, PNG } = require('./aide')

let citoyen, agent, autreCitoyen
beforeAll(async () => {
  await preparer()
  citoyen = await connecter('citoyen@tananamadio.mg')
  autreCitoyen = await connecter('lalao.rasoa@example.mg')
  agent = await connecter('agent@tananamadio.mg')
})
afterAll(() => db.fermer())

const points = async (email) =>
  (await db.query('SELECT points_eco FROM citoyens c JOIN utilisateurs u ON u.id = c.id WHERE u.email = $1', [email])).rows[0].points_eco

const envoyer = (qui, champs, photo = PNG) => {
  const req = request(app).post('/api/signalements').set(qui.entete)
  for (const [k, v] of Object.entries(champs)) req.field(k, String(v))
  return photo ? req.attach('photo', photo, { filename: 'depot.png', contentType: 'image/png' }) : req
}

let cree
describe('envoi', () => {
  test('photo + GPS : zone affectée par le trigger PostGIS, +2 points', async () => {
    const avant = await points('citoyen@tananamadio.mg')
    const r = await envoyer(citoyen, { latitude: -18.9137, longitude: 47.5361, urgence: 'critique', description: 'Tas devant le marché' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ statut: 'en_attente', urgence: 'critique', zone_nom: 'Analakely', points_gagnes: 2 })
    expect(r.body.photo_url).toMatch(/^\/uploads\/.+\.png$/)
    expect(await points('citoyen@tananamadio.mg')).toBe(avant + 2)
    cree = r.body
    expect((await request(app).get(r.body.photo_url)).status).toBe(200) // la photo est servie
  })

  test('hors des zones connues : accepté, sans zone', async () => {
    const r = await envoyer(citoyen, { latitude: -18.8, longitude: 47.4, description: 'Bord de route' }, null)
    expect(r.status).toBe(201)
    expect(r.body.zone_id).toBeNull()
  })

  test('GPS invalide, fichier non image, envoi vide : 400', async () => {
    expect((await envoyer(citoyen, { latitude: 120, longitude: 47.5 })).body.code).toBe('GPS_INVALIDE')
    const texte = await request(app)
      .post('/api/signalements')
      .set(citoyen.entete)
      .field('latitude', '-18.91')
      .field('longitude', '47.53')
      .attach('photo', Buffer.from('pas une image'), { filename: 'x.txt', contentType: 'text/plain' })
    expect(texte.body.code).toBe('PHOTO_INVALIDE')
    expect((await envoyer(citoyen, { latitude: -18.91, longitude: 47.53 }, null)).body.code).toBe('CONTENU_REQUIS')
  })

  test('seul un citoyen peut signaler', async () => {
    expect((await envoyer(agent, { latitude: -18.91, longitude: 47.53, description: 'x' })).status).toBe(403)
  })
})

describe('consultation', () => {
  test('un citoyen ne voit que ses signalements', async () => {
    const r = await request(app).get('/api/signalements?limit=100').set(autreCitoyen.entete)
    expect(r.status).toBe(200)
    expect(r.body.signalements.every((s) => s.citoyen_id === autreCitoyen.user.id)).toBe(true)
    expect((await request(app).get(`/api/signalements/${cree.id}`).set(autreCitoyen.entete)).status).toBe(403)
  })

  test('carte : le nom du déclarant n’est visible que par le personnel', async () => {
    const pourCitoyen = await request(app).get('/api/signalements/carte').set(citoyen.entete)
    const pourAgent = await request(app).get('/api/signalements/carte').set(agent.entete)
    expect(pourCitoyen.body.signalements[0].citoyen_nom).toBeUndefined()
    expect(pourAgent.body.signalements[0].citoyen_nom).toBeDefined()
    expect(pourAgent.body.signalements.some((s) => s.statut === 'rejete')).toBe(false)
  })

  test('filtres et pagination, urgences critiques en tête', async () => {
    const r = await request(app).get('/api/signalements?statut=en_attente&limit=2&page=1').set(agent.entete)
    expect(r.body.signalements).toHaveLength(2)
    expect(r.body.total).toBeGreaterThan(2)
    expect(r.body.signalements.every((s) => s.statut === 'en_attente')).toBe(true)
    expect(r.body.signalements[0].urgence).toBe('critique')
    expect((await request(app).get('/api/signalements?statut=nimporte').set(agent.entete)).status).toBe(400)
  })
})

describe('validation par un agent', () => {
  test('validation : +5 points, une seule fois', async () => {
    const avant = await points('citoyen@tananamadio.mg')
    const r = await request(app).patch(`/api/signalements/${cree.id}/statut`).set(agent.entete).send({ statut: 'valide' })
    expect(r.status).toBe(200)
    expect(r.body.statut).toBe('valide')
    expect(r.body.date_validation).toBeTruthy()
    expect(await points('citoyen@tananamadio.mg')).toBe(avant + 5)
    // repasser en attente puis revalider ne redonne pas de points
    await request(app).patch(`/api/signalements/${cree.id}/statut`).set(agent.entete).send({ statut: 'en_attente' })
    await request(app).patch(`/api/signalements/${cree.id}/statut`).set(agent.entete).send({ statut: 'valide' })
    expect(await points('citoyen@tananamadio.mg')).toBe(avant + 5)
  })

  test('transitions réservées aux collectes refusées', async () => {
    const r = await request(app).patch(`/api/signalements/${cree.id}/statut`).set(agent.entete).send({ statut: 'collecte' })
    expect(r.status).toBe(422)
    expect(r.body.code).toBe('TRANSITION_INVALIDE')
  })

  test('un citoyen ne peut pas valider', async () => {
    const r = await request(app).patch(`/api/signalements/${cree.id}/statut`).set(citoyen.entete).send({ statut: 'valide' })
    expect(r.status).toBe(403)
  })

  test('identifiant mal formé : 400', async () => {
    expect((await request(app).get('/api/signalements/123').set(agent.entete)).body.code).toBe('ID_INVALIDE')
  })
})

describe('suppression', () => {
  test('le citoyen supprime son signalement en attente, pas celui d’un autre', async () => {
    const r = await envoyer(citoyen, { latitude: -18.92, longitude: 47.53, description: 'Doublon' }, null)
    expect((await request(app).delete(`/api/signalements/${r.body.id}`).set(autreCitoyen.entete)).status).toBe(403)
    expect((await request(app).delete(`/api/signalements/${r.body.id}`).set(citoyen.entete)).status).toBe(200)
    expect((await request(app).get(`/api/signalements/${r.body.id}`).set(agent.entete)).status).toBe(404)
  })
})
