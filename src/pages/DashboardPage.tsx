import { useEffect, useState } from "react";
import {
  Inbox, Loader2, CheckCircle2, AlertOctagon, TrendingUp,
  Clock, ArrowRight, Activity, Users, Zap,
} from "lucide-react";
import type { DashboardStats, ServiceRequest } from "@/lib/types";
import { api } from "@/lib/api";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, formatRelativeTime, cn } from "@/lib/utils";
import { SkeletonStat, SkeletonCard, LoadingSpinner } from "@/components/Skeletons";
import { RequestCard } from "@/components/RequestCard";
import { ProgressBar } from "@/components/ProgressBar";
import type { Page } from "@/App";

// ============================================================
// Dashboard Page
// ============================================================

interface DashboardProps {
  onNavigate: (page: Page) => void;
  onSelectRequest: (id: string) => void;
  requests: ServiceRequest[];
}

export function DashboardPage({ onNavigate, onSelectRequest, requests }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.stats()
      .then((s) => setStats(s))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requests.length]);

  const recentRequests = requests.slice(0, 5);
  const activeRequests = requests.filter((r) => r.status === "in_progress").slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-surface-900 p-6 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-2 text-brand-200">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Real-Time Operations</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-white lg:text-3xl">Service Request Command Center</h2>
          <p className="mt-1 max-w-lg text-sm text-brand-100">
            Monitor all service requests as they move through processing — live, without refreshing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("submit")}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-lg transition-transform hover:scale-105"
            >
              Submit New Request
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNavigate("monitor")}
              className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <Activity className="h-4 w-4" />
              Live Monitor
            </button>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
        ) : (
          <>
            <StatCard
              icon={Inbox}
              label="Total Requests"
              value={stats?.total ?? 0}
              color="brand"
              sublabel={`${stats?.last24h ?? 0} in last 24h`}
            />
            <StatCard
              icon={Loader2}
              label="In Progress"
              value={stats?.byStatus.in_progress ?? 0}
              color="blue"
              sublabel="Being processed"
              spin
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats?.byStatus.completed ?? 0}
              color="emerald"
              sublabel="Successfully resolved"
            />
            <StatCard
              icon={AlertOctagon}
              label="Critical"
              value={stats?.byPriority.critical ?? 0}
              color="rose"
              sublabel="High priority items"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent requests */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-surface-900">Recent Requests</h3>
            <button
              onClick={() => onNavigate("requests")}
              className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            ) : recentRequests.length === 0 ? (
              <EmptyState onNavigate={onNavigate} />
            ) : (
              recentRequests.map((req) => (
                <RequestCard key={req.id} request={req} onClick={(r) => onSelectRequest(r.id)} />
              ))
            )}
          </div>
        </div>

        {/* Side panel: status breakdown + active processing */}
        <div className="space-y-4">
          {/* Status breakdown */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-surface-900">Status Breakdown</h3>
            {stats && (
              <div className="space-y-3">
                {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((status) => {
                  const count = stats.byStatus[status] ?? 0;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  const colors = STATUS_COLORS[status];
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-medium", colors.text)}>{STATUS_LABELS[status]}</span>
                        <span className="font-mono font-semibold text-surface-600 tabular-nums">{count}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-100">
                        <div
                          className={cn("progress-bar-fill h-full rounded-full", colors.dot)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority distribution */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-bold text-surface-900">Priority Distribution</h3>
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(PRIORITY_LABELS) as Array<keyof typeof PRIORITY_LABELS>).map((p) => {
                  const count = stats.byPriority[p] ?? 0;
                  const colors = PRIORITY_COLORS[p];
                  return (
                    <div key={p} className={cn("rounded-lg border p-3", colors.bg, colors.border)}>
                      <p className={cn("text-xs font-medium", colors.text)}>{PRIORITY_LABELS[p]}</p>
                      <p className={cn("mt-1 text-2xl font-bold tabular-nums", colors.text)}>{count}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live processing */}
          <div className="rounded-xl border border-surface-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-900">Live Processing</h3>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
            {activeRequests.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Clock className="h-8 w-8 text-surface-300" />
                <p className="text-xs text-surface-400">No requests being processed right now</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeRequests.map((req) => (
                  <div key={req.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-surface-500">{req.ticket_number}</span>
                      <span className="font-mono font-bold text-blue-600 tabular-nums">{req.progress}%</span>
                    </div>
                    <div className="mt-1.5">
                      <ProgressBar value={req.progress} size="sm" animated color="blue" />
                    </div>
                    <p className="mt-1 truncate text-xs text-surface-400">{req.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ----

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sublabel,
  spin,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  color: "brand" | "blue" | "emerald" | "rose";
  sublabel: string;
  spin?: boolean;
}) {
  const colors = {
    brand: { bg: "bg-brand-50", text: "text-brand-600", icon: "bg-brand-500" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "bg-blue-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", icon: "bg-emerald-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-600", icon: "bg-rose-500" },
  };
  const c = colors[color];

  return (
    <div className="card-hover rounded-xl border border-surface-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", c.icon)}>
          <Icon className={cn("h-5 w-5 text-white", spin && "animate-spin")} />
        </div>
        <span className="text-3xl font-bold tabular-nums text-surface-900">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-surface-700">{label}</p>
      <p className="text-xs text-surface-400">{sublabel}</p>
    </div>
  );
}

function EmptyState({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 bg-white py-12">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100">
        <Users className="h-6 w-6 text-surface-400" />
      </div>
      <p className="text-sm font-medium text-surface-500">No requests yet</p>
      <button
        onClick={() => onNavigate("submit")}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Create your first request
      </button>
    </div>
  );
}
