import { useState, useEffect } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('pwa-banner-dismissed')
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (stored || standalone) return

    const appleDevice = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIos(appleDevice)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setVisible(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    const timer = appleDevice ? setTimeout(() => setVisible(true), 2500) : undefined

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (timer !== undefined) clearTimeout(timer)
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
    } else if (isIos) {
      setVisible(false)
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    localStorage.setItem('pwa-banner-dismissed', '1')
  }

  return (
    <div className="animate-slide-up fixed bottom-20 left-3 right-3 z-50 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)' }}>
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <span className="text-xl">🛍️</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-tight">Installer l'application Doukouré Import</p>
          <p className="text-indigo-200 text-xs mt-0.5">{isIos ? 'Dans Safari : Partager puis Sur l’écran d’accueil' : 'Installez-la pour utiliser le suivi hors-ligne'}</p>
        </div>
        {isIos ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold text-white"><Share size={13} /> Partager</span>
        ) : (
          <button
            onClick={handleInstall}
            disabled={!deferredPrompt}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: '#059669' }}>
            <Download size={13} />
            Installer
          </button>
        )}
        <button onClick={handleDismiss} className="shrink-0 rounded-lg p-1.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <X size={14} className="text-white" />
        </button>
      </div>
    </div>
  )
}
