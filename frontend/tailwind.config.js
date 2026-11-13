/** @type {import('tailwindcss').Config} */
// Identité visuelle d'origine de Tanàna Madio (mai 2026) :
// vert émeraude, fond menthe très clair, cartes blanches et cartes pastel, ardoise pour le texte.
// Le rouge reste réservé à l'urgence critique.
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
  theme: {
    extend: {
      // Direction « Forêt et or » : forêt profond pour les surfaces de prestige (barre latérale,
      // accueil, connexion), Vert Madio du logo pour les actions, or champagne réservé à ce qui compte
      // (élément actif, priorités, points éco, étapes), fond porcelaine. Rouge : urgence critique seulement.
      colors: {
        vert: {
          DEFAULT: '#008043', // Vert Madio (logo) : boutons et liens, 5:1 sur blanc
          50: '#EAF4EE',
          100: '#D3E8DB',
          300: '#8CC5A2',
          500: '#13955A', // jade : icônes, barres, tracés
          600: '#008043',
          700: '#00602F', // Vert profond (logo)
        },
        or: { DEFAULT: '#C9A55C', 50: '#FBF6EA', 100: '#F3E7C8', 300: '#E1C88C', clair: '#E9D6A6', 700: '#8A6A22' },
        ardoise: { DEFAULT: '#0B1F17', 800: '#16302A', 700: '#2E4A40' },
        menthe: '#9FD8B8', // repère clair sur fond forêt
        fond: '#F4F6F3', // porcelaine
        sombre: { DEFAULT: '#062A1C', 800: '#0A3624', 700: '#0F4430' }, // forêt profond
        encre: { DEFAULT: '#0B1F17', doux: '#4A5A52', pale: '#87958D' },
        trait: '#E1E6E1',
        ambre: { DEFAULT: '#F59E0B', 700: '#B45309', 100: '#FEF3C7', 50: '#FFFBEB' },
        alerte: { DEFAULT: '#DC2626', 50: '#FEF2F2', 100: '#FEE2E2', 700: '#B91C1C' },
      },
      fontFamily: {
        titre: ['Poppins', '"Inter Variable"', 'system-ui', 'sans-serif'], // police du logo
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { carte: '16px' },
      boxShadow: {
        carte: '0 1px 2px rgba(6, 42, 28, 0.04), 0 2px 8px -2px rgba(6, 42, 28, 0.06)',
        survol: '0 12px 28px -12px rgba(6, 42, 28, 0.22)',
        flotte: '0 24px 48px -20px rgba(6, 42, 28, 0.45)',
        or: '0 0 0 1px rgba(201, 165, 92, 0.55), 0 10px 30px -12px rgba(201, 165, 92, 0.45)',
      },
      keyframes: {
        flotter: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        clignoter: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        apparaitre: { from: { opacity: '0', transform: 'scale(0.4)' }, to: { opacity: '1', transform: 'scale(1)' } },
        entree: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } }, // « none » à la fin : pas de cadre de référence pour les éléments fixes (barre du chauffeur)
        poser: { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        flotter: 'flotter 4s ease-in-out infinite',
        'flotter-lent': 'flotter 5.5s ease-in-out infinite 0.8s',
        clignoter: 'clignoter 1.6s ease-in-out infinite',
        apparaitre: 'apparaitre 0.6s ease-out both',
        entree: 'entree 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        poser: 'poser 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
