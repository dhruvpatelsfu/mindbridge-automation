import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('root element missing')
}

createRoot(container).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
)
