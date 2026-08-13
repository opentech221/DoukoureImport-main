import { useState, useEffect } from 'react'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'
import OrderTrackingTimeline, { type OrderStatus, type InspectionData } from '../components/OrderTrackingTimeline'
import { getPostgrestClient } from '../lib/getPostgrestClient'

// ---------------------------------------------------------------------------
// Fallback si la commande n'existe pas encore en DB
// ---------------------------------------------------------------------------

const FALLBACK_STATUS: OrderStatus = 'INSPECTION_WEIGHED_CHINA'
const FALLBACK_INSPECTION: InspectionData = {
  photoUrl:           'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop&auto=format',
  videoUrl:           '',
  videoThumbUrl:      'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=600&h=400&fit=crop&auto=format',
  actualWeightKg:     1.4,
  estimatedWeightKg:  1.2,
  adjustedBalanceXOF: 28_750,
  inspectedAt:        '29 jan 2024 — 11h30',
  warehouseLocation:  'Guangzhou',
}

// ---------------------------------------------------------------------------
// Écran suivi de commande
// ---------------------------------------------------------------------------

interface Props {
  orderRef?: string | null
}

export default function TrackingDashboard({ orderRef }: Props) {
  const [orderStatus,    setOrderStatus]    = useState<OrderStatus>(FALLBACK_STATUS)
  const [inspectionData, setInspectionData] = useState<InspectionData>(FALLBACK_INSPECTION)
  const [order,          setOrder]          = useState<{ order_ref?: string; product_name?: string; deposit_paid_xof?: number; shipping_option?: string } | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [mediaStatus,    setMediaStatus]    = useState<'idle' | 'secure' | 'fallback' | 'error'>('idle')

  function needsSecureInspectionMedia(data: Record<string, unknown>): boolean {
    return [
      data.inspection_photo_path,
      data.inspection_video_path,
      data.inspection_thumbnail_path,
    ].some((value) => typeof value === 'string' && value.trim().length > 0)
  }

  useEffect(() => {
    let cancelled = false

    async function loadOrder() {
      setLoading(true)
      const db = await getPostgrestClient()

      const response = orderRef
        ? await db
            .from('orders')
            .select('*')
            .eq('order_ref', orderRef)
            .single()
        : await db
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

      const { data } = response

      if (data) {
        const customerPhone = String(data.customer_phone ?? '')
        setOrder(data)
        if (data.status) setOrderStatus(data.status as OrderStatus)
        const nextInspectionData: InspectionData = {
          photoUrl:           data.inspection_photo_url ?? FALLBACK_INSPECTION.photoUrl,
          videoUrl:           data.inspection_video_url ?? '',
          videoThumbUrl:      FALLBACK_INSPECTION.videoThumbUrl,
          actualWeightKg:     data.actual_weight        ?? FALLBACK_INSPECTION.actualWeightKg,
          estimatedWeightKg:  data.estimated_weight     ?? FALLBACK_INSPECTION.estimatedWeightKg,
          adjustedBalanceXOF: data.balance_xof          ?? FALLBACK_INSPECTION.adjustedBalanceXOF,
          inspectedAt:        FALLBACK_INSPECTION.inspectedAt,
          warehouseLocation:  'Guangzhou',
        }

        if (!cancelled) {
          setInspectionData(nextInspectionData)
          setMediaStatus('fallback')
        }

        if (
          orderRef
          && customerPhone
          && needsSecureInspectionMedia(data as Record<string, unknown>)
        ) {
          try {
            const params = new URLSearchParams({ customerPhone })
            const mediaResponse = await fetch(
              `/make-server-9c5a520a/orders/${encodeURIComponent(orderRef)}/inspection-media?${params.toString()}`,
              {
                headers: {
                  'x-customer-phone': customerPhone,
                },
              },
            )
            const mediaPayload = await mediaResponse.json().catch(() => ({}))
            if (mediaResponse.ok && mediaPayload?.data) {
              if (!cancelled) {
                setInspectionData((current) => ({
                  ...current,
                  photoUrl: mediaPayload.data.photoUrl ?? current.photoUrl,
                  videoUrl: mediaPayload.data.videoUrl ?? current.videoUrl,
                  videoThumbUrl: mediaPayload.data.videoThumbUrl ?? current.videoThumbUrl,
                }))
                setMediaStatus('secure')
              }
            } else if (!cancelled) {
              setMediaStatus('error')
            }
          } catch {
            if (!cancelled) {
              setMediaStatus('error')
            }
          }
        }
      }

      if (!cancelled) {
        setLoading(false)
      }
    }

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [orderRef])

  const productName    = order?.product_name    ?? 'Nike Air Max 2024'
  const depositPaid    = order?.deposit_paid_xof ?? 39_167
  const shippingLabel  = order?.shipping_option === 'AIR_ECO' ? '🛫 Aérien Éco' : order?.shipping_option === 'MARITIME' ? '🚢 Maritime' : '✈️ Aérien Express'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8FAFC' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#1E1B4B' }} />
      </div>
    )
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: '#F8FAFC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-indigo-800"
        style={{ background: '#1E1B4B' }}>
        <button
          className="p-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Retour">
          <ChevronLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <p className="text-indigo-300 text-xs">Suivi de commande</p>
          <p className="text-white font-bold text-sm">{order?.order_ref ?? 'Aucune commande'}</p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: '#D97706', color: 'white' }}>
          En cours
        </span>
      </div>

      {/* ── Récapitulatif commande ── */}
      <div className="mx-4 mt-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3">
        <img
          src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop&auto=format"
          alt="Nike Air Max"
          className="w-16 h-16 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: '#1E1B4B' }}>{productName}</p>
          <p className="text-xs text-slate-500 mt-0.5">Taille 42 EU · 1 paire</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: '#EEF2FF', color: '#4338CA' }}>
              {shippingLabel}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400">Acompte payé</p>
          <p className="font-bold text-sm font-mono" style={{ color: '#059669' }}>
            {formatXOF(depositPaid)}
          </p>
        </div>
      </div>

      {mediaStatus === 'secure' && (
        <div className="mx-4 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          Médias d'inspection chargés via URL signée.
        </div>
      )}
      {mediaStatus === 'error' && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          Médias d'inspection indisponibles en mode sécurisé, affichage du support de secours.
        </div>
      )}

      {/* ── OrderTrackingTimeline — Ticket 2.2 ── */}
      <div className="mx-4 mt-4">
        <OrderTrackingTimeline
          orderStatus={orderStatus}
          inspectionData={inspectionData}
        />
      </div>
    </div>
  )
}
