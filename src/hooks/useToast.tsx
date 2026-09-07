import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { localizeError } from "../i18n/localize";
import { useLanguage } from "./useLanguage";

export type ToastType = "success" | "error";

export type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  toasts: Toast[];
  notify: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastType = "success") => {
    const text = type === "error" ? localizeError(message, t) : message;
    const id = Date.now() + Math.random();
    setToasts((current) => {
      const withoutSame = current.filter((toast) => toast.message !== text || toast.type !== type);
      return [...withoutSame, { id, type, message: text }];
    });
    window.setTimeout(() => dismiss(id), 3600);
  }, [dismiss, t]);

  const value = useMemo(() => ({ toasts, notify, dismiss }), [toasts, notify, dismiss]);
  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
