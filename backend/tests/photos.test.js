// Photos gardées dans la base (mode d'hébergement sans disque permanent)
process.env.PHOTOS_STOCKAGE = 'base'
const { app, request, db, preparer, connecter, PNG } = require('./aide')

let citoyen
beforeAll(async () => {
  await preparer()
  citoyen = await connecter('citoyen@tananamadio.mg')
})
afterAll(() => db.fermer())

test('les photos de démonstration sont dans la base et servies sous /uploads', async () => {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM photos')
  expect(rows[0].n).toBeGreaterThan(5)
  const r = await request(app).get('/uploads/demo-depot-01.jpg')
  expect(r.status).toBe(200)
  expect(r.headers['content-type']).toMatch(/image\/jpeg/)
  expect(r.body.length).toBeGreaterThan(1000)
})

test('une photo envoyée est enregistrée en base, puis supprimée avec son signalement', async () => {
  const cree = await request(app).post('/api/signalements').set(citoyen.entete)
    .field('latitude', '-18.91').field('longitude', '47.52').field('description', 'Photo en base')
    .attach('photo', PNG, { filename: 'p.png', contentType: 'image/png' })
  expect(cree.status).toBe(201)
  const photo = await request(app).get(cree.body.photo_url)
  expect(photo.status).toBe(200)
  expect(photo.headers['content-type']).toMatch(/image\/png/)
  expect((await request(app).delete(`/api/signalements/${cree.body.id}`).set(citoyen.entete)).status).toBe(200)
  expect((await request(app).get(cree.body.photo_url)).status).toBe(404)
})

test('une photo inconnue renvoie 404', async () => {
  expect((await request(app).get('/uploads/inexistante.jpg')).status).toBe(404)
})
