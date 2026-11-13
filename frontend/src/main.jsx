import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { LangueProvider } from './context/LangueContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {/* animations coupées si le téléphone demande moins de mouvement */}
      <MotionConfig reducedMotion="user">
      <LangueProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '12px', background: '#111820', color: '#FFFFFF', fontSize: '14px', border: '1px solid rgba(201,165,92,0.35)' },
            success: { iconTheme: { primary: '#C9A55C', secondary: '#111820' } },
            error: { style: { borderRadius: '8px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' } },
          }}
        />
      </AuthProvider>
      </LangueProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)

// Application installable et utilisable avec un réseau faible (production uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
