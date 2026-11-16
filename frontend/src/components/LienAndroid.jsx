// Télécharger l'application Android depuis le site (gratuit, sans magasin d'applications) :
// - téléphone Android : le bouton ;
// - ordinateur : le bouton et le QR code à scanner avec un téléphone Android ;
// - iPhone, et dans l'application Android elle-même : rien.
// L'API reprend la dernière version des Releases GitHub (voir backend/src/config/app.js).
import { Download, Smartphone } from 'lucide-react'
import { useLangue } from '../context/LangueContext'
import { natif, surAndroid, surIOS } from '../natif'

export const ADRESSE_APK = '/telecharger/tanana-madio.apk'

export default function LienAndroid() {
  const { t } = useLangue()
  if (natif || surIOS()) return null
  const android = surAndroid()

  return (
    <section
      aria-labelledby="lien-android-titre"
      className="mx-auto mt-6 flex max-w-[1050px] flex-col items-center gap-8 rounded-[24px] border border-trait bg-white p-8 text-center sm:flex-row sm:p-10 sm:text-left"
    >
      <div className="flex-1">
        <h2 id="lien-android-titre" className="flex items-center justify-center gap-2.5 font-titre text-xl font-semibold sm:justify-start sm:text-2xl">
          <Smartphone className="h-6 w-6 text-or-700" aria-hidden /> {t('L’application Android')}
        </h2>
        <p className="mt-2 text-lg text-encre-doux">{t('Installez Tanàna Madio sur votre téléphone Android : gratuit, sans magasin d’applications.')}</p>
        <a href={ADRESSE_APK} download="tanana-madio.apk" className="btn-principal mt-6 min-h-[52px] px-7 text-base">
          <Download className="h-5 w-5" aria-hidden /> {t('Télécharger l’application')}
        </a>
        <p className="mt-3 text-sm text-encre-pale">{t('Après le téléchargement, ouvrez le fichier et autorisez l’installation.')}</p>
      </div>
      {!android && (
        <figure className="shrink-0 text-center">
          <img src="/android-qr.svg" width="148" height="148" alt={t('Code QR pour télécharger l’application Android')} className="rounded-xl border border-trait p-2" />
          <figcaption className="mt-2 text-sm text-encre-doux">{t('Scannez avec votre téléphone')}</figcaption>
        </figure>
      )}
    </section>
  )
}
