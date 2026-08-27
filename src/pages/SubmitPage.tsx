import { useState } from "react";
import { Send, AlertCircle, CheckCircle2 } from "lucide-react";
import type { CreateRequestInput, Priority, Category } from "@/lib/types";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { PRIORITY_LABELS, CATEGORY_LABELS, cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/Skeletons";
import type { Page } from "@/App";

// ============================================================
// Submit Request Page
// ============================================================

interface SubmitPageProps {
  onSubmitted: () => void;
  onNavigate: (page: Page) => void;
}

export function SubmitPage({ onSubmitted, onNavigate }: SubmitPageProps) {
  const [form, setForm] = useState<CreateRequestInput>({
    title: "",
    description: "",
    priority: "medium",
    category: "general",
    submitted_by: "",
    estimated_minutes: 5,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ ticket: string } | null>(null);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 3) e.title = "Title must be at least 3 characters";
    if (form.title.length > 200) e.title = "Title must be 200 characters or fewer";
    if (form.description.trim().length < 10) e.description = "Description must be at least 10 characters";
    if (form.description.length > 2000) e.description = "Description must be 2000 characters or fewer";
    if (form.submitted_by.trim().length < 2) e.submitted_by = "Name is required (min 2 characters)";
    if ((form.estimated_minutes ?? 5) < 1 || (form.estimated_minutes ?? 5) > 120) e.estimated_minutes = "Must be between 1 and 120";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await api.create({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        submitted_by: form.submitted_by.trim(),
      });
      setSuccess({ ticket: data.ticket_number });
      showToast(`Request ${data.ticket_number} submitted and processing started`, "success");
      onSubmitted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to submit request";
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm({
      title: "",
      description: "",
      priority: "medium",
      category: "general",
      submitted_by: "",
      estimated_minutes: 5,
    });
    setSuccess(null);
    setErrors({});
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center animate-fade-in">
        <div className="max-w-md rounded-2xl border border-surface-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-surface-900">Request Submitted!</h2>
          <p className="mt-2 text-sm text-surface-500">
            Your service request has been created and is now being processed.
          </p>
          <div className="mt-4 rounded-lg bg-surface-50 px-4 py-3">
            <p className="text-xs font-medium text-surface-400">Ticket Number</p>
            <p className="font-mono text-lg font-bold text-brand-600">{success.ticket}</p>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 rounded-lg border border-surface-200 px-4 py-2.5 text-sm font-semibold text-surface-700 hover:bg-surface-50"
            >
              Submit Another
            </button>
            <button
              onClick={() => onNavigate("monitor")}
              className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Watch Live
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="rounded-2xl border border-surface-200 bg-white p-6 lg:p-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-surface-900">Submit a Service Request</h2>
          <p className="mt-1 text-sm text-surface-500">
            Fill out the form below. Processing starts automatically once submitted.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Submitter name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-surface-700">
              Submitted By <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.submitted_by}
              onChange={(e) => setForm({ ...form, submitted_by: e.target.value })}
              placeholder="Your name"
              className={cn(
                "input-focus w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400",
                errors.submitted_by ? "border-rose-300" : "border-surface-200",
              )}
            />
            {errors.submitted_by && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-500">
                <AlertCircle className="h-3 w-3" />
                {errors.submitted_by}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-surface-700">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief summary of the issue"
              maxLength={200}
              className={cn(
                "input-focus w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400",
                errors.title ? "border-rose-300" : "border-surface-200",
              )}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.title ? (
                <p className="flex items-center gap-1 text-xs text-rose-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </p>
              ) : <span />}
              <span className="text-xs text-surface-400">{form.title.length}/200</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-surface-700">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Provide detailed information about the service request..."
              rows={5}
              maxLength={2000}
              className={cn(
                "input-focus w-full resize-none rounded-lg border bg-white px-4 py-2.5 text-sm text-surface-900 placeholder:text-surface-400",
                errors.description ? "border-rose-300" : "border-surface-200",
              )}
            />
            <div className="mt-1 flex items-center justify-between">
              {errors.description ? (
                <p className="flex items-center gap-1 text-xs text-rose-500">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </p>
              ) : <span />}
              <span className="text-xs text-surface-400">{form.description.length}/2000</span>
            </div>
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-surface-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                className="input-focus w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-sm text-surface-900"
              >
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-surface-700">Priority</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, priority: p })}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-semibold transition-all-smooth",
                      form.priority === p
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50",
                    )}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Estimated time */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-surface-700">
              Estimated Processing Time (minutes)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={30}
                value={form.estimated_minutes}
                onChange={(e) => setForm({ ...form, estimated_minutes: parseInt(e.target.value) })}
                className="flex-1 accent-brand-500"
              />
              <span className="w-16 rounded-lg bg-surface-50 px-3 py-1.5 text-center font-mono text-sm font-semibold text-surface-700">
                {form.estimated_minutes}m
              </span>
            </div>
            <p className="mt-1 text-xs text-surface-400">
              Higher values simulate longer processing — useful for demonstrating concurrent processing.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 border-t border-surface-100 pt-5">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-surface-200 px-4 py-2.5 text-sm font-semibold text-surface-600 hover:bg-surface-50"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all-smooth hover:bg-brand-600 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" className="text-white" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
