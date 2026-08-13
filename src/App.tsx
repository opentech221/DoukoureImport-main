import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { Bell, Home, Package, QrCode, Search, Settings, ShoppingBag, Calculator } from 'lucide-react'
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

type DesktopHeaderProps = {
  activeScreen: Screen
  searchQuery: string
  onSearchChange: (value: string) => void
  onNavigate: (screen: Screen) => void
  onIntentPrefetch: (screen: Screen) => void
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
      className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md border-t border-slate-100 md:hidden"
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

const DESKTOP_NAV_ITEMS: Array<{ id: Screen; label: string; Icon: typeof Home }> = [
  { id: 'home', label: 'Accueil', Icon: Home },
  { id: 'product', label: 'Catalogue', Icon: ShoppingBag },
  { id: 'tracking', label: 'Suivi', Icon: Package },
  { id: 'delivery', label: 'Pass livraison', Icon: QrCode },
  { id: 'engine', label: 'Moteur tarifaire', Icon: Calculator },
  { id: 'admin', label: 'Administration', Icon: Settings },
]

function DesktopHeader({
  activeScreen,
  searchQuery,
  onSearchChange,
  onNavigate,
  onIntentPrefetch,
}: DesktopHeaderProps) {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-border bg-card/95 shadow-sm backdrop-blur md:block">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex shrink-0 items-center gap-3 text-left"
          aria-label="Retour à l'accueil Doukoure Import"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-black text-white shadow-sm">
            DI
          </span>
          <span className="hidden xl:block">
            <span className="block text-sm font-extrabold leading-tight text-text">Doukoure Import</span>
            <span className="block text-[11px] font-medium text-text-muted">Chine → Sénégal</span>
          </span>
        </button>

        <label className="relative min-w-0 max-w-2xl flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            onFocus={() => onIntentPrefetch('home')}
            placeholder="Rechercher dans le catalogue..."
            className="h-11 w-full rounded-xl border border-border bg-surface-muted pl-10 pr-4 text-sm font-medium text-text outline-none transition focus:border-focus focus:bg-card"
            aria-label="Recherche globale"
          />
        </label>

        <nav className="flex items-center gap-1" aria-label="Navigation principale">
          {DESKTOP_NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = activeScreen === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                onMouseEnter={() => onIntentPrefetch(id)}
                onFocus={() => onIntentPrefetch(id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? 'bg-primary-soft text-primary' : 'text-text-muted hover:bg-surface-muted hover:text-text'}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} />
                <span className="hidden xl:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          className="relative hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-text-muted transition hover:bg-surface-muted lg:flex"
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>
      </div>
    </header>
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
  const [globalSearchQuery, setGlobalSearchQuery] = useState('')
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

  function handleGlobalSearch(value: string) {
    setGlobalSearchQuery(value)
    if (screen !== 'home') {
      handleNavigate({ screen: 'home' })
    }
  }

  const renderScreen = () => {
    switch (screen) {
      case 'home':     return <HomePage onNavigate={handleNavigate} globalSearchQuery={globalSearchQuery} />
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
    <div className="relative min-h-screen w-full bg-surface">
      <DesktopHeader
        activeScreen={screen}
        searchQuery={globalSearchQuery}
        onSearchChange={handleGlobalSearch}
        onNavigate={(nextScreen) => handleNavigate({ screen: nextScreen })}
        onIntentPrefetch={(nextScreen) => prefetchScreen(nextScreen, 'intent')}
      />

      <div className="mx-auto max-w-400 pb-20 md:pb-8">
        <Suspense fallback={<ScreenLoader />}>
          {renderScreen()}
        </Suspense>
      </div>

      {useEnhancedNav ? (
        <Suspense fallback={null}>
          <div className="md:hidden">
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
          </div>
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
