// src/components/impostazioni/SlicerImportPage.tsx
// Sparks3D Preventivi — Pagina importazione profili slicer
// =========================================================

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SlicerProfile {
  nome: string;
  path: string;
  tipo: string;
  origin: string;
  is_user: boolean;
  params: Record<string, any>;
}

interface SlicerStatus {
  nome: string;
  codice: string;
  installato: boolean;
  path: string | null;
  exe_path: string | null;
}

interface Props {
  tipo: "filament" | "machine" | "process";
  defaultSlicer: "bambu" | "orca";
  onSelect: (profile: SlicerProfile) => void;
  onBack: () => void;
}

const SLICER_TABS = [
  { codice: "bambu", label: "Bambu Studio", color: "#00ae42", icon: "🟢" },
  { codice: "orca", label: "Orca Slicer", color: "#009688", icon: "🐋" },
];

export function SlicerImportPage({ tipo, defaultSlicer, onSelect, onBack }: Props) {
  const [profiles, setProfiles] = useState<SlicerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soloUtente, setSoloUtente] = useState(false);
  const [isBeta, setIsBeta] = useState(false);
  const [activeSlicer, setActiveSlicer] = useState(defaultSlicer);
  const [slicerStatuses, setSlicerStatuses] = useState<SlicerStatus[]>([]);

  const tipoLabel = tipo === "filament" ? "Profili filamento"
    : tipo === "machine" ? "Profili stampante"
    : "Profili di stampa";

  const tipoPageLabel = tipo === "filament" ? "Materiali"
    : tipo === "machine" ? "Stampanti"
    : "Profili di stampa";

  const activeTab = SLICER_TABS.find(t => t.codice === activeSlicer) || SLICER_TABS[0];

  useEffect(() => {
    invoke<SlicerStatus[]>("check_slicer_status").then(statuses => {
      setSlicerStatuses(statuses);
      const currentInstalled = statuses.find(s => s.codice === activeSlicer)?.installato;
      if (!currentInstalled) {
        const firstInstalled = statuses.find(s => s.installato);
        if (firstInstalled) setActiveSlicer(firstInstalled.codice as "bambu" | "orca");
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [soloUtente, isBeta, activeSlicer]);

  const loadProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<SlicerProfile[]>("scan_slicer_profiles", {
        tipo,
        isBeta: activeSlicer === "bambu" ? isBeta : false,
        soloUtente,
        slicerType: activeSlicer,
      });
      setProfiles(data);
      if (data.length === 0) {
        setError(`Nessun profilo trovato. Verifica che ${activeTab.label} sia installato e abbia profili salvati.`);
      }
    } catch (e: any) {
      setError(String(e));
    }
    setLoading(false);
  };

  const filtered = profiles.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const getSlicerStatus = (codice: string) =>
    slicerStatuses.find(s => s.codice === codice);

  return (
    <div className="animate-fade-in">
      {/* Header con breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "none", border: "none", color: "var(--text-muted)",
          fontSize: 13, cursor: "pointer", padding: "6px 0",
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Torna a {tipoPageLabel}
        </button>
      </div>

      <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
        Importa profili slicer
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        {tipoLabel} — Seleziona un profilo per importarlo in {tipoPageLabel}
      </p>

      {/* Slicer tabs */}
      <div style={{
        display: "flex", gap: 0, marginBottom: 20,
        borderRadius: 12, overflow: "hidden",
        border: "1px solid var(--border-subtle)",
      }}>
        {SLICER_TABS.map(tab => {
          const status = getSlicerStatus(tab.codice);
          const isActive = activeSlicer === tab.codice;
          const isInstalled = status?.installato ?? false;
          return (
            <button
              key={tab.codice}
              onClick={() => { if (isInstalled) setActiveSlicer(tab.codice as "bambu" | "orca"); }}
              disabled={!isInstalled}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "14px 20px",
                background: isActive ? "var(--bg-card)" : "var(--bg-surface)",
                border: "none",
                borderBottom: isActive ? `3px solid ${tab.color}` : "3px solid transparent",
                color: !isInstalled ? "var(--text-muted)" : isActive ? "var(--text-primary)" : "var(--text-secondary)",
                cursor: isInstalled ? "pointer" : "not-allowed",
                opacity: isInstalled ? 1 : 0.5,
                transition: "all 0.2s",
                fontSize: 14, fontWeight: isActive ? 700 : 500,
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {isInstalled ? (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: `${tab.color}22`, color: tab.color, fontWeight: 600,
                }}>
                  ✓
                </span>
              ) : (
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 6,
                  background: "var(--bg-surface)", color: "var(--text-muted)", fontWeight: 600,
                }}>
                  Non installato
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="s3d-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={`Cerca profilo ${activeTab.label}...`}
            className="s3d-input" style={{ flex: 1 }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
            <input
              type="checkbox" checked={soloUtente}
              onChange={(e) => setSoloUtente(e.target.checked)}
              style={{ width: 16, height: 16, borderRadius: 4, accentColor: activeTab.color }}
            />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Solo utente</span>
          </label>
          {activeSlicer === "bambu" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" }}>
              <input
                type="checkbox" checked={isBeta}
                onChange={(e) => setIsBeta(e.target.checked)}
                style={{ width: 16, height: 16, borderRadius: 4, accentColor: activeTab.color }}
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Beta</span>
            </label>
          )}
          <button onClick={loadProfiles} style={{
            fontSize: 12, color: activeTab.color, cursor: "pointer",
            background: "none", border: "none", fontWeight: 600,
          }}>
            Ricarica
          </button>
        </div>
      </div>

      {/* Contatore risultati */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {loading ? "Scansione in corso..." : `${filtered.length} profili ${activeTab.label}`}
        </span>
      </div>

      {/* Lista profili */}
      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ marginBottom: 8 }}>Scansione profili {activeTab.label} in corso...</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.6 }}>
              {activeSlicer === "bambu"
                ? "Percorso: %APPDATA%\\BambuStudio\\"
                : "Percorso: %APPDATA%\\OrcaSlicer\\"
              }
            </div>
          </div>
        ) : error && filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "var(--orange)", marginBottom: 8 }}>{error}</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {activeSlicer === "bambu"
                ? "Percorsi cercati: %APPDATA%\\BambuStudio\\ e %ProgramFiles%\\Bambu Studio\\"
                : "Percorsi cercati: %APPDATA%\\OrcaSlicer\\ e %ProgramFiles%\\OrcaSlicer\\"
              }
            </p>
          </div>
        ) : (
          <table className="s3d-table">
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ width: 80 }}>Origine</th>
                <th>Nome profilo</th>
                {tipo === "filament" && <><th>Tipo</th><th>Densità</th><th>Costo</th><th>Nozzle</th></>}
                {tipo === "process" && <><th>Layer</th><th>Pareti</th><th>Infill</th><th>Supporti</th></>}
                {tipo === "machine" && <><th>Modello</th><th>Nozzle</th><th>Altezza</th></>}
                <th style={{ textAlign: "right", width: 100 }}>Azione</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((profile, idx) => (
                <tr key={idx} style={{ cursor: "pointer" }} onClick={() => onSelect(profile)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                        background: profile.is_user ? "var(--green-soft)" : "var(--bg-surface)",
                        color: profile.is_user ? "var(--green)" : "var(--text-muted)",
                      }}>
                        {profile.is_user ? "Utente" : (activeSlicer === "bambu" ? "BBL" : "ORC")}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{profile.nome}</span>
                  </td>
                  {tipo === "filament" && (
                    <>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.filament_type ? String(profile.params.filament_type) : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.filament_density ? `${String(profile.params.filament_density)} g/cm³` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.filament_cost && Number(profile.params.filament_cost) > 0
                          ? `${String(profile.params.filament_cost)} €/kg` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.nozzle_temperature ? `${String(profile.params.nozzle_temperature)}°C` : "—"}
                      </td>
                    </>
                  )}
                  {tipo === "process" && (
                    <>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.layer_height ? `${String(profile.params.layer_height)}mm` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.wall_loops ? String(profile.params.wall_loops) : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.sparse_infill_density ? String(profile.params.sparse_infill_density) : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.enable_support && String(profile.params.enable_support) === "1" ? "Sì" : "No"}
                      </td>
                    </>
                  )}
                  {tipo === "machine" && (
                    <>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.printer_model ? String(profile.params.printer_model) : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.nozzle_diameter ? `${String(profile.params.nozzle_diameter)}mm` : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                        {profile.params.printable_height ? `${String(profile.params.printable_height)}mm` : "—"}
                      </td>
                    </>
                  )}
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(profile); }}
                      style={{
                        background: "none", border: "none",
                        color: activeTab.color, fontSize: 12,
                        fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Importa →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
