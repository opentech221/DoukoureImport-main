import { Check, X } from 'lucide-react'

interface Props {
  open: boolean
  productName: string
  imageUrl: string
  size: string
  color: string
  quantity: number
  priceAdjustmentXOF: number
  onClose: () => void
  onChange: (selection: { size: string; color: string; quantity: number }) => void
}

const sizes = ['40', '41', '42', '43', '44']
const colors = [
  { label: 'Noir', value: '#111827' },
  { label: 'Blanc', value: '#F8FAFC' },
  { label: 'Rouge', value: '#DC2626' },
]

export default function SkuSelectorSheet({ open, productName, imageUrl, size, color, quantity, priceAdjustmentXOF, onClose, onChange }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm lg:items-center lg:p-6" onClick={onClose}>
      <section className="w-full max-w-lg rounded-t-3xl bg-card p-5 shadow-2xl lg:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-3 border-b border-border pb-4">
          <img src={imageUrl} alt={productName} className="h-16 w-16 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text">{productName}</p>
            <p className="mt-1 text-xs text-text-muted">Prix ajusté: <strong className="text-text">{priceAdjustmentXOF > 0 ? '+' : ''}{priceAdjustmentXOF.toLocaleString('fr-SN')} FCFA</strong></p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-text-muted" aria-label="Fermer"><X size={17} /></button>
        </div>

        <div className="space-y-5 py-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Taille</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((value) => <button key={value} type="button" onClick={() => onChange({ size: value, color, quantity })} className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-bold ${size === value ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted'}`}>{value}</button>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Couleur</p>
            <div className="flex flex-wrap gap-3">
              {colors.map((item) => <button key={item.label} type="button" onClick={() => onChange({ size, color: item.label, quantity })} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${color === item.label ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted'}`}><span className="h-5 w-5 rounded-full border border-border" style={{ background: item.value }} />{item.label}{color === item.label && <Check size={14} />}</button>)}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-3">
            <span className="text-sm font-semibold text-text">Quantité</span>
            <div className="flex items-center gap-3"><button type="button" onClick={() => onChange({ size, color, quantity: Math.max(1, quantity - 1) })} className="h-9 w-9 rounded-lg border border-border bg-card text-lg">−</button><span className="w-8 text-center font-bold text-text">{quantity}</span><button type="button" onClick={() => onChange({ size, color, quantity: quantity + 1 })} className="h-9 w-9 rounded-lg border border-border bg-card text-lg">+</button></div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-success py-3.5 text-sm font-extrabold text-white">Confirmer la sélection</button>
      </section>
    </div>
  )
}
