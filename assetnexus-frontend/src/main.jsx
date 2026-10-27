import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './state/theme'
import './index.css'
import './extra.css'
import './design.css'
import './theme.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
