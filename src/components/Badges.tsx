import type { Priority, Status, Category } from "@/lib/types";
import { PRIORITY_LABELS, STATUS_LABELS, CATEGORY_LABELS, PRIORITY_COLORS, STATUS_COLORS, cn } from "@/lib/utils";

// ============================================================
// Badge Components
// ============================================================

export function PriorityBadge({ priority, size = "sm" }: { priority: Priority; size?: "sm" | "xs" }) {
  const colors = PRIORITY_COLORS[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-2 py-0.5 text-[10px]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function StatusBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "xs" }) {
  const colors = STATUS_COLORS[status];
  const isAnimated = status === "in_progress";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        colors.bg,
        colors.text,
        colors.border,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-2 py-0.5 text-[10px]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", colors.dot, isAnimated && "animate-pulse")} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-100 px-2 py-0.5 text-xs font-medium text-surface-600">
      {CATEGORY_LABELS[category]}
    </span>
  );
}
