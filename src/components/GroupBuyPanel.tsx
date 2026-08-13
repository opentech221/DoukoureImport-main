import { Share2, Users } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'

interface Props {
  soloPriceXOF: number
  groupPriceXOF: number
  groupSize?: number
  onShare: () => void
}

export default function GroupBuyPanel({ soloPriceXOF, groupPriceXOF, groupSize = 3, onShare }: Props) {
  return (
    <section className="mt-4 space-y-3" aria-label="Achat solo ou groupé">
      <div className="flex overflow-hidden rounded-2xl border border-border shadow-sm">
        <div className="flex min-w-0 flex-1 flex-col justify-center bg-surface-muted px-3 py-3 sm:px-4">
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Achat solo</span>
          <span className="mt-1 truncate text-sm font-extrabold font-mono text-text">{formatXOF(soloPriceXOF)} FCFA</span>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="flex min-w-0 flex-[1.35] items-center justify-between gap-2 bg-success px-3 py-3 text-left text-white transition hover:bg-emerald-700 sm:px-4"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-100"><Users size={13} /> Achat groupé ({groupSize} pers.)</span>
            <span className="mt-1 block truncate text-sm font-extrabold font-mono">{formatXOF(groupPriceXOF)} FCFA</span>
          </span>
          <Share2 size={17} className="shrink-0" />
        </button>
      </div>
      <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2 text-xs font-semibold text-emerald-800">
        <span className="h-2 w-2 animate-pulse rounded-full bg-success" /> Amina a lancé un groupe, il manque 1 personne pour le prix de gros !
      </p>
    </section>
  )
}
