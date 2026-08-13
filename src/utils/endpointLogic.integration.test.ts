import { describe, expect, it, vi } from "vitest"
import {
  calculateCatalogPriceXOF,
  canAccessInspectionMedia,
  classifyInspectionMediaReference,
  createInMemoryRateLimiter,
  processWebhookEvent,
  signWebhookPayload,
  validateAdminSettingsPayload,
  verifyAdminToken,
} from "../../supabase/functions/server/endpoint_logic"

describe("endpoint logic integration", () => {
  it("valide un token admin correct et refuse un token incorrect", () => {
    expect(verifyAdminToken("secret-admin", "secret-admin")).toBe(true)
    expect(verifyAdminToken("bad-token", "secret-admin")).toBe(false)
    expect(verifyAdminToken(null, "secret-admin")).toBe(false)
  })

  it("valide la structure de payload settings admin", () => {
    expect(
      validateAdminSettingsPayload({
        rateAirExpressXOF: 11000,
        rateAirEcoXOF: 7500,
        rateMaritimeCbmXOF: 145000,
        marginPercentage: 15,
      }),
    ).toBe(true)

    expect(
      validateAdminSettingsPayload({
        rateAirExpressXOF: "11000",
        rateAirEcoXOF: 7500,
        rateMaritimeCbmXOF: 145000,
        marginPercentage: 15,
      }),
    ).toBe(false)
  })

  it("traite un webhook valide puis déduplique la rediffusion", async () => {
    const secret = "wave-webhook-secret"
    const rawBody = JSON.stringify({
      orderRef: "ORD-TEST-1001",
      idempotencyKey: "idem-001",
      providerReference: "WAVE-REF-001",
      status: "CONFIRMED",
    })
    const signature = await signWebhookPayload(rawBody, secret)

    const markOrderPaid = vi.fn(async () => undefined)
    const storage = new Map<string, unknown>()

    const deps = {
      getDedupe: async (key: string) => storage.get(key),
      setDedupe: async (key: string, value: unknown) => {
        storage.set(key, value)
      },
      markOrderPaid,
    }

    const first = await processWebhookEvent(deps, {
      provider: "wave",
      rawBody,
      signature,
      payload: JSON.parse(rawBody),
      secret,
    })

    expect(first.ok).toBe(true)
    expect(first.deduped).toBeUndefined()
    expect(markOrderPaid).toHaveBeenCalledTimes(1)

    const second = await processWebhookEvent(deps, {
      provider: "wave",
      rawBody,
      signature,
      payload: JSON.parse(rawBody),
      secret,
    })

    expect(second.ok).toBe(true)
    expect(second.deduped).toBe(true)
    expect(markOrderPaid).toHaveBeenCalledTimes(1)
  })

  it("refuse un webhook avec signature invalide", async () => {
    const secret = "orange-webhook-secret"
    const rawBody = JSON.stringify({
      orderRef: "ORD-TEST-1002",
      idempotencyKey: "idem-002",
    })

    const deps = {
      getDedupe: async () => null,
      setDedupe: async () => undefined,
      markOrderPaid: async () => undefined,
    }

    const result = await processWebhookEvent(deps, {
      provider: "orange",
      rawBody,
      signature: "bad-signature",
      payload: JSON.parse(rawBody),
      secret,
    })

    expect(result.ok).toBe(false)
    expect(result.statusCode).toBe(401)
  })

  it("calcule un prix catalogue robuste à partir des tarifs et du coût de base", () => {
    const repricing = calculateCatalogPriceXOF(
      {
        id: 1,
        price_xof: 12000,
        base_cost_xof: 8000,
        estimated_weight_kg: 1.4,
        length_cm: 100,
        width_cm: 100,
        height_cm: 100,
      },
      {
        rateAirExpressXOF: 11000,
        rateAirEcoXOF: 7500,
        rateMaritimeCbmXOF: 145000,
        marginPercentage: 15,
      },
    )

    expect(repricing.baseCostXof).toBe(8000)
    expect(repricing.selectedMode).toBe("AIR_ECO")
    expect(repricing.shippingCostXof).toBe(10500)
    expect(repricing.newPriceXof).toBe(21275)
    expect(repricing.cbmVolume).toBeCloseTo(1)
  })

  it("applique un rate limit en fenêtre glissante", () => {
    const limiter = createInMemoryRateLimiter({ windowMs: 1000, maxRequests: 2 })

    const first = limiter.check("admin:ip", 0)
    const second = limiter.check("admin:ip", 200)
    const third = limiter.check("admin:ip", 300)
    const afterWindow = limiter.check("admin:ip", 1201)

    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(1)

    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(0)

    expect(third.allowed).toBe(false)
    expect(third.retryAfterSec).toBeGreaterThanOrEqual(1)

    expect(afterWindow.allowed).toBe(true)
  })

  it("isole le rate limit par clé", () => {
    const limiter = createInMemoryRateLimiter({ windowMs: 1000, maxRequests: 1 })

    const a1 = limiter.check("admin:a", 0)
    const a2 = limiter.check("admin:a", 10)
    const b1 = limiter.check("admin:b", 10)

    expect(a1.allowed).toBe(true)
    expect(a2.allowed).toBe(false)
    expect(b1.allowed).toBe(true)
  })

  it("classe correctement les références de médias d'inspection", () => {
    expect(classifyInspectionMediaReference(null)).toEqual({ kind: "missing" })
    expect(classifyInspectionMediaReference("   ")).toEqual({ kind: "missing" })
    expect(classifyInspectionMediaReference("https://cdn.example.com/photo.jpg")).toEqual({
      kind: "direct",
      value: "https://cdn.example.com/photo.jpg",
    })
    expect(classifyInspectionMediaReference("inspection/orders/ORD-001/photo.jpg")).toEqual({
      kind: "storage",
      value: "inspection/orders/ORD-001/photo.jpg",
    })
  })

  it("autorise l'accès média d'inspection au propriétaire normalisé", () => {
    expect(canAccessInspectionMedia("+221 77 123 4567", "+221771234567")).toBe(true)
    expect(canAccessInspectionMedia("+221771234567", "+221 70 123 4567")).toBe(false)
    expect(canAccessInspectionMedia(null, "+221771234567")).toBe(false)
  })
})
