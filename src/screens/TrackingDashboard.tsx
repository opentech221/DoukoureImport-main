import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Loader2, MapPin, Package, Truck } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'
import OrderTrackingTimeline, { type InspectionData, type OrderStatus } from '../components/OrderTrackingTimeline'
import { getPostgrestClient } from '../lib/getPostgrestClient'

type TrackedOrder = { order_ref: string; product_name: string; product_image_url: string; deposit_paid_xof: number; balance_xof: number; shipping_option: string; status: OrderStatus; delivery_address: string }
const FALLBACK_ORDERS: TrackedOrder[] = [
  { order_ref: 'ORD-2024-0847', product_name: 'Nike Air Max 2024', product_image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=160&h=120&fit=crop&auto=format', deposit_paid_xof: 39167, balance_xof: 28750, shipping_option: 'AIR_EXPRESS', status: 'INSPECTION_WEIGHED_CHINA', delivery_address: 'Sacré-Cœur 3, Dakar' },
  { order_ref: 'ORD-2024-0821', product_name: 'Montre Xiaomi Smart Band 8', product_image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=160&h=120&fit=crop&auto=format', deposit_paid_xof: 28200, balance_xof: 0, shipping_option: 'AIR_ECO', status: 'OUT_FOR_DELIVERY', delivery_address: 'Sacré-Cœur 3, Dakar' },
  { order_ref: 'ORD-2024-0794', product_name: 'Sac à main cuir PU', product_image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=160&h=120&fit=crop&auto=format', deposit_paid_xof: 21000, balance_xof: 15750, shipping_option: 'MARITIME', status: 'IN_TRANSIT', delivery_address: 'Sacré-Cœur 3, Dakar' },
]
const FALLBACK_INSPECTION: InspectionData = { photoUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=400&fit=crop&auto=format', videoUrl: '', videoThumbUrl: '', actualWeightKg: 1.4, estimatedWeightKg: 1.2, adjustedBalanceXOF: 28750, inspectedAt: '29 jan 2024 — 11h30', warehouseLocation: 'Guangzhou' }
interface Props { orderRef?: string | null; onBack?: () => void }

export default function TrackingDashboard({ orderRef, onBack }: Props) {
  const [orders, setOrders] = useState<TrackedOrder[]>(FALLBACK_ORDERS)
  const [selectedOrderRef, setSelectedOrderRef] = useState(orderRef ?? FALLBACK_ORDERS[0].order_ref)
  const [loading, setLoading] = useState(true)
  const selectedOrder = orders.find(order => order.order_ref === selectedOrderRef) ?? orders[0]
  useEffect(() => {
    async function loadOrders() {
      try {
        const db = await getPostgrestClient()
        if (orderRef) {
          const response = await db.from('orders').select('*').eq('order_ref', orderRef).single()
          if (response.data) setOrders([mapOrder(response.data as Record<string, unknown>)])
        } else {
          const response = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(20)
          if (Array.isArray(response.data) && response.data.length > 0) setOrders(response.data.map(item => mapOrder(item as Record<string, unknown>)))
        }
      } finally { setLoading(false) }
    }
    loadOrders().catch(() => setLoading(false))
  }, [orderRef])
  const shippingLabel = selectedOrder?.shipping_option === 'AIR_ECO' ? 'Aérien Éco' : selectedOrder?.shipping_option === 'MARITIME' ? 'Maritime' : 'Aérien Express'
  const statusLabel = selectedOrder?.status === 'OUT_FOR_DELIVERY' ? 'En livraison' : selectedOrder?.status === 'DELIVERED' ? 'Livré' : 'En transit'
  const inspectionData = useMemo(() => ({ ...FALLBACK_INSPECTION, adjustedBalanceXOF: selectedOrder?.balance_xof ?? FALLBACK_INSPECTION.adjustedBalanceXOF }), [selectedOrder])
  if (loading) return <div className="flex h-full min-h-[60vh] items-center justify-center bg-surface"><Loader2 size={32} className="animate-spin text-primary" /></div>
  if (!selectedOrder) return null
  return <div className="h-full overflow-y-auto bg-surface pb-24"><header className="sticky top-0 z-30 flex items-center gap-3 border-b border-indigo-800 bg-primary px-4 py-3 text-white"><button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10" aria-label="Retour"><ChevronLeft size={18} /></button><div className="flex-1"><p className="text-[11px] text-indigo-200">Portefeuille de suivi</p><h1 className="text-sm font-extrabold">Mes commandes</h1></div><Truck size={20} className="text-emerald-300" /></header><main className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:px-8"><section><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold text-text-muted">Suivi logistique</p><h2 className="text-lg font-extrabold text-text">Toutes vos commandes</h2></div><span className="text-xs font-bold text-text-muted">{orders.length} commandes</span></div><div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">{orders.map(order => <button type="button" key={order.order_ref} onClick={() => setSelectedOrderRef(order.order_ref)} className={`w-[min(82vw,350px)] shrink-0 snap-start rounded-2xl border bg-card p-3 text-left shadow-sm ${selectedOrder.order_ref === order.order_ref ? 'border-primary ring-2 ring-indigo-100' : 'border-border'}`}><div className="flex gap-3"><img src={order.product_image_url} alt={order.product_name} className="h-16 w-20 rounded-xl object-cover bg-surface-muted" /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-text">{order.product_name}</strong><span className="mt-1 block text-xs font-semibold text-text-muted">{order.order_ref}</span><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-1 text-[10px] font-bold text-primary"><MapPin size={11} /> {order.status === 'OUT_FOR_DELIVERY' ? 'En livraison' : 'En transit'}</span></span></div></button>)}</div></section><section className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6"><div className="flex items-center gap-3"><Package className="text-primary" size={22} /><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-text-muted">Commande sélectionnée</p><h2 className="truncate text-base font-extrabold text-text">{selectedOrder.order_ref}</h2><p className="truncate text-xs text-text-muted">{selectedOrder.product_name}</p></div><span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-bold text-amber-800">{statusLabel}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-4"><div><p className="text-xs text-text-muted">Acompte payé</p><p className="font-mono text-sm font-extrabold text-success">{formatXOF(selectedOrder.deposit_paid_xof)}</p></div><div><p className="text-xs text-text-muted">Solde restant</p><p className="font-mono text-sm font-extrabold text-amber">{formatXOF(selectedOrder.balance_xof)}</p></div></div><p className="mt-3 text-xs font-semibold text-text-muted">{shippingLabel} · {selectedOrder.delivery_address}</p></section><OrderTrackingTimeline orderStatus={selectedOrder.status} inspectionData={inspectionData} /></main></div>
}

function mapOrder(data: Record<string, unknown>): TrackedOrder {
  const productImage = String(data.product_image_url ?? '')
  return { order_ref: String(data.order_ref ?? 'ORD-2024-0847'), product_name: String(data.product_name ?? 'Colis importé de Chine'), product_image_url: productImage || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=160&h=120&fit=crop&auto=format', deposit_paid_xof: Number(data.deposit_paid_xof ?? 0), balance_xof: Number(data.balance_xof ?? 0), shipping_option: String(data.shipping_option ?? 'AIR_EXPRESS'), status: (data.status ?? 'INSPECTION_WEIGHED_CHINA') as OrderStatus, delivery_address: String(data.delivery_address ?? 'Dakar') }
}
