import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('pwa-banner-dismissed')
    if (stored) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Show simulated banner in demo context after delay
    const timer = setTimeout(() => {
      if (!deferredPrompt) setVisible(true)
    }, 4000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  }, [])

  if (dismissed || !visible) return null

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
        setDismissed(true)
      }
    } else {
      // Demo: simulate install accepted
      setVisible(false)
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  return (
    <div className="animate-slide-up fixed bottom-20 left-3 right-3 z-50 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' }}>
      <div className="flex items-center gap-3 p-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <span className="text-xl">🛍️</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">Installer l'App Doukoure Import</p>
          <p className="text-indigo-200 text-xs mt-0.5">Sans passer par le Play Store — fonctionne hors-ligne</p>
        </div>
        <button
          onClick={handleInstall}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
          style={{ background: '#059669' }}>
          <Download size={13} />
          Installer
        </button>
        <button onClick={handleDismiss} className="flex-shrink-0 p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <X size={14} className="text-white" />
        </button>
      </div>
    </div>
  )
}
