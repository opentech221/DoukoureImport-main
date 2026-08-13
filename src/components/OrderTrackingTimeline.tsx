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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-sm">
        {children}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'rgba(0,0,0,0.55)' }}
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
        <div className="px-4 py-3" style={{ background: '#1E1B4B' }}>
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
      <div className="rounded-2xl overflow-hidden" style={{ background: '#0F172A' }}>
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
                  style={{ background: 'rgba(255,255,255,0.92)' }}>
                  <PlayCircle size={34} style={{ color: '#1E1B4B' }} />
                </div>
                <span className="text-white text-sm font-bold tracking-wide">
                  Regarder la vidéo d'inspection 360°
                </span>
              </button>
              {/* Badge durée */}
              <div
                className="absolute bottom-3 right-3 px-2 py-1 rounded-lg text-xs font-bold text-white"
                style={{ background: 'rgba(0,0,0,0.65)' }}>
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
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>

        {/* En-tête */}
        <div
          className="px-4 py-3 flex items-center gap-2 border-b"
          style={{ borderColor: '#FDE68A' }}>
          <AlertCircle size={15} style={{ color: '#D97706' }} />
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: '#92400E' }}>
              Inspection & Pesée — Entrepôt Chine
            </p>
            <p className="text-xs" style={{ color: '#B45309' }}>
              {data.warehouseLocation ?? 'Guangzhou'} · {data.inspectedAt ?? '29 jan 2024'}
            </p>
          </div>
          <CheckCircle size={16} style={{ color: '#D97706' }} />
        </div>

        {/* Comparatif poids */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#FEF3C7' }}>
          <div className="flex items-center gap-3">
            {/* Estimé */}
            <div
              className="flex-1 rounded-xl p-3 text-center border"
              style={{ background: 'white', borderColor: '#E2E8F0' }}>
              <p className="text-xs text-slate-400 mb-1">Poids estimé</p>
              <p className="font-black text-lg font-mono" style={{ color: '#1E1B4B' }}>
                {data.estimatedWeightKg} kg
              </p>
            </div>

            {/* Flèche + delta */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <Scale size={18} style={{ color: '#D97706' }} />
              <span
                className="text-xs font-bold font-mono px-2 py-0.5 rounded-full"
                style={{
                  background: isHeavier ? '#FEF2F2' : '#F0FDF4',
                  color: isHeavier ? '#DC2626' : '#059669',
                }}>
                {diffLabel}
              </span>
            </div>

            {/* Réel */}
            <div
              className="flex-1 rounded-xl p-3 text-center border"
              style={{
                background: isHeavier ? '#FEF2F2' : '#F0FDF4',
                borderColor: isHeavier ? '#FECACA' : '#A7F3D0',
              }}>
              <p className="text-xs text-slate-400 mb-1">Poids réel</p>
              <p
                className="font-black text-lg font-mono"
                style={{ color: isHeavier ? '#DC2626' : '#059669' }}>
                {data.actualWeightKg} kg
              </p>
            </div>
          </div>

          <p className="text-xs text-center mt-2.5" style={{ color: '#92400E' }}>
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
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Timeline ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-sm" style={{ color: '#1E1B4B' }}>
            Progression de la commande
          </h2>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{
              background: orderStatus === 'DELIVERED' ? '#F0FDF4' : '#EEF2FF',
              color: orderStatus === 'DELIVERED' ? '#059669' : '#4338CA',
            }}>
            Étape {Math.min(activeStep + 1, STEP_DEFS.length)} / {STEP_DEFS.length}
          </span>
        </div>

        <div className="px-4 py-4">
          {STEP_DEFS.map((step, i) => {
            const done   = i < activeStep
            const active = i === activeStep
            const Icon   = step.Icon
            const isLast = i === STEP_DEFS.length - 1

            return (
              <div key={step.status} className="flex gap-3">
                {/* Indicateur vertical */}
                <div className="flex flex-col items-center flex-shrink-0">
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
                      className="w-0.5 rounded-full my-1"
                      style={{
                        flex: 1,
                        minHeight: 20,
                        background: done ? '#059669' : '#E2E8F0',
                      }}
                    />
                  )}
                </div>

                {/* Contenu étape */}
                <div className={`flex-1 ${isLast ? '' : 'pb-4'}`}>
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
          className="mt-3 rounded-2xl px-4 py-3 flex items-center gap-3 border"
          style={{ background: '#F0FDF4', borderColor: '#A7F3D0' }}>
          <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: '#065F46' }}>
              Solde final à régler à la livraison
            </p>
            <p className="font-black text-base font-mono" style={{ color: '#059669' }}>
              {formatXOF(inspectionData.adjustedBalanceXOF)}
            </p>
          </div>
          <span className="text-xs text-slate-400">Encaissé par Paps</span>
        </div>
      )}

      {/* ── Bannière livraison confirmée ── */}
      {orderStatus === 'DELIVERED' && (
        <div
          className="mt-3 rounded-2xl px-4 py-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
          <CheckCircle size={28} className="text-white flex-shrink-0" />
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
