import { X } from "lucide-react";

export interface HomeNotification {
  id: number;
  icon: string;
  title: string;
  body: string;
  time: string;
}

interface Props {
  open: boolean;
  notifications: HomeNotification[];
  readIds: Set<number>;
  onClose: () => void;
}

export default function NotificationsPanel({ open, notifications, readIds, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div className="absolute top-0 left-0 right-0 max-w-md mx-auto bg-white shadow-2xl"
        style={{ borderRadius: "0 0 24px 24px" }}>
        <div className="flex items-center justify-between px-5 pt-10 pb-4 border-b border-slate-100"
          style={{ background: "#1E1B4B", borderRadius: "0 0 24px 24px" }}>
          <div>
            <p className="text-indigo-300 text-xs">Centre de</p>
            <h2 className="text-white font-bold text-lg">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <X size={16} className="text-white" />
          </button>
        </div>
        <div className="bg-white divide-y divide-slate-50 max-h-96 overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-4"
              style={{ background: readIds.has(n.id) ? "white" : "#F8FAFF" }}>
              <span className="text-xl shrink-0">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm leading-snug" style={{ color: "#1E1B4B" }}>{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-xs text-slate-400 mt-1">{n.time}</p>
              </div>
              {!readIds.has(n.id) && (
                <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: "#059669" }} />
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100">
          <p className="text-center text-xs text-slate-400">
            {notifications.length} notifications · Toutes lues
          </p>
        </div>
      </div>
    </div>
  );
}
