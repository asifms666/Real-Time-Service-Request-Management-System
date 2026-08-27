import { useEffect, useState } from "react";
import {
  ArrowLeft, Clock, User, Hash, Calendar, AlertCircle,
  CheckCircle2, XCircle, Loader2, Activity, MessageSquare,
} from "lucide-react";
import type { ServiceRequest, RequestEvent } from "@/lib/types";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { PriorityBadge, StatusBadge, CategoryBadge } from "@/components/Badges";
import { ProgressBar } from "@/components/ProgressBar";
import { LoadingSpinner } from "@/components/Skeletons";
import { Modal } from "@/components/Modal";
import { showToast } from "@/components/Toast";
import {
  STATUS_LABELS, formatDateTime, formatRelativeTime, formatTime, cn,
} from "@/lib/utils";
import type { Status, Priority } from "@/lib/types";

// ============================================================
// Request Detail Page
// ============================================================

interface DetailPageProps {
  requestId: string;
  onBack: () => void;
  onUpdate: () => void;
}

export function DetailPage({ requestId, onBack, onUpdate }: DetailPageProps) {
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const { data } = await api.get(requestId);
        if (!mounted) return;
        setRequest(data);
        setEvents(data.events ?? []);
      } catch {
        if (mounted) showToast("Failed to load request", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    // Realtime subscription
    const channel = supabase
      .channel(`detail-${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "service_requests", filter: `id=eq.${requestId}` },
        (payload: { new: Record<string, unknown> }) => {
          if (mounted) setRequest(payload.new as unknown as ServiceRequest);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_events", filter: `request_id=eq.${requestId}` },
        (payload: { new: Record<string, unknown> }) => {
          if (mounted) setEvents((prev) => [...prev, payload.new as unknown as RequestEvent]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  async function handleStatusChange(newStatus: Status) {
    if (!request) return;
    setUpdating(true);
    try {
      await api.update(request.id, { status: newStatus });
      showToast(`Status updated to ${STATUS_LABELS[newStatus]}`, "success");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function handlePriorityChange(newPriority: Priority) {
    if (!request) return;
    setUpdating(true);
    try {
      await api.update(request.id, { priority: newPriority });
      showToast(`Priority updated`, "success");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update priority", "error");
    } finally {
      setUpdating(false);
    }
  }

  async function handleCancel() {
    if (!request) return;
    setUpdating(true);
    try {
      await api.update(request.id, { status: "cancelled", cancel_reason: cancelReason || "Cancelled by supervisor" });
      showToast("Request cancelled", "info");
      setShowCancelModal(false);
      setCancelReason("");
      onUpdate();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel request", "error");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <AlertCircle className="h-10 w-10 text-surface-300" />
        <p className="text-sm text-surface-500">Request not found</p>
        <button onClick={onBack} className="text-sm font-semibold text-brand-600">Go back</button>
      </div>
    );
  }

  const isActive = request.status === "in_progress";
  const canCancel = request.status === "pending" || request.status === "in_progress" || request.status === "on_hold";
  const canComplete = request.status === "in_progress" || request.status === "on_hold";

  return (
    <div className="mx-auto max-w-4xl space-y-5 animate-fade-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-surface-500 hover:text-surface-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to requests
      </button>

      {/* Main card */}
      <div className={cn(
        "rounded-2xl border border-surface-200 bg-white p-6 lg:p-8",
        isActive && "ring-2 ring-blue-200",
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-surface-400">
                <Hash className="h-3.5 w-3.5" />
                {request.ticket_number}
              </span>
              <CategoryBadge category={request.category} />
            </div>
            <h1 className="mt-2 text-xl font-bold text-surface-900 lg:text-2xl">{request.title}</h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>

        {/* Description */}
        <div className="mt-5 rounded-xl bg-surface-50 p-4">
          <p className="text-sm leading-relaxed text-surface-700 whitespace-pre-wrap">{request.description}</p>
        </div>

        {/* Progress */}
        {(isActive || request.status === "completed") && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-surface-700">Processing Progress</span>
              <span className="font-mono font-bold text-surface-900 tabular-nums">{request.progress}%</span>
            </div>
            <ProgressBar
              value={request.progress}
              size="lg"
              animated={isActive}
              color={request.status === "completed" ? "emerald" : "blue"}
            />
          </div>
        )}

        {/* Metadata grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-surface-100 pt-5 lg:grid-cols-4">
          <MetaItem icon={User} label="Submitted By" value={request.submitted_by} />
          <MetaItem icon={User} label="Assigned To" value={request.assigned_to ?? "Auto-assigning..."} />
          <MetaItem icon={Clock} label="Est. Time" value={`${request.estimated_minutes} min`} />
          <MetaItem icon={Calendar} label="Created" value={formatRelativeTime(request.created_at)} />
        </div>

        {request.cancel_reason && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 px-4 py-3">
            <XCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <div>
              <p className="text-xs font-semibold text-rose-700">Cancellation Reason</p>
              <p className="text-sm text-rose-600">{request.cancel_reason}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-surface-100 pt-5">
          {canCancel && (
            <>
              {request.status !== "in_progress" && (
                <button
                  onClick={() => handleStatusChange("in_progress")}
                  disabled={updating}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
                >
                  <Loader2 className="h-4 w-4" />
                  Start Processing
                </button>
              )}
              {canComplete && (
                <button
                  onClick={() => handleStatusChange("completed")}
                  disabled={updating}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </button>
              )}
              <button
                onClick={() => handleStatusChange("on_hold")}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
              >
                <Clock className="h-4 w-4" />
                Put on Hold
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={updating}
                className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                <XCircle className="h-4 w-4" />
                Cancel Request
              </button>
            </>
          )}
          {request.status === "cancelled" && (
            <button
              onClick={() => handleStatusChange("pending")}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              Reopen Request
            </button>
          )}
        </div>

        {/* Priority quick-change */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-400">Change priority:</span>
          {(["low", "medium", "high", "critical"] as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePriorityChange(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                request.priority === p
                  ? "bg-brand-100 text-brand-700"
                  : "bg-surface-50 text-surface-500 hover:bg-surface-100",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Event timeline */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 lg:p-8">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-surface-900">
          <Activity className="h-4 w-4 text-brand-500" />
          Event Timeline
        </h3>
        {events.length === 0 ? (
          <p className="text-sm text-surface-400">No events recorded yet.</p>
        ) : (
          <div className="relative space-y-4 pl-6">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-surface-200" />
            {events.map((event, idx) => {
              const eventIcons: Record<string, typeof CheckCircle2> = {
                created: Hash,
                status_changed: ArrowLeft,
                progress_updated: Loader2,
                assigned: User,
                cancelled: XCircle,
                completed: CheckCircle2,
                note_added: MessageSquare,
              };
              const EventIcon = eventIcons[event.event_type] ?? Activity;
              const isLast = idx === events.length - 1;
              return (
                <div key={event.id} className={cn("relative", isLast && "animate-fade-in")}>
                  {/* Dot */}
                  <div className={cn(
                    "absolute -left-[22px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white",
                    event.event_type === "completed" ? "bg-emerald-500" :
                    event.event_type === "cancelled" ? "bg-rose-500" :
                    event.event_type === "created" ? "bg-brand-500" :
                    "bg-surface-300",
                  )} />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-surface-700">{event.message}</p>
                      <p className="mt-0.5 text-xs text-surface-400">
                        by {event.actor} · {formatDateTime(event.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-surface-400">
                      {formatTime(event.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel modal */}
      <Modal open={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Request" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            Are you sure you want to cancel request <span className="font-mono font-semibold">{request.ticket_number}</span>?
            This will stop any ongoing processing.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-surface-700">Reason (optional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={3}
              className="input-focus w-full resize-none rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm text-surface-900"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCancelModal(false)}
              className="rounded-lg border border-surface-200 px-4 py-2 text-sm font-semibold text-surface-600 hover:bg-surface-50"
            >
              Close
            </button>
            <button
              onClick={handleCancel}
              disabled={updating}
              className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {updating ? <LoadingSpinner size="sm" className="text-white" /> : <XCircle className="h-4 w-4" />}
              Confirm Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-xs font-medium text-surface-400">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-surface-700">{value}</p>
    </div>
  );
}
