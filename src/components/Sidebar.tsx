import { LayoutDashboard, FilePlus, List, Activity, Headset } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Page } from "@/App";

// ============================================================
// Sidebar Navigation
// ============================================================

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  connectionState: "connecting" | "connected" | "disconnected";
  stats: { total: number; active: number; completed: number };
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS: Array<{ id: Page; label: string; icon: typeof LayoutDashboard; description: string }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & analytics" },
  { id: "submit", label: "New Request", icon: FilePlus, description: "Submit a service request" },
  { id: "requests", label: "All Requests", icon: List, description: "Search & filter requests" },
  { id: "monitor", label: "Live Monitor", icon: Activity, description: "Real-time processing" },
];

export function Sidebar({ currentPage, onNavigate, connectionState, stats, mobileOpen, onMobileClose }: SidebarProps) {
  const connectionConfig = {
    connected: { color: "bg-emerald-500", label: "Live", text: "text-emerald-600" },
    connecting: { color: "bg-amber-500 animate-pulse", label: "Connecting", text: "text-amber-600" },
    disconnected: { color: "bg-rose-500", label: "Offline", text: "text-rose-600" },
  };
  const conn = connectionConfig[connectionState];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-surface-950/40 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-surface-200 bg-white transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-surface-100 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30">
            <Headset className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-surface-900">ServiceFlow</h1>
            <p className="text-[11px] font-medium text-surface-400">Request Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
            Navigation
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onMobileClose();
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all-smooth",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-surface-600 hover:bg-surface-50 hover:text-surface-900",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    isActive ? "bg-brand-500 text-white shadow-md shadow-brand-500/30" : "bg-surface-100 text-surface-500 group-hover:bg-surface-200",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className={cn("text-sm font-semibold", isActive ? "text-brand-700" : "text-surface-700")}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-surface-400">{item.description}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Stats mini-panel */}
        <div className="border-t border-surface-100 px-4 py-4">
          <div className="rounded-xl bg-surface-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-surface-500">Quick Stats</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", conn.color)} />
                <span className={cn("text-[11px] font-semibold", conn.text)}>{conn.label}</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-lg font-bold text-surface-900 tabular-nums">{stats.total}</p>
                <p className="text-[10px] font-medium text-surface-400">Total</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600 tabular-nums">{stats.active}</p>
                <p className="text-[10px] font-medium text-surface-400">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600 tabular-nums">{stats.completed}</p>
                <p className="text-[10px] font-medium text-surface-400">Done</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
