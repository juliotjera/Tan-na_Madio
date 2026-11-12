// Notifications (citoyen, agent, chauffeur) et exports CSV du personnel
const { app, request, db, preparer, connecter, PNG } = require('./aide')
const { Notification } = require('../src/models')

let citoyen, agent, chauffeur, camion
beforeAll(async () => {
  await preparer()
  citoyen = await connecter('citoyen@tananamadio.mg')
  agent = await connecter('agent@tananamadio.mg')
  chauffeur = await connecter('chauffeur2@tananamadio.mg') // camion BIBILY
  camion = (await request(app).get('/api/camions').set(agent.entete)).body.camions.find((c) => c.immatriculation === 'BIBILY')
})
afterAll(() => db.fermer())

const notifications = async (qui) => (await request(app).get('/api/notifications').set(qui.entete)).body

describe('notifications', () => {
  let signalement

  test('une urgence critique prévient les agents', async () => {
    const r = await request(app)
      .post('/api/signalements')
      .set(citoyen.entete)
      .field('latitude', '-18.9137')
      .field('longitude', '47.5361')
      .field('urgence', 'critique')
      .field('description', 'Feu de déchets près de l’école')
      .attach('photo', PNG, { filename: 'feu.png', contentType: 'image/png' })
    signalement = r.body
    const n = await notifications(agent)
    expect(n.non_lues).toBeGreaterThan(0)
    expect(n.notifications[0]).toMatchObject({ type: 'urgence_critique', titre: 'Urgence critique signalée à Analakely', lu: false })
  })

  test('la validation prévient le citoyen', async () => {
    await request(app).patch(`/api/signalements/${signalement.id}/statut`).set(agent.entete).send({ statut: 'valide' })
    const n = await notifications(citoyen)
    expect(n.notifications[0]).toMatchObject({ type: 'signalement_valide', lien: '/citoyen/signalements' })
    expect(n.notifications[0].titre).toMatch(/\+5 points/)
  })

  test('la tournée prévient le chauffeur, puis le citoyen au ramassage', async () => {
    const c = (
      await request(app)
        .post('/api/collectes')
        .set(agent.entete)
        .send({ camion_id: camion.id, date_planifiee: new Date().toISOString(), signalement_ids: [signalement.id] })
    ).body
    const pourChauffeur = await notifications(chauffeur)
    expect(pourChauffeur.notifications[0]).toMatchObject({ type: 'tournee_affectee', lien: `/chauffeur/tournees/${c.id}` })
    expect((await notifications(citoyen)).notifications[0].type).toBe('signalement_planifie')

    await request(app).patch(`/api/collectes/${c.id}/demarrer`).set(chauffeur.entete)
    await request(app).patch(`/api/collectes/${c.id}/signalements/${signalement.id}`).set(chauffeur.entete)
    expect((await notifications(citoyen)).notifications[0]).toMatchObject({ type: 'signalement_collecte' })

    await request(app).patch(`/api/collectes/${c.id}/terminer`).set(chauffeur.entete).send({ poids_collecte_kg: 80 })
    expect((await notifications(agent)).notifications[0]).toMatchObject({ type: 'tournee_terminee', titre: 'Tournée terminée : 1/1 arrêts' })
  })

  test('marquer comme lu : une seule, puis toutes', async () => {
    const avant = await notifications(citoyen)
    await request(app).patch(`/api/notifications/${avant.notifications[0].id}/lu`).set(citoyen.entete).expect(200)
    expect((await notifications(citoyen)).non_lues).toBe(avant.non_lues - 1)
    await request(app).patch('/api/notifications/tout-lu').set(citoyen.entete).expect(200)
    expect((await notifications(citoyen)).non_lues).toBe(0)
  })

  test('on ne lit pas les notifications des autres', async () => {
    const n = (await notifications(agent)).notifications[0]
    expect((await request(app).patch(`/api/notifications/${n.id}/lu`).set(citoyen.entete)).status).toBe(404)
  })
})

describe('exports CSV', () => {
  test('signalements : fichier CSV lisible par Excel (UTF-8, point-virgule)', async () => {
    const r = await request(app).get('/api/exports/signalements.csv?statut=collecte').set(agent.entete)
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toMatch(/text\/csv/)
    expect(r.headers['content-disposition']).toMatch(/signalements-\d{4}-\d{2}-\d{2}\.csv/)
    expect(r.text.charCodeAt(0)).toBe(0xfeff) // marque UTF-8 pour Excel
    const lignes = r.text.slice(1).trim().split('\r\n')
    expect(lignes[0]).toBe('Date;Statut;Urgence;Zone;Adresse;Description;Latitude;Longitude;Déclarant;Validé le;Photo')
    expect(lignes.length).toBeGreaterThan(1)
    expect(lignes.slice(1).every((l) => l.split(';')[1] === 'collecte')).toBe(true)
  })

  test('collectes : distances et gain', async () => {
    const r = await request(app).get('/api/exports/collectes.csv').set(agent.entete)
    expect(r.status).toBe(200)
    expect(r.text).toMatch(/Gain \(%\)/)
  })

  test('réservé au personnel', async () => {
    expect((await request(app).get('/api/exports/signalements.csv').set(citoyen.entete)).status).toBe(403)
  })
})

test('flux temps réel : une notification arrive aussitôt sur le flux de son destinataire', async () => {
  const http = require('http')
  const serveur = app.listen(0)
  const port = serveur.address().port
  const conducteur = await connecter('chauffeur@tananamadio.mg')
  const recu = new Promise((resoudre, rejeter) => {
    const req = http.get({ port, path: '/api/notifications/flux', headers: { Authorization: `Bearer ${conducteur.token}` } }, (res) => {
      expect(res.headers['content-type']).toMatch(/text\/event-stream/)
      let tampon = ''
      res.on('data', (morceau) => {
        tampon += morceau
        if (tampon.includes('retry:') && !tampon.includes('event: notification')) {
          Notification.notifier(conducteur.user.id, { type: 'tournee_affectee', titre: 'Test temps réel' })
        }
        const m = tampon.match(/event: notification\ndata: (.+)\n\n/)
        if (m) {
          req.destroy()
          resoudre(JSON.parse(m[1]))
        }
      })
    })
    req.on('error', (e) => e.code !== 'ECONNRESET' && rejeter(e))
  })
  const n = await recu
  expect(n).toMatchObject({ type: 'tournee_affectee', titre: 'Test temps réel', lu: false })
  expect(n.user_id).toBeUndefined()
  await new Promise((r) => serveur.close(r))
})
