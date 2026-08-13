import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import OrderTrackingTimeline, { type InspectionData } from './OrderTrackingTimeline'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const inspectionData: InspectionData = {
  photoUrl: 'https://example.com/inspection.jpg',
  videoUrl: 'https://example.com/inspection.mp4',
  videoThumbUrl: 'https://example.com/inspection-thumb.jpg',
  actualWeightKg: 1.4,
  estimatedWeightKg: 1.2,
  adjustedBalanceXOF: 28750,
  inspectedAt: '13 août 2026 — 11h30',
  warehouseLocation: 'Guangzhou',
}

describe('OrderTrackingTimeline', () => {
  let container: HTMLDivElement | null = null
  let root: Root | null = null

  afterEach(() => {
    if (root) {
      act(() => root?.unmount())
      root = null
    }
    container?.remove()
    container = null
  })

  it('conserve la structure visuelle du suivi avec inspection et solde', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(
        <OrderTrackingTimeline
          orderStatus="OUT_FOR_DELIVERY"
          inspectionData={inspectionData}
        />,
      )
    })

    expect(container).toMatchSnapshot()
  })
})
