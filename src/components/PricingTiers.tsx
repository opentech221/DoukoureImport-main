import { Check } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'

interface Props {
  quantity: number
  unitPriceXOF: number
}

export default function PricingTiers({ quantity, unitPriceXOF }: Props) {
  const tiers = [
    { label: '1-9 pièces', min: 1, multiplier: 1 },
    { label: '10-49 pièces', min: 10, multiplier: 0.94 },
    { label: '50+ pièces', min: 50, multiplier: 0.88 },
  ]

  return (
    <section className="mt-4" aria-label="Tarification par volume">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Prix par volume</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {tiers.map((tier) => {
          const active = quantity >= tier.min && (tier.min === 50 || quantity < (tier.min === 10 ? 50 : 10))
          return (
            <div key={tier.label} className={`rounded-xl border px-3 py-2.5 ${active ? 'border-success bg-success-soft ring-1 ring-success' : 'border-border bg-card'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text-muted">{tier.label}</span>
                {active && <Check size={14} className="text-success" />}
              </div>
              <p className="mt-1 text-sm font-extrabold font-mono text-text">{formatXOF(Math.round(unitPriceXOF * tier.multiplier))} <span className="text-[10px] font-medium text-text-subtle">/u</span></p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
