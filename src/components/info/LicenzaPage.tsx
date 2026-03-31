// src/components/info/LicenzaPage.tsx
// Sparks3D Preventivi – Licenza CC BY-NC-ND 4.0 + Donazione
// ============================================================

import { open } from "@tauri-apps/plugin-shell";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

export function LicenzaPage() {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState("");

  useEffect(() => {
    invoke<string>("get_app_version").then(v => setAppVersion(v)).catch(() => {});
  }, []);

  const openLink = async (url: string) => {
    try { await open(url); } catch { window.open(url, "_blank"); }
  };

  return (
    <div style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ═══ HEADER ═══ */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <img src="/app-icon.png" alt="Sparks3D" style={{ width: 56, height: 56, borderRadius: 14 }} />
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{t("common.appName")}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: "#556a89" }}>{appVersion ? `v${appVersion}` : ""}</span>
          </div>
        </div>
      </div>

      {/* ═══ LICENZA ═══ */}
      <div style={cardStyle}>
        <div style={titleStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9.354a4 4 0 10-2.646 7.093" />
            <path d="M9 15l-1 3 2.5-1.5L13 18l-1-3" />
          </svg>
          {t("licenza.title")}
        </div>

        <div style={{
          padding: "16px 20px", borderRadius: 12,
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.12)",
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#60a5fa", marginBottom: 8 }}>
            {t("licenza.ccLabel")}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#8899b4" }}>
            {t("licenza.ccBadge")}
          </div>
        </div>

        <div style={{ fontSize: 14, color: "#b8c5db", lineHeight: 1.7, marginBottom: 20 }}>
          {t("licenza.intro")}
        </div>

        {/* Cosa puoi fare */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t("licenza.canDoTitle")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 24 }}>
            {[
              t("licenza.canDo1"),
              t("licenza.canDo2"),
              t("licenza.canDo3"),
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cosa NON puoi fare */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            {t("licenza.cannotDoTitle")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 24 }}>
            {[
              t("licenza.cannotDo1"),
              t("licenza.cannotDo2"),
              t("licenza.cannotDo3"),
              t("licenza.cannotDo4"),
              t("licenza.cannotDo5"),
            ].map((text, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171", marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Attribuzione */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {t("licenza.attributionTitle")}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, paddingLeft: 24 }}>
            {t("licenza.attributionText")}
          </div>
        </div>

        <button
          onClick={() => openLink("https://creativecommons.org/licenses/by-nc-nd/4.0/deed.it")}
          style={{
            padding: "10px 20px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#60a5fa", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {t("licenza.readFull")}
        </button>
      </div>

      {/* ═══ AUTORE ═══ */}
      <div style={cardStyle}>
        <div style={titleStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          {t("licenza.authorTitle")}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={infoBox}>
            <div style={{ fontSize: 11, color: "#556a89", marginBottom: 4 }}>{t("licenza.developedBy")}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e8edf5" }}>{t("licenza.author")}</div>
          </div>
          <div style={infoBox}>
            <div style={{ fontSize: 11, color: "#556a89", marginBottom: 4 }}>{t("licenza.website")}</div>
            <div
              style={{ fontSize: 14, fontWeight: 600, color: "#60a5fa", cursor: "pointer" }}
              onClick={() => openLink("https://www.sparks3d.it")}
            >
              {t("licenza.websiteUrl")}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 13, color: "#6b7fa0", marginTop: 16, lineHeight: 1.5 }}>
          {t("licenza.appDescription")}
        </div>
      </div>

      {/* ═══ DONAZIONE ═══ */}
      <div style={{
        ...cardStyle,
        background: "linear-gradient(135deg, rgba(251,191,36,0.06) 0%, rgba(245,158,11,0.04) 100%)",
        border: "1px solid rgba(251,191,36,0.15)",
      }}>
        <div style={{
          ...titleStyle,
          color: "#fbbf24",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          {t("licenza.supportTitle")}
        </div>

        <div style={{ fontSize: 14, color: "#b8c5db", lineHeight: 1.7, marginBottom: 20 }}>
          {t("licenza.supportText")}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => openLink("https://buymeacoffee.com/Sparks3D.it")}
            style={{
              padding: "12px 28px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
              color: "#1a1a2e", fontSize: 15, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
              boxShadow: "0 4px 16px rgba(251,191,36,0.3)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
            </svg>
            {t("licenza.buyMeACoffee")}
          </button>
          <span style={{ fontSize: 12, color: "#6b7fa0" }}>
            {t("licenza.anyAmount")}
          </span>
        </div>
      </div>

      {/* ═══ COPYRIGHT ═══ */}
      <div style={{ textAlign: "center", padding: "8px 0 16px", color: "#475569", fontSize: 12 }}>
        {t("licenza.footer")}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 24,
};

const titleStyle: React.CSSProperties = {
  fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 16,
  display: "flex", alignItems: "center", gap: 10,
};

const infoBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  padding: "12px 16px",
};
