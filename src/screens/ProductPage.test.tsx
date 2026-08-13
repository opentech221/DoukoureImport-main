import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import ProductPage from "./ProductPage";

// Silence React 19 act warnings in jsdom tests.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const maybeSingleMock = vi.fn();

vi.mock("../lib/getPostgrestClient", () => ({
  getPostgrestClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
    })),
  })),
}));

vi.mock("../components/ShippingOptionSelector", () => ({
  default: () => null,
}));

vi.mock("../components/MediaRichCarousel", () => ({
  default: () => null,
}));

vi.mock("../components/ProductStickyActions", () => ({
  default: ({ onOrderCreated }: { onOrderCreated?: (orderRef: string, target?: "tracking" | "delivery") => void }) => (
    <div>
      <button data-testid="go-tracking" onClick={() => onOrderCreated?.("ORD-TRACK-001", "tracking")}>Tracking</button>
      <button data-testid="go-delivery" onClick={() => onOrderCreated?.("ORD-DELIVERY-001", "delivery")}>Delivery</button>
    </div>
  ),
}));

describe("ProductPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    vi.clearAllMocks();
  });

  async function renderPage(onNavigate?: (target: { screen: string; orderRef?: string | null; productId?: string | number | null }) => void) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<ProductPage productId={9999} onNavigate={onNavigate} />);
      await Promise.resolve();
    });
  }

  it("affiche un message explicite quand le produit est introuvable", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });

    await renderPage();

    expect(container.textContent).toContain("Produit introuvable");
  });

  it("redirige vers Suivi avec orderRef quand la cible est tracking", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const onNavigate = vi.fn();

    await renderPage(onNavigate);

    const btn = container.querySelector('[data-testid="go-tracking"]') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });

    expect(onNavigate).toHaveBeenCalledWith({ screen: "tracking", orderRef: "ORD-TRACK-001" });
  });

  it("redirige vers Pass avec orderRef quand la cible est delivery", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const onNavigate = vi.fn();

    await renderPage(onNavigate);

    const btn = container.querySelector('[data-testid="go-delivery"]') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });

    expect(onNavigate).toHaveBeenCalledWith({ screen: "delivery", orderRef: "ORD-DELIVERY-001" });
  });
});
