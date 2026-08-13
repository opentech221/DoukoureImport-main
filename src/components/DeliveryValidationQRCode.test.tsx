import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import DeliveryValidationQRCode from './DeliveryValidationQRCode'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../utils/deliveryPassOffline', () => ({
  buildDeliveryValidationIdempotencyKey: vi.fn(() => 'delivery-validation:test'),
  cacheDeliveryPassSnapshot: vi.fn(async () => undefined),
  queueOrSyncDeliveryPassValidation: vi.fn(async () => 'queued'),
}))

describe('DeliveryValidationQRCode', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'))
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container?.remove()
    container = null
    vi.useRealTimers()
  })

  function renderPass(isBalancePaid: boolean) {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <DeliveryValidationQRCode
          orderId="ORD-SNAPSHOT-001"
          remainingBalanceAmount={28750}
          customerPhone="+221 77 123 4567"
          isBalancePaid={isBalancePaid}
        />,
      )
    })
  }

  it('conserve la structure visuelle du pass avec solde dû', () => {
    renderPass(false)
    expect(container).toMatchSnapshot()
  })

  it('conserve la structure visuelle du pass avec solde réglé', () => {
    renderPass(true)
    expect(container).toMatchSnapshot()
  })
})
