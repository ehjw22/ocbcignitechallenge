import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/opendyslexic/latin-400.css'
import '@fontsource/opendyslexic/latin-700.css'
import App from './App'
import { AppProvider } from './context/AppContext'
import { Compare } from './pages/Compare'
import './index.css'

const comparePage = window.location.pathname.startsWith('/compare')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {comparePage ? (
      <Compare />
    ) : (
      <BrowserRouter>
        <AppProvider>
          <App />
        </AppProvider>
      </BrowserRouter>
    )}
  </StrictMode>,
)
