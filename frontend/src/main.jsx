import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { LangueProvider } from './context/LangueContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LangueProvider>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '8px', background: '#065F46', color: '#FFFFFF', fontSize: '14px' },
            success: { iconTheme: { primary: '#6EE7B7', secondary: '#065F46' } },
            error: { style: { borderRadius: '8px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' } },
          }}
        />
      </AuthProvider>
      </LangueProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Application installable et utilisable avec un réseau faible (production uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
