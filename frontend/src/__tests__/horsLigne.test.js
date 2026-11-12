// Mode hors ligne du chauffeur : file des points marqués sans réseau et synchronisation
import { beforeEach, describe, expect, test, vi } from 'vitest'

const marquerPoint = vi.fn()
vi.mock('../api', () => ({ marquerPoint: (...args) => marquerPoint(...args) }))
const { avecPointsEnAttente, erreurReseau, garderTournee, mettreEnAttente, pointsEnAttente, synchroniser, tourneeGardee } = await import('../utils/horsLigne')

const coupure = Object.assign(new Error('Network Error'), { response: undefined })
const refus = (code, status = 422) => Object.assign(new Error(code), { response: { status, data: { code } } })

beforeEach(() => {
  localStorage.clear()
  marquerPoint.mockReset()
})

describe('file des points en attente', () => {
  test('un point n’est mis en attente qu’une fois', () => {
    mettreEnAttente('c1', 's1')
    mettreEnAttente('c1', 's1')
    mettreEnAttente('c1', 's2')
    mettreEnAttente('c2', 's9')
    expect(pointsEnAttente('c1')).toHaveLength(2)
    expect(pointsEnAttente()).toHaveLength(3)
  })

  test('erreurReseau distingue une coupure d’un refus de l’API', () => {
    expect(erreurReseau(coupure)).toBe(true)
    expect(erreurReseau(refus('ACCES_REFUSE', 403))).toBe(false)
  })

  test('synchronisation : tout part quand le réseau est revenu', async () => {
    mettreEnAttente('c1', 's1')
    mettreEnAttente('c1', 's2')
    marquerPoint.mockResolvedValue({})
    const r = await synchroniser()
    expect(r).toEqual({ envoyes: 2, refuses: [], restants: 0 })
    expect(marquerPoint).toHaveBeenCalledWith('c1', 's1')
  })

  test('synchronisation : s’arrête à la première coupure et garde le reste', async () => {
    mettreEnAttente('c1', 's1')
    mettreEnAttente('c1', 's2')
    marquerPoint.mockResolvedValueOnce({}).mockRejectedValueOnce(coupure)
    const r = await synchroniser()
    expect(r.envoyes).toBe(1)
    expect(r.restants).toBe(1)
    expect(pointsEnAttente('c1')[0].signalementId).toBe('s2')
  })

  test('synchronisation : « déjà collecté » compte comme envoyé, un refus est signalé', async () => {
    mettreEnAttente('c1', 's1')
    mettreEnAttente('c1', 's2')
    marquerPoint.mockRejectedValueOnce(refus('POINT_DEJA_COLLECTE', 409)).mockRejectedValueOnce(refus('STATUT_INVALIDE'))
    const r = await synchroniser()
    expect(r.envoyes).toBe(1)
    expect(r.refuses).toHaveLength(1)
    expect(r.restants).toBe(0)
  })
})

describe('tournée gardée sur le téléphone', () => {
  const tournee = {
    id: 'c1',
    nb_faits: 0,
    signalements: [
      { id: 's1', collecte_fait: false },
      { id: 's2', collecte_fait: false },
    ],
  }

  test('la dernière version est relue hors ligne', () => {
    garderTournee(tournee)
    expect(tourneeGardee('c1')).toEqual(tournee)
    expect(tourneeGardee('inconnue')).toBeNull()
  })

  test('les points en attente apparaissent collectés, avec la progression à jour', () => {
    mettreEnAttente('c1', 's2')
    const c = avecPointsEnAttente(tournee)
    expect(c.nb_faits).toBe(1)
    expect(c.signalements[1]).toMatchObject({ collecte_fait: true, en_attente_envoi: true })
    expect(c.signalements[0].collecte_fait).toBe(false)
    expect(tournee.signalements[1].collecte_fait).toBe(false) // pas de modification de l'original
  })
})
