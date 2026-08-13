import { useEffect, useRef, useState } from 'react'
import { Camera, ChevronLeft, Image as ImageIcon, Loader2, RefreshCw, Search, Zap, ZapOff } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSearch: (file: File) => void | Promise<void>
}

type CameraFacing = 'environment' | 'user'

type TorchTrack = MediaStreamTrack & {
  getCapabilities?: () => { torch?: boolean }
  applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>
}

export default function ImmersiveVisualSearch({ open, onClose, onSearch }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    let cancelled = false

    async function startCamera() {
      setCameraError(null)
      setTorchEnabled(false)
      setTorchAvailable(false)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('La caméra n’est pas disponible dans ce navigateur. Utilisez la galerie.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing } },
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        const track = stream.getVideoTracks()[0] as TorchTrack | undefined
        setTorchAvailable(Boolean(track?.getCapabilities?.().torch))
      } catch {
        setCameraError('Autorisez l’accès à la caméra ou choisissez une image dans la galerie.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [facing, open])

  if (!open) return null

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0] as TorchTrack | undefined
    if (!track?.applyConstraints || !torchAvailable) return

    const nextValue = !torchEnabled
    try {
      await track.applyConstraints({ advanced: [{ torch: nextValue } as MediaTrackConstraintSet] })
      setTorchEnabled(nextValue)
    } catch {
      setTorchAvailable(false)
    }
  }

  function handleCapture() {
    const video = videoRef.current
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setCameraError('La caméra n’est pas encore prête. Réessayez dans un instant.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError('Impossible de capturer cette image. Réessayez.')
        return
      }
      const file = new File([blob], `catalogue-camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
      await submitSearch(file)
    }, 'image/jpeg', 0.92)
  }

  async function submitSearch(file: File) {
    setSearching(true)
    setCameraError(null)
    try {
      await onSearch(file)
    } catch {
      setCameraError('La recherche catalogue a échoué. Réessayez.')
    } finally {
      setSearching(false)
    }
  }

  async function handleGalleryChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) await submitSearch(file)
  }

  return (
    <div className="fixed inset-0 z-100 overflow-hidden bg-black text-white">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="Aperçu caméra pour recherche visuelle"
      />

      <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80" />

      <div className="relative flex h-full flex-col justify-between p-4 pb-8 sm:p-6 sm:pb-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm"
            aria-label="Fermer la caméra"
          >
            <ChevronLeft size={23} />
          </button>
          <button
            type="button"
            onClick={() => setFacing((current) => current === 'environment' ? 'user' : 'environment')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm"
            aria-label="Changer de caméra"
          >
            <RefreshCw size={19} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {cameraError && (
            <div className="max-w-sm rounded-2xl border border-white/20 bg-black/65 px-4 py-3 text-center text-sm backdrop-blur-sm">
              {cameraError}
            </div>
          )}
          {searching ? (
            <div className="flex items-center gap-3 rounded-full bg-black/65 px-5 py-3 text-sm font-semibold backdrop-blur-sm">
              <Loader2 size={18} className="animate-spin" /> Recherche dans le catalogue...
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={toggleTorch}
                disabled={!torchAvailable}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={torchEnabled ? 'Désactiver la lampe torche' : 'Activer la lampe torche'}
              >
                {torchEnabled ? <ZapOff size={19} /> : <Zap size={19} />}
              </button>
              <button
                type="button"
                onClick={handleCapture}
                className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/90 bg-white/20 shadow-2xl backdrop-blur-sm transition-transform active:scale-90"
                aria-label="Capturer une image"
              >
                <span className="h-16 w-16 rounded-full bg-white" />
              </button>
              <div className="h-11 w-11" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-xl rounded-3xl border border-white/15 bg-black/50 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Recherche visuelle</p>
              <p className="text-xs text-white/70">Trouvez un produit déjà présent au catalogue.</p>
            </div>
            <Camera size={18} className="text-white/80" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-3 py-3 text-xs font-bold transition hover:bg-white/20"
            >
              <Camera size={16} /> Prendre une photo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-3 text-xs font-bold text-slate-900 transition hover:bg-white/90"
            >
              <ImageIcon size={16} /> Ouvrir la galerie
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleGalleryChange}
          />
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/60">
            <Search size={12} /> Image traitée uniquement pour trouver un article du catalogue
          </p>
        </div>
      </div>
    </div>
  )
}
