// Outils géographiques (WGS84, SRID 4326)

const RAYON_TERRE_KM = 6371

// Distance « à vol d'oiseau » entre deux points GPS, en kilomètres (formule de Haversine)
function haversine(lat1, lon1, lat2, lon2) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return RAYON_TERRE_KM * 2 * Math.asin(Math.sqrt(a))
}

// Coordonnées valides (Madagascar n'est pas imposé : l'outil reste général)
const latitudeValide = (v) => Number.isFinite(v) && v >= -90 && v <= 90
const longitudeValide = (v) => Number.isFinite(v) && v >= -180 && v <= 180

// Polygone fermé (WKT) à partir d'une liste de [lat, lng]
function polygoneWkt(points) {
  const anneau = [...points, points[0]].map(([lat, lng]) => `${lng} ${lat}`).join(', ')
  return `POLYGON((${anneau}))`
}

// Carré d'environ « cote » km centré sur un point (zones de démonstration)
function carre(lat, lng, coteKm) {
  const dLat = coteKm / 2 / 111.32
  const dLng = coteKm / 2 / (111.32 * Math.cos((lat * Math.PI) / 180))
  return [
    [lat - dLat, lng - dLng],
    [lat - dLat, lng + dLng],
    [lat + dLat, lng + dLng],
    [lat + dLat, lng - dLng],
  ]
}

module.exports = { haversine, latitudeValide, longitudeValide, polygoneWkt, carre }
