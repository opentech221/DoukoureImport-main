export type OrderStatus =
  | "PAYMENT_PENDING"
  | "PURCHASED_CHINA"
  | "INSPECTION_WEIGHED_CHINA"
  | "IN_TRANSIT_SN"
  | "CUSTOMS_DAKAR"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "PAID"
  | "PAYMENT_FAILED"

export interface TransitionValidationResult {
  ok: boolean
  reason?: string
}

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PAYMENT_PENDING: ["PURCHASED_CHINA", "PAYMENT_FAILED", "PAID"],
  PURCHASED_CHINA: ["INSPECTION_WEIGHED_CHINA"],
  INSPECTION_WEIGHED_CHINA: ["IN_TRANSIT_SN"],
  IN_TRANSIT_SN: ["CUSTOMS_DAKAR"],
  CUSTOMS_DAKAR: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "PAID"],
  DELIVERED: ["PAID"],
  PAID: [],
  PAYMENT_FAILED: ["PAYMENT_PENDING"],
}

export function isValidOrderStatus(status: string | null | undefined): status is OrderStatus {
  if (!status) return false
  return status in TRANSITIONS
}

export function canTransition(from: OrderStatus, to: OrderStatus): TransitionValidationResult {
  if (from === to) return { ok: true }

  const allowed = TRANSITIONS[from]
  if (allowed.includes(to)) return { ok: true }

  return {
    ok: false,
    reason: `Transition interdite: ${from} -> ${to}`,
  }
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  const result = canTransition(from, to)
  if (!result.ok) {
    throw new Error(result.reason)
  }
}

export function normalizeOrderStatus(status: string | null | undefined, fallback: OrderStatus = "PAYMENT_PENDING"): OrderStatus {
  return isValidOrderStatus(status) ? status : fallback
}
