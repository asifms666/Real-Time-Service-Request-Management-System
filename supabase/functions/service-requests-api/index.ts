import { corsHeaders, handleOptions, jsonResponse, errorResponse } from "../_shared/cors.ts";

// ============================================================
// Service Request Management — REST API
// ============================================================
// Routes:
//   GET    /service-requests-api            → list (with search, filter, sort, pagination)
//   GET    /service-requests-api/stats       → aggregate dashboard stats
//   GET    /service-requests-api/:id        → single request + events timeline
//   POST   /service-requests-api             → create new request
//   PUT    /service-requests-api/:id         → update request (status, assign, etc.)
//   DELETE /service-requests-api/:id         → cancel/delete request
//
// Concurrency: creating a request triggers a non-blocking fetch to the
// process-request edge function, so the API responds immediately while
// background processing runs concurrently.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_CATEGORIES = ["hardware", "software", "network", "account", "general", "other"];
const VALID_STATUSES = ["pending", "in_progress", "on_hold", "completed", "cancelled"];

interface CreateBody {
  title?: string;
  description?: string;
  priority?: string;
  category?: string;
  submitted_by?: string;
  assigned_to?: string;
  estimated_minutes?: number;
  metadata?: Record<string, unknown>;
}

interface UpdateBody {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  title?: string;
  description?: string;
  progress?: number;
  cancel_reason?: string;
}

function authHeaders(): HeadersInit {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

// ---- Input validation ----

function validateCreate(body: CreateBody): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.title || body.title.trim().length < 3) {
    errors.push("Title is required and must be at least 3 characters.");
  }
  if (body.title && body.title.length > 200) {
    errors.push("Title must be 200 characters or fewer.");
  }
  if (!body.description || body.description.trim().length < 10) {
    errors.push("Description is required and must be at least 10 characters.");
  }
  if (body.description && body.description.length > 2000) {
    errors.push("Description must be 2000 characters or fewer.");
  }
  if (!body.submitted_by || body.submitted_by.trim().length < 2) {
    errors.push("submitted_by is required (min 2 characters).");
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
  }
  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }
  if (body.estimated_minutes !== undefined) {
    if (typeof body.estimated_minutes !== "number" || body.estimated_minutes < 1 || body.estimated_minutes > 120) {
      errors.push("estimated_minutes must be between 1 and 120.");
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateUpdate(body: UpdateBody): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
  }
  if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
  }
  if (body.category && !VALID_CATEGORIES.includes(body.category)) {
    errors.push(`Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
  }
  if (body.title !== undefined && body.title.trim().length < 3) {
    errors.push("Title must be at least 3 characters.");
  }
  if (body.progress !== undefined && (body.progress < 0 || body.progress > 100)) {
    errors.push("Progress must be between 0 and 100.");
  }

  return { valid: errors.length === 0, errors };
}

// ---- Database helpers ----

async function generateTicketNumber(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/generate_ticket_number`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to generate ticket number");
  }
  const ticket = await res.json();
  return ticket as string;
}

async function fetchStats(): Response {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/service_requests?select=status,priority,progress,created_at`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    return errorResponse("Failed to fetch stats", 500);
  }
  const rows: Array<{ status: string; priority: string; progress: number; created_at: string }> = await res.json();

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  let avgProgress = 0;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] ?? 0) + 1;
    avgProgress += r.progress;
  }
  avgProgress = rows.length > 0 ? Math.round(avgProgress / rows.length) : 0;

  const now = Date.now();
  const last24h = rows.filter((r) => new Date(r.created_at).getTime() > now - 86_400_000).length;

  return jsonResponse({
    total: rows.length,
    byStatus,
    byPriority,
    avgProgress,
    last24h,
  });
}

async function listRequests(url: URL): Promise<Response> {
  const search = url.searchParams.get("search") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const priority = url.searchParams.get("priority") ?? "";
  const category = url.searchParams.get("category") ?? "";
  const sort = url.searchParams.get("sort") ?? "created_at";
  const order = url.searchParams.get("order") ?? "desc";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  let query = `${SUPABASE_URL}/rest/v1/service_requests?select=*`;

  // Filters
  const filters: string[] = [];
  if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
  if (priority) filters.push(`priority=eq.${encodeURIComponent(priority)}`);
  if (category) filters.push(`category=eq.${encodeURIComponent(category)}`);
  if (search) filters.push(`or=(title.ilike.%${encodeURIComponent(search)}%,description.ilike.%${encodeURIComponent(search)}%,ticket_number.ilike.%${encodeURIComponent(search)}%,submitted_by.ilike.%${encodeURIComponent(search)}%)`);

  if (filters.length > 0) {
    query += "&" + filters.join("&");
  }

  // Sorting
  const validSorts = ["created_at", "updated_at", "priority", "status", "ticket_number", "title"];
  const sortCol = validSorts.includes(sort) ? sort : "created_at";
  query += `&order=${sortCol}.${order === "asc" ? "asc" : "desc"}`;
  query += `&limit=${limit}&offset=${offset}`;

  const res = await fetch(query, { headers: authHeaders() });
  if (!res.ok) {
    return errorResponse("Failed to fetch requests", 500);
  }
  const data = await res.json();

  // Get total count
  let countQuery = `${SUPABASE_URL}/rest/v1/service_requests?select=id`;
  if (filters.length > 0) countQuery += "&" + filters.join("&");
  const countRes = await fetch(countQuery + `&limit=1000`, {
    headers: { ...authHeaders(), "Prefer": "count=exact" },
  });
  const total = countRes.headers.get("content-range")?.split("/")[1] ?? String(data.length);

  return jsonResponse({ data, total: parseInt(total) });
}

async function getRequest(id: string): Promise<Response> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: authHeaders() },
  );
  if (!res.ok) return errorResponse("Failed to fetch request", 500);
  const rows = await res.json();
  if (rows.length === 0) return errorResponse("Request not found", 404);
  const request = rows[0];

  const eventsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/request_events?request_id=eq.${encodeURIComponent(id)}&order=created_at.asc&select=*`,
    { headers: authHeaders() },
  );
  const events = eventsRes.ok ? await eventsRes.json() : [];

  return jsonResponse({ data: { ...request, events } });
}

async function createRequest(body: CreateBody): Promise<Response> {
  const { valid, errors } = validateCreate(body);
  if (!valid) return errorResponse("Validation failed", 422, errors);

  let ticketNumber: string;
  try {
    ticketNumber = await generateTicketNumber();
  } catch {
    return errorResponse("Failed to generate ticket number", 500);
  }

  const insertBody = {
    ticket_number: ticketNumber,
    title: body.title!.trim(),
    description: body.description!.trim(),
    priority: body.priority ?? "medium",
    category: body.category ?? "general",
    status: "pending",
    progress: 0,
    submitted_by: body.submitted_by!.trim(),
    assigned_to: body.assigned_to?.trim() ?? null,
    estimated_minutes: body.estimated_minutes ?? 5,
    metadata: body.metadata ?? {},
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/service_requests`, {
    method: "POST",
    headers: { ...authHeaders(), "Prefer": "return=representation" },
    body: JSON.stringify(insertBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    return errorResponse("Failed to create request", 500, errText);
  }
  const created = await res.json();
  const request = created[0];

  // Fire-and-forget: trigger background processing (non-blocking)
  // This demonstrates concurrent processing — the API returns immediately
  // while the process-request function handles the long-running work.
  try {
    const processUrl = `${SUPABASE_URL}/functions/v1/process-request`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requestId: request.id }),
    }).catch(() => {
      // Non-blocking: if background trigger fails, request stays "pending"
      // and can be manually processed later.
    });
  } catch {
    // Swallow — background trigger is best-effort
  }

  return jsonResponse({ data: request }, 201);
}

async function updateRequest(id: string, body: UpdateBody): Promise<Response> {
  const { valid, errors } = validateUpdate(body);
  if (!valid) return errorResponse("Validation failed", 422, errors);

  const updateBody: Record<string, unknown> = {};
  if (body.status !== undefined) updateBody.status = body.status;
  if (body.priority !== undefined) updateBody.priority = body.priority;
  if (body.category !== undefined) updateBody.category = body.category;
  if (body.assigned_to !== undefined) updateBody.assigned_to = body.assigned_to;
  if (body.title !== undefined) updateBody.title = body.title.trim();
  if (body.description !== undefined) updateBody.description = body.description.trim();
  if (body.progress !== undefined) updateBody.progress = body.progress;
  if (body.cancel_reason !== undefined) updateBody.cancel_reason = body.cancel_reason;

  if (body.status === "cancelled") {
    updateBody.cancel_reason = body.cancel_reason ?? "Cancelled by supervisor";
  }
  if (body.status === "completed") {
    updateBody.completed_at = new Date().toISOString();
    updateBody.progress = 100;
  }
  if (body.status === "in_progress" && !body.progress) {
    updateBody.processed_at = new Date().toISOString();
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ...authHeaders(), "Prefer": "return=representation" },
      body: JSON.stringify(updateBody),
    },
  );

  if (!res.ok) {
    return errorResponse("Failed to update request", 500);
  }
  const updated = await res.json();
  if (updated.length === 0) return errorResponse("Request not found", 404);

  return jsonResponse({ data: updated[0] });
}

async function deleteRequest(id: string): Promise<Response> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/service_requests?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: { ...authHeaders(), "Prefer": "return=representation" },
    },
  );

  if (!res.ok) return errorResponse("Failed to delete request", 500);
  const deleted = await res.json();
  if (deleted.length === 0) return errorResponse("Request not found", 404);

  return jsonResponse({ data: deleted[0], message: "Request deleted" });
}

// ---- Router ----

Deno.serve(async (req: Request) => {
  const optionRes = handleOptions(req);
  if (optionRes) return optionRes;

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/service-requests-api\/?/, "");
  const segments = path.split("/").filter(Boolean);

  try {
    // GET routes
    if (req.method === "GET") {
      if (segments.length === 0 || segments[0] === "") return await listRequests(url);
      if (segments[0] === "stats") return await fetchStats();
      if (segments.length === 1) return await getRequest(segments[0]);
      return errorResponse("Not found", 404);
    }

    // POST — create
    if (req.method === "POST" && segments.length === 0) {
      const body: CreateBody = await req.json();
      return await createRequest(body);
    }

    // PUT — update
    if (req.method === "PUT" && segments.length === 1) {
      const body: UpdateBody = await req.json();
      return await updateRequest(segments[0], body);
    }

    // DELETE
    if (req.method === "DELETE" && segments.length === 1) {
      return await deleteRequest(segments[0]);
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(message, 500);
  }
});
