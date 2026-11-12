import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
// Tangkap event instal PWA sedini mungkin (bisa datang sebelum React selesai render)
import './lib/installPrompt'
import App from './App.jsx'

// Register PWA service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Versi baru FinanceMe tersedia. Muat ulang sekarang?')) {
      updateSW(true)
    }
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Semua animasi framer-motion mengikuti pengaturan "kurangi gerakan" perangkat */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
