import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '8px', background: '#0C1A2B', color: '#FFFFFF', fontSize: '14px' },
            success: { iconTheme: { primary: '#8EC5FF', secondary: '#0C1A2B' } },
            error: { style: { borderRadius: '8px', background: '#FEF3F2', color: '#B42318', fontSize: '14px' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Application installable et utilisable avec un réseau faible (production uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
