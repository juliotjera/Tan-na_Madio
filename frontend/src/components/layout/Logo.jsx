// Logo de Tanàna Madio : épingle de carte + bac de collecte municipal (public/logo/), décliné en
// « Asphalte et or » (kit vert d'origine : D:\EGO\tanana_madio_reconstruction\logo).
// Ne pas déformer ; symbole ≥ 24 px, logo horizontal ≥ 140 px de large.

// Symbole seul (barre latérale repliée, petits espaces)
export function Marque({ className = 'h-9 w-9', blanc = false, alt = 'Tanàna Madio' }) {
  return <img src={blanc ? '/logo/symbole-blanc.svg' : '/logo/symbole.svg'} alt={alt} className={`shrink-0 ${className}`} />
}

// Logo horizontal : sans slogan dans l'application, avec « Signaler · Collecter · Ville propre » sur
// l'accueil (sousTitre), version pour fond sombre (clair). Symbole seul sous 400 px de large.
export function Logo({ clair = false, sousTitre = false, className = '' }) {
  const fichier = clair ? 'logo-horizontal-fond-sombre' : sousTitre ? 'logo-horizontal' : 'logo-horizontal-sans-slogan'
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img src={`/logo/${fichier}.svg`} alt="Tanàna Madio" className={`${sousTitre ? 'h-14 max-[400px]:hidden' : clair ? 'h-14' : 'h-11'} w-auto`} />
      {sousTitre && <Marque className="h-11 w-11 min-[401px]:hidden" />}
    </span>
  )
}

// Immatriculation d'un camion
export function Plaque({ numero, className = '' }) {
  return (
    <span className={`plaque ${className}`} title={`Camion ${numero}`}>
      <span aria-hidden>MG</span>
      <span>{numero}</span>
    </span>
  )
}
