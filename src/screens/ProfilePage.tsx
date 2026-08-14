import { ChevronLeft, MapPin, Package, Phone, ShieldCheck, User } from 'lucide-react'

interface Props {
  onBack: () => void
  onOpenTracking: () => void
}

export default function ProfilePage({ onBack, onOpenTracking }: Props) {
  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-8"><button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-text" aria-label="Retour"><ChevronLeft size={20} /></button><h1 className="text-lg font-extrabold text-text">Mon profil</h1></div>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 md:px-8 md:py-8">
        <section className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-white shadow-sm"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black">MD</span><span><strong className="block text-lg">Mamadou Diallo</strong><span className="mt-1 block text-sm text-indigo-200">+221 77 123 45 67</span><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-1 text-xs font-bold"><ShieldCheck size={13} /> Client vérifié</span></span></section>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <button type="button" onClick={onOpenTracking} className="flex w-full items-center gap-3 border-b border-border px-4 py-4 text-left hover:bg-surface-muted"><Package size={19} className="text-primary" /><span className="flex-1"><strong className="block text-sm text-text">Mes commandes</strong><span className="text-xs text-text-muted">1 commande en cours</span></span></button>
          <div className="flex items-center gap-3 border-b border-border px-4 py-4"><MapPin size={19} className="text-success" /><span><strong className="block text-sm text-text">Adresse principale</strong><span className="text-xs text-text-muted">Sacré-Coeur 3, Dakar</span></span></div>
          <a href="https://wa.me/221770000000" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-4 hover:bg-surface-muted"><Phone size={19} className="text-amber" /><span><strong className="block text-sm text-text">Assistance WhatsApp</strong><span className="text-xs text-text-muted">Message vocal ou texte, réponse sous 2 h</span></span></a>
        </section>
        <section className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center gap-2"><User size={17} className="text-text-muted" /><strong className="text-sm text-text">Données personnelles</strong></div><p className="mt-2 text-xs leading-relaxed text-text-muted">Vos coordonnées servent uniquement au suivi de vos commandes, à la livraison Paps et aux alertes demandées.</p></section>
      </main>
    </div>
  )
}
