import { ChevronRight, MapPin, Package, Phone } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigateTracking: () => void;
}

export default function ProfilePanel({ open, onClose, onNavigateTracking }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 mx-auto max-h-[90vh] max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl lg:bottom-1/2 lg:max-w-lg lg:translate-y-1/2 lg:rounded-3xl">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-100"
          style={{ background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            MD
          </div>
          <div>
            <p className="text-white font-bold text-base">Mamadou Diallo</p>
            <p className="text-indigo-300 text-xs">+221 77 123 45 67</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block"
              style={{ background: "#059669", color: "white" }}>
              Client vérifié ✓
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {[
            { icon: <Package size={18} style={{ color: "#4338CA" }} />, label: "Mes commandes", sub: "1 commande en cours", action: onNavigateTracking },
            { icon: <MapPin size={18} style={{ color: "#059669" }} />, label: "Mes adresses", sub: "Sacré-Cœur 3, Dakar", action: () => {} },
            { icon: <Phone size={18} style={{ color: "#D97706" }} />, label: "Contacter le support", sub: "WhatsApp · Réponse < 2h", action: () => window.open("https://wa.me/221770000000", "_blank") },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 active:bg-slate-100">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#F8FAFC" }}>
                {item.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: "#1E1B4B" }}>{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          ))}
        </div>

        <div className="px-5 py-4">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl font-bold text-sm border-2 transition-all active:scale-95"
            style={{ borderColor: "#E2E8F0", color: "#64748B" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
