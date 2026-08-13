import { X, Trash2 } from "lucide-react";
import { formatXOF } from "../../utils/pricingEngine";

export interface CartItem {
  productName: string;
  shippingOption: string;
  depositAmount: number;
  balanceAmount: number;
}

interface Props {
  items: CartItem[];
  onClose: () => void;
  onRemove: (i: number) => void;
}

export default function CartSheet({ items, onClose, onRemove }: Props) {
  const shippingLabels: Record<string, string> = {
    AIR_EXPRESS: "✈️ Aérien Express",
    AIR_ECO: "🛫 Aérien Éco",
    MARITIME: "🚢 Fret Maritime",
  };

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-w-md mx-auto bg-white shadow-2xl"
        style={{ borderRadius: "24px 24px 0 0" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="font-bold text-base" style={{ color: "#1E1B4B" }}>
            Mon Panier ({items.length})
          </h2>
          <button onClick={onClose}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
            <span className="text-5xl">🛒</span>
            <p className="font-semibold" style={{ color: "#1E1B4B" }}>
              Votre panier est vide
            </p>
            <p className="text-xs text-slate-400">
              Commandez un produit pour le voir apparaître ici.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: "#F8FAFC" }}
                >
                  👟
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ color: "#1E1B4B" }}
                  >
                    {item.productName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {shippingLabels[item.shippingOption] ?? item.shippingOption}
                  </p>
                  <p
                    className="text-xs font-bold font-mono mt-0.5"
                    style={{ color: "#059669" }}
                  >
                    Acompte {formatXOF(item.depositAmount)}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(i)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: "#FEF2F2" }}
                >
                  <Trash2 size={13} style={{ color: "#DC2626" }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Total acomptes</span>
              <span className="font-bold font-mono" style={{ color: "#059669" }}>
                {formatXOF(items.reduce((s, it) => s + it.depositAmount, 0))}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-sm border-2 transition-all active:scale-95"
              style={{ borderColor: "#E2E8F0", color: "#64748B" }}
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
