/**
 * OrderTrackingTimeline — Ticket 2.2
 *
 * Composant de suivi de commande à 6 étapes avec :
 * - Timeline visuelle multi-étapes (icônes Lucide, état coloré)
 * - Card inspection média (photo + vidéo 360°) avec modals d'agrandissement
 * - Comparatif poids estimé vs réel
 * - Bandeau "Solde final à régler à la livraison"
 *
 * Props :
 *   orderStatus    — Statut courant de la commande (7 états possibles)
 *   inspectionData — Données de pesée + médias en provenance de Chine
 */

import { useState } from 'react'
import {
  CheckCircle, Clock, CreditCard, Package, Warehouse,
  Ship, ShieldCheck, Truck, Home,
  PlayCircle, X, Scale, AlertCircle,
  ArrowRight, Camera, Video,
} from 'lucide-react'
import { formatXOF } from '../utils/pricingEngine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'PURCHASED_CHINA'
  | 'INSPECTION_WEIGHED_CHINA'
  | 'IN_TRANSIT_SN'
  | 'CUSTOMS_DAKAR'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'

export interface InspectionData {
  photoUrl: string
  videoUrl: string
  /** Thumbnail affiché avant lancement de la vidéo */
  videoThumbUrl?: string
  actualWeightKg: number
  estimatedWeightKg: number
  adjustedBalanceXOF: number
  /** Date/heure de l'inspection en Chine */
  inspectedAt?: string
  /** Lieu de l'entrepôt */
  warehouseLocation?: string
}

interface Props {
  orderStatus: OrderStatus
  inspectionData?: InspectionData
}

// ---------------------------------------------------------------------------
// Définition des 6 étapes
// ---------------------------------------------------------------------------

interface StepDef {
  status: OrderStatus
  label: string
  sublabel: string
  Icon: typeof CheckCircle
  completedAt?: string
  estimatedAt?: string
}

const STEP_DEFS: StepDef[] = [
  {
    status: 'PAYMENT_PENDING',
    label: 'Paiement',
    sublabel: 'Acompte 2/3',
    Icon: CreditCard,
    completedAt: '24 jan 2024 — 09h14',
  },
  {
    status: 'PURCHASED_CHINA',
    label: 'Achat Chine',
    sublabel: 'Commande passée',
    Icon: Package,
    completedAt: '25 jan 2024 — 14h03',
  },
  {
    status: 'INSPECTION_WEIGHED_CHINA',
    label: 'Inspection & Pesée',
    sublabel: 'Entrepôt Guangzhou',
    Icon: Warehouse,
    completedAt: '29 jan 2024 — 11h30',
  },
  {
    status: 'IN_TRANSIT_SN',
    label: 'En Transit',
    sublabel: 'Vol / Cargo maritime',
    Icon: Ship,
    estimatedAt: '5 fév 2024',
  },
  {
    status: 'CUSTOMS_DAKAR',
    label: 'Douane Dakar',
    sublabel: 'Dédouanement',
    Icon: ShieldCheck,
    estimatedAt: '15 fév 2024',
  },
  {
    status: 'OUT_FOR_DELIVERY',
    label: 'En livraison',
    sublabel: 'Livreur Paps',
    Icon: Truck,
    estimatedAt: '17 fév 2024',
  },
  {
    status: 'DELIVERED',
    label: 'Livré',
    sublabel: 'Colis remis',
    Icon: Home,
    estimatedAt: '17 fév 2024',
  },
]

// Ordre pour comparaison
const STATUS_ORDER: OrderStatus[] = STEP_DEFS.map(s => s.status)

function statusIndex(s: OrderStatus) {
  return STATUS_ORDER.indexOf(s)
}

// ---------------------------------------------------------------------------
// Sous-composant : modal générique
// ---------------------------------------------------------------------------

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="di-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-sm">
        {children}
        <button
          onClick={onClose}
          className="di-modal-close absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-lg"
          aria-label="Fermer">
          <X size={16} className="text-white" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : modal photo
// ---------------------------------------------------------------------------

function PhotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <div className="rounded-2xl overflow-hidden">
        <img src={url} alt="Photo inspection Chine" className="w-full block" />
        <div className="bg-primary px-4 py-3">
          <p className="text-white text-xs font-semibold flex items-center gap-1.5">
            <Camera size={12} /> Photo d'inspection — Entrepôt Guangzhou
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : modal vidéo 360°
// ---------------------------------------------------------------------------

function VideoModal({ data, onClose }: { data: InspectionData; onClose: () => void }) {
  const [playing, setPlaying] = useState(false)
  const thumb = data.videoThumbUrl ?? data.photoUrl

  return (
    <Modal onClose={onClose}>
      <div className="di-video-surface overflow-hidden rounded-2xl">
        {/* Zone vidéo */}
        <div className="relative" style={{ paddingBottom: '62%' }}>
          {data.videoUrl && playing ? (
            <video
              src={data.videoUrl}
              autoPlay
              controls
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : (
            <>
              <img
                src={thumb}
                alt="Aperçu vidéo 360°"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.55)' }}
              />
              <button
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                aria-label="Lancer la vidéo">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
                  className="di-video-play flex h-16 w-16 items-center justify-center rounded-full shadow-2xl">
                  <PlayCircle size={34} />
                </div>
                <span className="text-white text-sm font-bold tracking-wide">
                  Regarder la vidéo d'inspection 360°
                </span>
              </button>
              {/* Badge durée */}
              <div
                className="absolute bottom-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-white"
                className="di-video-badge absolute bottom-3 right-3 rounded-lg px-2 py-1 text-xs font-bold text-white">
                360°
              </div>
            </>
          )}
        </div>

        {/* Méta */}
        <div className="px-4 py-3 space-y-1">
          <p className="text-white font-bold text-sm">Vidéo d'inspection 360°</p>
          <p className="text-slate-400 text-xs">
            {data.warehouseLocation ?? 'Entrepôt Guangzhou'} ·{' '}
            {data.inspectedAt ?? '29 jan 2024 — 11h30'}
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : card inspection média
// ---------------------------------------------------------------------------

function InspectionCard({ data }: { data: InspectionData }) {
  const [photoOpen, setPhotoOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)

  const weightDiff    = Math.round((data.actualWeightKg - data.estimatedWeightKg) * 1000) / 1000
  const isHeavier     = weightDiff > 0
  const diffLabel     = `${isHeavier ? '+' : ''}${weightDiff} kg`
  const thumb         = data.videoThumbUrl ?? data.photoUrl

  return (
    <>
      <div className="di-inspection-card overflow-hidden rounded-2xl border">

        {/* En-tête */}
        <div className="di-inspection-heading flex items-center gap-2 border-b px-4 py-3">
          <AlertCircle size={15} className="text-amber" />
          <div className="flex-1">
            <p className="text-sm font-bold">
              Inspection & Pesée — Entrepôt Chine
            </p>
            <p className="di-inspection-muted text-xs">
              {data.warehouseLocation ?? 'Guangzhou'} · {data.inspectedAt ?? '29 jan 2024'}
            </p>
          </div>
          <CheckCircle size={16} className="text-amber" />
        </div>

        {/* Comparatif poids */}
        <div className="di-inspection-panel-border border-b px-4 py-4">
          <div className="flex items-center gap-3">
            {/* Estimé */}
            <div className="flex-1 rounded-xl border border-border bg-card p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Poids estimé</p>
              <p className="text-lg font-black font-mono text-text">
                {data.estimatedWeightKg} kg
              </p>
            </div>

            {/* Flèche + delta */}
            <div className="flex shrink-0 flex-col items-center gap-1">
              <Scale size={18} className="text-amber" />
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold font-mono ${isHeavier ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'}`}>
                {diffLabel}
              </span>
            </div>

            {/* Réel */}
            <div className={`flex-1 rounded-xl border p-3 text-center ${isHeavier ? 'border-red-200 bg-danger-soft' : 'border-emerald-200 bg-success-soft'}`}>
              <p className="text-xs text-slate-400 mb-1">Poids réel</p>
              <p className={`text-lg font-black font-mono ${isHeavier ? 'text-danger' : 'text-success'}`}>
                {data.actualWeightKg} kg
              </p>
            </div>
          </div>

          <p className="mt-2.5 text-center text-xs text-amber-900">
            {isHeavier
              ? `Colis plus lourd — surcoût de transport répercuté sur le solde`
              : weightDiff < 0
                ? `Colis plus léger — déduction appliquée sur le solde`
                : `Poids identique à l'estimation — aucun ajustement`}
          </p>
        </div>

        {/* Médias */}
        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          {/* Miniature photo */}
          <button
            onClick={() => setPhotoOpen(true)}
            className="relative rounded-xl overflow-hidden text-left group"
            aria-label="Agrandir la photo d'inspection">
            <img
              src={data.photoUrl}
              alt="Photo inspection"
              className="w-full h-28 object-cover"
              style={{ filter: 'brightness(0.92)' }}
            />
            <div
              className="absolute inset-0 flex items-end p-2"
              style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.72) 0%, transparent 55%)' }}>
              <div className="flex items-center gap-1.5">
                <Camera size={11} className="text-white" />
                <span className="text-white text-xs font-bold">Photo inspection</span>
              </div>
            </div>
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(30,27,75,0.3)' }}>
              <ArrowRight size={20} className="text-white" />
            </div>
          </button>

          {/* Miniature vidéo */}
          <button
            onClick={() => setVideoOpen(true)}
            className="relative rounded-xl overflow-hidden text-left group"
            aria-label="Regarder la vidéo d'inspection 360°">
            <img
              src={thumb}
              alt="Aperçu vidéo 360°"
              className="w-full h-28 object-cover"
              style={{ filter: 'brightness(0.65)' }}
            />
            {/* Bouton play */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: 'rgba(255,255,255,0.9)' }}>
                <PlayCircle size={22} style={{ color: '#1E1B4B' }} />
              </div>
            </div>
            <div
              className="absolute inset-0 flex items-end p-2"
              style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.72) 0%, transparent 55%)' }}>
              <div className="flex items-center gap-1.5">
                <Video size={11} className="text-white" />
                <span className="text-white text-xs font-bold">Vidéo 360°</span>
              </div>
            </div>
            {/* Badge 360 */}
            <div
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-xs font-black text-white"
              style={{ background: '#D97706' }}>
              360°
            </div>
          </button>
        </div>

        {/* Bandeau solde ajusté */}
        <div className="mx-4 mb-4 rounded-xl overflow-hidden">
          <div className="px-4 py-3" style={{ background: '#1E1B4B' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-300 text-xs mb-0.5">Solde final à régler à la livraison</p>
                <p className="text-white font-black text-2xl font-mono leading-tight">
                  {formatXOF(data.adjustedBalanceXOF)}
                </p>
              </div>
              <div
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                style={{ background: '#D97706' }}>
                COD
              </div>
            </div>
            {weightDiff !== 0 && (
              <p className="text-indigo-300 text-xs mt-1.5 flex items-center gap-1">
                <span style={{ color: isHeavier ? '#FCA5A5' : '#6EE7B7' }}>
                  {isHeavier ? '▲' : '▼'} Ajustement : {diffLabel}
                </span>
                <span>· Pesée réalisée à Guangzhou</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {photoOpen && <PhotoModal url={data.photoUrl} onClose={() => setPhotoOpen(false)} />}
      {videoOpen && <VideoModal data={data} onClose={() => setVideoOpen(false)} />}
    </>
  )
}

// ---------------------------------------------------------------------------
// Composant principal : timeline
// ---------------------------------------------------------------------------

export default function OrderTrackingTimeline({ orderStatus, inspectionData }: Props) {
  const currentIdx     = statusIndex(orderStatus)
  const showInspection =
    currentIdx >= statusIndex('INSPECTION_WEIGHED_CHINA') && !!inspectionData

  // Index de l'étape active dans STEP_DEFS (les 6 étapes UI)
  // STEP_DEFS a 7 entrées (inclut PAYMENT_PENDING) — on les mappe toutes
  const activeStep = currentIdx

  return (
    <div>

      {/* ── Timeline ── */}
      <div className="di-timeline-shell">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-text">
            Progression de la commande
          </h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${orderStatus === 'DELIVERED' ? 'bg-success-soft text-success' : 'bg-primary-soft text-primary-hover'}`}>
            Étape {Math.min(activeStep + 1, STEP_DEFS.length)} / {STEP_DEFS.length}
          </span>
        </div>

        <div className="grid gap-3 px-4 py-4 lg:grid-cols-7 lg:gap-2">
          {STEP_DEFS.map((step, i) => {
            const done   = i < activeStep
            const active = i === activeStep
            const Icon   = step.Icon
            const isLast = i === STEP_DEFS.length - 1

            return (
              <div key={step.status} className="flex gap-3 lg:flex-col lg:gap-0">
                {/* Indicateur vertical */}
                <div className="flex shrink-0 flex-col items-center lg:w-full lg:flex-row">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      background: done   ? '#F0FDF4'
                                : active ? '#EEF2FF'
                                : '#F8FAFC',
                      border: active ? '2px solid #1E1B4B' : 'none',
                    }}>
                    <Icon
                      size={14}
                      className={active ? 'animate-pulse-fomo' : undefined}
                      style={{
                        color: done   ? '#059669'
                             : active ? '#1E1B4B'
                             : '#CBD5E1',
                        strokeWidth: done ? 2.5 : 2,
                      }}
                    />
                  </div>
                  {!isLast && (
                    <div
                      className="my-1 w-0.5 rounded-full lg:mx-1 lg:my-0 lg:h-0.5 lg:w-auto"
                      style={{
                        flex: 1,
                        minHeight: 20,
                        background: done ? '#059669' : '#E2E8F0',
                      }}
                    />
                  )}
                </div>

                {/* Contenu étape */}
                <div className={`flex-1 lg:pt-3 ${isLast ? '' : 'pb-4 lg:pb-0'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-semibold text-sm leading-tight"
                      style={{
                        color: done   ? '#475569'
                             : active ? '#1E1B4B'
                             : '#CBD5E1',
                      }}>
                      {step.label}
                    </span>

                    {done && (
                      <CheckCircle size={13} style={{ color: '#059669', flexShrink: 0 }} />
                    )}
                    {active && (
                      <span
                        className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#FFF7ED', color: '#D97706' }}>
                        <Clock size={10} /> En cours
                      </span>
                    )}
                  </div>

                  <p
                    className="text-xs mt-0.5"
                    style={{ color: done || active ? '#94A3B8' : '#E2E8F0' }}>
                    {step.sublabel}
                    {done && step.completedAt && (
                      <> · <span className="font-medium">{step.completedAt}</span></>
                    )}
                    {!done && !active && step.estimatedAt && (
                      <> · Estimé {step.estimatedAt}</>
                    )}
                    {active && step.completedAt && (
                      <> · <span className="font-medium">{step.completedAt}</span></>
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Inspection Card (visible dès INSPECTION_WEIGHED_CHINA) ── */}
      {showInspection && inspectionData && (
        <div className="mt-4">
          <InspectionCard data={inspectionData} />
        </div>
      )}

      {/* ── Bandeau solde si pas encore livré et inspection disponible ── */}
      {showInspection && inspectionData && orderStatus !== 'DELIVERED' && (
        <div
          className="di-balance-banner mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3">
          <CheckCircle size={18} className="shrink-0 text-success" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-800">
              Solde final à régler à la livraison
            </p>
            <p className="text-base font-black font-mono text-success">
              {formatXOF(inspectionData.adjustedBalanceXOF)}
            </p>
          </div>
          <span className="text-xs text-slate-400">Encaissé par Paps</span>
        </div>
      )}

      {/* ── Bannière livraison confirmée ── */}
      {orderStatus === 'DELIVERED' && (
        <div
          className="di-delivered-banner mt-3 flex items-center gap-3 rounded-2xl px-4 py-4">
          <CheckCircle size={28} className="shrink-0 text-white" />
          <div>
            <p className="text-white font-black text-base">Colis livré avec succès !</p>
            <p className="text-emerald-100 text-xs mt-0.5">
              Merci d'avoir commandé sur Doukoure Import 🇸🇳
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
