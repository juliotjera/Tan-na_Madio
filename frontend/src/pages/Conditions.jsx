// Conditions d'utilisation et confidentialité (liens du pied de page de l'accueil)
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Logo } from '../components/layout/Logo'

export default function Conditions() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="min-h-screen bg-fond">
      <header className="border-b border-trait bg-white">
        <div className="mx-auto flex h-[76px] max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Accueil">
            <Logo sousTitre />
          </Link>
          <Link to="/" className="btn-discret">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <section className="carte p-6 sm:p-8">
          <h1 className="text-[28px]">Conditions d’utilisation</h1>
          <div className="mt-4 space-y-3 text-encre-doux">
            <p>Tanàna Madio permet aux habitants d’Antananarivo de signaler des dépôts d’ordures et à la commune d’organiser leur ramassage.</p>
            <p>En créant un compte, vous vous engagez à signaler des dépôts réels, avec des photos prises sur place, sans y faire figurer de personne identifiable.</p>
            <p>Les agents municipaux peuvent rejeter un signalement en double ou inexact. Un compte utilisé de façon abusive peut être désactivé.</p>
          </div>
        </section>
        <section id="confidentialite" className="carte scroll-mt-6 p-6 sm:p-8">
          <h2 className="text-[24px]">Confidentialité</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-encre-doux">
            <li>Données conservées : nom, prénom, adresse e-mail, téléphone et quartier (facultatifs), signalements (position GPS, photo, description).</li>
            <li>Elles servent uniquement à vérifier les signalements et à organiser les tournées de collecte.</li>
            <li>Votre nom n’apparaît qu’au personnel municipal ; la carte publique ne montre que des points anonymes, et le classement n’affiche que votre prénom et l’initiale de votre nom.</li>
            <li>Les mots de passe sont chiffrés (bcrypt) et ne sont jamais lisibles, même par l’administrateur.</li>
            <li>Vous pouvez demander la suppression de votre compte auprès de l’administrateur de la commune.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
