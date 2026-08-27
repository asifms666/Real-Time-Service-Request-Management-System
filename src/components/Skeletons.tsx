import { cn } from "@/lib/utils";

// ============================================================
// Loading Skeletons
// ============================================================

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="shimmer-bg h-4 w-24 rounded" />
          <div className="shimmer-bg h-3 w-16 rounded" />
        </div>
        <div className="shimmer-bg h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="shimmer-bg h-3 w-full rounded" />
        <div className="shimmer-bg h-3 w-3/4 rounded" />
      </div>
      <div className="mt-4">
        <div className="shimmer-bg h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-surface-100 px-4 py-3">
      <div className="shimmer-bg h-4 w-20 rounded" />
      <div className="shimmer-bg h-4 flex-1 rounded" />
      <div className="shimmer-bg h-6 w-24 rounded-full" />
      <div className="shimmer-bg h-6 w-24 rounded-full" />
      <div className="shimmer-bg h-4 w-24 rounded" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5">
      <div className="shimmer-bg h-4 w-16 rounded" />
      <div className="shimmer-bg mt-3 h-8 w-20 rounded" />
    </div>
  );
}

export function LoadingSpinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" };
  return (
    <svg
      className={cn("animate-spin text-brand-500", sizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-medium text-surface-500">Loading...</p>
      </div>
    </div>
  );
}
