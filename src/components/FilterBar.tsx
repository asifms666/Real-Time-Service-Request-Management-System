import { useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import type { Status, Priority, Category } from "@/lib/types";
import { STATUS_LABELS, PRIORITY_LABELS, CATEGORY_LABELS, cn } from "@/lib/utils";

// ============================================================
// Filter Bar Component
// ============================================================

export interface FilterState {
  search: string;
  status: Status | "";
  priority: Priority | "";
  category: Category | "";
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function FilterBar({ filters, onFilterChange, onReset }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasActiveFilters = filters.status || filters.priority || filters.category;

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="Search by title, description, ticket number, or submitter..."
            className="input-focus w-full rounded-lg border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
            showAdvanced || hasActiveFilters
              ? "border-brand-300 bg-brand-50 text-brand-700"
              : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
              {[filters.status, filters.priority, filters.category].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-surface-200 bg-white p-4 animate-slide-up">
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1.5 block text-xs font-semibold text-surface-500">Status</label>
            <select
              value={filters.status}
              onChange={(e) => onFilterChange({ ...filters, status: e.target.value as Status | "" })}
              className="input-focus w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
            >
              <option value="">All Statuses</option>
              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-1.5 block text-xs font-semibold text-surface-500">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => onFilterChange({ ...filters, priority: e.target.value as Priority | "" })}
              className="input-focus w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
            >
              <option value="">All Priorities</option>
              {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <label className="mb-1.5 block text-xs font-semibold text-surface-500">Category</label>
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value as Category | "" })}
              className="input-focus w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900"
            >
              <option value="">All Categories</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-2 text-sm font-medium text-surface-600 hover:bg-surface-50"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
