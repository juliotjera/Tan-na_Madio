import { fileURLToPath } from 'node:url'

// chemin explicite : la configuration est trouvée quel que soit le dossier de lancement
export default {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.js', import.meta.url)) },
    autoprefixer: {},
  },
}
