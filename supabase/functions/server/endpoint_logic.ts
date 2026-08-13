export type PaymentProvider = "wave" | "orange"

export interface CatalogRates {
  rateAirExpressXOF: number
  rateAirEcoXOF: number
  rateMaritimeCbmXOF: number
  marginPercentage: number
}

export interface CatalogProductForRepricing {
  id: number
  price_xof: number
  base_cost_xof?: number | null
  estimated_weight_kg?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
}

export interface CatalogRepricingResult {
  newPriceXof: number
  baseCostXof: number
  selectedMode: "AIR_EXPRESS" | "AIR_ECO" | "MARITIME"
  shippingCostXof: number
  cbmVolume?: number
}

export interface PaymentWebhookPayload {
  orderRef: string
  idempotencyKey: string
  providerReference?: string
  status?: "CONFIRMED" | "FAILED" | "PENDING"
  amountXof?: number
}

export interface WebhookProcessingDeps {
  getDedupe: (key: string) => Promise<unknown>
  setDedupe: (key: string, value: unknown) => Promise<void>
  markOrderPaid: (orderRef: string) => Promise<void>
}

export interface WebhookProcessInput {
  provider: PaymentProvider
  rawBody: string
  signature: string | null
  payload: PaymentWebhookPayload
  secret: string | null
}

export interface WebhookProcessResult {
  ok: boolean
  statusCode: number
  deduped?: boolean
  error?: string
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
  remaining: number
}

export interface InspectionMediaReference {
  kind: "missing" | "direct" | "storage"
  value?: string
}

function textEncoder() {
  return new TextEncoder()
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function signWebhookPayload(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder().encode(rawBody))
  return toHex(signature)
}

function secureEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string | null,
): Promise<boolean> {
  if (!signature || !secret) return false
  const expected = await signWebhookPayload(rawBody, secret)
  return secureEqual(signature.toLowerCase(), expected.toLowerCase())
}

export function verifyAdminToken(rawToken: string | null, expectedToken: string | null): boolean {
  if (!rawToken || !expectedToken) return false
  return secureEqual(rawToken, expectedToken)
}

export function validateAdminSettingsPayload(payload: unknown): payload is {
  rateAirExpressXOF: number
  rateAirEcoXOF: number
  rateMaritimeCbmXOF: number
  marginPercentage: number
} {
  if (!payload || typeof payload !== "object") return false
  const p = payload as Record<string, unknown>

  const required = [
    "rateAirExpressXOF",
    "rateAirEcoXOF",
    "rateMaritimeCbmXOF",
    "marginPercentage",
  ]

  for (const key of required) {
    if (typeof p[key] !== "number" || Number.isNaN(p[key])) {
      return false
    }
  }

  return true
}

export function getWebhookSecretForProvider(
  provider: PaymentProvider,
  envGet: (name: string) => string | undefined,
): string | null {
  if (provider === "wave") {
    return envGet("WAVE_WEBHOOK_SECRET") ?? envGet("WAVE_SANDBOX_WEBHOOK_SECRET") ?? null
  }
  return envGet("ORANGE_WEBHOOK_SECRET") ?? envGet("ORANGE_SANDBOX_WEBHOOK_SECRET") ?? null
}

export async function processWebhookEvent(
  deps: WebhookProcessingDeps,
  input: WebhookProcessInput,
): Promise<WebhookProcessResult> {
  if (!input.payload.idempotencyKey || !input.payload.orderRef) {
    return { ok: false, statusCode: 400, error: "idempotencyKey and orderRef are required" }
  }

  const signatureOk = await verifyWebhookSignature(input.rawBody, input.signature, input.secret)
  if (!signatureOk) {
    return { ok: false, statusCode: 401, error: "Invalid webhook signature" }
  }

  const dedupeKey = `payment:webhook:${input.provider}:${input.payload.idempotencyKey}`
  const existing = await deps.getDedupe(dedupeKey)
  if (existing) {
    return { ok: true, statusCode: 200, deduped: true }
  }

  await deps.markOrderPaid(input.payload.orderRef)
  await deps.setDedupe(dedupeKey, {
    receivedAt: new Date().toISOString(),
    payload: input.payload,
  })

  return { ok: true, statusCode: 200 }
}

export function createInMemoryRateLimiter(config: RateLimitConfig) {
  const buckets = new Map<string, number[]>()

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      const windowStart = now - config.windowMs
      const previous = buckets.get(key) ?? []
      const active = previous.filter((ts) => ts > windowStart)

      if (active.length >= config.maxRequests) {
        const oldest = active[0] ?? now
        const retryAfterMs = Math.max(0, config.windowMs - (now - oldest))
        const retryAfterSec = Math.max(1, Math.ceil(retryAfterMs / 1000))
        buckets.set(key, active)
        return {
          allowed: false,
          retryAfterSec,
          remaining: 0,
        }
      }

      active.push(now)
      buckets.set(key, active)

      return {
        allowed: true,
        retryAfterSec: 0,
        remaining: Math.max(0, config.maxRequests - active.length),
      }
    },
  }
}

export function classifyInspectionMediaReference(value: string | null | undefined): InspectionMediaReference {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) {
    return { kind: "missing" }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "direct", value: trimmed }
  }

  return { kind: "storage", value: trimmed }
}

export function canAccessInspectionMedia(
  orderCustomerPhone: string | null | undefined,
  requestedCustomerPhone: string | null | undefined,
): boolean {
  const normalizedOrderPhone = orderCustomerPhone?.replace(/\s+/g, "") ?? ""
  const normalizedRequestedPhone = requestedCustomerPhone?.replace(/\s+/g, "") ?? ""

  if (!normalizedOrderPhone || !normalizedRequestedPhone) {
    return false
  }

  return secureEqual(normalizedOrderPhone, normalizedRequestedPhone)
}

function safePositive(value: number | null | undefined, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export function calculateCatalogPriceXOF(
  product: CatalogProductForRepricing,
  rates: CatalogRates,
): CatalogRepricingResult {
  const baseCostXof = Math.round(safePositive(product.base_cost_xof, safePositive(product.price_xof, 0)))
  const weightKg = safePositive(product.estimated_weight_kg, 1)
  const lengthCm = safePositive(product.length_cm, 30)
  const widthCm = safePositive(product.width_cm, 20)
  const heightCm = safePositive(product.height_cm, 10)

  const cbmVolume = (lengthCm * widthCm * heightCm) / 1_000_000
  const airExpressCost = Math.round(weightKg * safePositive(rates.rateAirExpressXOF, 11_000))
  const airEcoCost = Math.round(weightKg * safePositive(rates.rateAirEcoXOF, 7_500))
  const maritimeCost = Math.round(cbmVolume * safePositive(rates.rateMaritimeCbmXOF, 145_000))

  const options = [
    { mode: "AIR_EXPRESS" as const, cost: airExpressCost },
    { mode: "AIR_ECO" as const, cost: airEcoCost },
    { mode: "MARITIME" as const, cost: maritimeCost },
  ]

  const selected = options.reduce((best, current) => (current.cost < best.cost ? current : best), options[0])
  const subtotal = baseCostXof + selected.cost
  const marginMultiplier = 1 + safePositive(rates.marginPercentage, 15) / 100
  const total = Math.round(subtotal * marginMultiplier)

  return {
    newPriceXof: total,
    baseCostXof,
    selectedMode: selected.mode,
    shippingCostXof: selected.cost,
    cbmVolume,
  }
}
