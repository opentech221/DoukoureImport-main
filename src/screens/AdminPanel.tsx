import { useState, useEffect } from 'react'
import { Settings, CheckCircle, ChevronLeft, RefreshCw, TrendingUp } from 'lucide-react'
import { DEFAULT_RATES, type SystemRates } from '../utils/pricingEngine'
import GlobalShippingRateSettings from '../components/GlobalShippingRateSettings'
import { getPostgrestClient } from '../lib/getPostgrestClient'

interface Props {
  onBack?: () => void
}

export default function AdminPanel({ onBack }: Props) {
  const [savedRates, setSavedRates] = useState<SystemRates>(DEFAULT_RATES)
  const [saveCount,  setSaveCount]  = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [repricingStatus, setRepricingStatus] = useState<string | null>(null)
  const [repricingJobId, setRepricingJobId] = useState<string | null>(null)
  const [repricingProgress, setRepricingProgress] = useState<{ processed: number; total: number; succeeded: number; failed: number } | null>(null)
  const [repricingRunning, setRepricingRunning] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        const db = await getPostgrestClient()
        const { data, error } = await db
          .from('system_settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle()

        if (!cancelled && data && !error) {
          setSavedRates({
            rateAirExpressXOF:  data.rate_air_express_xof  ?? DEFAULT_RATES.rateAirExpressXOF,
            rateAirEcoXOF:      data.rate_air_eco_xof      ?? DEFAULT_RATES.rateAirEcoXOF,
            rateMaritimeCbmXOF: data.rate_maritime_cbm_xof ?? DEFAULT_RATES.rateMaritimeCbmXOF,
            marginPercentage:   data.margin_percentage     ?? DEFAULT_RATES.marginPercentage,
          })
        }
      } catch {
        // Fallback local: DEFAULT_RATES already displayed.
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave(rates: SystemRates) {
    let remoteSaved = false
    try {
      const envToken = import.meta.env.VITE_ADMIN_API_TOKEN as string | undefined
      const sessionToken = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('doukoure_admin_token')
        : null

      const adminToken = sessionToken
        ?? envToken
        ?? (typeof window !== 'undefined'
          ? window.prompt('Code admin requis pour appliquer les nouveaux tarifs:') ?? ''
          : '')

      if (!adminToken) {
        throw new Error('Code admin requis')
      }

      if (typeof sessionStorage !== 'undefined' && !sessionToken) {
        sessionStorage.setItem('doukoure_admin_token', adminToken)
      }

      const response = await fetch('/make-server-9c5a520a/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({
          rateAirExpressXOF: rates.rateAirExpressXOF,
          rateAirEcoXOF: rates.rateAirEcoXOF,
          rateMaritimeCbmXOF: rates.rateMaritimeCbmXOF,
          marginPercentage: rates.marginPercentage,
        }),
      })

      if (!response.ok) {
        throw new Error(`Admin settings update failed (${response.status})`)
      }
      remoteSaved = true
    } catch {
      // Keep local UI state even if remote write fails.
    }
    setSavedRates(rates)
    if (remoteSaved) {
      setSaveCount(n => n + 1)
    }
  }

  async function handleRunRepricing() {
    setRepricingRunning(true)
    setRepricingStatus(null)
    try {
      const envToken = import.meta.env.VITE_ADMIN_API_TOKEN as string | undefined
      const sessionToken = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('doukoure_admin_token')
        : null
      const adminToken = sessionToken ?? envToken ?? ''

      const response = await fetch('/make-server-9c5a520a/admin/repricing/start', {
        method: 'POST',
        headers: {
          'x-admin-token': adminToken,
        },
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? `Repricing failed (${response.status})`)
      }

      setRepricingJobId(payload.jobId ?? null)
      setRepricingStatus(payload.status ?? 'UNKNOWN')
      setRepricingProgress({
        processed: payload.processedProducts ?? 0,
        total: payload.totalProducts ?? 0,
        succeeded: payload.succeededProducts ?? 0,
        failed: payload.failedProducts ?? 0,
      })
    } catch (error) {
      setRepricingStatus(String(error))
    } finally {
      setRepricingRunning(false)
    }
  }

  async function handleRefreshRepricing() {
    try {
      const envToken = import.meta.env.VITE_ADMIN_API_TOKEN as string | undefined
      const sessionToken = typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem('doukoure_admin_token')
        : null
      const adminToken = sessionToken ?? envToken ?? ''

      const endpoint = repricingJobId
        ? `/make-server-9c5a520a/admin/repricing/${repricingJobId}`
        : '/make-server-9c5a520a/admin/repricing/latest'

      const response = await fetch(endpoint, {
        headers: {
          'x-admin-token': adminToken,
        },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? `Unable to load repricing job (${response.status})`)
      }

      const job = payload.data?.job ?? payload.data ?? null
      if (job) {
        setRepricingJobId(job.id ?? repricingJobId)
        setRepricingStatus(job.status ?? null)
        setRepricingProgress({
          processed: job.processed_products ?? 0,
          total: job.total_products ?? 0,
          succeeded: job.succeeded_products ?? 0,
          failed: job.failed_products ?? 0,
        })
      }
    } catch (error) {
      setRepricingStatus(String(error))
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F1F5F9', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header admin ── */}
      <div
        className="sticky top-0 z-30 border-b border-indigo-900 px-4 py-3 flex items-center gap-3"
        style={{ background: '#1E1B4B' }}>

        {/* Bouton ← App Client */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs transition-all active:scale-95 shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)', color: '#A5B4FC' }}
            aria-label="Retour vers l'app client">
            <ChevronLeft size={14} />
            <span className="hidden sm:inline">App Client</span>
          </button>
        )}

        {/* Icône + titre */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          <Settings size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-extrabold text-sm leading-tight">
            Administration — Doukoure Import
          </h1>
          <p className="text-indigo-300 text-xs truncate">Configuration globale des tarifs fret</p>
        </div>

        {/* Badge admin + confirmation */}
        <div className="flex items-center gap-2 shrink-0">
          {saveCount > 0 && (
            <span
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#059669', color: 'white' }}>
              <CheckCircle size={11} /> Appliqués ({saveCount}×)
            </span>
          )}
          <span
            className="text-xs px-2 py-1 rounded-lg font-medium"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#A5B4FC' }}>
            Ibrahima D.
          </span>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <TrendingUp size={16} /> Repricing catalogue
              </div>
              <p className="text-xs text-slate-500">Lance un recalcul batch des prix produits avec suivi d'exécution et snapshots.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRefreshRepricing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RefreshCw size={14} /> Rafraîchir
              </button>
              <button
                type="button"
                onClick={handleRunRepricing}
                disabled={repricingRunning}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TrendingUp size={14} /> {repricingRunning ? 'Repricing...' : 'Lancer le recalcul'}
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Statut</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{repricingStatus ?? 'Aucun job'}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Progression</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {repricingProgress ? `${repricingProgress.processed}/${repricingProgress.total}` : '0/0'}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Réussis</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{repricingProgress?.succeeded ?? 0}</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Échecs</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{repricingProgress?.failed ?? 0}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-300 border-t-transparent animate-spin" />
          </div>
        ) : (
          <GlobalShippingRateSettings
            initialRates={savedRates}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}
