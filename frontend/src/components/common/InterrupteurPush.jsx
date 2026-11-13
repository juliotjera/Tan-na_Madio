// Activation des notifications sur cet appareil (Mon compte, tableau de bord chauffeur)
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { BellRing } from 'lucide-react'
import { activerPush, desactiverPush, etatPush } from '../../utils/push'
import { messageErreur } from '../../api/axiosConfig'
import { useLangue } from '../../context/LangueContext'
import { Spinner } from './ui'

const TEXTES = {
  actif: 'Activées sur cet appareil',
  inactif: 'Recevez une alerte sur ce téléphone, même application fermée.',
  refuse: 'Bloquées dans les réglages du navigateur pour ce site.',
  'non-supporte': 'Disponibles une fois l’application installée ou ouverte dans un navigateur récent.',
}

export default function InterrupteurPush({ compact = false }) {
  const { t } = useLangue()
  const [etat, setEtat] = useState(null)
  const [occupe, setOccupe] = useState(false)

  useEffect(() => {
    etatPush().then(setEtat)
  }, [])

  if (!etat || (compact && etat !== 'inactif')) return null

  const basculer = async () => {
    setOccupe(true)
    try {
      if (etat === 'actif') {
        await desactiverPush()
        toast.success(t('Notifications désactivées sur cet appareil'))
      } else {
        await activerPush()
        toast.success(t('Notifications activées sur cet appareil'))
      }
      setEtat(await etatPush())
    } catch (err) {
      toast.error(err.response ? messageErreur(err) : err.message)
    } finally {
      setOccupe(false)
    }
  }

  return (
    <section className={`carte flex items-center gap-4 ${compact ? 'border-or-300/60 p-4' : 'p-5'}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-or-50 text-marque">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold">{t('Notifications sur ce téléphone')}</h2>
        <p className="text-sm text-encre-doux">{t(TEXTES[etat])}</p>
      </div>
      {(etat === 'actif' || etat === 'inactif') && (
        <button type="button" className={etat === 'actif' ? 'btn-secondaire min-h-[38px]' : 'btn-principal min-h-[38px]'} disabled={occupe} onClick={basculer}>
          {occupe && <Spinner className="h-4 w-4" />}
          {etat === 'actif' ? t('Désactiver') : t('Activer')}
        </button>
      )}
    </section>
  )
}
