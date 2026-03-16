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

interface Props {
  tipo: "filament" | "machine" | "process";
  onSelect: (profile: SlicerProfile) => void;
  onClose: () => void;
}

export function SlicerProfilePicker({ tipo, onSelect, onClose }: Props) {
  const [profiles, setProfiles] = useState<SlicerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soloUtente, setSoloUtente] = useState(false);
  const [isBeta, setIsBeta] = useState(false);

  const tipoLabel = tipo === "filament" ? "Profili filamento" : tipo === "machine" ? "Profili stampante" : "Profili di stampa";

  useEffect(() => {
    loadProfiles();
  }, [soloUtente, isBeta]);

  const loadProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<SlicerProfile[]>("scan_slicer_profiles", {
        tipo, isBeta, soloUtente,
      });
      setProfiles(data);
      if (data.length === 0) {
        setError("Nessun profilo trovato. Verifica che Bambu Studio sia installato e abbia profili salvati.");
      }
    } catch (e: any) {
      setError(String(e));
    }
    setLoading(false);
  };

  const filtered = profiles.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 640, margin: "0 16px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottom: "1px solid var(--border-subtle)" }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
              Importa da Bambu Studio
            </h3>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{tipoLabel}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer" }}>x</button>
        </div>

        {/* Toolbar */}
        <div style={{ padding: 16, borderBottom: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca profilo per nome..."
            className="s3d-input"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={soloUtente} onChange={(e) => setSoloUtente(e.target.checked)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Solo profili utente (no integrati BBL)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBeta} onChange={(e) => setIsBeta(e.target.checked)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Bambu Studio Beta</span>
            </label>
            <button onClick={loadProfiles} style={{ fontSize: 11, color: "var(--accent)", cursor: "pointer", marginLeft: "auto", background: "none", border: "none", fontWeight: 600 }}>
              Ricarica
            </button>
          </div>
        </div>

        {/* Lista profili */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>Scansione profili in corso...</div>
          ) : error && filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-amber-600 dark:text-amber-400 text-sm">{error}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
                Percorsi cercati: %APPDATA%/BambuStudio/ e %ProgramFiles%/Bambu Studio/
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((profile, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(profile)}
                  style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderRadius: 10, transition: "background 0.2s", cursor: "pointer", background: "transparent", border: "none" }}
                >
                  <div className="flex items-center justify-between">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                        background: profile.is_user ? "var(--green-soft)" : "var(--bg-surface)",
                        color: profile.is_user ? "var(--green)" : "var(--text-muted)",
                      }}>
                        {profile.is_user ? "Utente" : "BBL"}
                      </span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                        {profile.nome}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--accent)" }}>
                      Importa
                    </span>
                  </div>
                  {/* Extra info based on type */}
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                    {tipo === "filament" && (
                      <>
                        {profile.params.filament_type && <span>Tipo: {String(profile.params.filament_type)}</span>}
                        {profile.params.filament_density && <span>Densita: {String(profile.params.filament_density)} g/cm3</span>}
                        {profile.params.filament_cost && Number(profile.params.filament_cost) > 0 && (
                          <span>Costo: {String(profile.params.filament_cost)} EUR/kg</span>
                        )}
                      </>
                    )}
                    {tipo === "process" && (
                      <>
                        {profile.params.layer_height && <span>Layer: {String(profile.params.layer_height)}mm</span>}
                        {profile.params.wall_loops && <span>Pareti: {String(profile.params.wall_loops)}</span>}
                        {profile.params.sparse_infill_density && <span>Infill: {String(profile.params.sparse_infill_density)}</span>}
                      </>
                    )}
                    {tipo === "machine" && (
                      <>
                        {profile.params.printer_model && <span>Modello: {String(profile.params.printer_model)}</span>}
                        {profile.params.nozzle_diameter && <span>Nozzle: {String(profile.params.nozzle_diameter)}mm</span>}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: 16, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {filtered.length} profili trovati
          </span>
          <button onClick={onClose} className="s3d-btn s3d-btn-ghost">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
