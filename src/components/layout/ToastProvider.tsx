// src/components/layout/ToastProvider.tsx
// Sparks3D Preventivi – Toast / Snackbar system
// ================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
  detail?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, detail?: string) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
  warning: (message: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

let nextId = 0;

const TOAST_STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", color: "#4ade80", icon: "✓" },
  error:   { bg: "rgba(244,63,94,0.1)",  border: "rgba(244,63,94,0.25)",  color: "#fb7185", icon: "✕" },
  info:    { bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)", color: "#60a5fa", icon: "ℹ" },
  warning: { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", color: "#fbbf24", icon: "⚠" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, detail?: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message, detail }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (msg, det) => addToast("success", msg, det),
    error: (msg, det) => addToast("error", msg, det),
    info: (msg, det) => addToast("info", msg, det),
    warning: (msg, det) => addToast("warning", msg, det),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* ── Toast container ── */}
      <div style={{
        position: "fixed", bottom: 20, right: 20,
        zIndex: 999999, display: "flex", flexDirection: "column-reverse",
        gap: 8, pointerEvents: "none", maxWidth: 380,
      }}>
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type];
          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "12px 16px",
                borderRadius: 12,
                background: s.bg,
                border: `1px solid ${s.border}`,
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                animation: "toastIn 0.3s ease-out",
                cursor: "pointer",
              }}
              onClick={() => removeToast(t.id)}
            >
              {/* Icon */}
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: s.border,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: s.color, flexShrink: 0,
              }}>
                {s.icon}
              </div>
              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: s.color,
                  lineHeight: 1.3,
                }}>
                  {t.message}
                </div>
                {t.detail && (
                  <div style={{
                    fontSize: 11, color: "#8899b4", marginTop: 3,
                    lineHeight: 1.3,
                  }}>
                    {t.detail}
                  </div>
                )}
              </div>
              {/* Close X */}
              <div style={{
                fontSize: 14, color: "#475569", cursor: "pointer",
                flexShrink: 0, marginTop: -2,
              }}>
                ×
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
