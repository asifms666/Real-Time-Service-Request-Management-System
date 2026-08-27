import { corsHeaders, handleOptions, errorResponse, jsonResponse } from "../_shared/cors.ts";

// ============================================================
// Background Request Processor — Concurrent Processing
// ============================================================
// This edge function simulates a long-running background worker.
// It is triggered fire-and-forget by the REST API after creating a request.
//
// Concurrency model:
//   - Each request gets its own invocation of this function.
//   - Multiple invocations run concurrently as separate Deno instances.
//   - The function does NOT block any API request — it runs independently.
//   - Processing advances through stages: pending → in_progress → completed
//   - Progress is updated in the database at intervals, triggering realtime
//     events that push to all connected WebSocket clients.
//
// The processing time is proportional to the request's estimated_minutes,
// scaled down for demo purposes (each "minute" = ~1.5 seconds).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function authHeaders(): HeadersInit {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function fetchRequest(id: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${id}&select=*`,
    { headers: authHeaders() },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.length > 0 ? rows[0] : null;
}

async function updateRequest(id: string, patch: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${id}`,
    {
      method: "PATCH",
      headers: { ...authHeaders(), "Prefer": "return=minimal" },
      body: JSON.stringify(patch),
    },
  );
  return res.ok;
}

async function addEvent(requestId: string, eventType: string, message: string, actor = "system"): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/request_events`, {
    method: "POST",
    headers: { ...authHeaders(), "Prefer": "return=minimal" },
    body: JSON.stringify({ request_id: requestId, event_type: eventType, message, actor }),
  });
}

// Sleep helper — non-blocking async delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Assign a technician name from a pool
const TECHNICIANS = [
  "Alex Chen", "Maria Garcia", "James Wilson", "Priya Patel",
  "David Kim", "Sarah Johnson", "Michael Brown", "Lisa Anderson",
];

Deno.serve(async (req: Request) => {
  const optionRes = handleOptions(req);
  if (optionRes) return optionRes;

  try {
    const { requestId } = await req.json();
    if (!requestId) return errorResponse("requestId is required", 400);

    // 1. Fetch the request
    const request = await fetchRequest(requestId);
    if (!request) return errorResponse("Request not found", 404);

    // If already processed or cancelled, skip
    const currentStatus = request.status as string;
    if (currentStatus === "completed" || currentStatus === "cancelled") {
      return jsonResponse({ message: `Request already ${currentStatus}`, skipped: true });
    }

    // 2. Assign a technician (random from pool)
    const tech = TECHNICIANS[Math.floor(Math.random() * TECHNICIANS.length)];
    await updateRequest(requestId, {
      assigned_to: tech,
      status: "in_progress",
      progress: 5,
      processed_at: new Date().toISOString(),
    });
    await addEvent(requestId, "assigned", `Auto-assigned to ${tech}`, "system");

    // 3. Simulate processing with progressive updates
    // Scale: each estimated minute = ~1.5 seconds, with 10 progress steps
    const estimated = request.estimated_minutes as number ?? 5;
    const totalDuration = Math.min(estimated * 1500, 30_000); // cap at 30s
    const steps = 10;
    const stepDelay = Math.max(totalDuration / steps, 800);

    for (let step = 1; step <= steps; step++) {
      await delay(stepDelay);

      // Re-fetch to check if cancelled mid-processing
      const current = await fetchRequest(requestId);
      if (!current || current.status === "cancelled") {
        return jsonResponse({ message: "Request was cancelled during processing", stopped: true });
      }

      const progress = Math.min(5 + Math.round((step / steps) * 90), 95);
      await updateRequest(requestId, { progress });
    }

    // 4. Mark as completed
    await updateRequest(requestId, {
      status: "completed",
      progress: 100,
      completed_at: new Date().toISOString(),
    });
    await addEvent(requestId, "completed", `Processing completed by ${tech}`, tech);

    return jsonResponse({
      message: "Request processed successfully",
      requestId,
      assignedTo: tech,
      duration: totalDuration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
