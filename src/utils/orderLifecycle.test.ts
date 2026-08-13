import { describe, expect, it } from "vitest"
import { assertTransition, canTransition, normalizeOrderStatus } from "./orderLifecycle"

describe("orderLifecycle", () => {
  it("autorise un flux nominal jusqu'a la livraison", () => {
    expect(canTransition("PAYMENT_PENDING", "PURCHASED_CHINA").ok).toBe(true)
    expect(canTransition("PURCHASED_CHINA", "INSPECTION_WEIGHED_CHINA").ok).toBe(true)
    expect(canTransition("INSPECTION_WEIGHED_CHINA", "IN_TRANSIT_SN").ok).toBe(true)
    expect(canTransition("IN_TRANSIT_SN", "CUSTOMS_DAKAR").ok).toBe(true)
    expect(canTransition("CUSTOMS_DAKAR", "OUT_FOR_DELIVERY").ok).toBe(true)
    expect(canTransition("OUT_FOR_DELIVERY", "DELIVERED").ok).toBe(true)
  })

  it("bloque les transitions invalides", () => {
    const result = canTransition("PAYMENT_PENDING", "DELIVERED")
    expect(result.ok).toBe(false)
    expect(result.reason).toContain("Transition interdite")
  })

  it("autorise le paiement final depuis OUT_FOR_DELIVERY ou DELIVERED", () => {
    expect(canTransition("OUT_FOR_DELIVERY", "PAID").ok).toBe(true)
    expect(canTransition("DELIVERED", "PAID").ok).toBe(true)
    expect(canTransition("PAYMENT_PENDING", "PAID").ok).toBe(true)
  })

  it("normalise les statuts inconnus", () => {
    expect(normalizeOrderStatus("UNKNOWN_STATUS")).toBe("PAYMENT_PENDING")
    expect(normalizeOrderStatus("OUT_FOR_DELIVERY")).toBe("OUT_FOR_DELIVERY")
  })

  it("throw si transition invalide", () => {
    expect(() => assertTransition("CUSTOMS_DAKAR", "PAID")).toThrow()
  })
})
