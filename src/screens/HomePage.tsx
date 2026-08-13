import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Search, ChevronRight, TrendingUp, Star, Bell, Loader2, X, User } from 'lucide-react'
import SharedContainerProgress from '../components/SharedContainerProgress'
import ImageSearchUploader, { type SearchPayload } from '../components/ImageSearchUploader'
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
}

export default function HomePage({ onNavigate }: Props) {
  const [searchQuery,  setSearchQuery]  = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [container,    setContainer]    = useState<ContainerData>(FALLBACK_CONTAINER)
  const [products,     setProducts]     = useState<Product[]>(FALLBACK_PRODUCTS)
  const [loadingProd,  setLoadingProd]  = useState(true)
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [notifRead,    setNotifRead]    = useState<Set<number>>(new Set(NOTIFICATIONS.filter(n => n.read).map(n => n.id)))
  const searchRef = useRef<HTMLInputElement>(null)

  const unreadCount = NOTIFICATIONS.filter(n => !notifRead.has(n.id)).length

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
      <div className="px-4 pt-10 pb-6 relative overflow-hidden"
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
          <div className="flex items-center gap-2">
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
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher un produit…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchActive(true)}
            onBlur={() => setSearchActive(false)}
            className="w-full pl-10 pr-14 py-3.5 rounded-2xl text-sm font-medium placeholder-slate-400 outline-none border-2 transition-colors"
            style={{
              background: 'rgba(255,255,255,0.97)',
              color: '#1E1B4B',
              borderColor: searchActive ? '#059669' : 'transparent',
            }}
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#E2E8F0' }}
              aria-label="Effacer la recherche">
              <X size={14} style={{ color: '#64748B' }} />
            </button>
          ) : (
            <button
              onClick={() => searchRef.current?.focus()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#059669' }}
              aria-label="Rechercher">
              <Search size={14} className="text-white" />
            </button>
          )}
        </div>
      </div>

      {/* ── Widget SharedContainerProgress — Ticket 2.1 ── */}
      <div className="mx-4 -mt-4">
        <SharedContainerProgress
          containerTargetCBM={container.targetCBM}
          currentAllocatedCBM={container.allocatedCBM}
          departureDeadline={container.departure}
          containerName={container.name}
          shareUrl="https://doukoure-import.sn"
        />
      </div>

      {/* ── Recherche Visuelle — Ticket 2.2 ── */}
      <div className="mx-4 mt-5">
        <ImageSearchUploader onSubmit={handleVisualSearch} />
      </div>

      {/* ── Grille produits populaires — Ticket 2.3 ── */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm flex items-center gap-2" style={{ color: '#1E1B4B' }}>
            <TrendingUp size={15} style={{ color: '#059669' }} />
            {searchQuery ? `Résultats pour "${searchQuery}"` : 'Produits Populaires'}
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
            <p className="text-xs text-slate-400 text-center">Essayez avec un autre mot-clé ou utilisez la recherche par image ci-dessus.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(p => {
              const tagStyle = TAG_COLORS[p.badge]
              const priceFormatted = new Intl.NumberFormat('fr-SN').format(p.price_xof)
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
        />
      </Suspense>
    </div>
  )
}
