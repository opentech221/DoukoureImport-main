import { Home, Package, QrCode, ShoppingBag, Settings, Calculator } from "lucide-react";

type Screen = "home" | "product" | "tracking" | "delivery" | "engine" | "admin";

type BottomNavProps = {
  activeScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onIntentPrefetch: (screen: Screen) => void;
  onTouchIntentPrefetch: (screen: Screen) => void;
};

const NAV: Array<{ id: Exclude<Screen, "admin">; label: string; Icon: typeof Home }> = [
  { id: "home", label: "Accueil", Icon: Home },
  { id: "product", label: "Produit", Icon: ShoppingBag },
  { id: "tracking", label: "Suivi", Icon: Package },
  { id: "delivery", label: "Pass", Icon: QrCode },
  { id: "engine", label: "Moteur", Icon: Calculator },
];

export default function BottomNav({
  activeScreen,
  onNavigate,
  onIntentPrefetch,
  onTouchIntentPrefetch,
}: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-md border-t border-slate-100 md:hidden"
      style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)" }}>
      <div className="flex items-center justify-around px-1 py-2">
        {NAV.map(({ id, label, Icon }) => {
          const active = activeScreen === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              onMouseEnter={() => onIntentPrefetch(id)}
              onFocus={() => onIntentPrefetch(id)}
              onTouchStart={() => onTouchIntentPrefetch(id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-0"
              style={{ background: active ? "#EEF2FF" : "transparent" }}>
              <Icon
                size={19}
                style={{ color: active ? "#1E1B4B" : "#94A3B8", strokeWidth: active ? 2.5 : 1.8 }}
              />
              <span className="text-xs font-semibold" style={{ color: active ? "#1E1B4B" : "#94A3B8" }}>
                {label}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => onNavigate("admin")}
          onMouseEnter={() => onIntentPrefetch("admin")}
          onFocus={() => onIntentPrefetch("admin")}
          onTouchStart={() => onTouchIntentPrefetch("admin")}
          className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
          style={{ background: "transparent" }}>
          <Settings size={19} style={{ color: "#94A3B8", strokeWidth: 1.8 }} />
          <span className="text-xs font-semibold text-slate-400">Admin</span>
        </button>
      </div>
    </nav>
  );
}
