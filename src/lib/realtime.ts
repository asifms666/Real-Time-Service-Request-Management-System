import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "./supabase";
import type { ServiceRequest, RequestEvent } from "./types";

// ============================================================
// Realtime hook — WebSocket subscriptions via Supabase Realtime
// ============================================================
// Subscribes to Postgres Changes on service_requests and request_events.
// Returns callbacks for row changes so the UI can update live without polling.

interface RealtimePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  table: string;
}

interface UseRealtimeOptions {
  onRequestChange?: (payload: RealtimePayload) => void;
  onEventChange?: (payload: RealtimePayload) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    const channel = supabase
      .channel("service-request-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        (payload: RealtimePayload) => {
          callbacksRef.current.onRequestChange?.(payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_events" },
        (payload: RealtimePayload) => {
          callbacksRef.current.onEventChange?.(payload);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    const checkState = setInterval(() => {
      const state = channel.state;
      if (state === "joined") setConnectionState("connected");
      else if (state === "closed" || state === "errored") setConnectionState("disconnected");
      else setConnectionState("connecting");
    }, 1000);
    return () => clearInterval(checkState);
  }, []);

  return { connectionState };
}

// Hook to track a single request's live updates
export function useRealtimeRequest(requestId: string | null) {
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [events, setEvents] = useState<RequestEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) {
      setRequest(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initial fetch via direct Supabase query (for events)
    const fetchInitial = async () => {
      const [{ data: reqData }, { data: eventData }] = await Promise.all([
        supabase.from("service_requests").select("*").eq("id", requestId).maybeSingle(),
        supabase.from("request_events").select("*").eq("request_id", requestId).order("created_at", { ascending: true }),
      ]);
      setRequest(reqData as ServiceRequest | null);
      setEvents((eventData ?? []) as RequestEvent[]);
      setLoading(false);
    };
    fetchInitial();

    // Realtime subscription for this specific request
    const channel = supabase
      .channel(`request-${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests", filter: `id=eq.${requestId}` },
        (payload: RealtimePayload) => {
          if (payload.eventType === "DELETE") {
            setRequest(null);
          } else {
            setRequest(payload.new as unknown as ServiceRequest);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_events", filter: `request_id=eq.${requestId}` },
        (payload: RealtimePayload) => {
          setEvents((prev) => [...prev, payload.new as unknown as RequestEvent]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId]);

  return { request, events, loading, setRequest };
}

// Connection status hook
export function useConnectionStatus() {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel("connection-status");
    channelRef.current = channel;

    channel
      .on("system" as never, {} as never, (payload: { status?: string }) => {
        if (payload.status === "ok") setStatus("connected");
      })
      .subscribe((state: string) => {
        if (state === "SUBSCRIBED") setStatus("connected");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setStatus("disconnected");
        else setStatus("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}

// Helper to merge a realtime payload into an existing request list
export function mergeRequestUpdate(
  existing: ServiceRequest[],
  payload: RealtimePayload,
): ServiceRequest[] {
  if (payload.eventType === "DELETE") {
    return existing.filter((r) => r.id !== payload.old.id);
  }
  const newRow = payload.new as unknown as ServiceRequest;
  const idx = existing.findIndex((r) => r.id === newRow.id);
  if (idx === -1) return [newRow, ...existing];
  const updated = [...existing];
  updated[idx] = newRow;
  return updated;
}

export type { RealtimePayload };
export { useCallback };
