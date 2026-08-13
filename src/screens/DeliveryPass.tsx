import { useState, useEffect } from 'react'
import { MapPin, Phone, Package, ChevronLeft, Shield, Loader2 } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'
import DeliveryValidationQRCode from '../components/DeliveryValidationQRCode'
import { getPostgrestClient } from '../lib/getPostgrestClient'
import { assertTransition, normalizeOrderStatus } from '../utils/orderLifecycle'
import { initiateAndConfirmBalancePayment } from '../utils/paymentService'
import { getCachedDeliveryPassSnapshot, getLatestCachedDeliveryPassSnapshot } from '../utils/deliveryPassOffline'
import { emitQaError, emitQaEvent } from '../utils/observability'

// ---------------------------------------------------------------------------
// Fallback si la commande n'existe pas encore en DB
// ---------------------------------------------------------------------------

const FALLBACK = {
  orderId:         'ORD-2024-0847',
  customerName:    'Mamadou Diallo',
  customerPhone:   '+221 77 123 4567',
  deliveryAddress: 'Sacré-Cœur 3, Villa 34 — Dakar',
  balanceAmount:   28_750,
  isBalancePaid:   false,
}

// ---------------------------------------------------------------------------
// Écran Pass de Livraison
// ---------------------------------------------------------------------------

interface Props {
  orderRef?: string | null
}

export default function DeliveryPass({ orderRef }: Props) {
  const [orderData,    setOrderData]    = useState(FALLBACK)
  const [orderStatus,  setOrderStatus]  = useState('OUT_FOR_DELIVERY')
  const [loading,      setLoading]      = useState(true)
  const [payModal,     setPayModal]     = useState(false)
  const [payName,      setPayName]      = useState('')
  const [payPhone,     setPayPhone]     = useState('')
  const [payMethod,    setPayMethod]    = useState<'wave' | 'orange'>('wave')
  const [paying,       setPaying]       = useState(false)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrder() {
      setLoading(true)
      try {
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
          setOrderData({
            orderId:         data.order_ref            ?? FALLBACK.orderId,
            customerName:    data.customer_name        ?? FALLBACK.customerName,
            customerPhone:   data.customer_phone       ?? FALLBACK.customerPhone,
            deliveryAddress: data.delivery_address     ?? FALLBACK.deliveryAddress,
            balanceAmount:   data.balance_xof          ?? FALLBACK.balanceAmount,
            isBalancePaid:   data.status === 'PAID',
          })
          if (data.status) setOrderStatus(data.status)
          setLoading(false)
          return
        }
      } catch {
        // fallback below
      }

      const cached = orderRef
        ? await getCachedDeliveryPassSnapshot(orderRef)
        : await getLatestCachedDeliveryPassSnapshot()

      if (cached) {
        setOrderData({
          orderId: cached.orderId,
          customerName: FALLBACK.customerName,
          customerPhone: cached.customerPhone,
          deliveryAddress: FALLBACK.deliveryAddress,
          balanceAmount: cached.remainingBalanceAmount,
          isBalancePaid: cached.isBalancePaid,
        })
        setOrderStatus(cached.orderStatus)
        setPaymentMessage('Pass chargé depuis le cache hors ligne. La synchronisation reprendra dès le retour réseau.')
      }

      setLoading(false)
    }

    loadOrder()
  }, [orderRef])

  async function handlePaymentConfirm() {
    if (!payName.trim() || !payPhone.trim()) return

    setPaying(true)
    try {
      const idempotencyKey = [
        'balance-payment',
        orderData.orderId,
        payMethod,
        payPhone.replace(/\s/g, ''),
        String(orderData.balanceAmount),
      ].join(':')

      if (typeof localStorage !== 'undefined' && localStorage.getItem(idempotencyKey) === 'done') {
        setPayModal(false)
        return
      }

      await initiateAndConfirmBalancePayment({
        orderRef: orderData.orderId,
        payerName: payName.trim(),
        payerPhone: payPhone.trim(),
        provider: payMethod,
        amountXof: orderData.balanceAmount,
        idempotencyKey,
      })

      const currentStatus = normalizeOrderStatus(orderStatus)
      assertTransition(currentStatus, 'PAID')
      emitQaEvent('delivery-pass:payment-confirmed', {
        orderRef: orderData.orderId,
        provider: payMethod,
        previousStatus: currentStatus,
      })

      const db = await getPostgrestClient()
      await db
        .from('orders')
        .update({ status: 'PAID', balance_xof: 0, updated_at: new Date().toISOString() })
        .eq('order_ref', orderData.orderId)

      // Journalisation best-effort de la transition (si la table est disponible).
      const { error: eventError } = await db.from('order_status_events').insert({
        order_ref: orderData.orderId,
        previous_status: currentStatus,
        next_status: 'PAID',
        source: 'delivery_pass',
        metadata: {
          provider: payMethod,
          payerPhone: payPhone.trim(),
        },
      })
      if (eventError && !eventError.message.toLowerCase().includes('order_status_events')) {
        throw new Error(eventError.message)
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(idempotencyKey, 'done')
      }

      const refreshed = await db
        .from('orders')
        .select('status,balance_xof')
        .eq('order_ref', orderData.orderId)
        .maybeSingle()

      if (refreshed.data?.status === 'PAID') {
        setOrderStatus('PAID')
        setOrderData(d => ({ ...d, isBalancePaid: true, balanceAmount: 0 }))
        setPayModal(false)
        setPaymentMessage(null)
      } else {
        setPaymentMessage('Paiement initié. Validation en attente du webhook opérateur…')
      }
    } catch (error) {
      emitQaError('delivery-pass:payment-failed', error, {
        orderRef: orderData.orderId,
        provider: payMethod,
      })
      setPaymentMessage('Le paiement n\'a pas pu être confirmé. Réessayez dans quelques instants.')
    } finally {
      setPaying(false)
    }
  }

  const ORDER = orderData

  const papsStatusLabel =
    orderStatus === 'OUT_FOR_DELIVERY' ? 'En cours de livraison'
    : orderStatus === 'DELIVERED'      ? 'Livré ✓'
    : 'En attente'

  const papsStatusStyle =
    orderStatus === 'DELIVERED'        ? { background: '#F0FDF4', color: '#059669' }
    : orderStatus === 'OUT_FOR_DELIVERY' ? { background: '#EEF2FF', color: '#4338CA' }
    : { background: '#FFF7ED', color: '#D97706' }

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
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{ background: '#1E1B4B' }}>
        <button
          className="p-2 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Retour">
          <ChevronLeft size={18} className="text-white" />
        </button>
        <div className="flex-1">
          <p className="text-indigo-300 text-xs">Pass de Livraison</p>
          <p className="text-white font-bold text-sm">{ORDER.orderId}</p>
        </div>
        <Shield size={18} className="text-emerald-400" />
      </div>

      {/* ── Card livreur Paps ── */}
      <div className="mx-auto mt-4 max-w-4xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:mx-8 lg:mt-8">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white"
              style={{ background: '#FF6B00' }}>
              P
            </div>
            <span className="font-bold text-sm" style={{ color: '#1E1B4B' }}>Livraison Paps</span>
          </div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={papsStatusStyle}>
            {papsStatusLabel}
          </span>
        </div>

        <div className="px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <Package size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Colis</p>
              <p className="font-semibold text-sm" style={{ color: '#1E1B4B' }}>
                Nike Air Max 2024 — 1 paire
              </p>
              <p className="text-xs text-slate-500">1.4 kg · 32×22×12 cm · Catégorie M</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Adresse de livraison</p>
              <p className="font-semibold text-sm" style={{ color: '#1E1B4B' }}>{ORDER.customerName}</p>
              <p className="text-xs text-slate-500">{ORDER.deliveryAddress}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Phone size={16} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Contact</p>
              <p className="font-semibold text-sm font-mono" style={{ color: '#1E1B4B' }}>
                {ORDER.customerPhone}
              </p>
            </div>
          </div>
        </div>

        {/* Bandeau solde COD */}
        <div
          className="mx-4 mb-4 p-3 rounded-xl border border-amber-200 flex items-center justify-between"
          style={{ background: '#FFFBEB' }}>
          <div>
            <p className="text-xs font-semibold" style={{ color: '#92400E' }}>
              Solde à encaisser à la livraison
            </p>
            <p className="font-bold text-lg font-mono mt-0.5" style={{ color: '#D97706' }}>
              {formatXOF(ORDER.balanceAmount)}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 rounded-lg font-bold"
            style={{ background: '#D97706', color: 'white' }}>
            COD
          </span>
        </div>
      </div>

      {/* ── DeliveryValidationQRCode — Ticket 3.2 ── */}
      <div className="mx-auto mb-6 mt-4 max-w-4xl md:mx-8 lg:mt-6">
        <DeliveryValidationQRCode
          orderId={ORDER.orderId}
          remainingBalanceAmount={ORDER.balanceAmount}
          customerPhone={ORDER.customerPhone}
          isBalancePaid={ORDER.isBalancePaid}
          orderStatus={orderStatus}
          onPaymentInitiated={() => setPayModal(true)}
          onDeliveryValidated={(nextStatus) => {
            setOrderStatus(nextStatus)
            setPaymentMessage(nextStatus === 'DELIVERED'
              ? 'Validation de remise enregistrée. Synchronisation confirmée.'
              : 'Validation différée enregistrée.')
          }}
        />
        {paymentMessage && (
          <div
            className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold"
            style={{ background: '#EEF2FF', color: '#4338CA' }}>
            {paymentMessage}
          </div>
        )}
      </div>

      {/* ── Modal paiement Mobile Money ── */}
      {payModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4 lg:items-center lg:backdrop-blur-sm"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl lg:max-w-lg">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-base" style={{ color: '#1E1B4B' }}>Paiement Mobile Money</p>
              <button onClick={() => setPayModal(false)} className="text-slate-400 text-xl leading-none">×</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Montant */}
              <div className="p-3.5 rounded-2xl text-center" style={{ background: '#F0FDF4' }}>
                <p className="text-xs text-slate-500 mb-1">Solde à régler</p>
                <p className="font-black text-2xl font-mono" style={{ color: '#059669' }}>{formatXOF(ORDER.balanceAmount)}</p>
              </div>

              {/* Choix méthode */}
              <div className="grid grid-cols-2 gap-2">
                {(['wave', 'orange'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className="py-3 rounded-xl font-bold text-sm border-2 transition-all"
                    style={{
                      borderColor: payMethod === m ? '#059669' : '#E2E8F0',
                      background:  payMethod === m ? '#F0FDF4' : 'white',
                      color:       payMethod === m ? '#059669' : '#64748B',
                    }}>
                    {m === 'wave' ? '🌊 Wave' : '🟠 Orange Money'}
                  </button>
                ))}
              </div>

              {/* Nom */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#1E1B4B' }}>Nom du payeur</label>
                <input
                  type="text"
                  placeholder="Mamadou Diallo"
                  value={payName}
                  onChange={e => setPayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#1E1B4B' }}
                  onFocus={e => (e.target.style.borderColor = '#059669')}
                  onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: '#1E1B4B' }}>Numéro {payMethod === 'wave' ? 'Wave' : 'Orange Money'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">🇸🇳 +221</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    placeholder="77 123 45 67"
                    value={payPhone}
                    onChange={e => setPayPhone(e.target.value)}
                    className="w-full pl-20 pr-4 py-3 rounded-xl border text-sm outline-none font-mono"
                    style={{ borderColor: '#E2E8F0', color: '#1E1B4B' }}
                    onFocus={e => (e.target.style.borderColor = '#059669')}
                    onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
                  />
                </div>
              </div>

              <button
                onClick={handlePaymentConfirm}
                disabled={paying || !payName.trim() || !payPhone.trim()}
                className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background: paying || !payName.trim() || !payPhone.trim()
                    ? '#E2E8F0'
                    : 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: paying || !payName.trim() || !payPhone.trim() ? '#94A3B8' : 'white',
                }}>
                {paying ? <><Loader2 size={16} className="animate-spin" /> Traitement…</> : "Confirmer le paiement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
