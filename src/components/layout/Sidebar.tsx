// src/components/layout/Sidebar.tsx
// Sparks3D Preventivi — Sidebar con supporto tema chiaro/scuro
// ==============================================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import type { PageId } from "../../types";
import { useTheme } from "../../context/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId, preventivoId?: number) => void;
  preventivoAttivo: number | null;
}

interface SlicerStatus {
  nome: string;
  codice: string;
  installato: boolean;
  path: string | null;
  exe_path: string | null;
}

const SLICER_COLORS: Record<string, { main: string; soft: string; text: string }> = {
  bambu: { main: "#34d399", soft: "rgba(52, 211, 153,", text: "#a7d8c4" },
  orca:  { main: "#26a69a", soft: "rgba(38, 166, 154,", text: "#8fd4cc" },
  anycubic: { main: "#42a5f5", soft: "rgba(66, 165, 245,", text: "#90caf9" },
  prusa: { main: "#ed6b21", soft: "rgba(237, 107, 33,", text: "#f0a870" },
};

// ── SVG Icons ──

const icons = {
  dashboard: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  preventivi: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  clienti: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  ritenuta: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  ),
  archivioRitenute: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  ),
  impostazioni: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  backup: (active: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#60a5fa" : "#6b7fa3"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
};

const mainNavItems: { id: PageId; labelKey: string; icon: (active: boolean) => JSX.Element }[] = [
  { id: "dashboard",    labelKey: "sidebar.dashboard",    icon: icons.dashboard },
  { id: "preventivi",   labelKey: "sidebar.preventivi",   icon: icons.preventivi },
  { id: "ritenuta",     labelKey: "sidebar.ritenute",     icon: icons.ritenuta },
  { id: "clienti",      labelKey: "sidebar.clienti",      icon: icons.clienti },
  { id: "backup" as PageId, labelKey: "sidebar.backup",   icon: icons.backup },
  { id: "impostazioni", labelKey: "sidebar.impostazioni", icon: icons.impostazioni },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [slicerStatuses, setSlicerStatuses] = useState<SlicerStatus[]>([]);
  const [slicerChecking, setSlicerChecking] = useState(true);
  const [appVersion, setAppVersion] = useState("");
  const [openingSlicer, setOpeningSlicer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const checkSlicers = async () => {
      try {
        const statuses = await invoke<SlicerStatus[]>("check_slicer_status");
        if (!cancelled) { setSlicerStatuses(statuses); setSlicerChecking(false); }
      } catch (err) {
        console.warn("Errore check slicer:", err);
        if (!cancelled) setSlicerChecking(false);
      }
    };
    checkSlicers();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    invoke<string>("get_app_version").then(v => setAppVersion(v)).catch(() => {});
  }, []);

  const isActive = (id: PageId) => {
    if (id === "preventivi") {
      return ["preventivi", "nuovo-preventivo"].includes(currentPage);
    }
    if (id === "ritenuta") {
      return ["ritenuta", "nuova-ritenuta"].includes(currentPage);
    }
    if (id === "impostazioni") {
      return ["impostazioni", "materiali", "stampanti", "profili", "servizi", "corrieri", "pagamenti", "interfaccia", "sicurezza", "settings-form", "slicer-import"].includes(currentPage);
    }
    return currentPage === id;
  };

  const handleOpenSlicer = async (codice: string) => {
    if (openingSlicer) return;
    setOpeningSlicer(codice);
    try {
      await invoke("open_slicer", { slicerCode: codice });
    } catch (err) {
      console.warn("Errore apertura slicer:", err);
      const label = slicerStatuses.find(s => s.codice === codice)?.nome || "Slicer";
      alert(t("sidebar.cannotOpenSlicer", { label }));
    } finally {
      setTimeout(() => setOpeningSlicer(null), 2000);
    }
  };

  return (
    <aside
      style={{
        width: 260,
        background: isDark
          ? "linear-gradient(180deg, #0c1629 0%, #091120 100%)"
          : "linear-gradient(180deg, #f8f9fb 0%, #f0f2f5 100%)",
        borderRight: isDark
          ? "1px solid rgba(56, 119, 214, 0.12)"
          : "1px solid rgba(0, 0, 0, 0.08)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        flexShrink: 0,
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: "20px 18px 16px", borderBottom: isDark ? "1px solid rgba(56, 119, 214, 0.1)" : "1px solid rgba(0, 0, 0, 0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/app-icon.png"
            alt="Sparks3D"
            style={{
              width: 42, height: 42,
              borderRadius: 12,
              boxShadow: "0 4px 16px rgba(59, 130, 246, 0.35)",
            }}
          />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: isDark ? "#e8edf5" : "#1a1a2e", letterSpacing: -0.2 }}>
              {t("common.appName")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: isDark ? "#556a89" : "#8895a7" }}>{appVersion ? `v${appVersion}` : ""}</span>
            </div>
          </div>
        </div>

        {/* ── Slicer badges (multi-slicer) ── */}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {slicerChecking ? (
            <div style={{ padding: "7px 12px", borderRadius: 8, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative", width: 8, height: 8 }}>
                <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: "#f59e0b", opacity: 0.3, animation: "slicerPing 2s cubic-bezier(0,0,0.2,1) infinite" }} />
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", boxShadow: "0 0 6px rgba(245,158,11,0.5)" }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#d4a853" }}>{t("sidebar.slicerChecking")}</span>
            </div>
          ) : (
            slicerStatuses.map((slicer) => {
              const colors = SLICER_COLORS[slicer.codice] || SLICER_COLORS.bambu;
              const isOpening = openingSlicer === slicer.codice;
              const dotColor = slicer.installato ? colors.main : "#f87171";
              const bgColor = slicer.installato ? `${colors.soft}0.06)` : "rgba(248,113,113,0.06)";
              const borderColor = slicer.installato ? `${colors.soft}0.15)` : "rgba(248,113,113,0.15)";
              return (
                <div key={slicer.codice}
                  title={slicer.installato ? `${slicer.nome} — Clicca per aprire` : `${slicer.nome} non trovato`}
                  onClick={() => slicer.installato && handleOpenSlicer(slicer.codice)}
                  style={{ padding: "7px 12px", borderRadius: 8, background: bgColor, border: `1px solid ${borderColor}`, display: "flex", alignItems: "center", gap: 8, cursor: slicer.installato ? "pointer" : "default", transition: "all 0.3s ease", opacity: isOpening ? 0.6 : 1 }}
                  onMouseEnter={(e) => { if (slicer.installato) { e.currentTarget.style.background = `${colors.soft}0.12)`; e.currentTarget.style.borderColor = `${colors.soft}0.3)`; } }}
                  onMouseLeave={(e) => { if (slicer.installato) { e.currentTarget.style.background = bgColor; e.currentTarget.style.borderColor = borderColor; } }}
                >
                  <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                    {slicer.installato && <div style={{ position: "absolute", inset: -2, borderRadius: "50%", background: dotColor, opacity: 0.3, animation: "slicerPing 2s cubic-bezier(0,0,0.2,1) infinite" }} />}
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, boxShadow: `0 0 6px ${slicer.installato?`${colors.soft}0.5)`:"rgba(248,113,113,0.5)"}`, position: "relative" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: slicer.installato ? colors.text : "#d4868a" }}>{slicer.nome}</span>
                    <span style={{ fontSize: 10, color: "#556a89", marginLeft: 6 }}>{slicer.installato ? t("sidebar.installed") : t("sidebar.notFound")}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={slicer.installato ? colors.main : "#f87171"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    {slicer.installato ? (<><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>) : (<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>)}
                  </svg>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Menu label ── */}
      <div style={{ padding: "16px 18px 4px" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 1.2, color: isDark ? "#3d5170" : "#9ca3af",
        }}>
          {t("sidebar.menu")}
        </span>
      </div>

      {/* ── Navigazione ── */}
      <nav style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {mainNavItems.map((item) => {
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                width: "100%", padding: "10px 14px",
                borderRadius: 10, border: "none",
                cursor: "pointer", transition: "all 0.2s",
                background: active
                  ? isDark
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%)"
                    : "linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)"
                  : "transparent",
                boxShadow: active
                  ? isDark
                    ? "inset 0 0 0 1px rgba(59, 130, 246, 0.2)"
                    : "inset 0 0 0 1px rgba(14, 165, 233, 0.15)"
                  : "none",
                position: "relative",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = isDark ? "rgba(59, 130, 246, 0.06)" : "rgba(14, 165, 233, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {/* Active indicator bar */}
              {active && (
                <div style={{
                  position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 20, borderRadius: "0 4px 4px 0",
                  background: "#3b82f6",
                  boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
                }} />
              )}

              {item.icon(active)}

              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? (isDark ? "#e8edf5" : "#0c4a6e") : (isDark ? "#7a8daa" : "#64748b"),
                transition: "color 0.2s",
              }}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Theme Toggle ── */}
      <ThemeToggle />

      {/* ── Info links (sopra il footer) ── */}
      <div style={{ padding: "4px 10px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {([
          { id: "guida" as PageId, label: t("sidebar.guida"), icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          )},
          { id: "licenza" as PageId, label: t("sidebar.licenza"), icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )},
        ]).map(item => {
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "7px 14px",
                borderRadius: 8, border: "none",
                cursor: "pointer", transition: "all 0.2s",
                background: active
                  ? isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(14, 165, 233, 0.08)"
                  : "transparent",
                color: active
                  ? isDark ? "#60a5fa" : "#0284c7"
                  : isDark ? "#4a5e7a" : "#94a3b8",
                fontSize: 12, fontWeight: 500,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = isDark ? "#8899b4" : "#475569"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = isDark ? "#4a5e7a" : "#94a3b8"; }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 18px", borderTop: isDark ? "1px solid rgba(56, 119, 214, 0.08)" : "1px solid rgba(0, 0, 0, 0.06)",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <span style={{ fontSize: 10, color: isDark ? "#9ca3af" : "#6b7280", lineHeight: 1.4 }}>
          {t("sidebar.footer")}
        </span>
        <span style={{ fontSize: 9, color: isDark ? "#6b7280" : "#9ca3af" }}>
          {t("sidebar.footerRights")}
        </span>
      </div>

      {/* ── CSS Animation per ping dot ── */}
      <style>{`
        @keyframes slicerPing {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(2); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </aside>
  );
}
