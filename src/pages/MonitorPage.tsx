import { useEffect, useState, useRef } from "react";
import {
  Activity, Radio, Cpu, Zap, ArrowRight, Layers,
  TrendingUp, Eye, Wifi,
} from "lucide-react";
import type { ServiceRequest } from "@/lib/types";
import { api } from "@/lib/api";
import { StatusBadge, PriorityBadge, CategoryBadge } from "@/components/Badges";
import { ProgressBar } from "@/components/ProgressBar";
import { LoadingSpinner } from "@/components/Skeletons";
import { showToast } from "@/components/Toast";
import { formatRelativeTime, formatTime, cn } from "@/lib/utils";
import type { Page } from "@/App";

// ============================================================
// Live Monitor Page — Real-time processing dashboard
// ============================================================

interface MonitorPageProps {
  requests: ServiceRequest[];
  onSelectRequest: (id: string) => void;
  onNavigate: (page: Page) => void;
  connectionState: "connecting" | "connected" | "disconnected";
}

export function MonitorPage({ requests, onSelectRequest, onNavigate, connectionState }: MonitorPageProps) {
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, avgProgress: 0 });
  const [activityLog, setActivityLog] = useState<Array<{ id: string; message: string; time: string; type: string }>>([]);
  const prevRequestsRef = useRef<Map<string, ServiceRequest>>(new Map());

  // Track changes for activity log
  useEffect(() => {
    const prevMap = prevRequestsRef.current;
    const newLog: Array<{ id: string; message: string; time: string; type: string }> = [];

    for (const req of requests) {
      const prev = prevMap.get(req.id);
      if (!prev) {
        newLog.push({
          id: req.id + "-created",
          message: `${req.ticket_number} created by ${req.submitted_by}`,
          time: formatTime(req.created_at),
          type: "created",
        });
      } else {
        if (prev.status !== req.status) {
          newLog.push({
            id: req.id + "-status-" + Date.now(),
            message: `${req.ticket_number} → ${req.status.replace("_", " ")}`,
            time: formatTime(new Date().toISOString()),
            type: "status",
          });
        }
        if (prev.progress !== req.progress && req.status === "in_progress") {
          if (Math.abs(req.progress - prev.progress) >= 10) {
            newLog.push({
              id: req.id + "-progress-" + Date.now(),
              message: `${req.ticket_number} at ${req.progress}%`,
              time: formatTime(new Date().toISOString()),
              type: "progress",
            });
          }
        }
      }
    }

    if (newLog.length > 0) {
      setActivityLog((prev) => [...newLog.reverse(), ...prev].slice(0, 30));
    }

    // Update ref
    const newMap = new Map<string, ServiceRequest>();
    for (const r of requests) newMap.set(r.id, r);
    prevRequestsRef.current = newMap;
  }, [requests]);

  // Compute stats
  useEffect(() => {
    const active = requests.filter((r) => r.status === "in_progress").length;
    const completed = requests.filter((r) => r.status === "completed").length;
    const inProgressReqs = requests.filter((r) => r.status === "in_progress");
    const avgProgress = inProgressReqs.length > 0
      ? Math.round(inProgressReqs.reduce((sum, r) => sum + r.progress, 0) / inProgressReqs.length)
      : 0;
    setStats({ total: requests.length, active, completed, avgProgress });
  }, [requests]);

  const activeRequests = requests.filter((r) => r.status === "in_progress").sort((a, b) => b.progress - a.progress);
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const recentlyCompleted = requests.filter((r) => r.status === "completed").slice(0, 5);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Live status banner */}
      <div className={cn(
        "flex items-center justify-between rounded-xl border p-4",
        connectionState === "connected"
          ? "border-emerald-200 bg-emerald-50"
          : connectionState === "connecting"
          ? "border-amber-200 bg-amber-50"
          : "border-rose-200 bg-rose-50",
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            connectionState === "connected" ? "bg-emerald-500" : connectionState === "connecting" ? "bg-amber-500" : "bg-rose-500",
          )}>
            <Radio className={cn("h-5 w-5 text-white", connectionState === "connecting" && "animate-pulse")} />
          </div>
          <div>
            <p className="text-sm font-bold text-surface-900">
              {connectionState === "connected" ? "Live WebSocket Connection Active" : connectionState === "connecting" ? "Establishing Connection..." : "Connection Lost"}
            </p>
            <p className="text-xs text-surface-500">
              {connectionState === "connected"
                ? "Updates are pushed in real-time — no polling required"
                : "Reconnecting..."}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 text-xs font-semibold text-surface-500 sm:flex">
          <Wifi className="h-4 w-4" />
          WebSocket
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MonitorStat icon={Layers} label="Total Tracked" value={stats.total} color="brand" />
        <MonitorStat icon={Cpu} label="Processing Now" value={stats.active} color="blue" pulse={stats.active > 0} />
        <MonitorStat icon={TrendingUp} label="Avg Progress" value={`${stats.avgProgress}%`} color="emerald" />
        <MonitorStat icon={Zap} label="Completed" value={stats.completed} color="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Active processing — main panel */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-surface-900">
              <Activity className="h-4 w-4 text-blue-500" />
              Active Processing
              {activeRequests.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {activeRequests.length} running
                </span>
              )}
            </h3>
          </div>

          {activeRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 bg-white py-12">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100">
                <Cpu className="h-6 w-6 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-500">No requests being processed</p>
              <button
                onClick={() => onNavigate("submit")}
                className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600"
              >
                Submit a Request
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => onSelectRequest(req.id)}
                  className="card-hover cursor-pointer rounded-xl border border-surface-200 bg-white p-5 ring-2 ring-blue-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-surface-400">{req.ticket_number}</span>
                        <CategoryBadge category={req.category} />
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-surface-900">{req.title}</p>
                      <p className="mt-0.5 text-xs text-surface-400">
                        {req.submitted_by} → {req.assigned_to ?? "assigning..."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={req.status} />
                      <PriorityBadge priority={req.priority} size="xs" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-surface-500">Processing...</span>
                      <span className="font-mono font-bold text-blue-600 tabular-nums">{req.progress}%</span>
                    </div>
                    <ProgressBar value={req.progress} size="md" animated color="blue" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pending queue */}
          {pendingRequests.length > 0 && (
            <div className="mt-5">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-bold text-surface-500">
                <Eye className="h-3.5 w-3.5" />
                Pending Queue ({pendingRequests.length})
              </h4>
              <div className="space-y-2">
                {pendingRequests.slice(0, 4).map((req) => (
                  <div
                    key={req.id}
                    onClick={() => onSelectRequest(req.id)}
                    className="card-hover flex cursor-pointer items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-surface-400">{req.ticket_number}</span>
                      <span className="truncate text-sm text-surface-700">{req.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={req.priority} size="xs" />
                      <span className="text-xs text-surface-400">{formatRelativeTime(req.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity log — side panel */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-surface-900">
            <Radio className="h-4 w-4 text-emerald-500" />
            Live Activity Feed
          </h3>
          <div className="rounded-xl border border-surface-200 bg-white p-4">
            {activityLog.length === 0 ? (
              <p className="py-8 text-center text-xs text-surface-400">
                Waiting for activity...
              </p>
            ) : (
              <div className="max-h-[500px] space-y-2 overflow-y-auto">
                {activityLog.map((log) => {
                  const typeColors: Record<string, string> = {
                    created: "bg-brand-500",
                    status: "bg-blue-500",
                    progress: "bg-amber-500",
                  };
                  return (
                    <div key={log.id} className="flex items-start gap-2.5 animate-slide-in">
                      <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", typeColors[log.type] ?? "bg-surface-400")} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-surface-700">{log.message}</p>
                        <p className="font-mono text-[10px] text-surface-400">{log.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recently completed */}
          {recentlyCompleted.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-bold text-surface-500">Recently Completed</h4>
              <div className="space-y-2">
                {recentlyCompleted.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => onSelectRequest(req.id)}
                    className="card-hover flex cursor-pointer items-center justify-between rounded-lg border border-surface-200 bg-white px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-surface-400">{req.ticket_number}</span>
                      <span className="truncate text-sm text-surface-700">{req.title}</span>
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">{formatRelativeTime(req.updated_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonitorStat({
  icon: Icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  color: "brand" | "blue" | "emerald";
  pulse?: boolean;
}) {
  const colors = {
    brand: { bg: "bg-brand-50", icon: "bg-brand-500", text: "text-brand-600" },
    blue: { bg: "bg-blue-50", icon: "bg-blue-500", text: "text-blue-600" },
    emerald: { bg: "bg-emerald-50", icon: "bg-emerald-500", text: "text-emerald-600" },
  };
  const c = colors[color];

  return (
    <div className="card-hover rounded-xl border border-surface-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", c.icon)}>
          <Icon className={cn("h-4.5 w-4.5 text-white", pulse && "animate-pulse")} />
        </div>
        <div>
          <p className={cn("text-2xl font-bold tabular-nums", c.text)}>{value}</p>
          <p className="text-xs font-medium text-surface-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
