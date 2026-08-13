import { useState, useMemo } from 'react'
import { Calculator, Scale, TrendingUp, RefreshCw, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  calculateInitialImportPrice,
  recalculateBalanceOnChinaWeighing,
  toCbm,
  formatXOF,
  DEFAULT_RATES,
  SHIPPING_LABELS,
  type ShippingOption,
  type SystemRates,
} from '../utils/pricingEngine'

// ---------------------------------------------------------------------------
// Sous-composant : ligne de détail
// ---------------------------------------------------------------------------
function DetailRow({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: accent ? '#059669' : '#1E1B4B' }}>
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Écran principal
// ---------------------------------------------------------------------------
export default function PricingEngineDemo() {
  // Paramètres du produit
  const [basePrice, setBasePrice]   = useState(45_000)
  const [weight, setWeight]         = useState(1.2)
  const [lengthCm, setLengthCm]     = useState(32)
  const [widthCm, setWidthCm]       = useState(22)
  const [heightCm, setHeightCm]     = useState(12)
  const [shipping, setShipping]     = useState<ShippingOption>('AIR_EXPRESS')
  const [margin, setMargin]         = useState(DEFAULT_RATES.marginPercentage)

  // Pesée réelle
  const [actualWeight, setActualWeight] = useState(1.4)
  const [showAdjustment, setShowAdjustment] = useState(true)
  const [showBreakdown, setShowBreakdown]   = useState(false)

  const rates: SystemRates = { ...DEFAULT_RATES, marginPercentage: margin }
  const dims = { lengthCm, widthCm, heightCm }

  const pricing = useMemo(() => {
    try {
      return calculateInitialImportPrice({
        basePriceXOF: basePrice,
        estimatedWeightKg: weight,
        dimensions: dims,
        shippingOption: shipping,
        rates,
      })
    } catch {
      return null
    }
  }, [basePrice, weight, lengthCm, widthCm, heightCm, shipping, margin])

  const adjustment = useMemo(() => {
    if (!pricing || !showAdjustment) return null
    try {
      return recalculateBalanceOnChinaWeighing({
        initialDepositPaid: pricing.depositAmount,
        estimatedWeightKg: weight,
        basePriceXOF: basePrice,
        actualWeightKg: actualWeight,
        actualDimensions: dims,
        shippingOption: shipping,
        rates,
      })
    } catch {
      return null
    }
  }, [pricing, showAdjustment, actualWeight, weight, basePrice, lengthCm, widthCm, heightCm, shipping, margin])

  const cbm = toCbm(dims)

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="bg-primary px-4 pb-5 pt-10 md:px-8 lg:pt-8">
        <div className="flex items-center gap-3 mb-1">
          <Calculator size={20} className="text-indigo-300" />
          <h1 className="text-white font-extrabold text-lg">Moteur de Calcul</h1>
        </div>
        <p className="text-indigo-300 text-xs">Ticket 1.1 — Simulation interactive du pricing engine</p>
      </div>

      {/* Inputs produit */}
      <div className="mx-auto mt-4 max-w-7xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:mx-8 lg:mt-8 lg:grid lg:grid-cols-2">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={14} style={{ color: '#059669' }} />
          <span className="font-bold text-sm" style={{ color: '#1E1B4B' }}>Paramètres du produit</span>
        </div>
        <div className="space-y-4 px-4 py-4 md:px-6 lg:px-8">

          {/* Prix de base */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">Prix d'achat Chine (FCFA)</label>
              <span className="text-xs font-mono font-bold" style={{ color: '#1E1B4B' }}>{basePrice.toLocaleString('fr-SN')}</span>
            </div>
            <input type="range" min={5000} max={500000} step={1000} value={basePrice}
              onChange={e => setBasePrice(+e.target.value)} className="w-full accent-indigo-700" />
          </div>

          {/* Poids */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">Poids estimé (kg)</label>
              <span className="text-xs font-mono font-bold" style={{ color: '#1E1B4B' }}>{weight} kg</span>
            </div>
            <input type="range" min={0.1} max={50} step={0.1} value={weight}
              onChange={e => setWeight(+e.target.value)} className="w-full accent-indigo-700" />
          </div>

          {/* Dimensions */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">
              Dimensions (cm) — CBM : <span className="font-mono" style={{ color: '#D97706' }}>{cbm.toFixed(4)} m³</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[['L', lengthCm, setLengthCm], ['l', widthCm, setWidthCm], ['h', heightCm, setHeightCm]].map(([label, val, setter]) => (
                <div key={label as string} className="text-center">
                  <p className="text-xs text-slate-400 mb-1">{label as string}</p>
                  <input type="number" min={1} max={300} value={val as number}
                    onChange={e => (setter as (v: number) => void)(+e.target.value)}
                    className="w-full text-center text-sm font-mono font-bold px-2 py-2 rounded-lg border border-slate-200 outline-none focus:border-indigo-400"
                    style={{ color: '#1E1B4B' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Mode expédition */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Mode d'expédition</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SHIPPING_LABELS) as ShippingOption[]).map(opt => (
                <button key={opt} onClick={() => setShipping(opt)}
                  className="py-2 px-1 rounded-xl text-xs font-bold border-2 transition-all"
                  style={{
                    borderColor: shipping === opt ? '#1E1B4B' : '#E2E8F0',
                    background: shipping === opt ? '#1E1B4B' : '#FAFAFA',
                    color: shipping === opt ? 'white' : '#64748B',
                  }}>
                  {SHIPPING_LABELS[opt].icon}<br />{SHIPPING_LABELS[opt].label.split(' ').slice(1).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Marge */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600">Marge commerciale</label>
              <span className="text-xs font-mono font-bold" style={{ color: '#D97706' }}>{margin}%</span>
            </div>
            <input type="range" min={0} max={50} step={1} value={margin}
              onChange={e => setMargin(+e.target.value)} className="w-full accent-amber-600" />
          </div>
        </div>
      </div>

      {/* Résultat calcul initial */}
      {pricing ? (
        <div className="mx-auto mt-4 max-w-7xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:mx-8">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Calculator size={14} style={{ color: '#1E1B4B' }} />
            <span className="font-bold text-sm" style={{ color: '#1E1B4B' }}>Résultat — Calcul initial</span>
          </div>

          {/* Badge principal */}
          <div className="p-4" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs mb-0.5">Acompte à payer aujourd'hui</p>
                <div className="flex items-center gap-2">
                  <span className="text-white font-extrabold text-2xl font-mono">{formatXOF(pricing.depositAmount)}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}>2/3</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-emerald-100 text-xs mb-0.5">Solde à la livraison</p>
                <p className="text-white font-bold text-base font-mono">{formatXOF(pricing.estimatedBalance)}</p>
                <span className="text-emerald-200 text-xs">1/3</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-3">
            <DetailRow label="Prix d'achat Chine" value={formatXOF(pricing.breakdown.basePriceXOF)} mono />
            <DetailRow label="Coût de fret" value={formatXOF(pricing.shippingCost)} mono />
            {pricing.cbmVolume !== undefined && (
              <DetailRow label="Volume CBM" value={`${pricing.cbmVolume.toFixed(4)} m³`} mono />
            )}
            <DetailRow label="Sous-total (avant marge)" value={formatXOF(pricing.breakdown.subtotal)} mono />
            <DetailRow label={`Marge (${margin}%)`} value={`+ ${formatXOF(pricing.breakdown.marginXOF)}`} mono />
            <DetailRow label="Prix total TTC" value={formatXOF(pricing.totalPrice)} mono accent />
          </div>

          {/* Toggle détail */}
          <button onClick={() => setShowBreakdown(s => !s)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-t border-slate-100 text-xs font-semibold text-slate-500">
            Détail du taux appliqué {showBreakdown ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showBreakdown && (
            <div className="px-4 pb-3 space-y-1 text-xs" style={{ background: '#F8FAFC' }}>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Mode</span>
                <span className="font-semibold font-mono" style={{ color: '#1E1B4B' }}>
                  {SHIPPING_LABELS[pricing.breakdown.shippingOption].label}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Taux appliqué</span>
                <span className="font-semibold font-mono" style={{ color: '#1E1B4B' }}>
                  {pricing.breakdown.rateApplied.toLocaleString('fr-SN')} {pricing.breakdown.unitLabel}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">DEPOSIT_RATIO</span>
                <span className="font-semibold font-mono" style={{ color: '#1E1B4B' }}>2/3 = 66.67%</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-4 mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
          Paramètres invalides — vérifiez les entrées.
        </div>
      )}

      {/* Section ajustement pesée */}
      <div className="mx-auto mt-4 max-w-7xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm md:mx-8">
        <button onClick={() => setShowAdjustment(s => !s)}
          className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Scale size={14} style={{ color: '#D97706' }} />
            <span className="font-bold text-sm" style={{ color: '#1E1B4B' }}>Simulation Pesée Réelle — Ajustement solde</span>
          </div>
          {showAdjustment ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>

        {showAdjustment && (
          <div className="px-4 py-4">
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">Poids réel mesuré en Chine (kg)</label>
                <span className="text-xs font-mono font-bold" style={{
                  color: actualWeight > weight ? '#D97706' : actualWeight < weight ? '#059669' : '#1E1B4B'
                }}>{actualWeight} kg</span>
              </div>
              <input type="range" min={0.1} max={50} step={0.1} value={actualWeight}
                onChange={e => setActualWeight(+e.target.value)} className="w-full accent-amber-600" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400">Estimé : {weight} kg</span>
                <span className="text-xs font-semibold font-mono" style={{
                  color: actualWeight > weight ? '#D97706' : '#059669'
                }}>
                  {actualWeight > weight ? '+' : ''}{Math.round((actualWeight - weight) * 1000) / 1000} kg
                </span>
              </div>
            </div>

            {adjustment && pricing && (
              <div className="rounded-xl overflow-hidden border border-slate-100">
                {/* Résultat ajustement */}
                <div className="p-3 flex items-center justify-between"
                  style={{ background: adjustment.isCredit ? '#F0FDF4' : '#FFFBEB' }}>
                  <div className="flex items-center gap-2">
                    {adjustment.isCredit
                      ? <CheckCircle size={16} style={{ color: '#059669' }} />
                      : <AlertTriangle size={16} style={{ color: '#D97706' }} />}
                    <span className="text-xs font-bold" style={{ color: adjustment.isCredit ? '#059669' : '#D97706' }}>
                      {adjustment.isCredit ? 'Crédit — Colis plus léger' : 'Surcoût — Colis plus lourd'}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm" style={{ color: adjustment.isCredit ? '#059669' : '#D97706' }}>
                    {adjustment.priceAdjustmentXOF > 0 ? '+' : ''}{formatXOF(adjustment.priceAdjustmentXOF)}
                  </span>
                </div>

                <div className="px-3 py-2 space-y-0">
                  <DetailRow label="Nouveau total TTC" value={formatXOF(adjustment.newTotalPrice)} mono />
                  <DetailRow label="Acompte déjà payé" value={`− ${formatXOF(pricing.depositAmount)}`} mono />
                  <DetailRow
                    label="Solde final à la livraison"
                    value={formatXOF(adjustment.finalBalanceToPay)}
                    mono accent={!adjustment.isCredit}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note test */}
      <div className="mx-auto mb-6 mt-4 flex max-w-7xl items-start gap-2 rounded-xl border border-indigo-100 bg-primary-soft p-3 md:mx-8">
        <RefreshCw size={13} style={{ color: '#4338CA' }} className="mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed" style={{ color: '#3730A3' }}>
          Ce moteur est couvert par <strong>42 tests unitaires vitest</strong> validant les cas nominaux, les ajustements de pesée, les crédits, la validation des entrées et les scénarios bout-en-bout. Lancez <code className="font-mono bg-indigo-100 px-1 rounded">pnpm test</code> pour les exécuter.
        </p>
      </div>
    </div>
  )
}
