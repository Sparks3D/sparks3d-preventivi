// src/components/layout/Sidebar.tsx
// Sparks3D Preventivi — Premium Dark Sidebar
// ============================================

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PageId } from "../../types";

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId, preventivoId?: number) => void;
  preventivoAttivo: number | null;
}

interface NavItem {
  id: PageId;
  label: string;
  icon: (active: boolean) => JSX.Element;
}

interface SlicerStatus {
  nome: string;
  installato: boolean;
  path: string | null;
  exe_path: string | null;
  versione: string | null;
}

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

const mainNav: NavItem[] = [
  { id: "dashboard",    label: "Dashboard",          icon: icons.dashboard },
  { id: "preventivi",   label: "Preventivi",         icon: icons.preventivi },
  { id: "ritenuta",     label: "Ritenuta / Ricevute", icon: icons.ritenuta },
  { id: "archivio-ritenute" as PageId, label: "Archivio Ritenute", icon: icons.archivioRitenute },
  { id: "clienti",      label: "Clienti",            icon: icons.clienti },
  { id: "backup" as PageId, label: "Backup / Ripristino", icon: icons.backup },
  { id: "impostazioni", label: "Impostazioni",       icon: icons.impostazioni },
];

export function Sidebar({ currentPage, onNavigate, preventivoAttivo }: SidebarProps) {
  const [slicerStatus, setSlicerStatus] = useState<SlicerStatus>({
    nome: "Bambu Studio",
    installato: false,
    path: null,
    exe_path: null,
    versione: null,
  });
  const [slicerChecking, setSlicerChecking] = useState(true);

  // ── Rileva Bambu Studio al mount ──
  useEffect(() => {
    let cancelled = false;
    const checkSlicer = async () => {
      try {
        const status = await invoke<SlicerStatus>("check_slicer_status");
        if (!cancelled) {
          setSlicerStatus(status);
          setSlicerChecking(false);
        }
      } catch (err) {
        console.warn("Errore check slicer:", err);
        if (!cancelled) {
          setSlicerStatus(prev => ({ ...prev, installato: false }));
          setSlicerChecking(false);
        }
      }
    };
    checkSlicer();
    return () => { cancelled = true; };
  }, []);

  const isActive = (id: PageId) => {
    if (id === "preventivi") {
      return ["preventivi", "nuovo-preventivo"].includes(currentPage);
    }
    if (id === "impostazioni") {
      return ["impostazioni", "materiali", "stampanti", "profili", "servizi", "corrieri", "pagamenti", "interfaccia"].includes(currentPage);
    }
    return currentPage === id;
  };

  // ── Colore e tooltip del dot slicer ──
  const slicerDotColor = slicerChecking
    ? "#f59e0b"  // giallo = verificando
    : slicerStatus.installato
      ? "#34d399"  // verde = trovato
      : "#f87171"; // rosso = non trovato

  const slicerDotShadow = slicerChecking
    ? "0 0 6px rgba(245, 158, 11, 0.5)"
    : slicerStatus.installato
      ? "0 0 6px rgba(52, 211, 153, 0.5)"
      : "0 0 6px rgba(248, 113, 113, 0.5)";

  const slicerTooltip = slicerChecking
    ? "Verifica in corso..."
    : slicerStatus.installato
      ? `${slicerStatus.nome} rilevato${slicerStatus.versione ? ` (${slicerStatus.versione})` : ""} — Clicca per aprire`
      : `${slicerStatus.nome} non trovato`;

  const [slicerOpening, setSlicerOpening] = useState(false);

  const handleOpenSlicer = async () => {
    if (!slicerStatus.installato || slicerChecking || slicerOpening) return;
    setSlicerOpening(true);
    try {
      await invoke("open_slicer");
    } catch (err) {
      console.warn("Errore apertura slicer:", err);
      alert("Impossibile aprire Bambu Studio. Verifica l'installazione.");
    } finally {
      setTimeout(() => setSlicerOpening(false), 2000);
    }
  };

  return (
    <aside
      style={{
        width: 260,
        background: "linear-gradient(180deg, #0c1629 0%, #091120 100%)",
        borderRight: "1px solid rgba(56, 119, 214, 0.12)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        flexShrink: 0,
      }}
    >
      {/* ── Logo ── */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(56, 119, 214, 0.1)" }}>
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
            <div style={{ fontWeight: 700, fontSize: 14, color: "#e8edf5", letterSpacing: -0.2 }}>
              Sparks3D
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: "#556a89" }}>v1.0.0</span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                padding: "1px 7px", borderRadius: 4,
                background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa",
              }}>
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* ── Slicer badge (FUNZIONALE + CLICCABILE) ── */}
        <div
          title={slicerTooltip}
          onClick={handleOpenSlicer}
          style={{
            marginTop: 14, padding: "7px 12px", borderRadius: 8,
            background: slicerStatus.installato
              ? "rgba(52, 211, 153, 0.06)"
              : slicerChecking
                ? "rgba(245, 158, 11, 0.06)"
                : "rgba(248, 113, 113, 0.06)",
            border: `1px solid ${slicerStatus.installato
              ? "rgba(52, 211, 153, 0.15)"
              : slicerChecking
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(248, 113, 113, 0.15)"}`,
            display: "flex", alignItems: "center", gap: 8,
            cursor: slicerStatus.installato ? "pointer" : "default",
            transition: "all 0.3s ease",
            opacity: slicerOpening ? 0.6 : 1,
          }}
          onMouseEnter={(e) => {
            if (slicerStatus.installato) {
              e.currentTarget.style.background = "rgba(52, 211, 153, 0.12)";
              e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (slicerStatus.installato) {
              e.currentTarget.style.background = "rgba(52, 211, 153, 0.06)";
              e.currentTarget.style.borderColor = "rgba(52, 211, 153, 0.15)";
            }
          }}
        >
          {/* Dot con animazione pulsante */}
          <div style={{ position: "relative", width: 8, height: 8 }}>
            {/* Ping animation (solo se installato o checking) */}
            {(slicerStatus.installato || slicerChecking) && (
              <div style={{
                position: "absolute", inset: -2,
                borderRadius: "50%",
                background: slicerDotColor,
                opacity: 0.3,
                animation: "slicerPing 2s cubic-bezier(0, 0, 0.2, 1) infinite",
              }} />
            )}
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: slicerDotColor,
              boxShadow: slicerDotShadow,
              position: "relative",
              transition: "all 0.5s ease",
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: slicerStatus.installato ? "#a7d8c4" : slicerChecking ? "#d4a853" : "#d4868a",
              transition: "color 0.3s",
            }}>
              {slicerStatus.nome}
            </span>
            {/* Mostra versione o stato */}
            {!slicerChecking && (
              <span style={{
                fontSize: 10, color: "#556a89", marginLeft: 6,
              }}>
                {slicerStatus.installato
                  ? (slicerStatus.versione ? `v${slicerStatus.versione}` : "Rilevato")
                  : "Non trovato"
                }
              </span>
            )}
            {slicerChecking && (
              <span style={{ fontSize: 10, color: "#556a89", marginLeft: 6 }}>
                Verifica...
              </span>
            )}
          </div>

          {/* Icona stato */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={slicerStatus.installato ? "#34d399" : slicerChecking ? "#f59e0b" : "#f87171"}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            {slicerStatus.installato ? (
              // External link / open icon
              <>
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </>
            ) : slicerChecking ? (
              // Clock
              <>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </>
            ) : (
              // X mark
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            )}
          </svg>
        </div>
      </div>

      {/* ── Menu label ── */}
      <div style={{ padding: "16px 18px 4px" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 1.2, color: "#3d5170",
        }}>
          Menu
        </span>
      </div>

      {/* ── Navigazione ── */}
      <nav style={{ flex: 1, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {mainNav.map((item) => {
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
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.06) 100%)"
                  : "transparent",
                boxShadow: active ? "inset 0 0 0 1px rgba(59, 130, 246, 0.2)" : "none",
                position: "relative",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.06)";
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
                color: active ? "#e8edf5" : "#7a8daa",
                transition: "color 0.2s",
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Preventivo attivo ── */}
      {preventivoAttivo && (
        <div style={{
          margin: "0 10px 8px",
          padding: 14, borderRadius: 12,
          background: "rgba(59, 130, 246, 0.06)",
          border: "1px solid rgba(59, 130, 246, 0.15)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "#3d5170", marginBottom: 8 }}>
            Preventivo attivo
          </div>
          <button
            onClick={() => onNavigate("nuovo-preventivo", preventivoAttivo)}
            style={{
              width: "100%", padding: "8px 12px",
              borderRadius: 8, border: "1px solid rgba(59, 130, 246, 0.25)",
              background: "rgba(59, 130, 246, 0.1)",
              color: "#60a5fa", fontWeight: 700, fontSize: 13,
              cursor: "pointer", transition: "all 0.2s",
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              textAlign: "left",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.18)";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.25)";
            }}
          >
            #{preventivoAttivo}
          </button>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            marginTop: 8, fontSize: 11, color: "#34d399",
          }}>
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#34d399",
              boxShadow: "0 0 6px rgba(52, 211, 153, 0.6)",
            }} />
            Salvataggio automatico
          </div>
        </div>
      )}

      {/* ── Info links (sopra il footer) ── */}
      <div style={{ padding: "4px 10px 0", display: "flex", flexDirection: "column", gap: 2 }}>
        {([
          { id: "guida" as PageId, label: "Guida utente", icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
            </svg>
          )},
          { id: "licenza" as PageId, label: "Licenza e info", icon: (
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
                background: active ? "rgba(59, 130, 246, 0.08)" : "transparent",
                color: active ? "#60a5fa" : "#4a5e7a",
                fontSize: 12, fontWeight: 500,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "#8899b4"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "#4a5e7a"; }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: "10px 18px", borderTop: "1px solid rgba(56, 119, 214, 0.08)",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <span style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.4 }}>
          CC BY-NC-ND 4.0 — Sparks3D.it
        </span>
        <span style={{ fontSize: 9, color: "#6b7280" }}>
          2025/2026 — Alcuni diritti riservati
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
