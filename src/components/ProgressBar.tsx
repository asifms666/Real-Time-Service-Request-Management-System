import { cn } from "@/lib/utils";

// ============================================================
// Progress Bar Component
// ============================================================

interface ProgressBarProps {
  value: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
  color?: "blue" | "emerald" | "amber" | "rose";
}

export function ProgressBar({
  value,
  size = "md",
  showLabel = false,
  animated = false,
  color = "blue",
}: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100);
  const heights = { sm: "h-1.5", md: "h-2", lg: "h-3" };
  const colors = {
    blue: "bg-gradient-to-r from-brand-400 to-brand-600",
    emerald: "bg-gradient-to-r from-emerald-400 to-emerald-600",
    amber: "bg-gradient-to-r from-amber-400 to-amber-600",
    rose: "bg-gradient-to-r from-rose-400 to-rose-600",
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 overflow-hidden rounded-full bg-surface-200", heights[size])}>
        <div
          className={cn("progress-bar-fill rounded-full", colors[color], animated && "animate-pulse")}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-mono text-xs font-medium text-surface-500 tabular-nums w-9 text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
