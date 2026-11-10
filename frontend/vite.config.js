import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En développement, /api et /uploads sont relayés vers l'API (port 3000) : pas de CORS à gérer
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
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
