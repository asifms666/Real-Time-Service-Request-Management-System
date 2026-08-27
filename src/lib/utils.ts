import type { Priority, Status, Category } from "./types";

// ============================================================
// Display helpers — labels, colors, formatting
// ============================================================

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const STATUS_LABELS: Record<Status, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  hardware: "Hardware",
  software: "Software",
  network: "Network",
  account: "Account",
  general: "General",
  other: "Other",
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; dot: string; border: string }> = {
  low: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500", border: "border-sky-200" },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", border: "border-orange-200" },
  critical: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200" },
};

export const STATUS_COLORS: Record<Status, { bg: string; text: string; dot: string; border: string }> = {
  pending: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", border: "border-slate-200" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", border: "border-blue-200" },
  on_hold: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", border: "border-amber-200" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", border: "border-emerald-200" },
  cancelled: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", border: "border-rose-200" },
};

export const CATEGORY_ICONS: Record<Category, string> = {
  hardware: "Monitor",
  software: "Code",
  network: "Wifi",
  account: "UserCircle",
  general: "Circle",
  other: "MoreHorizontal",
};

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
