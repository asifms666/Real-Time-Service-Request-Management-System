/*
# Create Service Request Management Schema

## Overview
This migration creates the core schema for a Real-Time Service Request Management System.
Operators submit service requests; supervisors monitor processing in real time.
A background worker simulates processing of each request through multiple status stages.

## New Tables

### 1. service_requests
The main table storing all service requests.
- `id` (uuid, primary key)
- `ticket_number` (text, unique, human-readable identifier like SR-0001)
- `title` (text, not null) — short summary of the request
- `description` (text, not null) — detailed description
- `priority` (text, not null, default 'medium') — low | medium | high | critical
- `category` (text, not null, default 'general') — hardware | software | network | account | other
- `status` (text, not null, default 'pending') — pending | in_progress | on_hold | completed | cancelled
- `progress` (integer, default 0) — 0 to 100, processing progress percentage
- `submitted_by` (text, not null) — name of the operator who submitted
- `assigned_to` (text) — name of the technician assigned
- `estimated_minutes` (integer, default 5) — estimated processing time
- `processed_at` (timestamptz) — when processing started
- `completed_at` (timestamptz) — when processing finished
- `cancel_reason` (text) — reason if cancelled
- `metadata` (jsonb) — additional flexible key-value data
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### 2. request_events
An audit/timeline log of every status change and event for each request.
- `id` (uuid, primary key)
- `request_id` (uuid, foreign key to service_requests, on delete cascade)
- `event_type` (text, not null) — created | status_changed | progress_updated | assigned | cancelled | completed | note_added
- `previous_status` (text) — status before the change
- `new_status` (text) — status after the change
- `progress` (integer) — progress value at time of event
- `message` (text) — human-readable event message
- `actor` (text) — who/what triggered the event (operator name, system, supervisor)
- `created_at` (timestamptz, default now())

## Indexes
- `service_requests_status_idx` on service_requests(status) — frequent filtering
- `service_requests_priority_idx` on service_requests(priority)
- `service_requests_created_at_idx` on service_requests(created_at desc)
- `request_events_request_id_idx` on request_events(request_id, created_at desc)

## Triggers
- `update_updated_at` — automatically sets updated_at on service_requests row update
- `log_status_change` — inserts a request_events row whenever status or progress changes

## Realtime
- Both tables are added to the realtime publication for live WebSocket updates.

## Security (RLS)
- This is a single-tenant demo app with no sign-in screen.
- RLS is enabled on both tables.
- Policies allow anon + authenticated full CRUD (data is intentionally shared/public).
*/

-- ============================================================
-- 1. service_requests table
-- ============================================================
CREATE TABLE IF NOT EXISTS service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('hardware', 'software', 'network', 'account', 'general', 'other')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  submitted_by text NOT NULL,
  assigned_to text,
  estimated_minutes integer NOT NULL DEFAULT 5 CHECK (estimated_minutes >= 1 AND estimated_minutes <= 120),
  processed_at timestamptz,
  completed_at timestamptz,
  cancel_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. request_events table
-- ============================================================
CREATE TABLE IF NOT EXISTS request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'status_changed', 'progress_updated', 'assigned', 'cancelled', 'completed', 'note_added')),
  previous_status text,
  new_status text,
  progress integer,
  message text,
  actor text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS service_requests_status_idx ON service_requests(status);
CREATE INDEX IF NOT EXISTS service_requests_priority_idx ON service_requests(priority);
CREATE INDEX IF NOT EXISTS service_requests_created_at_idx ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS request_events_request_id_idx ON request_events(request_id, created_at DESC);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_updated_at ON service_requests;
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Trigger: log status/progress changes to request_events
-- ============================================================
CREATE OR REPLACE FUNCTION log_request_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status or progress changed
  IF TG_OP = 'INSERT' THEN
    INSERT INTO request_events (request_id, event_type, new_status, progress, message, actor)
    VALUES (NEW.id, 'created', NEW.status, NEW.progress, 'Request ' || NEW.ticket_number || ' created', NEW.submitted_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO request_events (request_id, event_type, previous_status, new_status, progress, message, actor)
      VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, NEW.progress,
        'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status,
        COALESCE(NEW.assigned_to, 'system'));
    END IF;

    IF NEW.progress IS DISTINCT FROM OLD.progress AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      INSERT INTO request_events (request_id, event_type, new_status, progress, message, actor)
      VALUES (NEW.id, 'progress_updated', NEW.status, NEW.progress, 'Progress updated to ' || NEW.progress || '%', 'system');
    END IF;

    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
      INSERT INTO request_events (request_id, event_type, new_status, progress, message, actor)
      VALUES (NEW.id, 'assigned', NEW.status, NEW.progress, 'Assigned to ' || NEW.assigned_to, NEW.assigned_to);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_request_change ON service_requests;
CREATE TRIGGER log_request_change
  AFTER INSERT OR UPDATE ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_request_change();

-- ============================================================
-- Realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE request_events;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_events ENABLE ROW LEVEL SECURITY;

-- service_requests: anon + authenticated full CRUD (shared demo data)
DROP POLICY IF EXISTS "anon_select_requests" ON service_requests;
CREATE POLICY "anon_select_requests" ON service_requests FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_requests" ON service_requests;
CREATE POLICY "anon_insert_requests" ON service_requests FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_requests" ON service_requests;
CREATE POLICY "anon_update_requests" ON service_requests FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_requests" ON service_requests;
CREATE POLICY "anon_delete_requests" ON service_requests FOR DELETE
  TO anon, authenticated USING (true);

-- request_events: anon + authenticated full CRUD
DROP POLICY IF EXISTS "anon_select_events" ON request_events;
CREATE POLICY "anon_select_events" ON request_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON request_events;
CREATE POLICY "anon_insert_events" ON request_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON request_events;
CREATE POLICY "anon_update_events" ON request_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON request_events;
CREATE POLICY "anon_delete_events" ON request_events FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- Function: generate next ticket number
-- ============================================================
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  ticket text;
BEGIN
  SELECT COALESCE(MAX(num), 0) + 1 INTO next_num
  FROM (
    SELECT CAST(SUBSTRING(ticket_number FROM 4) AS integer) AS num
    FROM service_requests
    WHERE ticket_number ~ '^SR-[0-9]+$'
  ) sub;

  ticket := 'SR-' || lpad(next_num::text, 4, '0');
  RETURN ticket;
END;
$$ LANGUAGE plpgsql;