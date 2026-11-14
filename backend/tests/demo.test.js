// Comptes de démonstration : connexion en un clic par rôle, sans mot de passe, et comptes protégés
const config = require('../src/config/env')
const { app, request, db, preparer, connecter } = require('./aide')

beforeAll(() => preparer())
afterAll(() => db.fermer())
afterEach(() => {
  config.comptesDemo = false // valeur par défaut pendant les tests
})

describe('démonstration désactivée', () => {
  test('aucun rôle proposé et connexion refusée', async () => {
    const dispo = await request(app).get('/api/auth/demo')
    expect(dispo.body).toEqual({ disponible: false, roles: [] })
    const r = await request(app).post('/api/auth/demo').send({ role: 'administrateur' })
    expect(r.status).toBe(404)
    expect(r.body.code).toBe('DEMO_INDISPONIBLE')
  })
})

describe('démonstration active', () => {
  beforeEach(() => {
    config.comptesDemo = true
  })

  test('propose les quatre rôles', async () => {
    const r = await request(app).get('/api/auth/demo')
    expect(r.body.disponible).toBe(true)
    expect(r.body.roles).toEqual(['citoyen', 'agent_municipal', 'chauffeur', 'administrateur'])
  })

  test('ouvre une session pour chaque rôle sans mot de passe', async () => {
    for (const role of ['citoyen', 'agent_municipal', 'chauffeur', 'administrateur']) {
      const r = await request(app).post('/api/auth/demo').send({ role })
      expect(r.status).toBe(200)
      expect(r.body.user.role).toBe(role)
      expect(r.body.token).toBeDefined()
      expect(r.headers['set-cookie'][0]).toMatch(/^tm_refresh=.*HttpOnly/)
    }
  })

  test('refuse un rôle inconnu', async () => {
    const r = await request(app).post('/api/auth/demo').send({ role: 'maire' })
    expect(r.status).toBe(400)
    expect(r.body.code).toBe('ROLE_INVALIDE')
  })

  test("l'administrateur ne peut ni désactiver, ni supprimer, ni réinitialiser un compte de démonstration", async () => {
    const admin = await connecter('admin@tananamadio.mg')
    const { rows } = await db.query("SELECT id FROM utilisateurs WHERE email = 'chauffeur@tananamadio.mg'")
    const id = rows[0].id
    const desactiver = await request(app).patch(`/api/utilisateurs/${id}/activer`).set(admin.entete).send({ actif: false })
    expect(desactiver.status).toBe(403)
    expect(desactiver.body.code).toBe('COMPTE_DEMO')
    expect((await request(app).delete(`/api/utilisateurs/${id}`).set(admin.entete)).body.code).toBe('COMPTE_DEMO')
    expect((await request(app).post(`/api/utilisateurs/${id}/mot-de-passe`).set(admin.entete)).body.code).toBe('COMPTE_DEMO')
  })

  test('les autres comptes restent gérables normalement', async () => {
    const admin = await connecter('admin@tananamadio.mg')
    const { rows } = await db.query("SELECT id FROM utilisateurs WHERE email = 'chauffeur3@tananamadio.mg'")
    const r = await request(app).patch(`/api/utilisateurs/${rows[0].id}/activer`).set(admin.entete).send({ actif: false })
    expect(r.status).toBe(200)
    expect(r.body.actif).toBe(false)
  })
})
