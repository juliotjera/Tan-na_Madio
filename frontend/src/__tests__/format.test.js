// Formats d'affichage et paliers des points éco
import { describe, expect, test } from 'vitest'
import { duree, kg, km, palier, PALIERS, pluriel } from '../utils/format'

describe('paliers des points éco', () => {
  test('0 point : premier palier, progression vers le suivant', () => {
    const p = palier(0)
    expect(p.actuel).toBe(PALIERS[0])
    expect(p.suivant).toBe(PALIERS[1])
    expect(p.progression).toBe(0)
  })

  test('au milieu d’un palier, la progression est proportionnelle', () => {
    const p = palier(50) // entre 25 et 75
    expect(p.actuel.seuil).toBe(25)
    expect(p.progression).toBeCloseTo(0.5)
  })

  test('au dernier palier, plus de suivant et progression complète', () => {
    const p = palier(1000)
    expect(p.suivant).toBeNull()
    expect(p.progression).toBe(1)
  })
})

describe('formats', () => {
  test('distances et poids en français, tiret si absent', () => {
    expect(km(12.34).replace(/\s/g, ' ')).toBe('12,3 km')
    expect(km(null)).toBe('—')
    expect(kg(1234.6).replace(/\s/g, ' ')).toBe('1 235 kg')
  })

  test('pluriel', () => {
    expect(pluriel(1, 'point')).toBe('1 point')
    expect(pluriel(3, 'point')).toBe('3 points')
    expect(pluriel(2, 'dépôt validé', 'dépôts validés')).toBe('2 dépôts validés')
  })

  test('durée lisible', () => {
    expect(duree(null)).toBe('—')
    expect(duree(45)).toBe('45 min')
    expect(duree(125)).toBe('2 h 05')
  })
})
