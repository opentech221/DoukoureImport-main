import { ShieldCheck } from 'lucide-react'

export default function TradeAssurance() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-success-soft p-3.5 text-emerald-900">
      <ShieldCheck size={21} className="mt-0.5 shrink-0 text-success" />
      <div>
        <p className="text-sm font-extrabold">Acompte Sécurisé</p>
        <p className="mt-1 text-xs leading-relaxed">Payez 2/3 aujourd'hui, le solde (1/3) sera réglé uniquement à la remise du colis par Paps.</p>
      </div>
    </div>
  )
}
