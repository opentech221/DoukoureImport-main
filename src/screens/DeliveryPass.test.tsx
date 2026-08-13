import { afterEach, describe, expect, it, vi } from "vitest"
import { createRoot, type Root } from "react-dom/client"
import { act } from "react"
import DeliveryPass from "./DeliveryPass"

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const {
  singleMock,
  maybeSingleMock,
  getCachedDeliveryPassSnapshotMock,
  getLatestCachedDeliveryPassSnapshotMock,
} = vi.hoisted(() => ({
  singleMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  getCachedDeliveryPassSnapshotMock: vi.fn(),
  getLatestCachedDeliveryPassSnapshotMock: vi.fn(),
}))

vi.mock("../lib/getPostgrestClient", () => ({
  getPostgrestClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: singleMock,
          maybeSingle: maybeSingleMock,
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

vi.mock("../utils/deliveryPassOffline", () => ({
  getCachedDeliveryPassSnapshot: getCachedDeliveryPassSnapshotMock,
  getLatestCachedDeliveryPassSnapshot: getLatestCachedDeliveryPassSnapshotMock,
}))

vi.mock("../components/DeliveryValidationQRCode", () => ({
  default: ({ orderId }: { orderId: string }) => <div data-testid="qr">QR {orderId}</div>,
}))

describe("DeliveryPass", () => {
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

  async function renderPage(orderRef?: string | null) {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<DeliveryPass orderRef={orderRef} />)
      await Promise.resolve()
    })
  }

  it("replie sur le cache hors ligne quand la commande n'est pas accessible", async () => {
    singleMock.mockRejectedValueOnce(new Error("offline"))
    getCachedDeliveryPassSnapshotMock.mockResolvedValueOnce({
      orderId: "ORD-CACHED-001",
      customerPhone: "+221778889999",
      remainingBalanceAmount: 19000,
      isBalancePaid: false,
      orderStatus: "OUT_FOR_DELIVERY",
    })

    await renderPage("ORD-CACHED-001")

    expect(container.textContent).toContain("ORD-CACHED-001")
    expect(container.textContent).toContain("Pass chargé depuis le cache hors ligne")
  })
})
