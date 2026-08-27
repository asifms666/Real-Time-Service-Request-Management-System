import { Menu, Wifi, WifiOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Top Bar
// ============================================================

interface TopBarProps {
  title: string;
  subtitle?: string;
  connectionState: "connecting" | "connected" | "disconnected";
  onMobileMenu: () => void;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, connectionState, onMobileMenu, actions }: TopBarProps) {
  const connConfig = {
    connected: { icon: Wifi, color: "text-emerald-600", bg: "bg-emerald-50", label: "Connected" },
    connecting: { icon: Loader2, color: "text-amber-600", bg: "bg-amber-50", label: "Connecting..." },
    disconnected: { icon: WifiOff, color: "text-rose-600", bg: "bg-rose-50", label: "Disconnected" },
  };
  const conn = connConfig[connectionState];
  const ConnIcon = conn.icon;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenu}
          className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-surface-900">{title}</h2>
          {subtitle && <p className="text-xs text-surface-400">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold",
            conn.bg,
            conn.color,
          )}
        >
          <ConnIcon className={cn("h-3.5 w-3.5", connectionState === "connecting" && "animate-spin")} />
          <span className="hidden sm:inline">{conn.label}</span>
        </div>
      </div>
    </header>
  );
}
