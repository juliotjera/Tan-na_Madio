// Authentification : inscription citoyen, connexion, jetons (accès + renouvellement), rôles
const { app, request, db, preparer, connecter } = require('./aide')

beforeAll(() => preparer())
afterAll(() => db.fermer())

const nouveau = {
  nom: 'Rabearivelo',
  prenom: 'Sitraka',
  email: 'sitraka@example.mg',
  mot_de_passe: 'Tanana2026',
  telephone: '034 00 000 00',
  extras: { quartier: 'Isotry' },
}

describe('inscription', () => {
  test('crée un compte citoyen et renvoie les jetons', async () => {
    const r = await request(app).post('/api/auth/register').send(nouveau)
    expect(r.status).toBe(201)
    expect(r.body.user).toMatchObject({ email: 'sitraka@example.mg', role: 'citoyen' })
    expect(r.body.token).toBeDefined()
    expect(r.body.refreshToken).toBeDefined()
    expect(r.body.user.mot_de_passe).toBeUndefined()
  })

  test('refuse de créer un compte du personnel', async () => {
    const r = await request(app).post('/api/auth/register').send({ ...nouveau, email: 'faux.agent@example.mg', role: 'agent_municipal' })
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('ROLE_NON_AUTORISE')
  })

  test('refuse un e-mail déjà utilisé, un mot de passe faible, des champs manquants', async () => {
    expect((await request(app).post('/api/auth/register').send(nouveau)).status).toBe(409)
    const faible = await request(app).post('/api/auth/register').send({ ...nouveau, email: 'x@example.mg', mot_de_passe: 'court' })
    expect(faible.body.code).toBe('MOT_DE_PASSE_FAIBLE')
    expect((await request(app).post('/api/auth/register').send({ email: 'y@example.mg' })).body.code).toBe('CHAMPS_MANQUANTS')
  })

  test('le mot de passe est stocké haché (bcrypt, 12 tours)', async () => {
    const { rows } = await db.query('SELECT mot_de_passe FROM utilisateurs WHERE email = $1', ['sitraka@example.mg'])
    expect(rows[0].mot_de_passe).toMatch(/^\$2[aby]\$12\$/)
  })
})

describe('connexion et jetons', () => {
  test('connexion réussie, puis profil', async () => {
    const { entete } = await connecter('citoyen@tananamadio.mg')
    const r = await request(app).get('/api/auth/profil').set(entete)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ role: 'citoyen', quartier: 'Analakely' })
  })

  test('mauvais mot de passe et compte inconnu : même réponse', async () => {
    const a = await request(app).post('/api/auth/login').send({ email: 'citoyen@tananamadio.mg', mot_de_passe: 'Mauvais123' })
    const b = await request(app).post('/api/auth/login').send({ email: 'personne@example.mg', mot_de_passe: 'Mauvais123' })
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)
    expect(a.body).toEqual(b.body)
  })

  test('sans jeton ou avec un jeton falsifié : 401', async () => {
    expect((await request(app).get('/api/auth/profil')).status).toBe(401)
    const faux = await request(app).get('/api/auth/profil').set({ Authorization: 'Bearer abc.def.ghi' })
    expect(faux.body.code).toBe('TOKEN_INVALIDE')
  })

  test('le renouvellement fait tourner le jeton : l’ancien ne sert plus', async () => {
    const { refreshToken } = await connecter('agent@tananamadio.mg')
    const r1 = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(r1.status).toBe(200)
    expect(r1.body.token).toBeDefined()
    expect(r1.body.refreshToken).not.toBe(refreshToken)
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken })).status).toBe(401)
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: r1.body.refreshToken })).status).toBe(200)
  })

  test('seule l’empreinte du jeton de renouvellement est en base', async () => {
    const { refreshToken } = await connecter('chauffeur@tananamadio.mg')
    const { rows } = await db.query('SELECT count(*)::int AS n FROM refresh_tokens WHERE token = $1', [refreshToken])
    expect(rows[0].n).toBe(0)
  })

  test('déconnexion : le jeton de renouvellement est révoqué', async () => {
    const { entete, refreshToken } = await connecter('agent2@tananamadio.mg')
    expect((await request(app).post('/api/auth/logout').set(entete).send({ refreshToken })).status).toBe(200)
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken })).status).toBe(401)
  })
})

describe('rôles et comptes', () => {
  test('un citoyen ne peut pas lister les utilisateurs', async () => {
    const { entete } = await connecter('citoyen@tananamadio.mg')
    const r = await request(app).get('/api/utilisateurs').set(entete)
    expect(r.status).toBe(403)
    expect(r.body.code).toBe('ROLE_INSUFFISANT')
  })

  test('l’administrateur crée un chauffeur ; un compte désactivé est bloqué immédiatement', async () => {
    const admin = await connecter('admin@tananamadio.mg')
    const cree = await request(app).post('/api/utilisateurs').set(admin.entete).send({
      nom: 'Rasolo',
      prenom: 'Haja',
      email: 'haja@tananamadio.mg',
      mot_de_passe: 'Camion2026',
      role: 'chauffeur',
      extras: { numero_permis: 'MG-C-999' },
    })
    expect(cree.status).toBe(201)
    expect(cree.body).toMatchObject({ role: 'chauffeur', numero_permis: 'MG-C-999' })

    const chauffeur = await connecter('haja@tananamadio.mg', 'Camion2026')
    const desactive = await request(app).patch(`/api/utilisateurs/${cree.body.id}/activer`).set(admin.entete).send({ actif: false })
    expect(desactive.status).toBe(200)
    expect((await request(app).get('/api/auth/profil').set(chauffeur.entete)).body.code).toBe('COMPTE_INACTIF')
    const reconnexion = await request(app).post('/api/auth/login').send({ email: 'haja@tananamadio.mg', mot_de_passe: 'Camion2026' })
    expect(reconnexion.status).toBe(403)
  })

  test('les actions sont journalisées', async () => {
    const admin = await connecter('admin@tananamadio.mg')
    const r = await request(app).get('/api/utilisateurs/journal').set(admin.entete)
    expect(r.status).toBe(200)
    expect(r.body.logs.map((l) => l.action)).toEqual(expect.arrayContaining(['connexion', 'inscription', 'desactivation']))
  })
})
