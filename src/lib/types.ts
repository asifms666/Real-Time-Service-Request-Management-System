// ============================================================
// Type Definitions — Service Request Management System
// ============================================================

export type Priority = "low" | "medium" | "high" | "critical";
export type Category = "hardware" | "software" | "network" | "account" | "general" | "other";
export type Status = "pending" | "in_progress" | "on_hold" | "completed" | "cancelled";
export type EventType =
  | "created"
  | "status_changed"
  | "progress_updated"
  | "assigned"
  | "cancelled"
  | "completed"
  | "note_added";

export interface ServiceRequest {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  status: Status;
  progress: number;
  submitted_by: string;
  assigned_to: string | null;
  estimated_minutes: number;
  processed_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface RequestEvent {
  id: string;
  request_id: string;
  event_type: EventType;
  previous_status: string | null;
  new_status: string | null;
  progress: number | null;
  message: string;
  actor: string;
  created_at: string;
}

export interface ServiceRequestWithEvents extends ServiceRequest {
  events: RequestEvent[];
}

export interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  avgProgress: number;
  last24h: number;
}

export interface CreateRequestInput {
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  submitted_by: string;
  assigned_to?: string;
  estimated_minutes?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateRequestInput {
  status?: Status;
  priority?: Priority;
  category?: Category;
  assigned_to?: string;
  title?: string;
  description?: string;
  progress?: number;
  cancel_reason?: string;
}

export interface ListParams {
  search?: string;
  status?: string;
  priority?: string;
  category?: string;
  sort?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export interface ListResponse {
  data: ServiceRequest[];
  total: number;
}

export interface ApiError {
  error: string;
  details?: string | string[];
}
