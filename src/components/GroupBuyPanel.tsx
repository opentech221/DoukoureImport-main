import { Clock, Share2, Users } from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'
import { useEffect, useState } from 'react'

interface Props {
  soloPriceXOF: number
  groupPriceXOF: number
  groupSize?: number
  joinedMembers?: number
  selectedMode: 'solo' | 'group'
  onSelectMode: (mode: 'solo' | 'group') => void
  onShare: () => void
}

export default function GroupBuyPanel({ soloPriceXOF, groupPriceXOF, groupSize = 3, joinedMembers = 2, selectedMode, onSelectMode, onShare }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(2 * 60 * 60 + 18 * 60)
  const remainingMembers = Math.max(0, groupSize - joinedMembers)
  const savings = Math.max(0, soloPriceXOF - groupPriceXOF)

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const hours = Math.floor(secondsLeft / 3600)
  const minutes = Math.floor((secondsLeft % 3600) / 60)
  const seconds = secondsLeft % 60

  return (
    <section className="mt-4 space-y-3" aria-label="Achat solo ou groupé">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold text-text">Achetez seul ou à plusieurs</p>
          <p className="mt-0.5 text-xs text-text-muted">Le prix groupé est débloqué dès que le groupe est complet.</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-soft px-2 py-1 text-xs font-bold text-amber"><Clock size={12} /> {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
      </div>
      <div className="flex overflow-hidden rounded-2xl border border-border shadow-sm">
        <button type="button" onClick={() => onSelectMode('solo')} className={`flex min-w-0 flex-1 flex-col justify-center px-3 py-3 text-left transition sm:px-4 ${selectedMode === 'solo' ? 'bg-primary-soft ring-1 ring-primary' : 'bg-surface-muted'}`}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-text-muted">Achat solo</span>
          <span className="mt-1 truncate text-sm font-extrabold font-mono text-text">{formatXOF(soloPriceXOF)} FCFA</span>
          <span className="mt-1 text-[11px] font-semibold text-text-muted">Commande immédiate</span>
        </button>
        <button
          type="button"
          onClick={() => onSelectMode('group')}
          className={`flex min-w-0 flex-[1.35] items-center justify-between gap-2 px-3 py-3 text-left text-white transition sm:px-4 ${selectedMode === 'group' ? 'bg-emerald-700 ring-2 ring-emerald-300' : 'bg-success hover:bg-emerald-700'}`}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-100"><Users size={13} /> Achat groupé ({groupSize} pers.)</span>
            <span className="mt-1 block truncate text-sm font-extrabold font-mono">{formatXOF(groupPriceXOF)} FCFA</span>
          </span>
          <Users size={17} className="shrink-0" />
        </button>
      </div>
      {selectedMode === 'group' && (
        <div className="rounded-xl border border-emerald-200 bg-success-soft p-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-900"><span><span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-success" /> Amina et Mamadou sont déjà dans ce groupe</span><span>{joinedMembers}/{groupSize} personnes</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-success" style={{ width: `${(joinedMembers / groupSize) * 100}%` }} /></div>
          <p className="mt-2 text-xs text-emerald-800">Encore {remainingMembers} personne{remainingMembers > 1 ? 's' : ''} pour économiser <strong>{formatXOF(savings)} FCFA</strong> chacun.</p>
          <button type="button" onClick={onShare} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-success px-3 py-2 text-xs font-extrabold text-white"><Share2 size={14} /> Inviter sur WhatsApp pour compléter le groupe</button>
        </div>
      )}
    </section>
  )
}
