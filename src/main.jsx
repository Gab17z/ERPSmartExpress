import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from '@/App.jsx'
import '@/index.css'

// Registra o Service Worker do PWA com auto-update
registerSW({
  onNeedRefresh() {
    // Atualiza automaticamente quando há nova versão
    console.log('[PWA] Nova versão disponível, atualizando...')
  },
  onOfflineReady() {
    console.log('[PWA] App pronto para uso offline')
  },
  onRegisteredSW(swUrl, registration) {
    // Verifica atualizações a cada hora
    if (registration) {
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 