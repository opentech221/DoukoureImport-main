import { describe, expect, it, vi } from "vitest"
import { initiateAndConfirmBalancePayment } from "./paymentService"

const upsertMock = vi.fn()

vi.mock("../lib/getPostgrestClient", () => ({
  getPostgrestClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      upsert: upsertMock,
    })),
  })),
}))

describe("paymentService", () => {
  it("utilise le fallback local quand l'endpoint de paiement est indisponible", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 404,
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch)

    upsertMock.mockResolvedValueOnce({ error: null })

    const result = await initiateAndConfirmBalancePayment({
      orderRef: "ORD-QA-PAY-001",
      payerName: "QA User",
      payerPhone: "+221771234567",
      provider: "wave",
      amountXof: 28000,
      idempotencyKey: "idem-qa-pay-001",
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe("CONFIRMED")
    expect(result.simulated).toBe(true)
    expect(upsertMock).toHaveBeenCalled()
  })
})