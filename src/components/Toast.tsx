import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Toast Notification System
// ============================================================

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

let toastId = 0;
const listeners: Array<(toasts: Toast[]) => void> = [];
let currentToasts: Toast[] = [];

function emit() {
  for (const l of listeners) l(currentToasts);
}

export function showToast(message: string, type: Toast["type"] = "info") {
  const id = `toast-${++toastId}`;
  currentToasts = [...currentToasts, { id, message, type }];
  emit();
  setTimeout(() => dismissToast(id), 4000);
}

export function dismissToast(id: string) {
  currentToasts = currentToasts.filter((t) => t.id !== id);
  emit();
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const idx = listeners.indexOf(setToasts);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
          error: <AlertCircle className="h-5 w-5 text-rose-500" />,
          info: <Info className="h-5 w-5 text-brand-500" />,
        };
        const borders = {
          success: "border-l-emerald-500",
          error: "border-l-rose-500",
          info: "border-l-brand-500",
        };
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border border-surface-200 border-l-4 bg-white px-4 py-3 shadow-lg animate-slide-in min-w-[280px] max-w-[400px]",
              borders[toast.type],
            )}
          >
            {icons[toast.type]}
            <p className="flex-1 text-sm font-medium text-surface-700">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="rounded p-0.5 text-surface-400 hover:bg-surface-100 hover:text-surface-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
