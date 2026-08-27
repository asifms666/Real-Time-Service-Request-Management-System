import { useEffect, useState, useCallback } from "react";
import { Search, Inbox, ArrowUpDown } from "lucide-react";
import type { ServiceRequest, ListParams } from "@/lib/types";
import { api } from "@/lib/api";
import { FilterBar, type FilterState } from "@/components/FilterBar";
import { RequestCard } from "@/components/RequestCard";
import { SkeletonCard, LoadingSpinner } from "@/components/Skeletons";
import { showToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

// ============================================================
// Requests List Page
// ============================================================

interface RequestsPageProps {
  onSelectRequest: (id: string) => void;
  externalRequests: ServiceRequest[];
  refreshKey: number;
}

export function RequestsPage({ onSelectRequest, externalRequests, refreshKey }: RequestsPageProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: "",
    priority: "",
    category: "",
  });
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Use external (realtime-merged) requests as the source, apply client-side filters
  const filtered = externalRequests.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.priority && r.priority !== filters.priority) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.ticket_number.toLowerCase().includes(q) ||
        r.submitted_by.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return sortOrder === "desc" ? -cmp : cmp;
  });

  // Initial load
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.list({ limit: 200 })
      .then((res) => {
        if (mounted) setTotal(res.total);
      })
      .catch(() => {
        if (mounted) showToast("Failed to load requests", "error");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [refreshKey]);

  function handleReset() {
    setFilters({ search: "", status: "", priority: "", category: "" });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filter bar */}
      <FilterBar filters={filters} onFilterChange={setFilters} onReset={handleReset} />

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-500">
          {loading ? (
            "Loading requests..."
          ) : (
            <>
              <span className="font-semibold text-surface-700">{sorted.length}</span> of{" "}
              <span className="font-semibold text-surface-700">{externalRequests.length}</span> requests
            </>
          )}
        </p>
        <button
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          className="flex items-center gap-1.5 rounded-lg border border-surface-200 px-3 py-1.5 text-xs font-semibold text-surface-600 hover:bg-surface-50"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortOrder === "desc" ? "Newest First" : "Oldest First"}
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-300 bg-white py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100">
            <Search className="h-6 w-6 text-surface-400" />
          </div>
          <p className="text-sm font-medium text-surface-500">No requests match your filters</p>
          <button onClick={handleReset} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((req) => (
            <RequestCard key={req.id} request={req} onClick={(r) => onSelectRequest(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
