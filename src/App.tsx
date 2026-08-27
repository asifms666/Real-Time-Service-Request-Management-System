import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { ToastContainer } from "@/components/Toast";
import { DashboardPage } from "@/pages/DashboardPage";
import { SubmitPage } from "@/pages/SubmitPage";
import { RequestsPage } from "@/pages/RequestsPage";
import { DetailPage } from "@/pages/DetailPage";
import { MonitorPage } from "@/pages/MonitorPage";
import { FullPageLoader } from "@/components/Skeletons";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { mergeRequestUpdate, type RealtimePayload } from "@/lib/realtime";
import type { ServiceRequest } from "@/lib/types";

// ============================================================
// App — Root Component
// ============================================================

export type Page = "dashboard" | "submit" | "requests" | "monitor" | "detail";

const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Overview of all service requests" },
  submit: { title: "New Request", subtitle: "Submit a new service request" },
  requests: { title: "All Requests", subtitle: "Search, filter, and manage requests" },
  monitor: { title: "Live Monitor", subtitle: "Real-time processing dashboard" },
  detail: { title: "Request Details", subtitle: "View and manage a single request" },
};

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");

  // Initial data load
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const { data } = await api.list({ limit: 200, sort: "created_at", order: "desc" });
        if (mounted) setRequests(data);
      } catch {
        // If API fails, try direct Supabase query
        const { data, error } = await supabase
          .from("service_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);
        if (!error && mounted) setRequests(data as ServiceRequest[]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Realtime WebSocket subscription — pushes updates without polling
  useEffect(() => {
    const channel = supabase
      .channel("app-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        (payload: RealtimePayload) => {
          setRequests((prev) => mergeRequestUpdate(prev, payload));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_events" },
        () => {
          // Events are handled per-detail-page; here we just know something changed
        },
      )
      .subscribe((state: string) => {
        if (state === "SUBSCRIBED") setConnectionState("connected");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setConnectionState("disconnected");
        else setConnectionState("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNavigate = useCallback((p: Page) => {
    setPage(p);
    setSelectedRequestId(null);
  }, []);

  const handleSelectRequest = useCallback((id: string) => {
    setSelectedRequestId(id);
    setPage("detail");
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Compute sidebar stats
  const sidebarStats = {
    total: requests.length,
    active: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  if (loading) {
    return (
      <>
        <FullPageLoader />
        <ToastContainer />
      </>
    );
  }

  const pageMeta = PAGE_TITLES[page];

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        currentPage={page}
        onNavigate={handleNavigate}
        connectionState={connectionState}
        stats={sidebarStats}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-[264px]">
        <TopBar
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          connectionState={connectionState}
          onMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="p-4 lg:p-8">
          {page === "dashboard" && (
            <DashboardPage
              onNavigate={handleNavigate}
              onSelectRequest={handleSelectRequest}
              requests={requests}
            />
          )}
          {page === "submit" && (
            <SubmitPage onSubmitted={handleRefresh} onNavigate={handleNavigate} />
          )}
          {page === "requests" && (
            <RequestsPage
              onSelectRequest={handleSelectRequest}
              externalRequests={requests}
              refreshKey={refreshKey}
            />
          )}
          {page === "monitor" && (
            <MonitorPage
              requests={requests}
              onSelectRequest={handleSelectRequest}
              onNavigate={handleNavigate}
              connectionState={connectionState}
            />
          )}
          {page === "detail" && selectedRequestId && (
            <DetailPage
              requestId={selectedRequestId}
              onBack={() => setPage("requests")}
              onUpdate={handleRefresh}
            />
          )}
          {page === "detail" && !selectedRequestId && (
            <div className="py-20 text-center text-sm text-surface-500">
              No request selected.{" "}
              <button onClick={() => handleNavigate("requests")} className="font-semibold text-brand-600">
                Browse requests
              </button>
            </div>
          )}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
}
