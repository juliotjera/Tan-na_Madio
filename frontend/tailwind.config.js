/** @type {import('tailwindcss').Config} */
export default {
  content: { relative: true, files: ['./index.html', './src/**/*.{js,jsx}'] },
  theme: {
    extend: {
      colors: {
        // Palette du rapport : forêt profonde, vert d'action, ambre d'attention, voile menthe
        foret: { DEFAULT: '#052E16', 900: '#052E16', 800: '#0A3D20', 700: '#14532D', 600: '#1B6B3A' },
        feuille: { DEFAULT: '#22C55E', 600: '#16A34A', 700: '#15803D', 100: '#DCFCE7', 50: '#F0FDF4' },
        ambre: { DEFAULT: '#F59E0B', 700: '#B45309', 100: '#FEF3C7', 50: '#FFFBEB' },
        menthe: '#F0FDF4',
        encre: { DEFAULT: '#14231A', doux: '#4B5E52', pale: '#7D8F83' },
        trait: '#D9E6DD',
        alerte: { DEFAULT: '#DC2626', 50: '#FEF2F2', 100: '#FEE2E2', 700: '#B91C1C' },
      },
      fontFamily: {
        titre: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Public Sans Variable"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { carte: '14px' },
      boxShadow: {
        carte: '0 1px 2px rgba(5, 46, 22, 0.06), 0 1px 1px rgba(5, 46, 22, 0.04)',
        flotte: '0 12px 32px -12px rgba(5, 46, 22, 0.35)',
      },
    },
  },
  plugins: [],
}
