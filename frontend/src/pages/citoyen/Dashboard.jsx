// Espace citoyen (version d'origine) : actions rapides, points écologiques, compteurs,
// carte filtrée des signalements, historique en photos, classement des citoyens
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, ImageOff, MapPin, Plus, RefreshCw, RotateCcw, Star, Trophy } from 'lucide-react'
import { carteSignalements, mesSignalements, profil, topCitoyens } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { usePosition } from '../../hooks/usePosition'
import { useLangue } from '../../context/LangueContext'
import { Cadrer, Carte, MaPosition, MarqueurSignalement } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Compteur, Modal, Spinner } from '../../components/common/ui'
import { dateCourte, dateHeure, palier, URGENCES } from '../../utils/format'

const STATUTS = [
  ['', 'Tous'],
  ['en_attente', 'En attente'],
  ['valide', 'Validé'],
  ['en_cours', 'En cours'],
  ['collecte', 'Collecté'],
  ['rejete', 'Rejeté'],
]
const NIVEAUX = [['', 'Tous'], ...Object.entries(URGENCES).map(([k, u]) => [k, u.libelle])]

function Pastilles({ options, valeur, onChange, libelle }) {
  const { t } = useLangue()
  return (
    <div role="radiogroup" aria-label={libelle} className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button
          key={v || 'tous'}
          type="button"
          role="radio"
          aria-checked={valeur === v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${valeur === v ? 'bg-vert-500 text-white' : 'bg-fond text-encre-doux hover:bg-vert-50 hover:text-vert'}`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  )
}

// Points écologiques (repris aussi dans « Mon compte »)
export function CartePoints({ points }) {
  const { t } = useLangue()
  const { actuel, suivant } = palier(points)
  return (
    <div className="flex flex-col gap-4 rounded-carte border border-vert-300/70 bg-gradient-to-r from-vert-50 to-white p-6 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-vert-100 text-vert-500">
        <Star className="h-6 w-6" />
      </span>
      <div className="flex-1">
        <p className="font-titre text-lg font-bold text-ardoise">{t('Points Écologiques')}</p>
        <p className="text-encre-doux">{t('Continuez à signaler pour gagner plus de points !')}</p>
        {suivant && <p className="mt-1 text-xs text-encre-pale">{t('Encore {n} points pour devenir {palier}', { n: suivant.seuil - points, palier: t(suivant.nom) })}</p>}
      </div>
      <div className="text-left sm:text-right">
        <p className="chiffre text-[34px] leading-none text-vert-500">{points}</p>
        <p className="text-sm text-encre-doux">{t('points')}</p>
        <span className="mt-2 inline-block rounded-full border border-vert-300 bg-white px-3 py-1 text-xs font-semibold text-vert">{t(actuel.nom)}</span>
        <p className="mt-1 text-xs text-encre-pale">{t('Vous contribuez activement à la propreté.')}</p>
      </div>
    </div>
  )
}

export default function CitoyenDashboard() {
  const { t } = useLangue()
  const [statut, setStatut] = useState('')
  const [urgence, setUrgence] = useState('')
  const [choisi, setChoisi] = useState(null)
  const [detail, setDetail] = useState(null)
  const gps = usePosition()
  const carte = useDonnees(() => carteSignalements({ statut: statut || undefined, urgence: urgence || undefined }), [statut, urgence], { intervalle: 60000 })
  const moi = useDonnees(profil, [])
  const mes = useDonnees(() => mesSignalements({ limit: 5 }), [], { intervalle: 60000 })
  const classement = useDonnees(topCitoyens, [])
  const [miseAJour, setMiseAJour] = useState(() => new Date())
  const c = mes.donnees?.compteurs

  const cadre = useMemo(() => {
    if (choisi) return [[choisi.latitude, choisi.longitude]]
    if (gps.position) return [gps.position]
    return null
  }, [choisi, gps.position])

  const rafraichir = async () => {
    await Promise.all([carte.recharger({ silencieux: true }), mes.recharger({ silencieux: true })])
    setMiseAJour(new Date())
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px]">{t('Mon Espace Citoyen')}</h1>
          <p className="mt-1 text-encre-doux">{t('Suivez vos signalements et vos points écologiques')}</p>
        </div>
        <Link to="/citoyen/signaler" className="btn-principal px-5">
          <Plus className="h-5 w-5" /> {t('Nouveau signalement')}
        </Link>
      </div>

      {/* Actions rapides */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="carte p-6">
          <h2 className="text-lg">{t('Signaler un problème')}</h2>
          <p className="mt-1 text-sm text-encre-doux">{t('Déclarez un nouveau signalement avec toutes les informations utiles.')}</p>
          <Link to="/citoyen/signaler" className="btn-accent mt-4 w-full">
            {t('Signaler maintenant')}
          </Link>
        </div>
        <div className="carte p-6">
          <h2 className="text-lg">{t("Consulter l'historique")}</h2>
          <p className="mt-1 text-sm text-encre-doux">{t('Retrouvez facilement vos signalements passés et leur statut.')}</p>
          <Link to="/citoyen/signalements" className="btn-secondaire mt-4 w-full">
            {t('Voir mes signalements')}
          </Link>
        </div>
      </div>

      {moi.donnees && <CartePoints points={moi.donnees.points_eco ?? 0} />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Compteur valeur={c?.total ?? '—'} libelle={t('Total')} couleur="vert" />
        <Compteur valeur={c?.en_attente ?? '—'} libelle={t('En attente')} couleur="ambre" />
        <Compteur valeur={c ? c.valide + c.en_cours : '—'} libelle={t('En cours')} couleur="bleu" />
        <Compteur valeur={c?.collecte ?? '—'} libelle={t('Collectés')} couleur="vert" />
      </div>

      {/* Carte des signalements */}
      <section className="carte p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl">{t('Carte des signalements')}</h2>
            <p className="text-sm text-encre-doux">{t('Filtres actifs pour la carte et le tableau.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondaire min-h-[38px]"
              onClick={() => {
                setStatut('')
                setUrgence('')
                setChoisi(null)
              }}
            >
              <RotateCcw className="h-4 w-4" /> {t('Réinitialiser')}
            </button>
            <button type="button" className="btn-secondaire min-h-[38px]" onClick={gps.localiser} disabled={gps.recherche}>
              {gps.recherche ? <Spinner className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} {t('Me géolocaliser')}
            </button>
            <button type="button" className="btn-secondaire min-h-[38px]" onClick={rafraichir}>
              <RefreshCw className="h-4 w-4" /> {t('Rafraîchir')}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="etiquette">{t('Statut')}</p>
            <Pastilles options={STATUTS} valeur={statut} onChange={setStatut} libelle={t('Statut')} />
          </div>
          <div>
            <p className="etiquette">{t('Urgence')}</p>
            <Pastilles options={NIVEAUX} valeur={urgence} onChange={setUrgence} libelle={t('Urgence')} />
          </div>
        </div>
        {gps.erreur && <p className="mt-3 text-sm text-ambre-700">{gps.erreur}</p>}
        <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm text-encre-doux">
          <span>{t('Dernière mise à jour : {heure}', { heure: miseAJour.toLocaleTimeString('fr-FR') })}</span>
          <span>{t('{n} signalement(s) affiché(s)', { n: carte.donnees?.length ?? 0 })}</span>
        </div>

        <Carte className="mt-3 h-[380px] sm:h-[440px]" zoom={13}>
          {carte.donnees?.map((s) => (
            <MarqueurSignalement key={s.id} signalement={s} estompe={s.statut === 'collecte'} onClick={setChoisi}>
              <div className="w-52 space-y-2">
                {s.photo_url && <img src={s.photo_url} alt="" className="h-28 w-full rounded-lg object-cover" loading="lazy" />}
                <div className="flex flex-wrap gap-1.5">
                  <StatutBadge statut={s.statut} />
                  <UrgenceBadge urgence={s.urgence} compact />
                </div>
                {s.description && <p>{s.description}</p>}
                <p className="text-xs text-encre-pale">
                  {s.zone_nom ?? t('Hors zone')} · {dateCourte(s.created_at)}
                </p>
              </div>
            </MarqueurSignalement>
          ))}
          <MaPosition position={gps.position} />
          {cadre && <Cadrer points={cadre} max={16} />}
        </Carte>

        {/* Repères sous la carte */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-trait p-3">
            <p className="text-xs font-semibold text-encre-doux">{t('Statut')}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {STATUTS.slice(1).map(([v, l]) => (
                <span key={v} className="rounded-md bg-fond px-2 py-0.5 text-[11px] text-encre-doux">
                  {t(l)}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-trait p-3">
            <p className="text-xs font-semibold text-encre-doux">{t('Urgence')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(URGENCES).map(([k, u]) => (
                <span key={k} className="inline-flex items-center gap-1 text-[11px] text-encre-doux">
                  <span className="h-2 w-2 rounded-full" style={{ background: u.couleur }} />
                  {t(u.libelle)}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-trait p-3">
            <p className="text-xs font-semibold text-encre-doux">{t('Astuce')}</p>
            <p className="mt-1 text-xs text-encre-doux">{t('Cliquez sur un marqueur pour centrer et afficher le signalement.')}</p>
          </div>
          <div className="rounded-xl border border-trait p-3">
            <p className="text-xs font-semibold text-encre-doux">{t('Centre ville')}</p>
            <p className="mt-1 text-xs text-encre-doux">{t('Les signalements sont localisés automatiquement selon vos données.')}</p>
          </div>
        </div>
      </section>

      {/* Historique en photos */}
      <section>
        <h2 className="mb-3 text-xl">{t('Historique')}</h2>
        {mes.donnees?.signalements.length === 0 && (
          <p className="carte p-5 text-sm text-encre-doux">{t('Aucun signalement pour l’instant. Le premier vous rapporte 2 points.')}</p>
        )}
        <ul className="space-y-3">
          {mes.donnees?.signalements.map((s) => (
            <li key={s.id} className="carte flex items-start gap-4 p-4">
              <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-fond">
                {s.photo_url ? (
                  <img src={s.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center text-encre-pale">
                    <ImageOff className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{s.description ?? t('Sans description')}</p>
                  <StatutBadge statut={s.statut} />
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-encre-doux">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {s.zone_nom ?? s.adresse ?? t('Hors zone')}
                  </span>
                  <span>{dateCourte(s.created_at)}</span>
                </p>
              </div>
              <button type="button" className="btn-secondaire min-h-0 p-2" onClick={() => setDetail(s)} aria-label="Voir le signalement">
                <Eye className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Classement */}
      <section className="carte p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <Trophy className="h-5 w-5 text-ambre" /> {t('Top Citoyens Écologiques')}
        </h2>
        <ol className="mt-4 space-y-2">
          {classement.donnees?.map((c, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${c.moi ? 'bg-vert-50 ring-1 ring-vert-300' : 'bg-fond/70'}`}>
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0 ? 'bg-ambre-100 text-ambre-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white text-encre-doux'
                }`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {c.nom}
                  {c.moi && <span className="ml-1.5 text-xs font-semibold text-vert">· vous</span>}
                </span>
                <span className="block text-xs text-encre-pale">{c.quartier ?? t('Quartier non spécifié')}</span>
              </span>
              <span className="font-semibold text-vert">{c.points_eco} pts</span>
            </li>
          ))}
        </ol>
      </section>

      <Modal ouvert={Boolean(detail)} onFermer={() => setDetail(null)} titre={detail?.description ?? 'Signalement'} large>
        {detail && (
          <div className="space-y-3">
            {detail.photo_url && <img src={detail.photo_url} alt="Photo du dépôt" className="max-h-[60vh] w-full rounded-xl object-contain" />}
            <div className="flex flex-wrap gap-2">
              <StatutBadge statut={detail.statut} />
              <UrgenceBadge urgence={detail.urgence} />
            </div>
            <p className="text-sm text-encre-doux">
              {[detail.adresse, detail.zone_nom].filter(Boolean).join(', ') || t('Hors zone')} · {dateHeure(detail.created_at)}
            </p>
            <Link to="/citoyen/signalements" className="btn-secondaire">
              {t('Voir mes signalements')}
            </Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
