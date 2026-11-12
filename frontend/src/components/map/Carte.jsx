// Carte Leaflet d'Antananarivo et ses calques (signalements, zones, itinéraire)
import { useEffect, useMemo } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { URGENCES } from '../../utils/format'

export const CENTRE_TANA = [-18.9137, 47.5361]

export function Carte({ centre = CENTRE_TANA, zoom = 14, className = 'h-[420px]', children, defilement = true, ...props }) {
  return (
    <div className={`relative isolate overflow-hidden rounded-carte border border-trait ${className}`}>
      <MapContainer center={centre} zoom={zoom} scrollWheelZoom={defilement} className="h-full w-full" {...props}>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>'
          maxZoom={19}
        />
        {children}
      </MapContainer>
    </div>
  )
}

// Recadre la carte sur un ensemble de points [[lat, lng], …]
export function Cadrer({ points, marge = 40, max = 16 }) {
  const map = useMap()
  const cle = points?.map((p) => p.join(',')).join(';')
  useEffect(() => {
    if (!points?.length) return
    if (points.length === 1) map.setView(points[0], max)
    else map.fitBounds(points, { padding: [marge, marge], maxZoom: max })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle])
  return null
}

export function AuClic({ onClic }) {
  useMapEvents({ click: (e) => onClic([e.latlng.lat, e.latlng.lng]) })
  return null
}

// Marqueur « goutte » coloré selon l'urgence ; anneau pulsant pour les urgences critiques
const icones = new Map()
export function iconeUrgence(urgence, estompe = false) {
  const cle = `${urgence}-${estompe}`
  if (!icones.has(cle)) {
    const couleur = URGENCES[urgence]?.couleur ?? URGENCES.moyen.couleur
    icones.set(
      cle,
      L.divIcon({
        className: '',
        html: `<div class="marqueur ${urgence === 'critique' && !estompe ? 'marqueur-critique' : ''}" style="background:${couleur};opacity:${estompe ? 0.45 : 1}"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 22],
        popupAnchor: [0, -20],
      }),
    )
  }
  return icones.get(cle)
}

export function MarqueurSignalement({ signalement, children, estompe, onClick }) {
  return (
    <Marker
      position={[signalement.latitude, signalement.longitude]}
      icon={iconeUrgence(signalement.urgence, estompe)}
      eventHandlers={onClick ? { click: () => onClick(signalement) } : undefined}
      keyboard
      title={URGENCES[signalement.urgence]?.libelle}
    >
      {children && <Popup>{children}</Popup>}
    </Marker>
  )
}

// Étape numérotée d'une tournée (verte une fois collectée)
export function iconeEtape(numero, { fait = false, active = false } = {}) {
  // à faire : plaque sombre ; prochain arrêt : ambre ; collecté : bleu pâle coché
  const fond = fait ? '#10B981' : active ? '#F59E0B' : '#4B5563'
  const texte = '#FFFFFF'
  return L.divIcon({
    className: '',
    html: `<div class="etape" style="background:${fond};color:${texte}">${fait ? '✓' : numero}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const iconeDepot = L.divIcon({
  className: '',
  html: '<div class="etape" style="background:#FFFFFF;color:#059669;border-color:#059669">D</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

// Itinéraire : tracé optimisé (vert, bordé de blanc), ordre naïf en pointillés pour comparer
export function Itineraire({ trace, traceNaive, etapes = [], depart, anime = true, onEtape, couleur = '#3B82F6' }) {
  return (
    <>
      {traceNaive?.length > 1 && <Polyline positions={traceNaive} pathOptions={{ color: '#9CA3AF', weight: 3, opacity: 0.8, dashArray: '2 8', lineCap: 'round' }} />}
      {trace?.length > 1 && (
        <>
          <Polyline positions={trace} pathOptions={{ color: '#FFFFFF', weight: 9, opacity: 0.9, lineJoin: 'round' }} />
          <Polyline key={trace.length} positions={trace} pathOptions={{ color: couleur, weight: 5, lineJoin: 'round', lineCap: 'round', className: anime ? 'trace-anime' : '' }} />
        </>
      )}
      {depart && (
        <Marker position={[depart.latitude, depart.longitude]} icon={iconeDepot}>
          <Tooltip direction="top" offset={[0, -12]}>
            Départ du camion
          </Tooltip>
        </Marker>
      )}
      {etapes.map((e, i) => (
        <Marker
          key={e.id ?? e.signalement_id ?? i}
          position={[e.latitude, e.longitude]}
          icon={iconeEtape(e.ordre ?? i + 1, { fait: e.collecte_fait, active: e.active })}
          zIndexOffset={e.active ? 1000 : 0}
          eventHandlers={onEtape ? { click: () => onEtape(e) } : undefined}
        />
      ))}
    </>
  )
}

const styleZone = { color: '#10B981', weight: 1.5, opacity: 0.7, fillColor: '#10B981', fillOpacity: 0.07, dashArray: '4 4' }

export function Zones({ zones, surbrillance }) {
  return zones
    ?.filter((z) => z.geometrie)
    .map((z) => (
      <GeoJSON
        key={`${z.id}-${surbrillance === z.id}`}
        data={z.geometrie}
        style={surbrillance === z.id ? { ...styleZone, fillOpacity: 0.16, weight: 2.5, opacity: 1, dashArray: null } : styleZone}
      >
        <Tooltip sticky>{z.nom}</Tooltip>
      </GeoJSON>
    ))
}

// Position de l'utilisateur (point bleu)
export function MaPosition({ position }) {
  if (!position) return null
  return (
    <>
      <CircleMarker center={position} radius={16} pathOptions={{ color: '#2563EB', weight: 0, fillOpacity: 0.15 }} />
      <CircleMarker center={position} radius={7} pathOptions={{ color: '#FFFFFF', weight: 3, fillColor: '#2563EB', fillOpacity: 1 }} />
    </>
  )
}

// Légende des urgences
export function LegendeUrgences({ className = '' }) {
  const items = useMemo(() => Object.entries(URGENCES), [])
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-encre-doux ${className}`}>
      {items.map(([cle, u]) => (
        <span key={cle} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: u.couleur }} />
          {u.libelle}
        </span>
      ))}
    </div>
  )
}
