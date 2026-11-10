/** @type {import('tailwindcss').Config} */
// Identité « signalisation urbaine » :
// - couleurs froides (nuit, bleu signalisation) = l'action de la commune (validation, tournées, collecte) ;
// - couleurs chaudes (ambre, orange, rouge) = le problème (déchets, urgences). Le rouge est réservé au critique.
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
  theme: {
    extend: {
      colors: {
        nuit: { DEFAULT: '#0C1A2B', 800: '#13263D', 700: '#1B3452' },
        bleu: {
          DEFAULT: '#0E518D', // bleu signalisation (proche RAL 5017)
          50: '#EEF4FA',
          100: '#DCE8F4',
          300: '#8DB5DE',
          500: '#2A6DB0',
          700: '#0A3D6B',
        },
        ciel: '#8EC5FF', // repère clair sur fond sombre
        papier: '#F3F5F8',
        encre: { DEFAULT: '#16212E', doux: '#4F5D6E', pale: '#8592A3' },
        trait: '#DCE2EA',
        ambre: { DEFAULT: '#E8A317', 700: '#9A6200', 100: '#FCEFC9', 50: '#FFF8E6' },
        alerte: { DEFAULT: '#D92D20', 50: '#FEF3F2', 100: '#FEE4E2', 700: '#B42318' },
      },
      fontFamily: {
        titre: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { carte: '10px' },
      boxShadow: {
        carte: '0 1px 0 rgba(12, 26, 43, 0.04)',
        flotte: '0 16px 40px -16px rgba(12, 26, 43, 0.45)',
      },
    },
  },
  plugins: [],
}
