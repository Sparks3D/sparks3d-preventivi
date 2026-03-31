// src/components/layout/UpdateBanner.tsx
// Sparks3D Preventivi — Banner aggiornamento automatico

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface UpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
}

type BannerState = "idle" | "available" | "installing" | "error";

export function UpdateBanner() {
  const { t } = useTranslation();
  const [state, setState] = useState<BannerState>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Controlla aggiornamenti all'avvio (silenzioso)
  useEffect(() => {
    const check = async () => {
      try {
        const info = await invoke<UpdateInfo | null>("check_for_updates");
        if (info) {
          setUpdateInfo(info);
          setState("available");
        }
      } catch {
        // Fallimento silenzioso — nessun banner in caso di errore di rete
      }
    };

    // Piccolo ritardo per non appesantire l'avvio
    const timer = setTimeout(check, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleInstall = async () => {
    setState("installing");
    try {
      await invoke("install_update");
      // L'app si riavvia automaticamente dopo l'installazione
    } catch (e: any) {
      setErrorMsg(e?.message || t("update.updateError"));
      setState("error");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (dismissed || state === "idle") return null;

  // Banner errore
  if (state === "error") {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 18px", marginBottom: 16,
        background: "rgba(244,63,94,0.08)",
        border: "1px solid rgba(244,63,94,0.3)",
        borderRadius: 12, fontSize: 13, color: "#f87171",
      }}>
        <span>⚠️ {t("update.error", { message: errorMsg })}</span>
        <button onClick={handleDismiss} style={btnDismissStyle}>✕</button>
      </div>
    );
  }

  // Banner installazione in corso
  if (state === "installing") {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 18px", marginBottom: 16,
        background: "rgba(59,130,246,0.08)",
        border: "1px solid rgba(59,130,246,0.3)",
        borderRadius: 12, fontSize: 13, color: "#60a5fa",
      }}>
        <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
        <span>{t("update.installing")}</span>
      </div>
    );
  }

  // Banner aggiornamento disponibile
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 16, padding: "12px 18px", marginBottom: 16,
      background: "rgba(34,197,94,0.08)",
      border: "1px solid rgba(34,197,94,0.3)",
      borderRadius: 12, fontSize: 13,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#4ade80" }}>
        <span style={{ fontSize: 16 }}>🆕</span>
        <span>
          <strong>{t("update.available")}</strong> {t("update.version")}{" "}
          <strong>{updateInfo?.version}</strong> {t("update.ready")}
          {updateInfo?.body && (
            <span style={{ color: "#86efac", marginLeft: 8 }}>— {updateInfo.body}</span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={handleInstall} style={btnInstallStyle}>
          {t("update.installNow")}
        </button>
        <button onClick={handleDismiss} style={btnDismissStyle}>
          {t("update.skip")}
        </button>
      </div>
    </div>
  );
}

const btnInstallStyle: React.CSSProperties = {
  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
  background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)",
  color: "#4ade80", cursor: "pointer", transition: "all 0.2s",
};

const btnDismissStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
  background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
  color: "#556a89", cursor: "pointer", transition: "all 0.2s",
};
