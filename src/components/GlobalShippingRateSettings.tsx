/**
 * GlobalShippingRateSettings — Ticket 5.1 (Mobile-First Responsive)
 *
 * - Mobile  : 1 colonne — formulaire en haut, simulation en bas
 * - Desktop : 2 colonnes côte à côte (lg:grid-cols-2)
 * - Champs full-width, labels séparés, bouton tactile ≥ 48px
 * - Cartes produit aérées avec Ancien vs Nouveau lisibles sur mobile
 */

import { useState, useEffect } from 'react'
import {
  TrendingUp, Package, Save, RefreshCw,
  CheckCircle, AlertCircle, Plane, Ship, Percent,
  ArrowDown, ArrowUp,
} from 'lucide-react'
import {
  calculateInitialImportPrice,
  formatXOF,
  type SystemRates,
  DEFAULT_RATES,
} from '../utils/pricingEngine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  initialRates?: SystemRates
  onSave?: (rates: SystemRates) => Promise<void>
}

// ---------------------------------------------------------------------------
// Produits de simulation
// ---------------------------------------------------------------------------

const SAMPLE_PRODUCTS = [
  {
    name:     'Sneakers Nike Air Max',
    emoji:    '👟',
    weight:   1.2,
    dims:     { lengthCm: 32, widthCm: 22, heightCm: 12 },
    base:     45_000,
    shipping: 'AIR_EXPRESS' as const,
  },
  {
    name:     'Sac à main cuir PU',
    emoji:    '👜',
    weight:   0.8,
    dims:     { lengthCm: 35, widthCm: 28, heightCm: 14 },
    base:     22_000,
    shipping: 'AIR_ECO' as const,
  },
  {
    name:     'TV 55" Samsung',
    emoji:    '📺',
    weight:   18,
    dims:     { lengthCm: 140, widthCm: 12, heightCm: 85 },
    base:     185_000,
    shipping: 'MARITIME' as const,
  },
]

const SHIPPING_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  AIR_EXPRESS: { label: '✈️ Aérien Express', bg: '#EEF2FF', color: '#4338CA' },
  AIR_ECO:     { label: '🛫 Aérien Éco',     bg: '#F0FDF4', color: '#059669' },
  MARITIME:    { label: '🚢 Maritime',        bg: '#FFF7ED', color: '#D97706' },
}

// ---------------------------------------------------------------------------
// Sous-composant : champ de saisie d'un taux (full-width, label distinct)
// ---------------------------------------------------------------------------

interface RateInputProps {
  label: string
  value: number
  onChange: (v: number) => void
  suffix: string
  hint: string
  icon: React.ReactNode
  changed: boolean
}

function RateInput({ label, value, onChange, suffix, hint, icon, changed }: RateInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="di-field-label flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        <span className="flex-1">{label}</span>
        {changed && (
          <span
            className="rounded bg-amber-soft px-2 py-0.5 text-xs font-bold text-amber"
            style={{ whiteSpace: 'nowrap' }}>
            modifié
          </span>
        )}
      </label>
      <div className="relative w-full">
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="di-field-input w-full rounded-xl border px-4 py-3 text-sm font-mono font-semibold outline-none transition-colors"
          style={{
            borderColor: changed ? '#FDE68A' : '#E2E8F0',
            paddingRight: `${suffix.length * 8 + 28}px`,
          }}
        />
        <span
          className="di-field-hint absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-medium"
          style={{ whiteSpace: 'nowrap' }}>
          {suffix}
        </span>
      </div>
      <p className="di-field-hint text-xs">{hint}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : toast de confirmation
// ---------------------------------------------------------------------------

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border transition-all duration-300 w-[calc(100%-2rem)] max-w-sm"
      style={{
        transform:     visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(140px)',
        opacity:       visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}>
      <CheckCircle size={20} className="shrink-0 text-success" />
      <div className="min-w-0">
        <p className="font-bold text-sm text-emerald-800">
          Tarifs mis à jour !
        </p>
        <p className="truncate text-xs text-success">
          Tout le catalogue reflète ces nouveaux tarifs.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : carte produit simulation (mobile-friendly)
// ---------------------------------------------------------------------------

function ProductSimCard({
  prod,
  rates,
  initialRates,
}: {
  prod: typeof SAMPLE_PRODUCTS[number]
  rates: SystemRates
  initialRates: SystemRates
}) {
  const badge = SHIPPING_BADGE[prod.shipping]

  const newP = calculateInitialImportPrice({
    basePriceXOF:      prod.base,
    estimatedWeightKg: prod.weight,
    dimensions:        prod.dims,
    shippingOption:    prod.shipping,
    rates,
  })
  const oldP = calculateInitialImportPrice({
    basePriceXOF:      prod.base,
    estimatedWeightKg: prod.weight,
    dimensions:        prod.dims,
    shippingOption:    prod.shipping,
    rates:             initialRates,
  })

  const changed = newP.totalPrice !== oldP.totalPrice
  const delta   = newP.totalPrice - oldP.totalPrice
  const isUp    = delta > 0

  return (
    <div className="border-b border-border px-4 py-4 last:border-0">

      {/* Titre produit + badge mode */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="flex items-center gap-1.5 text-sm font-bold text-text">
          <span>{prod.emoji}</span>
          {prod.name}
        </span>
        <span
          className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
          {badge.label}
        </span>
      </div>

      {/* Ancien → Nouveau prix */}
      <div className="flex items-center gap-3 mb-3">
        {/* Ancien */}
        <div className="di-muted-surface flex-1 rounded-xl border border-border p-3 text-center">
          <p className="mb-1 text-xs text-text-subtle">Ancien prix</p>
          <p className="text-sm font-bold font-mono text-text-muted" style={{ textDecoration: changed ? 'line-through' : 'none' }}>
            {formatXOF(oldP.totalPrice)}
          </p>
        </div>

        {/* Delta */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          {changed ? (
            <>
              {isUp
                ? <ArrowUp size={16} style={{ color: '#D97706' }} />
                : <ArrowDown size={16} style={{ color: '#059669' }} />}
              <span
                className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: isUp ? '#FEF3C7' : '#D1FAE5',
                  color:      isUp ? '#D97706' : '#059669',
                }}>
                {isUp ? '+' : ''}{formatXOF(delta)}
              </span>
            </>
          ) : (
            <span className="text-slate-300 text-lg">→</span>
          )}
        </div>

        {/* Nouveau */}
        <div
          className={`flex-1 rounded-xl border p-3 text-center ${changed ? (isUp ? 'di-soft-warning' : 'di-soft-success') : 'di-muted-surface border-border'}`}
          style={{
          }}>
          <p className="mb-1 text-xs text-text-subtle">Nouveau prix</p>
          <p
            className="font-mono text-sm font-bold"
            style={{ color: changed ? (isUp ? '#D97706' : '#059669') : '#64748B' }}>
            {formatXOF(newP.totalPrice)}
          </p>
        </div>
      </div>

      {/* Acompte 2/3 + Solde 1/3 */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
          style={{ background: '#F0FDF4', border: '1px solid #A7F3D0' }}>
          <span className="text-xs font-semibold" style={{ color: '#059669' }}>Acompte 2/3</span>
          <span className="text-sm font-mono font-black" style={{ color: '#059669' }}>
            {formatXOF(newP.depositAmount)}
          </span>
        </div>
        <div
          className="flex flex-col gap-1 px-3 py-2.5 rounded-xl"
          style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
          <span className="text-xs font-semibold" style={{ color: '#4338CA' }}>Solde 1/3</span>
          <span className="text-sm font-mono font-black" style={{ color: '#4338CA' }}>
            {formatXOF(newP.estimatedBalance)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function GlobalShippingRateSettings({ initialRates = DEFAULT_RATES, onSave }: Props) {
  const [rates,   setRates]   = useState<SystemRates>(initialRates)
  const [saving,  setSaving]  = useState(false)
  const [toastOn, setToastOn] = useState(false)

  useEffect(() => { setRates(initialRates) }, [initialRates])

  function updateRate(key: keyof SystemRates) {
    return (v: number) => setRates(r => ({ ...r, [key]: v }))
  }

  function isChanged(key: keyof SystemRates) {
    return rates[key] !== initialRates[key]
  }

  function hasChanges() {
    return (Object.keys(rates) as (keyof SystemRates)[]).some(k => isChanged(k))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await (onSave ? onSave(rates) : new Promise(r => setTimeout(r, 1200)))
      setToastOn(true)
      setTimeout(() => setToastOn(false), 4000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Mobile: 1 col / Desktop: 2 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ══ Colonne gauche : formulaire ══ */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp size={15} style={{ color: '#059669' }} />
              <h2 className="font-bold text-sm" style={{ color: '#1E1B4B' }}>
                Configuration des Tarifs Globaux
              </h2>
            </div>

            <div className="px-5 py-5 flex flex-col gap-6">

              {/* Fret aérien */}
              <div className="flex flex-col gap-4 pb-5 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                  Fret Aérien
                </p>
                <RateInput
                  label="Aérien Express (5–7j)"
                  value={rates.rateAirExpressXOF}
                  onChange={updateRate('rateAirExpressXOF')}
                  suffix="FCFA / kg"
                  hint="Priorité douane · Tracking temps réel"
                  icon={<Plane size={13} style={{ color: '#4338CA' }} />}
                  changed={isChanged('rateAirExpressXOF')}
                />
                <RateInput
                  label="Aérien Éco (10–15j)"
                  value={rates.rateAirEcoXOF}
                  onChange={updateRate('rateAirEcoXOF')}
                  suffix="FCFA / kg"
                  hint="Recommandé PME · Assuré"
                  icon={<Plane size={13} style={{ color: '#059669' }} />}
                  changed={isChanged('rateAirEcoXOF')}
                />
              </div>

              {/* Fret maritime */}
              <div className="flex flex-col gap-4 pb-5 border-b border-slate-100">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                  Fret Maritime
                </p>
                <RateInput
                  label="Maritime (~35j)"
                  value={rates.rateMaritimeCbmXOF}
                  onChange={updateRate('rateMaritimeCbmXOF')}
                  suffix="FCFA / m³"
                  hint="Conteneur groupé · Idéal gros volumes"
                  icon={<Ship size={13} style={{ color: '#D97706' }} />}
                  changed={isChanged('rateMaritimeCbmXOF')}
                />
              </div>

              {/* Marge */}
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
                  Marge Commerciale
                </p>
                <RateInput
                  label="Marge globale"
                  value={rates.marginPercentage}
                  onChange={updateRate('marginPercentage')}
                  suffix="%"
                  hint="Appliquée sur (prix achat + fret) pour tous les produits"
                  icon={<Percent size={13} style={{ color: '#7C3AED' }} />}
                  changed={isChanged('marginPercentage')}
                />
              </div>

              {/* Récap modifications non enregistrées */}
              {hasChanges() && (
                <div
                  className="rounded-xl p-4 flex flex-col gap-2 border"
                  style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={13} style={{ color: '#D97706', flexShrink: 0 }} />
                    <span className="text-xs font-bold" style={{ color: '#92400E' }}>
                      Modifications non enregistrées
                    </span>
                  </div>
                  {(Object.keys(rates) as (keyof SystemRates)[]).map(k => {
                    if (!isChanged(k)) return null
                    const labels: Record<keyof SystemRates, string> = {
                      rateAirExpressXOF:  'Express',
                      rateAirEcoXOF:      'Éco',
                      rateMaritimeCbmXOF: 'Maritime',
                      marginPercentage:   'Marge',
                    }
                    const d   = rates[k] - initialRates[k]
                    const isUp = d > 0
                    return (
                      <div key={k} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span style={{ color: '#92400E' }}>{labels[k]}</span>
                        <span
                          className="font-mono font-bold"
                          style={{ color: isUp ? '#D97706' : '#059669' }}>
                          {formatXOF(initialRates[k])} → {formatXOF(rates[k])}
                          {' '}({isUp ? '+' : ''}{((d / initialRates[k]) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* CTA — tactile ≥ 48px */}
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges()}
                className="w-full rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{
                  minHeight: 52,
                  fontSize:  15,
                  background: saving
                    ? '#6EE7B7'
                    : hasChanges()
                      ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                      : '#E2E8F0',
                  color:  hasChanges() || saving ? 'white' : '#94A3B8',
                  cursor: hasChanges() && !saving ? 'pointer' : 'not-allowed',
                }}>
                {saving
                  ? <><RefreshCw size={16} className="animate-spin" /> Application en cours…</>
                  : <><Save size={16} /> Enregistrer et appliquer à tout le catalogue</>}
              </button>
            </div>
          </div>

          {/* Règle métier impact catalogue */}
          <div
            className="rounded-2xl p-4 border"
            style={{ background: '#EEF2FF', borderColor: '#C7D2FE' }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: '#3730A3' }}>
              📌 Impact Catalogue
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#4338CA' }}>
              Les nouveaux tarifs s'appliquent immédiatement à <strong>tous les produits</strong> dès l'enregistrement.
              Les commandes déjà en cours <strong>conservent le tarif verrouillé</strong> lors du paiement de leur acompte initial.
            </p>
          </div>
        </div>

        {/* ══ Colonne droite : simulation live ══ */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={15} style={{ color: '#1E1B4B' }} />
                <h2 className="font-bold text-sm" style={{ color: '#1E1B4B' }}>
                  Simulation Live — Impact Catalogue
                </h2>
              </div>
              <span className="text-xs" style={{ color: '#94A3B8' }}>Temps réel</span>
            </div>

            <div>
              {SAMPLE_PRODUCTS.map(prod => (
                <ProductSimCard
                  key={prod.name}
                  prod={prod}
                  rates={rates}
                  initialRates={initialRates}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <SaveToast visible={toastOn} />
    </>
  )
}
