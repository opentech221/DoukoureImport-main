/**
 * ImageSearchUploader — Ticket 3.1
 *
 * Composant de recherche visuelle par photo/vidéo avec :
 * - Zone drag & drop (JPG, PNG, WEBP, MP4)
 * - Déclenchement caméra natif PWA (capture="environment")
 * - Prévisualisation image/vidéo avec suppression
 * - Formulaire : budget FCFA, taille/couleur/quantité, numéro WhatsApp
 * - CTA "Trouver ce produit au prix usine Chine" avec état de chargement + toast
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload, Camera, X, Search, Phone, Package,
  Loader2, CheckCircle, AlertCircle, Play, Volume2, VolumeX,
  Scissors, ZoomIn,
} from 'lucide-react'
import ImmersiveVisualSearch from './ImmersiveVisualSearch'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MediaFile = {
  file: File
  objectUrl: string
  type: 'image' | 'video'
}

type ToastState = {
  visible: boolean
  success: boolean
  message: string
}

interface Props {
  /** Callback déclenché lors de la soumission du formulaire */
  onSubmit?: (payload: SearchPayload) => void | Promise<void>
  /** Classes CSS supplémentaires sur le conteneur racine */
  className?: string
  title?: string
  subtitle?: string
}

export interface SearchPayload {
  file: File
  mediaType: 'image' | 'video'
  budgetXOF: string
  sizingNote: string
  whatsappPhone: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
const MAX_SIZE_MB = 50

function isMimeAccepted(file: File) {
  return ACCEPTED_MIME.includes(file.type)
}

function isMediaType(file: File): 'image' | 'video' | null {
  if (file.type.startsWith('image/')) return 'image'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
}

// ---------------------------------------------------------------------------
// Sous-composant : zone de dépôt vide
// ---------------------------------------------------------------------------

function DropZone({
  onFile,
  onOpenCamera,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  onFile: (f: File) => void
  onOpenCamera: () => void
  dragging: boolean
  onDragOver: React.DragEventHandler
  onDragLeave: React.DragEventHandler
  onDrop: React.DragEventHandler
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className="relative flex flex-col items-center justify-center gap-4 py-8 px-5 rounded-2xl border-2 border-dashed transition-all"
      style={{
        borderColor: dragging ? '#059669' : '#CBD5E1',
        background:  dragging ? '#F0FDF4' : '#FAFAFA',
      }}>

      {/* Icône centrale */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform"
        style={{
          background: dragging ? '#059669' : '#EEF2FF',
          transform: dragging ? 'scale(1.08)' : 'scale(1)',
        }}>
        <Upload size={24} style={{ color: dragging ? 'white' : '#4338CA' }} />
      </div>

      {/* Texte */}
      <div className="text-center">
        <p className="font-bold text-sm" style={{ color: '#1E1B4B' }}>
          {dragging ? 'Déposez votre fichier ici' : 'Glissez une photo ou vidéo'}
        </p>
        <p className="text-xs text-slate-400 mt-1">JPG · PNG · WEBP · MP4 · max {MAX_SIZE_MB} Mo</p>
      </div>

      {/* Boutons */}
      <div className="flex gap-2 w-full">
        {/* Importer depuis galerie */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-transform active:scale-95"
          style={{ background: '#1E1B4B' }}>
          <Upload size={14} />
          Importer
        </button>

        {/* Déclencher caméra (PWA) */}
        <button
          type="button"
          onClick={onOpenCamera}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer transition-transform active:scale-95"
          style={{ background: '#059669' }}
          aria-label="Ouvrir la caméra">
          <Camera size={14} />
          Caméra
        </button>
      </div>

      {/* Input fichier caché (galerie) */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : prévisualisation image
// ---------------------------------------------------------------------------

function ImagePreview({ media, onRemove }: { media: MediaFile; onRemove: () => void }) {
  const [zoomed, setZoomed] = useState(false)

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden bg-slate-900">
        <img
          src={media.objectUrl}
          alt="Aperçu"
          className="w-full object-cover"
          style={{ maxHeight: 220 }}
        />

        {/* Overlay gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 45%)' }}
        />

        {/* Bouton supprimer */}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          aria-label="Supprimer l'image">
          <X size={14} className="text-white" />
        </button>

        {/* Bouton zoom */}
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="absolute top-3 right-14 w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          aria-label="Agrandir l'image">
          <ZoomIn size={14} className="text-white" />
        </button>

        {/* Badge type */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: 'rgba(30,27,75,0.75)' }}>
          <Camera size={10} />
          {media.file.name.length > 20 ? media.file.name.slice(0, 20) + '…' : media.file.name}
        </div>

        {/* Hint recadrer */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)' }}>
          <Scissors size={10} />
          Recadrer bientôt
        </div>
      </div>

      {/* Modal zoom */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setZoomed(false)}>
          <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <img src={media.objectUrl} alt="Zoom" className="w-full rounded-2xl" />
            <button
              onClick={() => setZoomed(false)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : prévisualisation vidéo
// ---------------------------------------------------------------------------

function VideoPreview({ media, onRemove }: { media: MediaFile; onRemove: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted,   setMuted]   = useState(true)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900">
      <video
        ref={videoRef}
        src={media.objectUrl}
        muted={muted}
        loop
        playsInline
        className="w-full object-cover"
        style={{ maxHeight: 220 }}
        onEnded={() => setPlaying(false)}
      />

      {/* Play overlay si en pause */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(15,23,42,0.45)' }}
          onClick={togglePlay}>
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
            style={{ background: 'rgba(255,255,255,0.92)' }}>
            <Play size={24} style={{ color: '#1E1B4B' }} />
          </div>
        </div>
      )}

      {/* Contrôles */}
      <div className="absolute top-3 right-3 flex gap-2">
        {/* Mute */}
        <button
          type="button"
          onClick={() => setMuted(m => !m)}
          className="w-8 h-8 rounded-full flex items-center justify-center shadow"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}>
          {muted
            ? <VolumeX size={13} className="text-white" />
            : <Volume2 size={13} className="text-white" />}
        </button>

        {/* Supprimer */}
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 rounded-full flex items-center justify-center shadow"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          aria-label="Supprimer la vidéo">
          <X size={13} className="text-white" />
        </button>
      </div>

      {/* Bouton pause si lecture */}
      {playing && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute bottom-3 left-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          aria-label="Mettre en pause">
          <span className="w-3 h-3 flex gap-0.5">
            <span className="w-1 h-full rounded-sm bg-white" />
            <span className="w-1 h-full rounded-sm bg-white" />
          </span>
        </button>
      )}

      {/* Badge vidéo */}
      <div
        className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold text-white"
        style={{ background: '#D97706' }}>
        360° MP4
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : toast
// ---------------------------------------------------------------------------

function Toast({ state }: { state: ToastState }) {
  if (!state.visible) return null

  return (
    <div
      className="fixed bottom-28 left-4 right-4 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-2xl"
      style={{
        background: state.success ? '#F0FDF4' : '#FEF2F2',
        border: `1.5px solid ${state.success ? '#A7F3D0' : '#FECACA'}`,
      }}>
      {state.success
        ? <CheckCircle size={18} style={{ color: '#059669', flexShrink: 0 }} />
        : <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />}
      <p
        className="text-sm font-semibold flex-1"
        style={{ color: state.success ? '#065F46' : '#991B1B' }}>
        {state.message}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function ImageSearchUploader({ onSubmit, className = '', title = 'Produit introuvable ? Confiez-nous la recherche !', subtitle = 'Soumettez l’image du produit : notre équipe le source en Chine et vous recontacte sur WhatsApp.' }: Props) {
  const [media,        setMedia]        = useState<MediaFile | null>(null)
  const [dragging,     setDragging]     = useState(false)
  const [budgetXOF,    setBudgetXOF]    = useState('')
  const [sizingNote,   setSizingNote]   = useState('')
  const [whatsappPhone,setWhatsappPhone]= useState('')
  const [loading,      setLoading]      = useState(false)
  const [toast,        setToast]        = useState<ToastState>({ visible: false, success: false, message: '' })
  const [error,        setError]        = useState<string | null>(null)
  const [cameraOpen,   setCameraOpen]   = useState(false)

  // Libère l'object URL à la suppression
  useEffect(() => {
    return () => { if (media) URL.revokeObjectURL(media.objectUrl) }
  }, [media])

  function showToast(success: boolean, message: string) {
    setToast({ visible: true, success, message })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 4000)
  }

  function handleFile(file: File) {
    setError(null)

    if (!isMimeAccepted(file)) {
      setError('Format non supporté. Utilisez JPG, PNG, WEBP ou MP4.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Fichier trop lourd (max ${MAX_SIZE_MB} Mo).`)
      return
    }
    const type = isMediaType(file)
    if (!type) { setError('Type de média non reconnu.'); return }

    if (media) URL.revokeObjectURL(media.objectUrl)
    setMedia({ file, objectUrl: URL.createObjectURL(file), type })
  }

  // Drag & drop
  const onDragOver  = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop      = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!media) { setError('Veuillez d\'abord ajouter une photo ou vidéo.'); return }

    setLoading(true)
    setError(null)

    try {
      const payload: SearchPayload = {
        file:         media.file,
        mediaType:    media.type,
        budgetXOF:    budgetXOF.replace(/\s/g, ''),
        sizingNote,
        whatsappPhone: whatsappPhone.replace(/\s/g, ''),
      }

      if (onSubmit) {
        await onSubmit(payload)
      } else {
        // Simulation réseau 1.8s
        await new Promise(r => setTimeout(r, 1800))
      }

      showToast(true, 'Demande envoyée ! Notre équipe vous contacte sur WhatsApp sous 24h.')
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Erreur lors de l\'envoi. Réessayez ou contactez-nous sur WhatsApp.'
      showToast(false, message)
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = !!media && !loading

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm ${className}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        noValidate>

        {/* ── En-tête ── */}
        <div
          className="px-4 py-3 border-b border-slate-100 flex items-center gap-2"
          style={{ background: '#FAFAFA' }}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: '#EEF2FF' }}>
            <Search size={15} style={{ color: '#4338CA' }} />
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#1E1B4B' }}>
              {title}
            </p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">

          {/* ── Zone média ── */}
          {media ? (
            media.type === 'image'
              ? <ImagePreview media={media} onRemove={() => setMedia(null)} />
              : <VideoPreview media={media} onRemove={() => setMedia(null)} />
          ) : (
            <DropZone
              onFile={handleFile}
              onOpenCamera={() => setCameraOpen(true)}
              dragging={dragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          )}

          {/* ── Erreur validation ── */}
          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm"
              style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* ── Champ budget ── */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#1E1B4B' }}>
              Budget estimé (FCFA)
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex : 50 000"
                value={budgetXOF}
                onChange={e => setBudgetXOF(e.target.value.replace(/[^\d\s]/g, ''))}
                className="w-full pl-4 pr-16 py-3 rounded-xl border text-sm outline-none transition-colors"
                style={{
                  borderColor: '#E2E8F0',
                  color: '#1E1B4B',
                }}
                onFocus={e => (e.target.style.borderColor = '#059669')}
                onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold"
                style={{ color: '#94A3B8' }}>
                FCFA
              </span>
            </div>
          </div>

          {/* ── Taille / Couleur / Quantité ── */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#1E1B4B' }}>
              Taille · Couleur · Quantité
            </label>
            <div className="relative">
              <Package
                size={13}
                className="absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: '#94A3B8' }}
              />
              <input
                type="text"
                placeholder="Ex : Taille 42, Noir, 2 paires"
                value={sizingNote}
                onChange={e => setSizingNote(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors"
                style={{ borderColor: '#E2E8F0', color: '#1E1B4B' }}
                onFocus={e => (e.target.style.borderColor = '#059669')}
                onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>

          {/* ── Numéro WhatsApp ── */}
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: '#1E1B4B' }}>
              Votre numéro WhatsApp
            </label>
            <div className="relative">
              {/* Drapeau + indicatif */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-base leading-none">🇸🇳</span>
                <span className="text-xs font-bold text-slate-400">+221</span>
                <span className="text-slate-200 text-sm">|</span>
              </div>
              <input
                type="tel"
                inputMode="tel"
                placeholder="77 123 45 67"
                value={whatsappPhone}
                onChange={e => setWhatsappPhone(formatPhone(e.target.value))}
                maxLength={11}
                className="w-full pl-20 pr-4 py-3 rounded-xl border text-sm outline-none transition-colors font-mono"
                style={{ borderColor: '#E2E8F0', color: '#1E1B4B' }}
                onFocus={e => (e.target.style.borderColor = '#059669')}
                onBlur={e  => (e.target.style.borderColor = '#E2E8F0')}
              />
              <Phone
                size={13}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: '#94A3B8' }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">
              On vous répond sous 24h sur WhatsApp avec le prix et le lien de commande.
            </p>
          </div>

          {/* ── CTA principal ── */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-extrabold text-sm text-white shadow-lg transition-all active:scale-95"
            style={{
              background: canSubmit
                ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                : '#E2E8F0',
              color: canSubmit ? 'white' : '#94A3B8',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Recherche en cours…
              </>
            ) : (
              <>
                <Search size={16} />
                Trouver ce produit au prix usine Chine
              </>
            )}
          </button>

          {/* Sous-note */}
          <p className="text-center text-xs text-slate-400 -mt-2">
            🇨🇳 Sourcing direct usine · Réponse sous 24h · Sans engagement
          </p>
        </div>
      </form>

      <Toast state={toast} />
      <ImmersiveVisualSearch
        open={cameraOpen}
        mode="sourcing"
        onClose={() => setCameraOpen(false)}
        onSearch={async (file) => {
          handleFile(file)
          setCameraOpen(false)
        }}
      />
    </>
  )
}
