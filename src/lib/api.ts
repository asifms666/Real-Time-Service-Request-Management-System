import type {
  CreateRequestInput,
  ListParams,
  ListResponse,
  ServiceRequest,
  ServiceRequestWithEvents,
  UpdateRequestInput,
  DashboardStats,
  ApiError,
} from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const API_BASE = `${SUPABASE_URL}/functions/v1/service-requests-api`;

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({ error: "Request failed" }))) as ApiError;
    throw new Error(errBody.error || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function buildQuery(params: ListParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.status) sp.set("status", params.status);
  if (params.priority) sp.set("priority", params.priority);
  if (params.category) sp.set("category", params.category);
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  async list(params: ListParams = {}): Promise<ListResponse> {
    const res = await fetch(`${API_BASE}${buildQuery(params)}`, { headers: headers() });
    return handleResponse<ListResponse>(res);
  },

  async get(id: string): Promise<{ data: ServiceRequestWithEvents }> {
    const res = await fetch(`${API_BASE}/${id}`, { headers: headers() });
    return handleResponse<{ data: ServiceRequestWithEvents }>(res);
  },

  async create(input: CreateRequestInput): Promise<{ data: ServiceRequest }> {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(input),
    });
    return handleResponse<{ data: ServiceRequest }>(res);
  },

  async update(id: string, input: UpdateRequestInput): Promise<{ data: ServiceRequest }> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(input),
    });
    return handleResponse<{ data: ServiceRequest }>(res);
  },

  async remove(id: string): Promise<{ data: ServiceRequest; message: string }> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    return handleResponse<{ data: ServiceRequest; message: string }>(res);
  },

  async stats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`, { headers: headers() });
    return handleResponse<DashboardStats>(res);
  },
};
