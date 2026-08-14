/**
 * ShippingOptionSelector — Ticket 1.2
 *
 * Composant interactif de sélection du mode d'expédition avec mise à jour
 * en temps réel des prix (acompte 2/3 / solde 1/3) via pricingEngine.
 *
 * Props :
 *   basePriceXOF      — Prix d'achat du produit en Chine (FCFA)
 *   estimatedWeight   — Poids estimé en kg
 *   dimensions        — Dimensions en cm (L × l × h)
 *   rates             — Grille tarifaire (DEFAULT_RATES si absente)
 *   defaultOption     — Mode présélectionné (AIR_EXPRESS par défaut)
 *   onSelectionChange — Callback déclenché à chaque changement de mode
 */

import { useState, useRef, useEffect } from 'react'
import { CheckCircle, Info, Plane, Ship, Clock, Weight, ChevronDown, ChevronUp } from 'lucide-react'
import {
  calculateInitialImportPrice,
  formatXOF,
  type ShippingOption,
  type Dimensions,
  type SystemRates,
  type PriceBreakdown,
  DEFAULT_RATES,
  SHIPPING_LABELS,
} from '../utils/pricingEngine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShippingSelectionPayload {
  option: ShippingOption
  pricing: PriceBreakdown
}

interface Props {
  basePriceXOF: number
  estimatedWeight: number
  dimensions: Dimensions
  rates?: SystemRates
  defaultOption?: ShippingOption
  onSelectionChange?: (payload: ShippingSelectionPayload) => void
}

// ---------------------------------------------------------------------------
// Données statiques par mode
// ---------------------------------------------------------------------------

const MODE_META: Record<ShippingOption, {
  Icon: typeof Plane
  tagline: string
  pros: string[]
  color: string
  colorLight: string
}> = {
  AIR_EXPRESS: {
    Icon: Plane,
    tagline: 'Le plus rapide',
    pros: ['Suivi en temps réel', 'Priorité douane', 'Idéal produits urgents'],
    color: '#1E1B4B',
    colorLight: '#EEF2FF',
  },
  AIR_ECO: {
    Icon: Plane,
    tagline: 'Meilleur rapport qualité-prix',
    pros: ['Économique', 'Fiable & assuré', 'Recommandé PME'],
    color: '#059669',
    colorLight: '#F0FDF4',
  },
  MARITIME: {
    Icon: Ship,
    tagline: 'Gros volumes — CBM partagé',
    pros: ['Tarif au m³', 'Conteneur groupé', 'Idéal gros colis'],
    color: '#D97706',
    colorLight: '#FFFBEB',
  },
}

// ---------------------------------------------------------------------------
// Sous-composant : carte de mode d'expédition
// ---------------------------------------------------------------------------

function ShippingCard({
  option,
  pricing,
  selected,
  onSelect,
  animating,
}: {
  option: ShippingOption
  pricing: PriceBreakdown
  selected: boolean
  onSelect: () => void
  animating: boolean
}) {
  const meta = MODE_META[option]
  const label = SHIPPING_LABELS[option]
  const Icon = meta.Icon

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className="w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-200"
      style={{
        borderColor: selected ? meta.color : '#E2E8F0',
        background: selected ? meta.colorLight : '#FAFAFA',
        boxShadow: selected ? `0 0 0 1px ${meta.color}18` : 'none',
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: selected ? meta.color : '#E2E8F0' }}>
          <Icon size={16} style={{ color: selected ? 'white' : '#64748B' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm" style={{ color: '#1E1B4B' }}>{label.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
              style={{ background: selected ? meta.color : '#F1F5F9', color: selected ? 'white' : '#64748B' }}>
              <Clock size={9} /> {label.duration}
            </span>
            {selected && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: meta.color, color: 'white' }}>
                {meta.tagline}
              </span>
            )}
          </div>
          <p
            className="text-xs font-mono font-semibold mt-0.5 transition-all duration-300"
            style={{ color: selected ? meta.color : '#94A3B8', opacity: animating ? 0.4 : 1 }}
          >
            Total TTC : {formatXOF(pricing.totalPrice)}
          </p>
        </div>

        <CheckCircle
          size={18}
          style={{
            color: meta.color,
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.15s',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Expanded detail — visible uniquement sur la carte sélectionnée */}
      {selected && (
        <div className="px-4 pb-4 pt-1 border-t border-dashed"
          style={{ borderColor: `${meta.color}30` }}>

          {/* Avantages du mode */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {meta.pros.map(pro => (
              <span key={pro} className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{ background: `${meta.color}12`, color: meta.color }}>
                ✓ {pro}
              </span>
            ))}
          </div>

          {/* Détail coût fret */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl py-2 px-1" style={{ background: 'rgba(255,255,255,0.7)' }}>
              <p className="text-xs text-slate-400 mb-0.5">Fret</p>
              <p className="font-bold text-xs font-mono" style={{ color: '#1E1B4B' }}>
                {formatXOF(pricing.shippingCost)}
              </p>
            </div>
            <div className="rounded-xl py-2 px-1" style={{ background: 'rgba(255,255,255,0.7)' }}>
              <p className="text-xs text-slate-400 mb-0.5">Marge</p>
              <p className="font-bold text-xs font-mono" style={{ color: '#1E1B4B' }}>
                {formatXOF(pricing.breakdown.marginXOF)}
              </p>
            </div>
            {pricing.cbmVolume !== undefined ? (
              <div className="rounded-xl py-2 px-1" style={{ background: 'rgba(255,255,255,0.7)' }}>
                <p className="text-xs text-slate-400 mb-0.5">CBM</p>
                <p className="font-bold text-xs font-mono" style={{ color: '#D97706' }}>
                  {pricing.cbmVolume.toFixed(3)} m³
                </p>
              </div>
            ) : (
              <div className="rounded-xl py-2 px-1" style={{ background: 'rgba(255,255,255,0.7)' }}>
                <p className="text-xs text-slate-400 mb-0.5">Tarif</p>
                <p className="font-bold text-xs font-mono" style={{ color: '#1E1B4B' }}>
                  {pricing.breakdown.rateApplied.toLocaleString('fr-SN')}
                  <span className="text-slate-400"> /kg</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : carte de prix (acompte / solde)
// ---------------------------------------------------------------------------

function PricingCard({
  pricing,
  animating,
  option,
}: {
  pricing: PriceBreakdown
  animating: boolean
  option: ShippingOption
}) {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false)
  const meta = MODE_META[option]

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-white">

      {/* Total TTC — ligne récap */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Weight size={13} className="text-slate-400" />
          <span className="text-sm text-slate-500">Prix total TTC</span>
        </div>
        <span
          className="font-bold text-base font-mono transition-all duration-300"
          style={{ color: '#1E1B4B', opacity: animating ? 0.3 : 1 }}
        >
          {formatXOF(pricing.totalPrice)}
        </span>
      </div>

      {/* Acompte 2/3 — badge émeraude principal */}
      <div className="p-5" style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-extrabold text-base">Acompte à payer aujourd'hui</span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-black"
                style={{ background: 'rgba(255,255,255,0.22)', color: 'white', letterSpacing: '0.05em' }}
              >
                2 / 3
              </span>
            </div>
            <p className="text-emerald-100 text-xs leading-relaxed">
              Règlement immédiat pour confirmer votre commande.<br />
              Le solde reste à payer à la livraison.
            </p>
          </div>
          <div
            className="shrink-0 text-right transition-all duration-300"
            style={{ opacity: animating ? 0.3 : 1, transform: animating ? 'translateY(4px)' : 'translateY(0)' }}
          >
            <span className="text-white font-black text-3xl leading-none font-mono">
              {formatXOF(pricing.depositAmount)}
            </span>
          </div>
        </div>

        {/* Barre de progression visuelle 2/3 */}
        <div className="mt-4 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <div className="h-full rounded-full" style={{ width: '66.67%', background: 'rgba(255,255,255,0.8)' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-emerald-100 text-xs">Acompte (66,67%)</span>
          <span className="text-emerald-200 text-xs">Solde (33,33%)</span>
        </div>
      </div>

      {/* Solde estimé 1/3 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100"
        style={{ background: '#F8FAFC' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Solde estimé à la livraison</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: '#EEF2FF', color: '#4338CA' }}
          >
            1 / 3
          </span>
        </div>
        <span
          className="font-semibold font-mono text-sm transition-all duration-300"
          style={{ color: '#1E1B4B', opacity: animating ? 0.3 : 1 }}
        >
          {formatXOF(pricing.estimatedBalance)}
        </span>
      </div>

      {/* Disclaimer / tooltip pesée */}
      <div>
        <button
          onClick={() => setDisclaimerOpen(o => !o)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left"
          aria-expanded={disclaimerOpen}
        >
          <Info size={14} style={{ color: '#D97706' }} className="shrink-0" />
          <span className="flex-1 text-xs leading-snug" style={{ color: '#92400E' }}>
            Le solde (1/3) sera ajusté automatiquement si le poids réel diffère du poids estimé.
          </span>
          {disclaimerOpen
            ? <ChevronUp size={13} className="text-slate-400 shrink-0" />
            : <ChevronDown size={13} className="text-slate-400 shrink-0" />}
        </button>

        {disclaimerOpen && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>
              Après réception à notre entrepôt en Chine, chaque colis est pesé sur une balance certifiée. Si le poids
              réel diffère du poids estimé lors de la commande, le montant du solde est automatiquement recalculé.
            </p>
            <div className="rounded-xl p-3 space-y-1.5 text-xs" style={{ background: '#FFFBEB' }}>
              <div className="flex items-start gap-2">
                <span style={{ color: '#D97706' }}>▲</span>
                <span style={{ color: '#92400E' }}>
                  <strong>Surpoids :</strong> La différence de coût est ajoutée au solde. Vous en êtes notifié par
                  WhatsApp avant l'expédition.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: '#059669' }}>▼</span>
                <span style={{ color: '#065F46' }}>
                  <strong>Sous-poids :</strong> La déduction est soustraite du solde. Vous payez moins à la livraison.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal exporté
// ---------------------------------------------------------------------------

export default function ShippingOptionSelector({
  basePriceXOF,
  estimatedWeight,
  dimensions,
  rates = DEFAULT_RATES,
  defaultOption = 'AIR_EXPRESS',
  onSelectionChange,
}: Props) {
  const [selected, setSelected] = useState<ShippingOption>(defaultOption)
  const [animating, setAnimating] = useState(false)
  const prevOption = useRef<ShippingOption>(defaultOption)

  // Calcule le pricing pour toutes les options en une passe
  const allPricings = (Object.keys(SHIPPING_LABELS) as ShippingOption[]).reduce(
    (acc, opt) => ({
      ...acc,
      [opt]: calculateInitialImportPrice({
        basePriceXOF,
        estimatedWeightKg: estimatedWeight,
        dimensions,
        shippingOption: opt,
        rates,
      }),
    }),
    {} as Record<ShippingOption, PriceBreakdown>,
  )

  const currentPricing = allPricings[selected]

  // Anime le prix lors du changement de mode
  function handleSelect(opt: ShippingOption) {
    if (opt === selected) return
    prevOption.current = selected
    setAnimating(true)
    setTimeout(() => {
      setSelected(opt)
      setAnimating(false)
      onSelectionChange?.({ option: opt, pricing: allPricings[opt] })
    }, 180)
  }

  // Notifie le parent au montage
  useEffect(() => {
    onSelectionChange?.({ option: selected, pricing: currentPricing })
  }, [])

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* En-tête de section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm" style={{ color: '#1E1B4B' }}>Mode d'expédition</h2>
        <span className="text-xs text-slate-400">
          {estimatedWeight} kg · {dimensions.lengthCm}×{dimensions.widthCm}×{dimensions.heightCm} cm
        </span>
      </div>

      {/* Sélecteur de modes */}
      <div className="flex flex-col gap-2 mb-4">
        {(Object.keys(SHIPPING_LABELS) as ShippingOption[]).map(opt => (
          <ShippingCard
            key={opt}
            option={opt}
            pricing={allPricings[opt]}
            selected={selected === opt}
            onSelect={() => handleSelect(opt)}
            animating={animating && selected === opt}
          />
        ))}
      </div>

      {/* Carte de prix dynamique */}
      <PricingCard pricing={currentPricing} animating={animating} option={selected} />
    </div>
  )
}
