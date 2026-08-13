/**
 * SharedContainerProgress — Ticket 2.1
 *
 * Widget Social Commerce "CBM Partagé" avec :
 * - Barre de progression FOMO animée (CSS) passant de l'ambre à l'émeraude
 * - Compte à rebours dynamique avant le départ du navire
 * - Bouton de partage WhatsApp avec lien pré-rempli
 */

import { useEffect, useState, useRef } from 'react'
import { Flame, Clock, Ship, Users, AlertTriangle, TrendingUp, Share2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  containerTargetCBM: number
  currentAllocatedCBM: number
  departureDeadline: Date
  containerName?: string
  shareUrl?: string
}

// ---------------------------------------------------------------------------
// Hook : compte à rebours
// ---------------------------------------------------------------------------

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(Math.max(0, target.getTime() - Date.now()))

  useEffect(() => {
    const id = setInterval(() => {
      setDiff(Math.max(0, target.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [target])

  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    mins:    Math.floor((diff % 3_600_000) / 60_000),
    secs:    Math.floor((diff % 60_000) / 1_000),
    expired: diff === 0,
  }
}

// ---------------------------------------------------------------------------
// Helpers visuels
// ---------------------------------------------------------------------------

function getColors(pct: number) {
  if (pct >= 85) return { bar: 'linear-gradient(90deg,#059669,#10B981)', text: '#059669', dot: '#059669' }
  if (pct >= 60) return { bar: 'linear-gradient(90deg,#D97706,#059669)', text: '#D97706', dot: '#D97706' }
  return { bar: 'linear-gradient(90deg,#D97706,#F59E0B)', text: '#D97706', dot: '#D97706' }
}

function urgencyLevel(pct: number) {
  if (pct >= 90) return { label: 'Presque complet !', icon: '🔥🔥🔥' }
  if (pct >= 75) return { label: 'Se remplit vite', icon: '🔥🔥' }
  if (pct >= 50) return { label: 'Plus de la moitié', icon: '🔥' }
  return { label: 'Places disponibles', icon: '📦' }
}

// ---------------------------------------------------------------------------
// Sous-composant : cellule flip-clock
// ---------------------------------------------------------------------------

function CountCell({ value, label, expired }: { value: number; label: string; expired: boolean }) {
  const prev = useRef(value)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (value !== prev.current) {
      setAnimating(true)
      const t = setTimeout(() => setAnimating(false), 250)
      prev.current = value
      return () => clearTimeout(t)
    }
  }, [value])

  return (
    <div className="flex-1 flex flex-col items-center">
      <div
        className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: expired ? '#374151' : '#1E1B4B', minHeight: 52 }}>
        <span
          className="font-black text-xl leading-none font-mono text-white transition-all duration-200"
          style={{
            opacity: animating ? 0.3 : 1,
            transform: animating ? 'translateY(-4px)' : 'translateY(0)',
          }}>
          {String(value).padStart(2, '0')}
        </span>
        {/* hairline */}
        <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
      </div>
      <span className="text-xs mt-1.5 font-semibold" style={{ color: '#94A3B8' }}>{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function SharedContainerProgress({
  containerTargetCBM,
  currentAllocatedCBM,
  departureDeadline,
  containerName = 'Dakar #104',
  shareUrl = 'https://doukoure-import.sn',
}: Props) {
  const pct = Math.min(100, Math.round((currentAllocatedCBM / containerTargetCBM) * 100))
  const remaining = Math.max(0, containerTargetCBM - currentAllocatedCBM)
  const colors = getColors(pct)
  const urgency = urgencyLevel(pct)
  const countdown = useCountdown(departureDeadline)

  // Barre animée : on commence à 0 puis transite vers pct après le montage
  const [barPct, setBarPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setBarPct(pct), 80)
    return () => clearTimeout(t)
  }, [pct])

  // Pulsation du point sur la barre
  const [dotPulse, setDotPulse] = useState(true)
  useEffect(() => {
    const id = setInterval(() => setDotPulse(p => !p), 900)
    return () => clearInterval(id)
  }, [])

  // Lien WhatsApp pré-rempli
  const whatsappMsg = encodeURIComponent(
    `🚢 Aide-nous à remplir le conteneur maritime ${containerName} pour Dakar !\n` +
    `📦 Déjà ${pct}% rempli — il reste ${remaining.toFixed(1)} m³ disponibles.\n` +
    `⚡ Départ imminent — commande vite ici : ${shareUrl}`,
  )
  const whatsappUrl = `https://wa.me/?text=${whatsappMsg}`

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-white"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── En-tête ── */}
      <div className="px-4 pt-4 pb-3">

        {/* Titre + pourcentage */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame
              size={16}
              style={{ color: colors.text }}
              className="animate-pulse-fomo"
            />
            <div>
              <p className="font-extrabold text-sm leading-tight" style={{ color: '#1E1B4B' }}>
                Conteneur Maritime {containerName}
              </p>
              <p className="text-xs font-medium" style={{ color: colors.text }}>
                {urgency.icon} {urgency.label}
              </p>
            </div>
          </div>
          <span
            className="font-black text-2xl font-mono transition-colors duration-700"
            style={{ color: colors.text }}>
            {pct}%
          </span>
        </div>

        {/* Barre de progression */}
        <div className="relative w-full h-4 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
          {/* Remplissage animé par transition CSS */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${barPct}%`,
              background: colors.bar,
              transition: 'width 1.5s cubic-bezier(0.25,0.46,0.45,0.94), background 0.8s ease',
            }}
          />
          {/* Shimmer */}
          <div
            className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
            style={{
              width: `${barPct}%`,
              background: 'linear-gradient(90deg, transparent 55%, rgba(255,255,255,0.28) 100%)',
              transition: 'width 1.5s cubic-bezier(0.25,0.46,0.45,0.94)',
            }}
          />
          {/* Point pulsant sur l'extrémité */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white"
            style={{
              left: `calc(${barPct}% - 7px)`,
              background: colors.dot,
              boxShadow: dotPulse ? `0 0 10px 2px ${colors.dot}66` : 'none',
              transition: 'left 1.5s cubic-bezier(0.25,0.46,0.45,0.94), box-shadow 0.45s ease',
            }}
          />
        </div>

        {/* Légende barre */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Ship size={11} />
            <span className="font-mono font-semibold">{currentAllocatedCBM}</span>
            <span>/ {containerTargetCBM} m³ réservés</span>
          </div>
          <span className="text-xs font-bold" style={{ color: colors.text }}>
            {remaining.toFixed(1)} m³ libres
          </span>
        </div>
      </div>

      {/* ── Stats rapides ── */}
      <div className="grid grid-cols-3 gap-px border-t border-b border-slate-100"
        style={{ background: '#F1F5F9' }}>
        {([
          { Icon: TrendingUp, label: 'Remplissage', value: `${pct}%`,              color: colors.text },
          { Icon: Users,      label: 'Clients',      value: '23',                   color: '#1E1B4B'   },
          { Icon: Ship,       label: 'Disponible',   value: `${remaining.toFixed(1)} m³`, color: '#059669' },
        ] as const).map(({ Icon, label, value, color }) => (
          <div key={label} className="flex flex-col items-center py-3 bg-white">
            <Icon size={13} style={{ color }} className="mb-1" />
            <span className="font-black text-sm font-mono" style={{ color }}>{value}</span>
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Compte à rebours ── */}
      <div className="px-4 py-4" style={{ background: '#F8FAFC' }}>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={13} style={{ color: countdown.expired ? '#94A3B8' : '#D97706' }} />
          <span className="text-xs font-bold" style={{ color: '#1E1B4B' }}>
            {countdown.expired
              ? 'Conteneur fermé — prochain départ en cours'
              : 'Départ du navire dans'}
          </span>
        </div>

        <div className="flex gap-2">
          <CountCell value={countdown.days}  label="Jours"  expired={countdown.expired} />
          <CountCell value={countdown.hours} label="Heures" expired={countdown.expired} />
          <CountCell value={countdown.mins}  label="Min"    expired={countdown.expired} />
          <CountCell value={countdown.secs}  label="Sec"    expired={countdown.expired} />
        </div>

        {/* Alerte urgence si < 24h */}
        {!countdown.expired && countdown.days === 0 && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border"
            style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
            <AlertTriangle size={13} style={{ color: '#DC2626' }} />
            <span className="text-xs font-semibold" style={{ color: '#991B1B' }}>
              Dernières heures — Dépêchez-vous !
            </span>
          </div>
        )}
      </div>

      {/* ── CTA WhatsApp ── */}
      <div className="px-4 pb-4 pt-1">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)' }}>
          <Share2 size={15} />
          Partager sur WhatsApp — Inviter des amis
        </a>
        <p className="text-center text-xs text-slate-400 mt-2">
          Lien pré-rempli · Conteneur {containerName} · {pct}% rempli
        </p>
      </div>
    </div>
  )
}
