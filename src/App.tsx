import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { attachDeliveryPassReplayHandlers } from './utils/deliveryPassOffline'

const HomePage = lazy(() => import('./screens/HomePage'))
const ProductPage = lazy(() => import('./screens/ProductPage'))
const TrackingDashboard = lazy(() => import('./screens/TrackingDashboard'))
const DeliveryPass = lazy(() => import('./screens/DeliveryPass'))
const AdminPanel = lazy(() => import('./screens/AdminPanel'))
const PricingEngineDemo = lazy(() => import('./screens/PricingEngineDemo'))
const BottomNav = lazy(() => import('./components/navigation/BottomNav'))
const InstallPWABanner = lazy(() => import('./components/InstallPWABanner'))

const SCREEN_PREFETCHERS: Record<Screen, () => Promise<unknown>> = {
  home: () => import('./screens/HomePage'),
  product: () => import('./screens/ProductPage'),
  tracking: () => import('./screens/TrackingDashboard'),
  delivery: () => import('./screens/DeliveryPass'),
  engine: () => import('./screens/PricingEngineDemo'),
  admin: () => import('./screens/AdminPanel'),
}

const NEXT_SCREEN_PROBABILITIES: Record<Screen, Screen[]> = {
  home: ['product', 'tracking'],
  product: ['tracking', 'delivery'],
  tracking: ['delivery', 'home'],
  delivery: ['home', 'tracking'],
  engine: ['home', 'product'],
  admin: ['home'],
}

type Screen = 'home' | 'product' | 'tracking' | 'delivery' | 'engine' | 'admin'
type AppNavigateTarget =
  | { screen: 'home' }
  | { screen: 'product'; productId?: string | number | null }
  | { screen: 'tracking'; orderRef?: string | null }
  | { screen: 'delivery'; orderRef?: string | null }
  | { screen: 'engine' }
  | { screen: 'admin' }

type BasicBottomNavProps = {
  activeScreen: Screen
  onNavigate: (screen: Screen) => void
  onIntentPrefetch: (screen: Screen) => void
  onTouchIntentPrefetch: (screen: Screen) => void
  minimal?: boolean
}

const BASIC_NAV_ITEMS: Array<{ id: Screen; label: string }> = [
  { id: 'home', label: 'Accueil' },
  { id: 'product', label: 'Produit' },
  { id: 'tracking', label: 'Suivi' },
  { id: 'delivery', label: 'Pass' },
  { id: 'engine', label: 'Moteur' },
  { id: 'admin', label: 'Admin' },
]

const BASIC_NAV_ITEMS_MINIMAL: Array<{ id: Screen; label: string }> = [
  { id: 'home', label: 'Accueil' },
  { id: 'product', label: 'Produit' },
]

function BasicBottomNav({
  activeScreen,
  onNavigate,
  onIntentPrefetch,
  onTouchIntentPrefetch,
  minimal = false,
}: BasicBottomNavProps) {
  const items = minimal ? BASIC_NAV_ITEMS_MINIMAL : BASIC_NAV_ITEMS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-100 max-w-md mx-auto"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)' }}>
      <div className={`grid gap-1 px-1 py-2 ${minimal ? 'grid-cols-2' : 'grid-cols-6'}`}>
        {items.map(({ id, label }) => {
          const active = activeScreen === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              onMouseEnter={() => onIntentPrefetch(id)}
              onFocus={() => onIntentPrefetch(id)}
              onTouchStart={() => onTouchIntentPrefetch(id)}
              className="px-1 py-2 rounded-lg text-xs font-semibold transition-colors"
              style={{
                color: active ? '#1E1B4B' : '#64748B',
                background: active ? '#EEF2FF' : 'transparent',
              }}>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function ScreenLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-transparent animate-spin" />
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedOrderRef, setSelectedOrderRef] = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | number | null>(null)
  const [showPWABanner, setShowPWABanner] = useState(false)
  const [useEnhancedNav, setUseEnhancedNav] = useState(false)
  const [isConstrainedNetwork, setIsConstrainedNetwork] = useState(false)
  const prefetchedScreensRef = useRef<Set<Screen>>(new Set())
  const lastTouchPrefetchAtRef = useRef(0)

  const enableEnhancedNav = useCallback(() => {
    import('./components/navigation/BottomNav')
      .then(() => {
        setUseEnhancedNav(true)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    return attachDeliveryPassReplayHandlers(30000)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const fallbackTimeout = window.setTimeout(() => {
      setShowPWABanner(true)
    }, 1500)

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    const idleHandle = idleWindow.requestIdleCallback?.(() => {
      setShowPWABanner(true)
    }, { timeout: 2000 })

    return () => {
      window.clearTimeout(fallbackTimeout)
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }

    const connectionType = nav.connection?.effectiveType
    const constrainedByConnection = nav.connection
      ? nav.connection.saveData === true || connectionType !== '4g'
      : false

    setIsConstrainedNetwork(constrainedByConnection)

    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'touchstart', 'keydown']
    const onFirstInteraction = () => {
      enableEnhancedNav()
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstInteraction)
      })
    }

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, onFirstInteraction, { passive: true })
    })

    if (constrainedByConnection) {
      return () => {
        interactionEvents.forEach((eventName) => {
          window.removeEventListener(eventName, onFirstInteraction)
        })
      }
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }

    const idleHandle = idleWindow.requestIdleCallback?.(() => {
      enableEnhancedNav()
    }, { timeout: 2400 })

    return () => {
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, onFirstInteraction)
      })
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle)
      }
    }
  }, [enableEnhancedNav])

  function isMobilePrefetchConstrained() {
    if (typeof window === 'undefined') return false

    const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const smallViewport = window.matchMedia?.('(max-width: 768px)').matches ?? false

    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
    const saveData = nav.connection?.saveData === true
    const slowNetwork = ['slow-2g', '2g'].includes(nav.connection?.effectiveType ?? '')

    return hasCoarsePointer || smallViewport || saveData || slowNetwork
  }

  function prefetchScreen(screenToPrefetch: Screen, reason: 'intent' | 'probabilistic') {
    if (prefetchedScreensRef.current.has(screenToPrefetch)) return
    if (reason === 'probabilistic' && isMobilePrefetchConstrained()) return

    prefetchedScreensRef.current.add(screenToPrefetch)
    SCREEN_PREFETCHERS[screenToPrefetch]().catch(() => {
      prefetchedScreensRef.current.delete(screenToPrefetch)
    })
  }

  function prefetchLikelyNext(activeScreen: Screen) {
    const candidates = NEXT_SCREEN_PROBABILITIES[activeScreen] ?? []
    const limit = isMobilePrefetchConstrained() ? 1 : 2

    for (const candidate of candidates.slice(0, limit)) {
      prefetchScreen(candidate, 'probabilistic')
    }
  }

  function handleNavigate(target: AppNavigateTarget) {
    prefetchScreen(target.screen, 'intent')

    if (target.screen === 'product' && target.productId !== undefined) {
      setSelectedProductId(target.productId)
    }
    if ((target.screen === 'tracking' || target.screen === 'delivery') && target.orderRef !== undefined) {
      setSelectedOrderRef(target.orderRef)
    }

    prefetchLikelyNext(target.screen)
    setScreen(target.screen)
  }

  const renderScreen = () => {
    switch (screen) {
      case 'home':     return <HomePage onNavigate={handleNavigate} />
      case 'product':  return <ProductPage onNavigate={handleNavigate} productId={selectedProductId} />
      case 'tracking': return <TrackingDashboard orderRef={selectedOrderRef} />
      case 'delivery': return <DeliveryPass orderRef={selectedOrderRef} />
      case 'engine':   return <PricingEngineDemo />
      case 'admin':    return <AdminPanel />
    }
  }

  if (screen === 'admin') {
    return (
      <div className="min-h-screen">
        <Suspense fallback={<ScreenLoader />}>
          <AdminPanel onBack={() => handleNavigate({ screen: 'home' })} />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="min-h-screen max-w-md mx-auto relative" style={{ background: '#F8FAFC' }}>
      <div className="pb-20">
        <Suspense fallback={<ScreenLoader />}>
          {renderScreen()}
        </Suspense>
      </div>

      {useEnhancedNav ? (
        <Suspense fallback={null}>
          <BottomNav
            activeScreen={screen}
            onNavigate={(targetScreen) => handleNavigate({ screen: targetScreen })}
            onIntentPrefetch={(targetScreen) => prefetchScreen(targetScreen, 'intent')}
            onTouchIntentPrefetch={(targetScreen) => {
              const now = Date.now()
              if (now - lastTouchPrefetchAtRef.current < 2500) return
              lastTouchPrefetchAtRef.current = now
              prefetchScreen(targetScreen, 'intent')
            }}
          />
        </Suspense>
      ) : (
        <BasicBottomNav
          activeScreen={screen}
          onNavigate={(targetScreen) => handleNavigate({ screen: targetScreen })}
          onIntentPrefetch={(targetScreen) => prefetchScreen(targetScreen, 'intent')}
          minimal={isConstrainedNetwork}
          onTouchIntentPrefetch={(targetScreen) => {
            const now = Date.now()
            if (now - lastTouchPrefetchAtRef.current < 2500) return
            lastTouchPrefetchAtRef.current = now
            prefetchScreen(targetScreen, 'intent')
          }}
        />
      )}

      {showPWABanner ? (
        <Suspense fallback={null}>
          <InstallPWABanner />
        </Suspense>
      ) : null}
    </div>
  )
}
