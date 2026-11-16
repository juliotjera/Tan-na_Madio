// Application Android : le site sert l'APK repris des Releases GitHub (fetch simulé, pas de réseau)
const { app, request, db } = require('./aide')

const fetchOrigine = global.fetch
afterEach(() => {
  global.fetch = fetchOrigine
})
afterAll(() => db.fermer())

test("sert l'APK sous son nom, avec le bon type", async () => {
  global.fetch = jest.fn(async () => new Response('APK-TEST', { status: 200, headers: { 'content-length': '8' } }))
  const r = await request(app).get('/telecharger/tanana-madio.apk').buffer(true).parse((res, fin) => {
    let corps = ''
    res.on('data', (morceau) => (corps += morceau))
    res.on('end', () => fin(null, corps))
  })
  expect(r.status).toBe(200)
  expect(r.headers['content-type']).toBe('application/vnd.android.package-archive')
  expect(r.headers['content-disposition']).toBe('attachment; filename="tanana-madio.apk"')
  expect(r.body).toBe('APK-TEST')
  expect(global.fetch.mock.calls[0][0]).toBe('https://github.com/juliotjera/Tan-na_Madio/releases/latest/download/tanana-madio.apk')
})

test('GitHub injoignable ou version absente : 502 avec un message clair', async () => {
  global.fetch = jest.fn(async () => {
    throw new Error('réseau coupé')
  })
  const coupe = await request(app).get('/telecharger/tanana-madio.apk')
  expect(coupe.status).toBe(502)
  expect(coupe.body.code).toBe('APK_INDISPONIBLE')

  global.fetch = jest.fn(async () => new Response('Not Found', { status: 404 }))
  const absent = await request(app).get('/telecharger/tanana-madio.apk')
  expect(absent.status).toBe(502)
})
