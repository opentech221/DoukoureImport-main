import { afterEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import TrackingDashboard from "./TrackingDashboard"

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const maybeSingleMock = vi.fn()

vi.mock("../lib/getPostgrestClient", () => ({
  getPostgrestClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: maybeSingleMock,
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
      })),
    })),
  })),
}))

describe("TrackingDashboard", () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount()
      })
    }
    if (container?.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.clearAllMocks()
  })

  async function renderPage() {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<TrackingDashboard orderRef="ORD-QA-TRACK-001" />)
      await Promise.resolve()
    })
  }

  it("affiche le récapitulatif de suivi à partir de la commande chargée", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        order_ref: "ORD-QA-TRACK-001",
        product_name: "Sneakers QA",
        deposit_paid_xof: 25000,
        shipping_option: "AIR_ECO",
        status: "OUT_FOR_DELIVERY",
      },
      error: null,
    })

    await renderPage()

    expect(container.textContent).toContain("ORD-QA-TRACK-001")
    expect(container.textContent).toContain("Sneakers QA")
    expect(container.textContent).toContain("Aérien Éco")
  })
})