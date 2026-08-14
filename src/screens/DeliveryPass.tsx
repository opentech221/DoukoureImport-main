import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ImageOff, LockKeyhole, Loader2, MapPin, PackageCheck, ShieldCheck, WalletCards } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'
import DeliveryValidationQRCode from '../components/DeliveryValidationQRCode'
import { getPostgrestClient } from '../lib/getPostgrestClient'
import { assertTransition, normalizeOrderStatus } from '../utils/orderLifecycle'
import { initiateAndConfirmBalancePayment } from '../utils/paymentService'
import { getCachedDeliveryPassSnapshot, getLatestCachedDeliveryPassSnapshot } from '../utils/deliveryPassOffline'
import { emitQaError, emitQaEvent } from '../utils/observability'

interface WalletOrder {
  orderId: string
  customerName: string
  customerPhone: string
  deliveryAddress: string
  productName: string
  productImage: string
  balanceAmount: number
  isBalancePaid: boolean
  status: string
}

const FALLBACK_ORDERS: WalletOrder[] = [
  { orderId: 'ORD-2024-0847', customerName: 'Mamadou Diallo', customerPhone: '+221 77 123 4567', deliveryAddress: 'Sacré-Cœur 3, Villa 34 — Dakar', productName: 'Nike Air Max 2024 — 1 paire', productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=240&fit=crop&auto=format', balanceAmount: 28750, isBalancePaid: false, status: 'OUT_FOR_DELIVERY' },
  { orderId: 'ORD-2024-0821', customerName: 'Mamadou Diallo', customerPhone: '+221 77 123 4567', deliveryAddress: 'Sacré-Cœur 3, Villa 34 — Dakar', productName: 'Montre Xiaomi Smart Band 8', productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=240&fit=crop&auto=format', balanceAmount: 0, isBalancePaid: true, status: 'OUT_FOR_DELIVERY' },
  { orderId: 'ORD-2024-0794', customerName: 'Mamadou Diallo', customerPhone: '+221 77 123 4567', deliveryAddress: 'Sacré-Cœur 3, Villa 34 — Dakar', productName: 'Sac à main cuir PU', productImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=240&fit=crop&auto=format', balanceAmount: 15750, isBalancePaid: false, status: 'OUT_FOR_DELIVERY' },
]

interface Props { orderRef?: string | null; onBack?: () => void }

function mapOrder(data: Record<string, unknown>): WalletOrder {
  const balanceAmount = Number(data.balance_xof ?? 0)
  return {
    orderId: String(data.order_ref ?? 'ORD-2024-0847'), customerName: String(data.customer_name ?? 'Mamadou Diallo'), customerPhone: String(data.customer_phone ?? '+221 77 123 4567'), deliveryAddress: String(data.delivery_address ?? 'Sacré-Cœur 3, Villa 34 — Dakar'), productName: String(data.product_name ?? data.product ?? 'Colis importé de Chine'), productImage: String(data.product_image_url ?? data.image_url ?? ''), balanceAmount, isBalancePaid: data.status === 'PAID' || balanceAmount <= 0, status: String(data.status ?? 'OUT_FOR_DELIVERY'),
  }
}

export default function DeliveryPass({ orderRef, onBack }: Props) {
  const [orders, setOrders] = useState<WalletOrder[]>(FALLBACK_ORDERS)
  const [activeOrderId, setActiveOrderId] = useState(orderRef ?? FALLBACK_ORDERS[0].orderId)
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState(false)
  const [payName, setPayName] = useState('')
  const [payPhone, setPayPhone] = useState('')
  const [payMethod, setPayMethod] = useState<'wave' | 'orange'>('wave')
  const [paying, setPaying] = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  const activeOrder = orders.find(order => order.orderId === activeOrderId) ?? orders[0]
  const pendingOrders = useMemo(() => orders.filter(order => !order.isBalancePaid && order.balanceAmount > 0), [orders])
  const totalRemainingBalance = pendingOrders.reduce((total, order) => total + order.balanceAmount, 0)

  useEffect(() => {
    async function loadWallet() {
      setLoading(true)
      try {
        const db = await getPostgrestClient()
        if (orderRef) {
          const response = await db.from('orders').select('*').eq('order_ref', orderRef).single()
          if (response.data) setOrders([mapOrder(response.data as Record<string, unknown>)])
        } else {
          const response = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(12)
          if (Array.isArray(response.data) && response.data.length > 0) setOrders(response.data.map(item => mapOrder(item as Record<string, unknown>)))
        }
      } catch {
        const cached = orderRef ? await getCachedDeliveryPassSnapshot(orderRef) : await getLatestCachedDeliveryPassSnapshot()
        if (cached) {
          const cachedOrder = { ...FALLBACK_ORDERS[0], orderId: cached.orderId, customerPhone: cached.customerPhone, balanceAmount: cached.remainingBalanceAmount, isBalancePaid: cached.isBalancePaid, status: cached.orderStatus }
          setOrders(orderRef ? [cachedOrder] : [cachedOrder, ...FALLBACK_ORDERS.slice(1)])
          setPaymentMessage('Pass chargé depuis le cache hors ligne. La synchronisation reprendra dès le retour réseau.')
        }
      } finally {
        setLoading(false)
      }
    }
    loadWallet()
  }, [orderRef])

  async function handleBatchPayment() {
    if (!payName.trim() || !payPhone.trim() || pendingOrders.length === 0) return
    setPaying(true)
    try {
      const db = await getPostgrestClient()
      for (const order of pendingOrders) {
        const idempotencyKey = ['batch-balance-payment', order.orderId, payMethod, payPhone.replace(/\s/g, ''), String(order.balanceAmount)].join(':')
        await initiateAndConfirmBalancePayment({ orderRef: order.orderId, payerName: payName.trim(), payerPhone: payPhone.trim(), provider: payMethod, amountXof: order.balanceAmount, idempotencyKey })
        const currentStatus = normalizeOrderStatus(order.status)
        assertTransition(currentStatus, 'PAID')
        await db.from('orders').update({ status: 'PAID', balance_xof: 0, updated_at: new Date().toISOString() }).eq('order_ref', order.orderId)
        emitQaEvent('delivery-pass:batch-payment-confirmed', { orderRef: order.orderId, provider: payMethod, amountXof: order.balanceAmount })
      }
      setOrders(current => current.map(order => pendingOrders.some(pending => pending.orderId === order.orderId) ? { ...order, balanceAmount: 0, isBalancePaid: true, status: 'PAID' } : order))
      setPayModal(false)
      setPaymentMessage('Paiement groupé confirmé. Tous vos QR codes sont déverrouillés.')
    } catch (error) {
      emitQaError('delivery-pass:batch-payment-failed', error, { provider: payMethod, amountXof: totalRemainingBalance })
      setPaymentMessage('Le paiement groupé n’a pas pu être confirmé. Réessayez dans quelques instants.')
    } finally {
      setPaying(false)
    }
  }

  if (loading) return <div className="flex h-full min-h-[60vh] items-center justify-center bg-surface"><Loader2 size={32} className="animate-spin text-primary" /></div>

  return (
    <div className="h-full overflow-y-auto bg-surface pb-32 font-sans">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-primary px-4 py-3 text-white shadow-sm"><button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10" aria-label="Retour"><ChevronLeft size={18} /></button><WalletCards size={20} className="text-emerald-300" /><div><p className="text-[11px] text-indigo-200">Mon portefeuille</p><h1 className="text-sm font-extrabold">Pass de Livraison</h1></div><span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold">{orders.length} pass</span></header>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5 md:px-8">
        <section><div className="mb-3 flex items-end justify-between"><div><p className="text-xs font-semibold text-text-muted">Arrivés au Sénégal</p><h2 className="text-lg font-extrabold text-text">Vos QR de livraison</h2></div><span className="text-xs font-semibold text-text-muted">Glissez pour voir</span></div><div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
          {orders.map(order => { const paid = order.isBalancePaid || order.balanceAmount <= 0; return <article key={order.orderId} onClick={() => setActiveOrderId(order.orderId)} className={`w-[min(86vw,390px)] shrink-0 snap-center overflow-hidden rounded-3xl border bg-card shadow-sm ${activeOrder?.orderId === order.orderId ? 'border-success ring-2 ring-emerald-100' : 'border-border'}`}><div className="relative h-36 bg-surface-muted">{order.productImage ? <img src={order.productImage} alt={order.productName} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-text-subtle"><ImageOff size={24} /></div>}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${paid ? 'bg-success-soft text-emerald-800' : 'bg-amber-soft text-amber-800'}`}>{paid ? 'Prêt à livrer' : 'Solde à régler'}</span></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold text-text-muted">Commande</p><h3 className="text-sm font-extrabold text-text">{order.orderId}</h3><p className="mt-1 line-clamp-1 text-xs text-text-muted">{order.productName}</p></div><PackageCheck size={20} className={paid ? 'text-success' : 'text-amber'} /></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="flex items-center gap-1 text-xs text-text-muted"><MapPin size={13} /> Dakar</span><span className="text-xs font-extrabold text-text">{paid ? 'QR déverrouillé' : formatXOF(order.balanceAmount)}</span></div></div></article> })}
        </div></section>

        {activeOrder && <section className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-text-muted">Pass sélectionné</p><h2 className="text-base font-extrabold text-text">{activeOrder.orderId}</h2></div><ShieldCheck className="text-success" size={21} /></div><div className="relative flex justify-center overflow-hidden rounded-2xl bg-surface-muted p-4">{!activeOrder.isBalancePaid && activeOrder.balanceAmount > 0 && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/35 backdrop-blur-[5px]"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg"><LockKeyhole size={22} /></span></div>}<DeliveryValidationQRCode orderId={activeOrder.orderId} remainingBalanceAmount={activeOrder.balanceAmount} customerPhone={activeOrder.customerPhone} isBalancePaid={activeOrder.isBalancePaid || activeOrder.balanceAmount <= 0} orderStatus={activeOrder.status} onPaymentInitiated={() => setPayModal(true)} onDeliveryValidated={nextStatus => setOrders(current => current.map(order => order.orderId === activeOrder.orderId ? { ...order, status: nextStatus } : order))} /></div>{!activeOrder.isBalancePaid && activeOrder.balanceAmount > 0 && <p className="mt-3 text-center text-xs font-semibold text-amber-800">Réglez le solde pour déverrouiller ce QR code Paps.</p>}</section>}

        <section className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-extrabold text-text">Récapitulatif des soldes en attente</h2><p className="mt-1 text-xs text-text-muted">Le dernier tiers après pesée</p></div><span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-bold text-amber-800">{pendingOrders.length} colis</span></div>{pendingOrders.length === 0 ? <p className="rounded-xl bg-success-soft p-4 text-sm font-semibold text-emerald-800">Tous vos soldes sont réglés. Vos QR codes sont prêts.</p> : <div className="divide-y divide-border">{pendingOrders.map(order => <div key={order.orderId} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-bold text-text">{order.orderId}</p><p className="truncate text-xs text-text-muted">{order.productName}</p></div><span className="shrink-0 font-mono text-sm font-extrabold text-amber">{formatXOF(order.balanceAmount)}</span></div>)}<div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-border pt-4"><span className="text-sm font-extrabold text-text">Total à régler</span><span className="font-mono text-xl font-black text-primary">{formatXOF(totalRemainingBalance)}</span></div></div>}</section>
      </main>

      {totalRemainingBalance > 0 && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-3 shadow-[0_-8px_30px_rgb(15_23_42/0.12)] backdrop-blur"><div className="mx-auto max-w-5xl"><button type="button" onClick={() => setPayModal(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success px-4 py-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-success-light active:scale-[0.99]">Payer le solde groupé ({formatXOF(totalRemainingBalance)} FCFA) via Wave / Orange Money</button><p className="mt-2 text-center text-[11px] font-medium text-text-muted">Payez en une seule transaction pour déverrouiller tous vos QR codes de livraison Paps simultanément.</p></div></div>}

      {payModal && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm md:items-center"><div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold text-text-muted">Paiement groupé</p><h2 className="text-lg font-extrabold text-text">{formatXOF(totalRemainingBalance)} FCFA</h2></div><button type="button" onClick={() => setPayModal(false)} className="text-2xl text-text-muted" aria-label="Fermer">×</button></div><div className="mb-4 grid grid-cols-2 gap-2">{(['wave', 'orange'] as const).map(method => <button key={method} type="button" onClick={() => setPayMethod(method)} className={`rounded-xl border-2 py-3 text-sm font-extrabold ${payMethod === method ? 'border-success bg-success-soft text-success' : 'border-border text-text-muted'}`}>{method === 'wave' ? 'Wave' : 'Orange Money'}</button>)}</div><label className="mb-3 block text-xs font-bold text-text">Nom du payeur<input value={payName} onChange={event => setPayName(event.target.value)} placeholder="Mamadou Diallo" className="mt-1.5 w-full rounded-xl border border-border px-4 py-3 text-sm text-text outline-none focus:border-focus" /></label><label className="mb-4 block text-xs font-bold text-text">Numéro Mobile Money<input value={payPhone} onChange={event => setPayPhone(event.target.value)} placeholder="77 123 45 67" inputMode="tel" className="mt-1.5 w-full rounded-xl border border-border px-4 py-3 font-mono text-sm text-text outline-none focus:border-focus" /></label><button type="button" onClick={handleBatchPayment} disabled={paying || !payName.trim() || !payPhone.trim()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-4 text-sm font-extrabold text-white disabled:bg-border disabled:text-text-subtle">{paying ? <><Loader2 size={17} className="animate-spin" /> Traitement...</> : 'Confirmer le paiement groupé'}</button></div></div>}
      {paymentMessage && <div className="fixed bottom-28 left-4 right-4 z-40 mx-auto max-w-xl rounded-xl bg-primary px-4 py-3 text-center text-xs font-bold text-white shadow-lg">{paymentMessage}</div>}
    </div>
  )
}