// src/components/preventivi/SliceFileImporter.tsx
// Sparks3D Preventivi – Importa dati da file GCode / 3MF
// ========================================================

import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface SliceData {
  tempo_stampa_sec: number;
  tempo_stampa_display: string;
  peso_totale_grammi: number;
  filamento_mm: number;
  filamento_cm3: number;
  filamento_tipo: string;
  filamento_densita: number;
  filamento_costo: number;
  nome_file: string;
  slicer: string;
  materiali: SliceFilamentInfo[];
}

export interface SliceFilamentInfo {
  slot: number;
  tipo: string;
  colore: string;
  peso_grammi: number;
  lunghezza_mm: number;
  densita: number;
}

interface Props {
  onImport: (data: SliceData) => void;
  compact?: boolean;
}

const formatTempo = (sec: number) => {
  if (sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export function SliceFileImporter({ onImport, compact }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SliceData | null>(null);

  const handleImport = async () => {
    try {
      setLoading(true); setError("");
      const selected = await open({
        multiple: false,
        filters: [{ name: "File di stampa 3D", extensions: ["gcode", "gco", "g", "3mf"] }],
      });
      if (!selected) { setLoading(false); return; }
      const filePath = selected as string;
      const result = await invoke<SliceData>("parse_slice_file", { filePath });
      setData(result);
      onImport(result);
    } catch (e: any) { setError(String(e)); } finally { setLoading(false); }
  };

  if (compact) {
    return (
      <div>
        <button onClick={handleImport} disabled={loading}
          className="s3d-btn s3d-btn-primary" style={{ background: "var(--orange)", boxShadow: "0 2px 12px rgba(249,115,22,0.3)" }}>
          {loading ? "⏳ Analisi file…" : "📂 Importa GCode / 3MF"}
        </button>
        {error && <span style={{ color: "var(--red)", fontSize: 11, marginLeft: 8 }}>{error}</span>}
        {data && (
          <span className="text-xs ml-2" style={{ color: "var(--green, #22c55e)" }}>
            ✓ {formatTempo(data.tempo_stampa_sec)} • {data.peso_totale_grammi.toFixed(1)}g
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Bottone importazione */}
      <button onClick={handleImport} disabled={loading}
        className="w-full p-4 rounded-lg border-2 border-dashed text-center cursor-pointer transition-colors"
        style={{
          borderColor: data ? "var(--green, #22c55e)" : "var(--border-default, rgba(99,180,255,.22))",
          background: data ? "var(--green-soft, rgba(34,197,94,.08))" : "var(--bg-input, #0f1628)",
          color: data ? "var(--green, #22c55e)" : "var(--text-secondary, #b8c5db)",
        }}>
        {loading ? (
          <span>⏳ Analisi del file in corso…</span>
        ) : data ? (
          <span>✅ File importato — clicca per cambiare</span>
        ) : (
          <div>
            <div style={{ fontSize: 28, marginBottom: 6, opacity: 0.7 }}>📂</div>
            <div className="text-sm font-medium">Importa file GCode o 3MF</div>
            <div className="text-xs mt-1" style={{ color: "var(--text-muted, #6b7fa0)" }}>
              Bambu Studio, OrcaSlicer, PrusaSlicer
            </div>
          </div>
        )}
      </button>

      {error && (
        <div className="mt-2 p-2 rounded-lg text-xs" style={{
          background: "var(--red-soft, rgba(244,63,94,.1))", color: "var(--red, #f43f5e)",
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Riepilogo dati importati — solo info pulite */}
      {data && (
        <div className="mt-3 p-4 rounded-lg" style={{
          background: "var(--bg-surface, #151c32)",
          border: "1px solid var(--border-default, rgba(99,180,255,.18))",
        }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-label, #7dd3fc)" }}>
              Dati importati
            </span>
            {data.slicer && (
              <span className="text-xs" style={{ color: "var(--text-muted, #6b7fa0)" }}>{data.slicer}</span>
            )}
          </div>

          {/* KPI: tempo, peso, filamento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <InfoBox label="Tempo stampa" value={data.tempo_stampa_display || formatTempo(data.tempo_stampa_sec)} />
            <InfoBox label="Peso totale" value={data.peso_totale_grammi > 0 ? `${data.peso_totale_grammi.toFixed(1)} g` : "—"} />
            <InfoBox label="Filamento" value={data.filamento_tipo || "—"} />
          </div>

          {/* Lista materiali (se multi) */}
          {data.materiali.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle, rgba(99,180,255,.1))" }}>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-label, #7dd3fc)" }}>
                {data.materiali.length > 1 ? `Materiali (${data.materiali.length} slot AMS)` : "Materiale"}
              </span>
              <div className="mt-2" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {data.materiali.map((m) => (
                  <div key={m.slot} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "6px 10px", borderRadius: 8,
                    background: "var(--bg-card, #1a2340)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {/* Colore dot */}
                      <div style={{
                        width: 14, height: 14, borderRadius: 4,
                        background: m.colore && m.colore !== "" ? m.colore : "#555",
                        border: "1px solid rgba(255,255,255,.2)",
                        flexShrink: 0,
                      }} />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #fff)" }}>
                          {m.tipo || "Filamento"}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-muted, #6b7fa0)", marginLeft: 6 }}>
                          Slot {m.slot}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary, #fff)" }}>
                        {m.peso_grammi > 0 ? `${m.peso_grammi.toFixed(1)}g` : "—"}
                      </span>
                      {m.colore && (
                        <span style={{ fontSize: 10, color: "var(--text-muted, #6b7fa0)", marginLeft: 6 }}>
                          {m.colore}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File sorgente */}
          <div className="mt-2 text-xs" style={{ color: "var(--text-muted, #6b7fa0)" }}>
            📄 {data.nome_file}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg text-center" style={{ background: "var(--bg-card, #1a2340)" }}>
      <div className="text-xs" style={{ color: "var(--text-muted, #6b7fa0)" }}>{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color: "var(--text-primary, #fff)" }}>{value}</div>
    </div>
  );
}
