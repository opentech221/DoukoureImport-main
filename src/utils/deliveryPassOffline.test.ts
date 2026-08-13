import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildDeliveryValidationIdempotencyKey,
  attachDeliveryPassReplayHandlers,
  cacheDeliveryPassSnapshot,
  flushDeliveryPassValidationQueue,
  getCachedDeliveryPassSnapshot,
  getLatestCachedDeliveryPassSnapshot,
  queueOrSyncDeliveryPassValidation,
  requestDeliveryPassBackgroundSync,
} from "./deliveryPassOffline"

describe("deliveryPassOffline", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, "indexedDB", {
      value: undefined,
      configurable: true,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("met en cache le snapshot du pass et le relit hors ligne", async () => {
    await cacheDeliveryPassSnapshot({
      orderId: "ORD-OFFLINE-001",
      customerPhone: "+221771234567",
      remainingBalanceAmount: 12000,
      isBalancePaid: false,
      orderStatus: "OUT_FOR_DELIVERY",
      qrPayload: "{\"orderId\":\"ORD-OFFLINE-001\"}",
      validationToken: "DI-TEST001",
      qrTimestamp: "2026-08-12T20:00:00.000Z",
      updatedAt: "2026-08-12T20:00:00.000Z",
    })

    const cached = await getCachedDeliveryPassSnapshot("ORD-OFFLINE-001")
    const latest = await getLatestCachedDeliveryPassSnapshot()

    expect(cached?.orderId).toBe("ORD-OFFLINE-001")
    expect(latest?.orderId).toBe("ORD-OFFLINE-001")
    expect(cached?.validationToken).toBe("DI-TEST001")
  })

  it("met en file une validation hors ligne puis la resynchronise au retour réseau", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      value: false,
      configurable: true,
    })

    const item = {
      idempotencyKey: buildDeliveryValidationIdempotencyKey("ORD-OFFLINE-002", "2026-08-12T21:00:00.000Z"),
      orderId: "ORD-OFFLINE-002",
      validationToken: "DI-TEST002",
      qrTimestamp: "2026-08-12T21:00:00.000Z",
      queuedAt: "2026-08-12T21:05:00.000Z",
    }

    const first = await queueOrSyncDeliveryPassValidation(item)
    expect(first).toBe("queued")

    Object.defineProperty(window.navigator, "onLine", {
      value: true,
      configurable: true,
    })

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ ok: true, status: "DELIVERED" }),
    })) as unknown as typeof fetch)

    const result = await flushDeliveryPassValidationQueue()

    expect(result.synced).toBe(1)
    expect(result.failed).toBe(0)
  })

  it("enregistre un background sync quand le service worker le supporte", async () => {
    const register = vi.fn(async () => undefined)
    Object.defineProperty(window.navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          sync: { register },
        }),
      },
      configurable: true,
    })

    const ok = await requestDeliveryPassBackgroundSync()

    expect(ok).toBe(true)
    expect(register).toHaveBeenCalledWith("delivery-pass-validation-sync")
  })

  it("attache un replay périodique sans planter puis le nettoie", async () => {
    const clear = attachDeliveryPassReplayHandlers(5)
    expect(typeof clear).toBe("function")
    clear()
  })
})
