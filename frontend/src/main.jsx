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
            style: { borderRadius: '14px', background: '#052E16', color: '#F0FDF4', fontSize: '14px' },
            success: { iconTheme: { primary: '#22C55E', secondary: '#052E16' } },
            error: { style: { borderRadius: '14px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
