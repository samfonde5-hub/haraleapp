import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts: sirf Devanagari + Latin, woff2 only (pehle saare languages ke 1.4MB fonts aa rahe the)
import './fonts.css'
import './index.css'
import './i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// Patient app ka code, browser free hote hi pehle se le aao (agli screen instant khule)
const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb) : setTimeout(cb, 1500))
idle(() => { import('./patient/PatientApp') })
