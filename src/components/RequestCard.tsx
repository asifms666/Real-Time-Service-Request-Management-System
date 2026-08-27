import { Clock, User, Hash, ChevronRight } from "lucide-react";
import type { ServiceRequest } from "@/lib/types";
import { PriorityBadge, StatusBadge, CategoryBadge } from "./Badges";
import { ProgressBar } from "./ProgressBar";
import { formatRelativeTime, cn } from "@/lib/utils";

// ============================================================
// Request Card
// ============================================================

interface RequestCardProps {
  request: ServiceRequest;
  onClick?: (request: ServiceRequest) => void;
  compact?: boolean;
}

export function RequestCard({ request, onClick, compact = false }: RequestCardProps) {
  const isActive = request.status === "in_progress";

  return (
    <div
      onClick={() => onClick?.(request)}
      className={cn(
        "card-hover cursor-pointer rounded-xl border border-surface-200 bg-white p-5",
        isActive && "ring-2 ring-blue-200",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-surface-400">
              <Hash className="h-3 w-3" />
              {request.ticket_number}
            </span>
            <CategoryBadge category={request.category} />
          </div>
          <h3 className="mt-2 truncate text-sm font-semibold text-surface-900">
            {request.title}
          </h3>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-xs text-surface-500">{request.description}</p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-surface-300" />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <StatusBadge status={request.status} />
        <PriorityBadge priority={request.priority} />
      </div>

      {(request.status === "in_progress" || request.status === "completed") && (
        <div className="mt-3">
          <ProgressBar
            value={request.progress}
            size="sm"
            showLabel
            animated={isActive}
            color={request.status === "completed" ? "emerald" : "blue"}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-surface-50 pt-3 text-xs text-surface-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {request.submitted_by}
          </span>
          {request.assigned_to && (
            <span className="flex items-center gap-1 text-surface-500">
              → {request.assigned_to}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(request.created_at)}
        </span>
      </div>
    </div>
  );
}
