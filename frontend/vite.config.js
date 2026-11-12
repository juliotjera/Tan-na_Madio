import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, /api et /uploads sont relayés vers l'API (port 3000, ou API_URL) : pas de CORS à gérer
const API = process.env.API_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/uploads': API,
    },
  },
  // tests unitaires (Vitest) : navigateur simulé pour localStorage
  test: {
    environment: 'jsdom',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          carte: ['leaflet', 'react-leaflet'],
          graphiques: ['recharts'],
        },
      },
    },
  },
})
