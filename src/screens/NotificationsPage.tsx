import { useState } from 'react'
import { Bell, CheckCheck, ChevronLeft, Package, ShieldCheck, Ship, Smartphone } from 'lucide-react'
import { enablePushNotifications, getPushStatus, type PushStatus } from '../utils/pushNotifications'

interface Props {
  onBack: () => void
}

const notifications = [
  { id: 1, icon: Ship, title: 'Conteneur Dakar #104 - 65% rempli', body: 'Le conteneur part dans 3 jours. Commandez vite !', time: 'Il y a 2h', unread: true },
  { id: 2, icon: Package, title: 'Commande ORD-2024-0847 inspectée', body: 'Poids réel : 1,4 kg. Le solde ajusté est disponible.', time: 'Il y a 5h', unread: true },
  { id: 3, icon: ShieldCheck, title: 'Acompte sécurisé', body: 'Votre paiement est bien enregistré. Votre colis est pris en charge.', time: 'Hier', unread: false },
]

function statusLabel(status: PushStatus) {
  if (status === 'subscribed') return 'Notifications push activées'
  if (status === 'granted') return 'Autorisation accordée'
  if (status === 'denied') return 'Notifications bloquées par le navigateur'
  if (status === 'unsupported') return 'Push indisponible sur cet appareil'
  return 'Recevez les alertes de commande sur cet appareil'
}

export default function NotificationsPage({ onBack }: Props) {
  const [readIds, setReadIds] = useState<Set<number>>(new Set())
  const [pushStatus, setPushStatus] = useState<PushStatus>(() => getPushStatus())
  const [activating, setActivating] = useState(false)

  async function activatePush() {
    setActivating(true)
    setPushStatus(await enablePushNotifications())
    setActivating(false)
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 md:px-8">
          <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted text-text" aria-label="Retour"><ChevronLeft size={20} /></button>
          <div className="flex-1"><p className="text-xs font-semibold text-text-muted">Centre de</p><h1 className="text-lg font-extrabold text-text">Notifications</h1></div>
          <button type="button" onClick={() => setReadIds(new Set(notifications.map((item) => item.id)))} className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-success"><CheckCheck size={15} /> Tout lire</button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 md:px-8 md:py-8">
        <section className="rounded-2xl border border-emerald-200 bg-success-soft p-4">
          <div className="flex items-start gap-3"><Smartphone size={21} className="mt-0.5 shrink-0 text-success" /><div className="flex-1"><p className="text-sm font-extrabold text-emerald-900">Alertes de commande</p><p className="mt-1 text-xs text-emerald-800">{statusLabel(pushStatus)}</p></div><button type="button" onClick={activatePush} disabled={activating || pushStatus === 'subscribed' || pushStatus === 'denied'} className="rounded-lg bg-success px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">{activating ? 'Activation...' : pushStatus === 'subscribed' ? 'Activé' : 'Activer'}</button></div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {notifications.map(({ id, icon: Icon, title, body, time, unread }) => {
            const isUnread = unread && !readIds.has(id)
            return <button type="button" key={id} onClick={() => setReadIds((current) => new Set([...current, id]))} className={`flex w-full items-start gap-3 border-b border-border px-4 py-4 text-left last:border-0 ${isUnread ? 'bg-primary-soft/40' : 'bg-card'}`}><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-primary"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className="text-sm text-text">{title}</strong>{isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" />}</span><span className="mt-1 block text-xs leading-relaxed text-text-muted">{body}</span><span className="mt-2 block text-[11px] font-semibold text-text-subtle">{time}</span></span></button>
          })}
        </section>
      </main>
    </div>
  )
}
