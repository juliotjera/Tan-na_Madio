/** @type {import('tailwindcss').Config} */
// Identité visuelle d'origine de Tanàna Madio (mai 2026) :
// vert émeraude, fond menthe très clair, cartes blanches et cartes pastel, ardoise pour le texte.
// Le rouge reste réservé à l'urgence critique.
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
  theme: {
    extend: {
      colors: {
        vert: {
          DEFAULT: '#059669', // boutons et liens
          50: '#ECFDF5',
          100: '#D1FAE5',
          300: '#6EE7B7',
          500: '#10B981', // émeraude des icônes et des barres
          700: '#047857',
        },
        ardoise: { DEFAULT: '#111827', 800: '#1F2937', 700: '#374151' },
        menthe: '#6EE7B7', // repère clair sur fond sombre
        fond: '#F0FDF6',
        sombre: { DEFAULT: '#0B1F17', 800: '#10291F' }, // héros et pied de page de l'accueil
        encre: { DEFAULT: '#111827', doux: '#4B5563', pale: '#9CA3AF' },
        trait: '#E5E7EB',
        ambre: { DEFAULT: '#F59E0B', 700: '#B45309', 100: '#FEF3C7', 50: '#FFFBEB' },
        alerte: { DEFAULT: '#DC2626', 50: '#FEF2F2', 100: '#FEE2E2', 700: '#B91C1C' },
      },
      fontFamily: {
        titre: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { carte: '16px' },
      boxShadow: {
        carte: '0 1px 2px rgba(17, 24, 39, 0.04), 0 1px 3px rgba(17, 24, 39, 0.03)',
        flotte: '0 20px 40px -16px rgba(6, 78, 59, 0.35)',
      },
      keyframes: {
        flotter: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        clignoter: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        apparaitre: { from: { opacity: '0', transform: 'scale(0.4)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        flotter: 'flotter 4s ease-in-out infinite',
        'flotter-lent': 'flotter 5.5s ease-in-out infinite 0.8s',
        clignoter: 'clignoter 1.6s ease-in-out infinite',
        apparaitre: 'apparaitre 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}
