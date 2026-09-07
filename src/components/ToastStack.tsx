import { useToast } from "../hooks/useToast";

export function ToastStack() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          className={`toast ${toast.type}`}
          onClick={() => dismiss(toast.id)}
        >
          <span>{toast.type === "success" ? "✓" : "!"}</span>
          {toast.message}
        </button>
      ))}
    </div>
  );
}
