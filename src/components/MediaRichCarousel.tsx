/**
 * MediaRichCarousel — Ticket 5.2
 *
 * Carrousel rich media supportant images HD et vidéos MP4 avec :
 * - Lecteur HTML5 custom (play/pause overlay, mute/unmute, plein écran)
 * - Barre de miniatures avec badge "Play" sur les vidéos
 * - Navigation flèches gauche/droite
 * - Indicateur de pagination (dots)
 * - Swipe tactile mobile (touch events)
 *
 * Props :
 *   mediaList  — Tableau d'objets { type, url, thumbnail?, alt?, duration? }
 *   className  — Classes CSS additionnelles sur le conteneur
 *   aspectRatio — Ratio hauteur/largeur du viewer (défaut 0.82 ≈ 5:6)
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, PlayCircle, Volume2, VolumeX,
  Maximize2, Pause, Play,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaItem {
  type:       'IMAGE' | 'VIDEO'
  url:        string
  thumbnail?: string
  alt?:       string
  duration?:  string
  autoplay?: boolean
  loop?: boolean
}

interface Props {
  mediaList:   MediaItem[]
  className?:  string
  aspectRatio?: number
}

// ---------------------------------------------------------------------------
// Sous-composant : lecteur vidéo custom
// ---------------------------------------------------------------------------

function VideoPlayer({ item }: { item: MediaItem }) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying]   = useState(false)
  const [muted,   setMuted]     = useState(true)
  const [progress,setProgress]  = useState(0)

  useEffect(() => {
    // Reset à chaque changement de source
    setPlaying(false)
    setProgress(0)
    if (videoRef.current) videoRef.current.currentTime = 0
  }, [item.url])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) } else { v.pause(); setPlaying(false) }
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  function handleEnded() { setPlaying(false); setProgress(100) }

  function handleFullscreen() {
    const v = videoRef.current
    if (!v) return
    if (v.requestFullscreen) v.requestFullscreen()
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    v.currentTime = pct * v.duration
    setProgress(pct * 100)
  }

  return (
    <div className="absolute inset-0 bg-slate-900">
      {item.url ? (
        <video
          ref={videoRef}
          src={item.url}
          muted={muted}
          playsInline
          autoPlay={item.autoplay}
          loop={item.loop ?? false}
          className="absolute inset-0 w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
      ) : (
        /* Placeholder si pas d'URL vidéo (demo) */
        item.thumbnail && (
          <img
            src={item.thumbnail}
            alt={item.alt}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.5)' }}
          />
        )
      )}

      {/* Overlay play / pause */}
      {!playing && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(15,23,42,0.42)' }}
          onClick={togglePlay}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.92)' }}>
            <PlayCircle size={36} style={{ color: '#1E1B4B' }} />
          </div>
        </div>
      )}

      {/* Contrôles bas */}
      <div
        className="absolute bottom-0 inset-x-0 px-4 py-3 flex flex-col gap-2"
        style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 100%)' }}>

        {/* Barre de progression */}
        <div
          className="w-full h-1 rounded-full cursor-pointer overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.25)' }}
          onClick={handleSeek}>
          <div
            className="h-full rounded-full transition-none"
            style={{ width: `${progress}%`, background: '#059669' }}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Play / Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="text-white"
            aria-label={playing ? 'Pause' : 'Lecture'}>
            {playing
              ? <Pause size={16} />
              : <Play size={16} />}
          </button>

          {/* Durée indicative */}
          {item.duration && (
            <span className="text-white text-xs font-mono">{item.duration}</span>
          )}

          <div className="flex-1" />

          {/* Mute */}
          <button
            type="button"
            onClick={() => setMuted(m => !m)}
            className="text-white"
            aria-label={muted ? 'Activer le son' : 'Couper le son'}>
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Plein écran */}
          {item.url && (
            <button
              type="button"
              onClick={handleFullscreen}
              className="text-white"
              aria-label="Plein écran">
              <Maximize2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function MediaRichCarousel({ mediaList, className = '', aspectRatio = 0.82 }: Props) {
  const [index,        setIndex]        = useState(0)
  const [touchStartX,  setTouchStartX]  = useState<number | null>(null)
  const [dragging,     setDragging]     = useState(false)

  const current = mediaList[index] ?? mediaList[0]
  const total   = mediaList.length

  const goTo   = useCallback((i: number) => setIndex(Math.max(0, Math.min(i, total - 1))), [total])
  const goPrev = useCallback(() => goTo(index - 1), [index, goTo])
  const goNext = useCallback(() => goTo(index + 1), [index, goTo])

  // Swipe tactile
  function onTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
    setDragging(false)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX !== null && Math.abs(e.touches[0].clientX - touchStartX) > 8) {
      setDragging(true)
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? goNext() : goPrev()
    setTouchStartX(null)
    setDragging(false)
  }

  if (!mediaList.length) return null

  return (
    <div className={`select-none ${className}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Viewer principal ── */}
      <div
        className="relative w-full overflow-hidden bg-slate-900"
        style={{ paddingBottom: `${aspectRatio * 100}%` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}>

        {/* Média actuel */}
        {current.type === 'IMAGE' ? (
          <img
            src={current.url}
            alt={current.alt ?? ''}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            draggable={false}
          />
        ) : (
          <VideoPlayer item={current} />
        )}

        {/* Badge durée vidéo */}
        {current.type === 'VIDEO' && current.duration && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white z-10"
            style={{ background: '#D97706' }}>
            <PlayCircle size={11} />
            {current.duration}
          </div>
        )}

        {/* Flèche gauche */}
        {index > 0 && (
          <button
            onClick={e => { e.stopPropagation(); goPrev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg z-10 transition-transform active:scale-90"
            style={{ background: 'rgba(255,255,255,0.9)' }}
            aria-label="Image précédente">
            <ChevronLeft size={18} className="text-slate-700" />
          </button>
        )}

        {/* Flèche droite */}
        {index < total - 1 && (
          <button
            onClick={e => { e.stopPropagation(); goNext() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg z-10 transition-transform active:scale-90"
            style={{ background: 'rgba(255,255,255,0.9)' }}
            aria-label="Image suivante">
            <ChevronRight size={18} className="text-slate-700" />
          </button>
        )}

        {/* Dots pagination */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {mediaList.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width:      i === index ? 18 : 6,
                height:     6,
                background: i === index ? 'white' : 'rgba(255,255,255,0.45)',
              }}
              aria-label={`Aller au média ${i + 1}`}
            />
          ))}
        </div>

        {/* Compteur */}
        <div
          className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-semibold text-white z-10"
          style={{ background: 'rgba(0,0,0,0.45)' }}>
          {index + 1} / {total}
        </div>
      </div>

      {/* ── Barre de miniatures ── */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {mediaList.map((item, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-150"
            style={{ borderColor: i === index ? '#059669' : '#E2E8F0' }}
            aria-label={item.alt ?? `Miniature ${i + 1}`}>

            <img
              src={item.thumbnail ?? item.url}
              alt=""
              className="w-full h-full object-cover"
            />

            {/* Overlay vidéo */}
            {item.type === 'VIDEO' && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(30,27,75,0.48)' }}>
                <PlayCircle size={16} className="text-white" />
              </div>
            )}

            {/* Badge durée */}
            {item.type === 'VIDEO' && item.duration && (
              <div
                className="absolute bottom-0.5 right-0.5 text-white font-mono font-bold"
                style={{ fontSize: 7, background: '#D97706', padding: '1px 3px', borderRadius: 3 }}>
                {item.duration}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
