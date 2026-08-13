import { getPostgrestClient } from "../lib/getPostgrestClient"
import { emitQaError, emitQaEvent } from "./observability"

export type PaymentProvider = "wave" | "orange"

export interface InitiateBalancePaymentInput {
  orderRef: string
  payerName: string
  payerPhone: string
  provider: PaymentProvider
  amountXof: number
  idempotencyKey: string
}

export interface PaymentResult {
  success: boolean
  providerReference: string
  status: "CONFIRMED" | "PENDING" | "FAILED"
  idempotencyKey: string
  simulated?: boolean
}

async function fallbackLocalPayment(input: InitiateBalancePaymentInput): Promise<PaymentResult> {
  emitQaEvent("payment:fallback:start", {
    orderRef: input.orderRef,
    provider: input.provider,
  })
  const db = await getPostgrestClient()
  const providerReference = `${input.provider.toUpperCase()}-${input.orderRef}-${Date.now()}`

  const { error } = await db
    .from("payment_transactions")
    .upsert(
      {
        order_ref: input.orderRef,
        provider: input.provider,
        provider_reference: providerReference,
        amount_xof: input.amountXof,
        status: "CONFIRMED",
        idempotency_key: input.idempotencyKey,
        payer_name: input.payerName,
        payer_phone: input.payerPhone,
        metadata: {
          mode: "local_fallback",
          confirmedAt: new Date().toISOString(),
        },
      },
      {
        onConflict: "provider,idempotency_key",
      },
    )

  if (error && !error.message.toLowerCase().includes("payment_transactions")) {
    emitQaError("payment:fallback:failed", error, {
      orderRef: input.orderRef,
      provider: input.provider,
    })
    throw new Error(error.message)
  }

  emitQaEvent("payment:fallback:confirmed", {
    orderRef: input.orderRef,
    provider: input.provider,
    providerReference,
  })

  return {
    success: true,
    providerReference,
    status: "CONFIRMED",
    idempotencyKey: input.idempotencyKey,
    simulated: true,
  }
}

export async function initiateAndConfirmBalancePayment(input: InitiateBalancePaymentInput): Promise<PaymentResult> {
  const response = await fetch("/make-server-9c5a520a/payments/initiate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderRef: input.orderRef,
      payerName: input.payerName,
      payerPhone: input.payerPhone,
      provider: input.provider,
      amountXof: input.amountXof,
      idempotencyKey: input.idempotencyKey,
    }),
  })

  if (response.status === 404) {
    return fallbackLocalPayment(input)
  }

  if (!response.ok) {
    emitQaError("payment:initiate:failed", new Error(`Payment initiation failed (${response.status})`), {
      orderRef: input.orderRef,
      provider: input.provider,
    })
    throw new Error(`Payment initiation failed (${response.status})`)
  }

  const payload = await response.json() as {
    providerReference?: string
    status?: "PAID" | "PENDING"
    idempotencyKey?: string
    simulated?: boolean
  }

  const providerReference = payload.providerReference ?? `${input.provider.toUpperCase()}-${input.orderRef}`
  const confirmed = payload.status === "PAID"

  return {
    success: true,
    providerReference,
    status: confirmed ? "CONFIRMED" : "PENDING",
    idempotencyKey: payload.idempotencyKey ?? input.idempotencyKey,
    simulated: payload.simulated === true,
  }
}
