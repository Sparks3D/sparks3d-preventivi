// src/components/layout/UpdateBanner.tsx
// Sparks3D Preventivi – Notifica aggiornamento disponibile
// ==========================================================

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";

interface UpdateInfo {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  download_url: string;
  release_notes: string;
  release_date: string;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [, setChecking] = useState(false);

  useEffect(() => {
    // Check dopo 5 secondi dall'avvio (non blocca il caricamento)
    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const info = await invoke<UpdateInfo>("check_for_updates");
        if (info.update_available) {
          setUpdate(info);
        }
      } catch (err) {
        console.warn("Check aggiornamenti fallito:", err);
      } finally {
        setChecking(false);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!update || dismissed) return null;

  return (
    <div style={{
      margin: "0 0 16px",
      padding: "14px 20px",
      borderRadius: 12,
      background: "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(168,85,247,0.06) 100%)",
      border: "1px solid rgba(59,130,246,0.2)",
      display: "flex",
      alignItems: "center",
      gap: 14,
      animation: "fadeIn 0.4s ease-out",
    }}>
      {/* Icona */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "rgba(59,130,246,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>

      {/* Testo */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
          Nuova versione disponibile: v{update.latest_version}
        </div>
        <div style={{ fontSize: 12, color: "#6b7fa0", marginTop: 2 }}>
          Versione attuale: v{update.current_version}
          {update.release_date && ` · Rilasciata il ${update.release_date}`}
        </div>
        {update.release_notes && (
          <div style={{
            fontSize: 12, color: "#8899b4", marginTop: 6,
            maxHeight: 40, overflow: "hidden", lineHeight: 1.4,
          }}>
            {update.release_notes.split('\n')[0]}
          </div>
        )}
      </div>

      {/* Bottoni */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {update.download_url && (
          <button
            onClick={async () => {
              try { await open(update.download_url); } catch { window.open(update.download_url, "_blank"); }
            }}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #2563eb, #3b82f6)",
              color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 2px 8px rgba(59,130,246,0.3)",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Scarica
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          style={{
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#6b7fa0", fontSize: 12, fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Dopo
        </button>
      </div>
    </div>
  );
}
