/**
 * ProductStickyActions — Ticket 1.2.C
 *
 * Barre d'action fixe en bas d'écran avec :
 * - Bouton vert "Commander — Payer l'acompte X FCFA" → modal Mobile Money
 * - Bouton WhatsApp pré-rempli
 * - Backdrop-blur
 * - Insertion de la commande dans Supabase à la confirmation
 */

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { formatXOF } from "../utils/pricingEngine";
import { getPostgrestClient } from "../lib/getPostgrestClient";

interface Props {
  productName: string;
  productRef: string;
  depositAmountXOF: number;
  selectedShippingOption: string;
  basePriceXOF: number;
  balanceXOF: number;
  estimatedWeight: number;
  onAddToCart?: () => void;
  onOrderCreated?: (orderRef: string, target?: "tracking" | "delivery") => void;
}

export default function ProductStickyActions({
  productName,
  productRef,
  depositAmountXOF,
  selectedShippingOption,
  basePriceXOF,
  balanceXOF,
  estimatedWeight,
  onAddToCart,
  onOrderCreated,
}: Props) {
  const [modal,      setModal]      = useState(false);
  const [name,       setName]       = useState("");
  const [phone,      setPhone]      = useState("");
  const [address,    setAddress]    = useState("");
  const [method,     setMethod]     = useState<"wave" | "orange">("wave");
  const [afterOrderTarget, setAfterOrderTarget] = useState<"tracking" | "delivery">("tracking");
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]    = useState(false);

  const shippingLabel =
    selectedShippingOption === "AIR_ECO"
      ? "Aérien Éco"
      : selectedShippingOption === "MARITIME"
      ? "Fret Maritime"
      : "Aérien Express";

  const waText = encodeURIComponent(
    `Bonjour Doukoure Import, j'ai une question sur le produit ${productName} (Réf: ${productRef}) avec le mode de transport ${shippingLabel}.`
  );

  async function handleOrder() {
    if (!name.trim() || !phone.trim()) return;
    setSubmitting(true);
    try {
      const db = await getPostgrestClient();
      const orderRef = `ORD-${Date.now()}`;
      await db.from("orders").insert({
        order_ref:        orderRef,
        customer_name:    name.trim(),
        customer_phone:   `+221${phone.replace(/\s/g, "")}`,
        delivery_address: address.trim() || null,
        product_name:     productName,
        product_id:       productRef,
        shipping_option:  selectedShippingOption,
        base_price_xof:   basePriceXOF,
        deposit_paid_xof: depositAmountXOF,
        balance_xof:      balanceXOF,
        estimated_weight: estimatedWeight,
        status:           "PAYMENT_PENDING",
      });
      setSuccess(true);
      onAddToCart?.();

      if (onOrderCreated) {
        onOrderCreated(orderRef, afterOrderTarget);
        return;
      }

      setTimeout(() => {
        setModal(false);
        setSuccess(false);
        setName("");
        setPhone("");
        setAddress("");
      }, 2800);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* ── Barre sticky ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t border-slate-100 space-y-2"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(16px)",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        <button
          onClick={() => setModal(true)}
          className="w-full py-4 rounded-2xl font-extrabold text-white text-base shadow-lg transition-transform active:scale-95"
          style={{
            background: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
            minHeight: 52,
          }}
        >
          Commander — Payer l'acompte {formatXOF(depositAmountXOF)}
        </button>

        <a
          href={`https://wa.me/221770000000?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm border-2 transition-transform active:scale-95"
          style={{ color: "#25D366", borderColor: "#25D366" }}
        >
          <span className="text-lg">📱</span> Poser une question sur WhatsApp
        </a>
      </div>

      {/* ── Modal Mobile Money ── */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => !submitting && setModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <div className="px-5 pb-2 flex items-center justify-between">
              <p className="font-bold text-lg" style={{ color: "#1E1B4B" }}>
                Paiement Mobile Money
              </p>
              <button
                onClick={() => !submitting && setModal(false)}
                className="text-slate-400 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "#F0FDF4" }}
                >
                  <CheckCircle size={32} style={{ color: "#059669" }} />
                </div>
                <p className="font-bold text-lg" style={{ color: "#065F46" }}>
                  Commande enregistrée !
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Notre équipe vous contacte sur WhatsApp pour finaliser le
                  paiement et confirmer votre commande.
                </p>
              </div>
            ) : (
              <div className="px-5 pb-6 space-y-4">
                {/* Récap commande */}
                <div
                  className="p-3.5 rounded-2xl"
                  style={{ background: "#F0FDF4" }}
                >
                  <p className="text-xs text-slate-500 mb-0.5">{productName}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      Acompte à régler (2/3)
                    </span>
                    <span
                      className="font-black text-xl font-mono"
                      style={{ color: "#059669" }}
                    >
                      {formatXOF(depositAmountXOF)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Mode : {shippingLabel}
                  </p>
                </div>

                {/* Méthode */}
                <div className="grid grid-cols-2 gap-2">
                  {(["wave", "orange"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMethod(m)}
                      className="py-3 rounded-xl font-bold text-sm border-2 transition-all"
                      style={{
                        borderColor: method === m ? "#059669" : "#E2E8F0",
                        background: method === m ? "#F0FDF4" : "white",
                        color: method === m ? "#059669" : "#64748B",
                      }}
                    >
                      {m === "wave" ? "🌊 Wave" : "🟠 Orange Money"}
                    </button>
                  ))}
                </div>

                {/* Redirection post-commande */}
                <div>
                  <label
                    className="block text-xs font-bold mb-1.5"
                    style={{ color: "#1E1B4B" }}
                  >
                    Après confirmation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAfterOrderTarget("tracking")}
                      className="py-2.5 rounded-xl font-semibold text-sm border-2 transition-all"
                      style={{
                        borderColor: afterOrderTarget === "tracking" ? "#1E1B4B" : "#E2E8F0",
                        background: afterOrderTarget === "tracking" ? "#EEF2FF" : "white",
                        color: afterOrderTarget === "tracking" ? "#1E1B4B" : "#64748B",
                      }}
                    >
                      Aller au Suivi
                    </button>
                    <button
                      type="button"
                      onClick={() => setAfterOrderTarget("delivery")}
                      className="py-2.5 rounded-xl font-semibold text-sm border-2 transition-all"
                      style={{
                        borderColor: afterOrderTarget === "delivery" ? "#059669" : "#E2E8F0",
                        background: afterOrderTarget === "delivery" ? "#F0FDF4" : "white",
                        color: afterOrderTarget === "delivery" ? "#059669" : "#64748B",
                      }}
                    >
                      Aller au Pass
                    </button>
                  </div>
                </div>

                {/* Nom */}
                <div>
                  <label
                    className="block text-xs font-bold mb-1.5"
                    style={{ color: "#1E1B4B" }}
                  >
                    Votre nom complet
                  </label>
                  <input
                    type="text"
                    placeholder="Mamadou Diallo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#E2E8F0", color: "#1E1B4B" }}
                    onFocus={(e) => (e.target.style.borderColor = "#059669")}
                    onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                  />
                </div>

                {/* Téléphone */}
                <div>
                  <label
                    className="block text-xs font-bold mb-1.5"
                    style={{ color: "#1E1B4B" }}
                  >
                    Numéro {method === "wave" ? "Wave" : "Orange Money"}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      🇸🇳 +221
                    </span>
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="77 123 45 67"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-20 pr-4 py-3 rounded-xl border text-sm outline-none font-mono"
                      style={{ borderColor: "#E2E8F0", color: "#1E1B4B" }}
                      onFocus={(e) => (e.target.style.borderColor = "#059669")}
                      onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                    />
                  </div>
                </div>

                {/* Adresse livraison */}
                <div>
                  <label
                    className="block text-xs font-bold mb-1.5"
                    style={{ color: "#1E1B4B" }}
                  >
                    Adresse de livraison{" "}
                    <span className="font-normal text-slate-400">
                      (optionnel)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Sacré-Cœur 3, Villa 34 — Dakar"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border text-sm outline-none"
                    style={{ borderColor: "#E2E8F0", color: "#1E1B4B" }}
                    onFocus={(e) => (e.target.style.borderColor = "#059669")}
                    onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
                  />
                </div>

                <button
                  onClick={handleOrder}
                  disabled={submitting || !name.trim() || !phone.trim()}
                  className="w-full py-4 rounded-2xl font-extrabold text-white text-base transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background:
                      submitting || !name.trim() || !phone.trim()
                        ? "#E2E8F0"
                        : "linear-gradient(135deg, #059669 0%, #10B981 100%)",
                    color:
                      submitting || !name.trim() || !phone.trim()
                        ? "#94A3B8"
                        : "white",
                    minHeight: 52,
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Envoi en
                      cours…
                    </>
                  ) : (
                    `Confirmer — ${formatXOF(depositAmountXOF)}`
                  )}
                </button>

                <p className="text-center text-xs text-slate-400">
                  Notre équipe vous contactera sur WhatsApp pour finaliser le
                  paiement
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
