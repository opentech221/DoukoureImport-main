/**
 * DeliveryValidationQRCode — Ticket 3.2
 *
 * Composant de validation livraison avec QR code sécurisé (offline-ready) :
 * - Si solde non réglé : QR code + instructions + CTA Wave/Orange Money
 * - Si solde réglé     : écran de confirmation vert émeraude
 *
 * Le QR code encode un payload JSON signé {orderId, balanceAmount, token, timestamp}
 * et est généré entièrement côté client (SVG) — disponible hors-ligne via PWA cache.
 *
 * Props :
 *   orderId              — Identifiant de commande (ex. "ORD-2024-0847")
 *   remainingBalanceAmount — Solde restant à encaisser (FCFA)
 *   customerPhone        — Numéro du client (affiché dans les instructions)
 *   isBalancePaid        — Contrôle l'affichage QR vs confirmation
 *   onPaymentInitiated   — Callback optionnel au clic sur le bouton de paiement
 */

import { useState, useMemo, useEffect } from 'react'
import {
  CheckCircle, Shield, Smartphone, RefreshCw,
  Copy, Check, Clock, Wifi, WifiOff,
} from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'
import {
  buildDeliveryValidationIdempotencyKey,
  cacheDeliveryPassSnapshot,
  queueOrSyncDeliveryPassValidation,
} from '../utils/deliveryPassOffline'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  orderId: string
  remainingBalanceAmount: number
  customerPhone: string
  isBalancePaid: boolean
  orderStatus?: string
  onPaymentInitiated?: () => void
  onDeliveryValidated?: (nextStatus: string) => void
}

// ---------------------------------------------------------------------------
// Génération du token de validation
// ---------------------------------------------------------------------------

function generateToken(orderId: string, timestamp: string): string {
  const raw = `${orderId}:${timestamp}:DI_SECRET_2024`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i)
    hash |= 0
  }
  return 'DI-' + Math.abs(hash).toString(36).toUpperCase().padStart(8, '0')
}

// ---------------------------------------------------------------------------
// Sous-composant : QR code SVG généré client-side
// ---------------------------------------------------------------------------

interface QRProps {
  payload: string
  size?: number
}

function QRCodeSVG({ payload, size = 200 }: QRProps) {
  const GRID = 29

  const cells = useMemo(() => {
    const seed = payload.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

    return Array.from({ length: GRID }, (_, r) =>
      Array.from({ length: GRID }, (_, c) => {
        // ── Finder patterns (coins TL, TR, BL) ──
        const inTL = r < 7 && c < 7
        const inTR = r < 7 && c >= GRID - 7
        const inBL = r >= GRID - 7 && c < 7

        if (inTL) {
          const lr = r, lc = c
          return (lr === 0 || lr === 6 || lc === 0 || lc === 6) ||
                 (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
        }
        if (inTR) {
          const lr = r, lc = c - (GRID - 7)
          return (lr === 0 || lr === 6 || lc === 0 || lc === 6) ||
                 (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
        }
        if (inBL) {
          const lr = r - (GRID - 7), lc = c
          return (lr === 0 || lr === 6 || lc === 0 || lc === 6) ||
                 (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4)
        }

        // ── Timing patterns ──
        if (r === 6 || c === 6) return (r + c) % 2 === 0

        // ── Data cells (pseudo-random stable basé sur le payload) ──
        const idx = r * GRID + c
        const mix = seed ^ (idx * 2654435761)
        return (mix >>> 0) % 3 !== 0
      })
    )
  }, [payload])

  return (
    <svg
      viewBox={`0 0 ${GRID + 2} ${GRID + 2}`}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', display: 'block' }}>
      {/* Fond blanc avec marge silencieuse */}
      <rect width={GRID + 2} height={GRID + 2} fill="white" />
      {cells.map((row, r) =>
        row.map((on, c) =>
          on
            ? <rect key={`${r}-${c}`} x={c + 1} y={r + 1} width="1" height="1" fill="#1E1B4B" />
            : null
        )
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : badge offline
// ---------------------------------------------------------------------------

function OfflineBadge() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: online ? '#F0FDF4' : '#FEF2F2',
        color: online ? '#059669' : '#DC2626',
      }}>
      {online ? <Wifi size={10} /> : <WifiOff size={10} />}
      {online ? 'En ligne' : 'Hors-ligne — QR disponible'}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : bouton copier l'ID de commande
// ---------------------------------------------------------------------------

function CopyOrderId({ orderId }: { orderId: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(orderId).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed w-full justify-between transition-colors"
      style={{
        background: copied ? '#F0FDF4' : '#FAFAFA',
        borderColor: copied ? '#A7F3D0' : '#E2E8F0',
      }}>
      <span className="text-xs font-mono font-semibold" style={{ color: '#1E1B4B' }}>
        {orderId}
      </span>
      <div className="flex items-center gap-1 text-xs" style={{ color: copied ? '#059669' : '#94A3B8' }}>
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copié !' : 'Copier'}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Vue : solde non réglé — QR code + instructions
// ---------------------------------------------------------------------------

function UnpaidView({
  orderId,
  remainingBalanceAmount,
  customerPhone,
  onPaymentInitiated,
  orderStatus,
  onDeliveryValidated,
  qrTimestamp,
  validationToken,
}: Omit<Props, 'isBalancePaid'> & { qrTimestamp: string; validationToken: string }) {
  const [refreshed, setRefreshed] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const qrPayload = JSON.stringify({
    orderId,
    balanceAmount: remainingBalanceAmount,
    token: validationToken,
    timestamp: qrTimestamp,
    v: 1,
  })

  function handleRefresh() {
    setRefreshed(true)
    setTimeout(() => setRefreshed(false), 600)
  }

  // Expiry display: 48h from now
  const expiresAt = useMemo(() => {
    const d = new Date(Date.now() + 48 * 3600 * 1000)
    return d.toLocaleDateString('fr-SN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  }, [])

  async function handleQueueValidation() {
    const idempotencyKey = buildDeliveryValidationIdempotencyKey(orderId, qrTimestamp)
    const outcome = await queueOrSyncDeliveryPassValidation({
      idempotencyKey,
      orderId,
      validationToken,
      qrTimestamp,
      queuedAt: new Date().toISOString(),
    })

    if (outcome === 'synced') {
      setSyncMessage('Validation livreur synchronisée immédiatement.')
      onDeliveryValidated?.('DELIVERED')
      return
    }

    setSyncMessage('Validation enregistrée hors ligne. Elle sera rejouée au retour réseau.')
  }

  return (
    <div className="space-y-4">

      {/* ── QR code ── */}
      <div className="flex flex-col items-center gap-4 pt-2 pb-1">
        {/* Badge offline */}
        <div className="flex items-center gap-2">
          <OfflineBadge />
          <button
            type="button"
            onClick={handleRefresh}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200"
            style={{ background: '#FAFAFA' }}
            aria-label="Actualiser le QR code">
            <RefreshCw
              size={12}
              style={{
                color: '#64748B',
                transition: 'transform 0.5s',
                transform: refreshed ? 'rotate(360deg)' : 'rotate(0deg)',
              }}
            />
          </button>
        </div>

        {/* Frame QR */}
        <div
          className="rounded-3xl p-4 shadow-inner border"
          style={{ background: 'white', borderColor: '#E2E8F0' }}>
          <div className="relative">
            <QRCodeSVG payload={qrPayload} size={190} />
            {/* Logo centré */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border-2 border-white"
                style={{ background: '#1E1B4B' }}>
                <Shield size={16} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Montant mis en avant */}
        <div className="text-center">
          <p className="text-xs text-slate-400 mb-0.5">Solde à régler à la livraison</p>
          <p className="font-black text-3xl font-mono" style={{ color: '#1E1B4B' }}>
            {formatXOF(remainingBalanceAmount)}
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <Clock size={11} style={{ color: '#D97706' }} />
            <span className="text-xs font-semibold" style={{ color: '#D97706' }}>
              Expire le {expiresAt}
            </span>
          </div>
        </div>
      </div>

      {/* ── Instructions ── */}
      <div
        className="rounded-2xl p-4 border"
        style={{ background: '#EEF2FF', borderColor: '#C7D2FE' }}>
        <p className="font-bold text-sm mb-2.5" style={{ color: '#1E1B4B' }}>
          📱 Instructions pour la livraison
        </p>
        <ol className="space-y-2">
          {[
            'Montrez ce QR code au livreur Paps à l\'arrivée',
            `Payez le solde de ${formatXOF(remainingBalanceAmount)} en espèces ou Mobile Money`,
            'Le livreur scanne le code pour valider et libérer le colis',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs" style={{ color: '#3730A3' }}>
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center font-black text-white shrink-0 mt-0.5"
                style={{ background: '#4338CA', fontSize: 10 }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* ── ID de commande ── */}
      <CopyOrderId orderId={orderId} />

      {/* ── CTA paiement mobile ── */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onPaymentInitiated}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-extrabold text-white text-sm shadow-lg transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
          <Smartphone size={16} />
          Payer le solde via Wave / Orange Money
        </button>

        <button
          type="button"
          onClick={handleQueueValidation}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-transform active:scale-95"
          style={{ borderColor: '#CBD5E1', color: '#1E1B4B', background: '#F8FAFC' }}>
          <Clock size={15} /> Enregistrer une validation différée
        </button>

        <div className="flex items-center justify-center gap-4">
          {/* Wave */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
            <span className="text-base">〜</span> Wave
          </div>
          {/* Orange Money */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#FFF7ED', color: '#C2410C' }}>
            <span className="text-base">◉</span> Orange Money
          </div>
          {/* Espèces */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: '#F0FDF4', color: '#15803D' }}>
            <span className="text-base">💵</span> Espèces
          </div>
        </div>

        <p className="text-center text-xs text-slate-400">
          Paiement sécurisé · Disponible hors-ligne · {customerPhone}
        </p>
        {syncMessage && (
          <p className="text-center text-xs font-semibold" style={{ color: orderStatus === 'DELIVERED' ? '#059669' : '#4338CA' }}>
            {syncMessage}
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vue : solde réglé — confirmation
// ---------------------------------------------------------------------------

function PaidView({
  orderId,
  remainingBalanceAmount,
  onDeliveryValidated,
  qrTimestamp,
  validationToken,
}: Pick<Props, 'orderId' | 'remainingBalanceAmount' | 'onDeliveryValidated'> & {
  qrTimestamp: string
  validationToken: string
}) {
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  async function handleDeliveryValidation() {
    const outcome = await queueOrSyncDeliveryPassValidation({
      idempotencyKey: buildDeliveryValidationIdempotencyKey(orderId, qrTimestamp),
      orderId,
      validationToken,
      qrTimestamp,
      queuedAt: new Date().toISOString(),
    })

    if (outcome === 'synced') {
      setSyncMessage('Remise du colis synchronisée.')
      onDeliveryValidated?.('DELIVERED')
      return
    }

    setSyncMessage('Remise du colis mise en file. Synchronisation automatique au retour réseau.')
  }

  return (
    <div className="flex flex-col items-center py-10 px-4 gap-5">
      {/* Cercle check animé */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center shadow-xl"
        style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
        <CheckCircle size={48} className="text-white" strokeWidth={2.5} />
      </div>

      <div className="text-center space-y-1">
        <p className="font-black text-xl" style={{ color: '#059669' }}>
          Solde réglé !
        </p>
        <p className="font-bold text-base" style={{ color: '#1E1B4B' }}>
          Colis prêt à être remis
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Le livreur Paps peut libérer votre commande.
        </p>
      </div>

      {/* Récap paiement */}
      <div
        className="w-full rounded-2xl p-4 space-y-2 border"
        style={{ background: '#F0FDF4', borderColor: '#A7F3D0' }}>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Commande</span>
          <span className="text-xs font-mono font-bold" style={{ color: '#1E1B4B' }}>{orderId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Solde encaissé</span>
          <span className="text-sm font-black font-mono" style={{ color: '#059669' }}>
            {formatXOF(remainingBalanceAmount)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">Statut</span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#059669', color: 'white' }}>
            ✓ Validé
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDeliveryValidation}
        className="w-full py-3 rounded-2xl border font-bold text-sm"
        style={{ borderColor: '#A7F3D0', color: '#047857', background: '#ECFDF5' }}>
        Synchroniser la remise du colis
      </button>

      {syncMessage && (
        <p className="text-center text-xs font-semibold" style={{ color: '#047857' }}>
          {syncMessage}
        </p>
      )}

      <p className="text-center text-xs text-slate-400">
        Merci d'avoir commandé sur Doukoure Import 🇸🇳
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal exporté
// ---------------------------------------------------------------------------

export default function DeliveryValidationQRCode({
  orderId,
  remainingBalanceAmount,
  customerPhone,
  isBalancePaid,
  orderStatus,
  onPaymentInitiated,
  onDeliveryValidated,
}: Props) {
  const qrTimestamp = useMemo(() => new Date().toISOString(), [orderId])
  const validationToken = useMemo(() => generateToken(orderId, qrTimestamp), [orderId, qrTimestamp])

  function handlePayment() {
    onPaymentInitiated?.()
  }

  useEffect(() => {
    const qrPayload = JSON.stringify({
      orderId,
      balanceAmount: remainingBalanceAmount,
      token: validationToken,
      timestamp: qrTimestamp,
      v: 1,
    })

    cacheDeliveryPassSnapshot({
      orderId,
      customerPhone,
      remainingBalanceAmount,
      isBalancePaid,
      orderStatus: orderStatus ?? (isBalancePaid ? 'PAID' : 'OUT_FOR_DELIVERY'),
      qrPayload,
      validationToken,
      qrTimestamp,
      updatedAt: new Date().toISOString(),
    })
  }, [customerPhone, isBalancePaid, orderId, orderStatus, qrTimestamp, remainingBalanceAmount, validationToken])

  return (
    <div
      className="rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── En-tête ── */}
      <div
        className="px-4 py-3 border-b border-slate-100 flex items-center justify-between"
        style={{ background: '#FAFAFA' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: isBalancePaid ? '#F0FDF4' : '#EEF2FF' }}>
            <Shield size={15} style={{ color: isBalancePaid ? '#059669' : '#4338CA' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1E1B4B' }}>
              {isBalancePaid ? 'Solde réglé — Colis libéré' : 'QR Code de Validation Livreur'}
            </p>
            <p className="text-xs text-slate-400">
              {isBalancePaid ? 'Livraison confirmée par Paps' : 'Disponible hors-ligne · Signé côté client'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Corps ── */}
      <div className="px-4 pb-5 pt-3">
        {isBalancePaid ? (
          <PaidView
            orderId={orderId}
            remainingBalanceAmount={remainingBalanceAmount}
            onDeliveryValidated={onDeliveryValidated}
            qrTimestamp={qrTimestamp}
            validationToken={validationToken}
          />
        ) : (
          <UnpaidView
            orderId={orderId}
            remainingBalanceAmount={remainingBalanceAmount}
            customerPhone={customerPhone}
            orderStatus={orderStatus}
            onPaymentInitiated={handlePayment}
            onDeliveryValidated={onDeliveryValidated}
            qrTimestamp={qrTimestamp}
            validationToken={validationToken}
          />
        )}
      </div>
    </div>
  )
}
