import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Search, Camera, ChevronRight, TrendingUp, Star, Bell, Loader2, X, User, PackagePlus, Users, Clock } from 'lucide-react'
import SharedContainerProgress from '../components/SharedContainerProgress'
import ImageSearchUploader, { type SearchPayload } from '../components/ImageSearchUploader'
import ImmersiveVisualSearch from '../components/ImmersiveVisualSearch'
import { getPostgrestClient } from '../lib/getPostgrestClient'
import { getStorageClient } from '../lib/getStorageClient'
import { emitQaError, emitQaEvent } from '../utils/observability'
import type { HomeNotification } from '../components/home/NotificationsPanel'

const NotificationsPanel = lazy(() => import('../components/home/NotificationsPanel'))
const ProfilePanel = lazy(() => import('../components/home/ProfilePanel'))

// ---------------------------------------------------------------------------
// Fallback mock (si Supabase vide)
// ---------------------------------------------------------------------------

const FALLBACK_CONTAINER = {
  targetCBM:    68,
  allocatedCBM: 44.2,
  departure:    new Date(Date.now() + 3 * 86_400_000 + 14 * 3_600_000 + 22 * 60_000),
  name:         'Dakar #104',
}

const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Sneakers Nike Air Max',      price_xof: 58_750, image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop&auto=format', rating: 4.9, badge: 'Populaire' },
  { id: 2, name: 'Montre Xiaomi Smart Band 8', price_xof: 42_300, image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop&auto=format', rating: 4.7, badge: 'Nouveau'   },
  { id: 3, name: 'Sac à main cuir PU',         price_xof: 31_500, image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop&auto=format', rating: 4.8, badge: ''          },
  { id: 4, name: 'Écouteurs Bluetooth TWS',    price_xof: 18_200, image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&auto=format', rating: 4.6, badge: 'Promo'     },
]

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  Populaire: { bg: '#1E1B4B', color: 'white' },
  Nouveau:   { bg: '#059669', color: 'white' },
  Promo:     { bg: '#D97706', color: 'white' },
}

const GROUP_BUY_PREVIEW = [
  { joined: 2, size: 3, endsIn: '02:18:42' },
  { joined: 1, size: 3, endsIn: '01:07:18' },
  { joined: 2, size: 3, endsIn: '03:42:10' },
  { joined: 1, size: 3, endsIn: '00:46:55' },
]

type Product = { id: number; name: string; price_xof: number; image_url: string; rating: number; badge: string }
type ContainerData = { targetCBM: number; allocatedCBM: number; departure: Date; name: string }

// ---------------------------------------------------------------------------
// Données notifications mock
// ---------------------------------------------------------------------------

const NOTIFICATIONS: HomeNotification[] = [
  { id: 1, icon: '🚢', title: 'Conteneur Dakar #104 — 65% rempli', body: 'Le conteneur part dans 3 jours. Commandez vite !', time: 'Il y a 2h', read: false },
  { id: 2, icon: '📦', title: 'Votre commande ORD-2024-0847 est inspectée', body: 'Poids réel : 1.4 kg. Solde ajusté disponible.', time: 'Il y a 5h', read: false },
  { id: 3, icon: '✈️', title: 'Colis en transit vers Dakar', body: 'Votre Nike Air Max a quitté Guangzhou.', time: 'Hier', read: true },
  { id: 4, icon: '💸', title: 'Nouveaux tarifs appliqués', body: 'Aérien Express : 11 000 FCFA/kg · Éco : 7 500 FCFA/kg', time: 'Il y a 2 jours', read: true },
]

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

interface Props {
  onNavigate?: (target: { screen: string; productId?: string | number | null; orderRef?: string | null }) => void
  globalSearchQuery?: string
  visualSearchOpen?: boolean
  visualSearchMode?: 'catalog' | 'sourcing'
  onVisualSearchClose?: () => void
  requestedPanel?: 'notifications' | 'profile' | null
  onPanelHandled?: () => void
}

export default function HomePage({ onNavigate, globalSearchQuery = '', visualSearchOpen = false, visualSearchMode = 'sourcing', onVisualSearchClose, requestedPanel, onPanelHandled }: Props) {
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [container,    setContainer]    = useState<ContainerData>(FALLBACK_CONTAINER)
  const [products,     setProducts]     = useState<Product[]>(FALLBACK_PRODUCTS)
  const [loadingProd,  setLoadingProd]  = useState(true)
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [showVisualSearch, setShowVisualSearch] = useState(false)
  const [activeVisualMode, setActiveVisualMode] = useState<'catalog' | 'sourcing'>(visualSearchMode)
  const [catalogSearchLoading, setCatalogSearchLoading] = useState(false)
  const [catalogSearchComplete, setCatalogSearchComplete] = useState(false)
  const [notifRead,    setNotifRead]    = useState<Set<number>>(new Set(NOTIFICATIONS.filter(n => n.read).map(n => n.id)))
  const searchRef = useRef<HTMLInputElement>(null)

  const unreadCount = NOTIFICATIONS.filter(n => !notifRead.has(n.id)).length

  useEffect(() => {
    setSearchQuery(globalSearchQuery)
  }, [globalSearchQuery])

  useEffect(() => {
    setShowVisualSearch(visualSearchOpen)
    if (visualSearchOpen) setActiveVisualMode(visualSearchMode)
  }, [visualSearchOpen])

  useEffect(() => {
    if (!requestedPanel) return
    setShowNotifs(requestedPanel === 'notifications')
    setShowProfile(requestedPanel === 'profile')
    onPanelHandled?.()
  }, [onPanelHandled, requestedPanel])

  function closeVisualSearch() {
    setShowVisualSearch(false)
    onVisualSearchClose?.()
  }

  function openSourcing() {
    setActiveVisualMode('sourcing')
    setShowVisualSearch(true)
  }

  function handleCatalogVisualSearch(file: File | undefined) {
    if (!file) return
    setCatalogSearchLoading(true)
    setCatalogSearchComplete(false)
    window.setTimeout(() => {
      setCatalogSearchLoading(false)
      setCatalogSearchComplete(true)
      closeVisualSearch()
    }, 900)
  }

  const filteredProducts = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : products

  useEffect(() => {
    let cancelled = false

    async function loadHomeData() {
      try {
        const db = await getPostgrestClient()

        // Fetch container le plus proche (fallback silencieux si table absente)
        const { data: containerData, error: containerError } = await db
          .from('containers')
          .select('*')
          .order('departure_date')
          .limit(1)
          .single()

        if (!cancelled && !containerError && containerData) {
          setContainer({
            targetCBM:    containerData.target_cbm,
            allocatedCBM: containerData.allocated_cbm,
            departure:    new Date(containerData.departure_date),
            name:         containerData.container_id ?? 'Dakar #104',
          })
        }

        // Fetch produits populaires (fallback mock si erreur)
        const { data: productsData, error: productsError } = await db
          .from('products')
          .select('id, name, price_xof, image_url, rating, badge')
          .order('rating', { ascending: false })
          .limit(8)

        if (!cancelled && !productsError && productsData && productsData.length > 0) {
          setProducts(productsData)
        }
      } catch {
        // Mode dégradé: les fallbacks mock restent affichés.
      } finally {
        if (!cancelled) setLoadingProd(false)
      }
    }

    loadHomeData()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleVisualSearch(payload: SearchPayload) {
    const storage = await getStorageClient()
    const db = await getPostgrestClient()
    const ext  = payload.file.name.split('.').pop() ?? 'jpg'
    const path = `requests/${Date.now()}.${ext}`

    const { data: uploadData, error: uploadError } = await storage
      .from('search-uploads')
      .upload(path, payload.file, { upsert: false })

    if (uploadError) {
      emitQaError('home:visual-search-upload-failed', uploadError, {
        path,
      })
      throw new Error('Upload indisponible sur cet environnement (bucket "search-uploads" manquant ou non autorisé).')
    }

    const { data: urlData } = storage
      .from('search-uploads')
      .getPublicUrl(uploadData?.path ?? path)

    const { error: insertError } = await db.from('visual_search_requests').insert({
      file_url:        urlData.publicUrl,
      budget_xof:      payload.budgetXOF ? parseInt(payload.budgetXOF, 10) : null,
      size_color_qty:  payload.sizingNote,
      whatsapp_phone:  `+221${payload.whatsappPhone.replace(/\s/g, '')}`,
      status:          'PENDING',
    })

    if (insertError) {
      emitQaError('home:visual-search-record-failed', insertError, {
        path,
      })
      throw new Error('Enregistrement indisponible (table "visual_search_requests" absente sur staging).')
    }

    emitQaEvent('home:visual-search-request-created', {
      path,
      budgetXOF: payload.budgetXOF ?? null,
    })
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header héro ── */}
      <div className="relative overflow-hidden px-4 pb-4 pt-6 md:hidden"
        style={{ background: 'linear-gradient(160deg, #1E1B4B 0%, #312E81 100%)' }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #A5B4FC, transparent)' }} />

        <div className="flex items-center justify-between mb-5 relative">
          <div>
            <p className="text-indigo-300 text-xs font-medium tracking-wide uppercase">Bienvenue sur</p>
            <h1 className="text-white font-extrabold text-2xl leading-tight mt-0.5">Doukoure Import</h1>
            <p className="text-indigo-300 text-xs mt-1 flex items-center gap-1.5">
              <span>🇨🇳</span>
              <span className="text-indigo-400">→</span>
              <span>🇸🇳</span>
              <span className="ml-1">Import direct Chine · Sénégal</span>
            </p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            {/* Cloche notifications */}
            <button
              onClick={() => { setShowNotifs(true); setNotifRead(new Set(NOTIFICATIONS.map(n => n.id))) }}
              className="w-9 h-9 rounded-full flex items-center justify-center relative transition-transform active:scale-90"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              aria-label="Notifications">
              <Bell size={16} className="text-white" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold border border-indigo-800"
                  style={{ background: '#EF4444', fontSize: 9 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {/* Profil */}
            <button
              onClick={() => setShowProfile(true)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              aria-label="Mon compte">
              <User size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative md:hidden">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher un produit…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchActive(true)}
            onBlur={() => setSearchActive(false)}
            className="w-full rounded-2xl border-2 py-3 pl-10 pr-24 text-sm font-medium placeholder-slate-400 outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.97)',
              color: '#1E1B4B',
              borderColor: searchActive ? '#059669' : 'transparent',
            }}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            <button
              onClick={() => { setActiveVisualMode('catalog'); setShowVisualSearch(true) }}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-soft text-primary"
              aria-label="Rechercher par photo">
              <Camera size={14} />
            </button>
            {searchQuery ? (
              <button
                onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200"
                aria-label="Effacer la recherche">
                <X size={14} className="text-text-muted" />
              </button>
            ) : (
              <button
                onClick={() => searchRef.current?.focus()}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-success"
                aria-label="Rechercher">
                <Search size={14} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Widget SharedContainerProgress — Ticket 2.1 ── */}
      <div className="mx-auto -mt-4 max-w-4xl px-4 md:px-8">
        <SharedContainerProgress
          containerTargetCBM={container.targetCBM}
          currentAllocatedCBM={container.allocatedCBM}
          departureDeadline={container.departure}
          containerName={container.name}
          shareUrl="https://doukoure-import.sn"
        />
      </div>

      {/* ── Grille produits populaires — Ticket 2.3 ── */}
      <div className="mx-auto mt-6 max-w-7xl px-4 md:px-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: '#1E1B4B' }}>
            <TrendingUp size={15} style={{ color: '#059669' }} />
            {catalogSearchComplete ? 'Résultats visuels du catalogue' : searchQuery ? `Résultats pour "${searchQuery}"` : 'Produits Populaires'}
          </h2>
          {!searchQuery && (
            <button className="text-xs font-semibold flex items-center gap-1" style={{ color: '#059669' }}>
              Voir tout <ChevronRight size={12} />
            </button>
          )}
        </div>

        {loadingProd ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: '#1E1B4B' }} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="font-semibold text-sm" style={{ color: '#1E1B4B' }}>Aucun résultat pour "{searchQuery}"</p>
            <p className="max-w-md text-center text-xs text-slate-400">Article introuvable ? Utilisez le bouton 📦 flottant en bas pour soumettre une demande de sourcing à notre équipe !</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 lg:gap-4">
            {filteredProducts.map(p => {
              const tagStyle = TAG_COLORS[p.badge]
              const priceFormatted = new Intl.NumberFormat('fr-SN').format(p.price_xof)
              const group = GROUP_BUY_PREVIEW[p.id % GROUP_BUY_PREVIEW.length]
              const groupPrice = Math.round(p.price_xof * 0.92)
              const remaining = group.size - group.joined
              return (
                <button
                  key={p.id}
                  onClick={() => onNavigate?.({ screen: 'product', productId: p.id })}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 text-left transition-transform active:scale-95">
                  <div className="relative">
                    <img src={p.image_url} alt={p.name} className="w-full h-36 object-cover bg-slate-100" />
                    {tagStyle && (
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ background: tagStyle.bg, color: tagStyle.color }}>
                        {p.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: '#1E1B4B' }}>
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-sm font-mono" style={{ color: '#059669' }}>
                        {priceFormatted} <span className="text-xs font-normal text-slate-400">FCFA</span>
                      </span>
                      <span className="flex items-center gap-0.5 text-xs text-slate-400">
                        <Star size={10} fill="#D97706" stroke="#D97706" /> {p.rating}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2">
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-800"><span className="flex items-center gap-1"><Users size={12} /> Achat groupé</span><span>-8%</span></div>
                      <p className="mt-1 text-xs font-extrabold font-mono text-emerald-900">{new Intl.NumberFormat('fr-SN').format(groupPrice)} FCFA</p>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-success" style={{ width: `${(group.joined / group.size) * 100}%` }} /></div>
                      <p className="mt-1.5 flex items-center justify-between gap-1 text-[10px] font-semibold text-emerald-800"><span>Encore {remaining} personne{remaining > 1 ? 's' : ''}</span><span className="flex items-center gap-1"><Clock size={10} /> {group.endsIn}</span></p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════ */}
      {/* Panneau Notifications                         */}
      {/* ══════════════════════════════════════════════ */}
      <Suspense fallback={null}>
        <NotificationsPanel
          open={showNotifs}
          notifications={NOTIFICATIONS}
          readIds={notifRead}
          onClose={() => setShowNotifs(false)}
          onOpenPage={() => {
            setShowNotifs(false)
            onNavigate?.({ screen: 'notifications' })
          }}
        />
      </Suspense>

      {/* ══════════════════════════════════════════════ */}
      {/* Panneau Profil / Mon Compte                   */}
      {/* ══════════════════════════════════════════════ */}
      <Suspense fallback={null}>
        <ProfilePanel
          open={showProfile}
          onClose={() => setShowProfile(false)}
          onNavigateTracking={() => {
            setShowProfile(false)
            onNavigate?.({ screen: 'tracking', orderRef: null })
          }}
          onOpenPage={() => {
            setShowProfile(false)
            onNavigate?.({ screen: 'profile' })
          }}
        />
      </Suspense>

      <button
        type="button"
        onClick={openSourcing}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-success p-4 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
        aria-label="Ouvrir une demande de sourcing">
        <PackagePlus size={22} />
      </button>

      <ImmersiveVisualSearch
        open={showVisualSearch && activeVisualMode === 'catalog'}
        onClose={closeVisualSearch}
        onSearch={handleCatalogVisualSearch}
      />

      {showVisualSearch && activeVisualMode === 'sourcing' && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm md:items-center md:p-6"
          onClick={closeVisualSearch}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-surface shadow-2xl md:rounded-3xl"
            onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="text-sm font-bold text-text">Produit introuvable ? Confiez-nous la recherche !</p>
                <p className="text-xs text-text-muted">Nous sourçons votre produit en Chine et vous recontactons sur WhatsApp.</p>
              </div>
              <button
                type="button"
                onClick={closeVisualSearch}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-text-muted"
                aria-label="Fermer la recherche visuelle">
                <X size={17} />
              </button>
            </div>
            <div className="p-4 md:p-6">
              <ImageSearchUploader onSubmit={handleVisualSearch} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
