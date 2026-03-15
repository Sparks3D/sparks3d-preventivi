// src/components/ritenuta/RitenuteArchivio.tsx
// Sparks3D Preventivi – Archivio Ritenute / Ricevute
// =====================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Ritenuta {
  id: number;
  preventivo_id: number | null;
  preventivo_numero: string;
  numero_ritenuta: string;
  data: string;
  cliente_id: number | null;
  cliente_nome: string;
  importo_lordo: number;
  ritenuta_importo: number;
  netto_pagare: number;
  marca_bollo: number;
  descrizione: string;
  pdf_path: string;
  note: string;
  created_at: string;
}

const eurFmt = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const dataFmt = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export function RitenuteArchivio() {
  const [ritenute, setRitenute] = useState<Ritenuta[]>([]);
  const [filtro, setFiltro] = useState("");
  const [annoFiltro, setAnnoFiltro] = useState<string>("tutti");
  const [loading, setLoading] = useState(true);
  const [eliminaId, setEliminaId] = useState<number | null>(null);
  const [messaggio, setMessaggio] = useState<{ tipo: "ok" | "err"; testo: string } | null>(null);

  const caricaRitenute = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<Ritenuta[]>("get_ritenute");
      setRitenute(data);
    } catch (err) {
      console.error("Errore caricamento ritenute:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { caricaRitenute(); }, [caricaRitenute]);

  // ── Anni disponibili ──
  const anni = [...new Set(ritenute.map((r) => r.data?.substring(0, 4)).filter(Boolean))].sort().reverse();

  // ── Filtraggio ──
  const filtrate = ritenute.filter((r) => {
    if (annoFiltro !== "tutti" && !r.data?.startsWith(annoFiltro)) return false;
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      r.numero_ritenuta.toLowerCase().includes(q) ||
      r.cliente_nome.toLowerCase().includes(q) ||
      r.preventivo_numero.toLowerCase().includes(q) ||
      r.descrizione.toLowerCase().includes(q)
    );
  });

  // ── Totali anno/filtro ──
  const totaleLordo = filtrate.reduce((s, r) => s + r.importo_lordo, 0);
  const totaleRitenute = filtrate.reduce((s, r) => s + r.ritenuta_importo, 0);
  const totaleNetto = filtrate.reduce((s, r) => s + r.netto_pagare, 0);

  // ── Azioni ──
  const apriPdf = async (path: string) => {
    try {
      await invoke("open_pdf_file", { path });
    } catch {
      mostraMessaggio("err", "File PDF non trovato. Potrebbe essere stato spostato o eliminato.");
    }
  };

  const apriCartella = async (path: string) => {
    try {
      await invoke("open_file_in_explorer", { path });
    } catch {
      mostraMessaggio("err", "Impossibile aprire la cartella.");
    }
  };

  const apriCartellaRitenute = async () => {
    try {
      const folders = await invoke<{ ritenute: string }>("get_documents_folder");
      // Apri la cartella direttamente
      await invoke("open_file_in_explorer", { path: folders.ritenute + "\\." });
    } catch {
      mostraMessaggio("err", "Impossibile aprire la cartella Ritenute.");
    }
  };

  const eliminaRitenuta = async (id: number) => {
    try {
      await invoke("delete_ritenuta", { id });
      setRitenute((prev) => prev.filter((r) => r.id !== id));
      setEliminaId(null);
      mostraMessaggio("ok", "Ritenuta eliminata con successo.");
    } catch (err) {
      mostraMessaggio("err", `Errore eliminazione: ${err}`);
    }
  };

  const mostraMessaggio = (tipo: "ok" | "err", testo: string) => {
    setMessaggio({ tipo, testo });
    setTimeout(() => setMessaggio(null), 4000);
  };

  // ── Stili ──
  const S = {
    page: {
      maxWidth: 1200,
      margin: "0 auto",
    } as React.CSSProperties,

    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
      flexWrap: "wrap" as const,
      gap: 16,
    } as React.CSSProperties,

    title: {
      fontSize: 26,
      fontWeight: 700,
      color: "#e2e8f0",
      display: "flex",
      alignItems: "center",
      gap: 12,
    } as React.CSSProperties,

    badge: {
      fontSize: 13,
      background: "rgba(14,165,233,0.15)",
      color: "#38bdf8",
      borderRadius: 20,
      padding: "4px 14px",
      fontWeight: 600,
    } as React.CSSProperties,

    controls: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap" as const,
    } as React.CSSProperties,

    input: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 16px",
      color: "#e2e8f0",
      fontSize: 14,
      outline: "none",
      minWidth: 240,
      transition: "border 0.2s",
    } as React.CSSProperties,

    select: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 14px",
      color: "#e2e8f0",
      fontSize: 14,
      outline: "none",
      cursor: "pointer",
    } as React.CSSProperties,

    btnOutline: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "10px 18px",
      color: "#94a3b8",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      transition: "all 0.2s",
      display: "flex",
      alignItems: "center",
      gap: 8,
    } as React.CSSProperties,

    kpiRow: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 14,
      marginBottom: 24,
    } as React.CSSProperties,

    kpiCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 14,
      padding: "16px 20px",
    } as React.CSSProperties,

    kpiLabel: {
      fontSize: 11,
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      marginBottom: 4,
    } as React.CSSProperties,

    kpiValue: {
      fontSize: 22,
      fontWeight: 700,
      color: "#e2e8f0",
    } as React.CSSProperties,

    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: 14,
    } as React.CSSProperties,

    th: {
      textAlign: "left" as const,
      padding: "12px 16px",
      fontSize: 11,
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      fontWeight: 600,
    } as React.CSSProperties,

    td: {
      padding: "14px 16px",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      color: "#cbd5e1",
      verticalAlign: "middle" as const,
    } as React.CSSProperties,

    tr: {
      transition: "background 0.15s",
      cursor: "default",
    } as React.CSSProperties,

    actionBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: "6px 8px",
      borderRadius: 8,
      transition: "all 0.2s",
      fontSize: 16,
    } as React.CSSProperties,

    toast: (tipo: "ok" | "err") => ({
      position: "fixed" as const,
      bottom: 24,
      right: 24,
      background: tipo === "ok" ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
      color: "#fff",
      padding: "14px 24px",
      borderRadius: 14,
      fontSize: 14,
      fontWeight: 600,
      zIndex: 9999,
      backdropFilter: "blur(12px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }),

    modal: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    } as React.CSSProperties,

    modalBox: {
      background: "#0f1629",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18,
      padding: 28,
      maxWidth: 440,
      width: "90%",
    } as React.CSSProperties,

    btnDanger: {
      background: "rgba(239,68,68,0.15)",
      border: "1px solid rgba(239,68,68,0.3)",
      borderRadius: 10,
      padding: "10px 20px",
      color: "#f87171",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    } as React.CSSProperties,

    btnCancel: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 20px",
      color: "#94a3b8",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    } as React.CSSProperties,

    empty: {
      textAlign: "center" as const,
      padding: "60px 20px",
      color: "#475569",
    } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      {/* ═══ HEADER ═══ */}
      <div style={S.header}>
        <div style={S.title}>
          <span>📋</span>
          Archivio Ritenute
          <span style={S.badge}>{filtrate.length} document{filtrate.length !== 1 ? "i" : "o"}</span>
        </div>
        <div style={S.controls}>
          <input
            type="text"
            placeholder="🔍 Cerca per cliente, numero, descrizione..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={S.input}
            onFocus={(e) => (e.target.style.borderColor = "rgba(14,165,233,0.5)")}
            onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
          />
          <select
            value={annoFiltro}
            onChange={(e) => setAnnoFiltro(e.target.value)}
            style={S.select}
          >
            <option value="tutti">Tutti gli anni</option>
            {anni.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button
            style={S.btnOutline}
            onClick={apriCartellaRitenute}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#e2e8f0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              e.currentTarget.style.color = "#94a3b8";
            }}
          >
            📂 Apri cartella
          </button>
        </div>
      </div>

      {/* ═══ KPI ═══ */}
      {filtrate.length > 0 && (
        <div style={S.kpiRow}>
          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Totale lordo</div>
            <div style={S.kpiValue}>{eurFmt(totaleLordo)}</div>
          </div>
          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Ritenute versate</div>
            <div style={{ ...S.kpiValue, color: "#f97316" }}>{eurFmt(totaleRitenute)}</div>
          </div>
          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Netto incassato</div>
            <div style={{ ...S.kpiValue, color: "#22c55e" }}>{eurFmt(totaleNetto)}</div>
          </div>
          <div style={S.kpiCard}>
            <div style={S.kpiLabel}>Documenti</div>
            <div style={{ ...S.kpiValue, color: "#38bdf8" }}>{filtrate.length}</div>
          </div>
        </div>
      )}

      {/* ═══ TABELLA ═══ */}
      {loading ? (
        <div style={S.empty}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 15, color: "#64748b" }}>Caricamento archivio...</div>
        </div>
      ) : filtrate.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, color: "#64748b", marginBottom: 8 }}>
            {ritenute.length === 0
              ? "Nessuna ritenuta in archivio"
              : "Nessun risultato per i filtri applicati"}
          </div>
          <div style={{ fontSize: 14, color: "#475569" }}>
            {ritenute.length === 0
              ? "Le ritenute generate dai preventivi appariranno qui automaticamente."
              : "Prova a modificare i criteri di ricerca."}
          </div>
        </div>
      ) : (
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16,
          overflow: "hidden",
        }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Numero</th>
                <th style={S.th}>Data</th>
                <th style={S.th}>Cliente</th>
                <th style={S.th}>Preventivo</th>
                <th style={{ ...S.th, textAlign: "right" }}>Lordo</th>
                <th style={{ ...S.th, textAlign: "right" }}>Ritenuta</th>
                <th style={{ ...S.th, textAlign: "right" }}>Netto</th>
                <th style={{ ...S.th, textAlign: "center" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtrate.map((r) => (
                <tr
                  key={r.id}
                  style={S.tr}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={S.td}>
                    <span style={{ fontWeight: 600, color: "#38bdf8" }}>{r.numero_ritenuta}</span>
                  </td>
                  <td style={S.td}>{dataFmt(r.data)}</td>
                  <td style={S.td}>
                    <span style={{ fontWeight: 500, color: "#e2e8f0" }}>{r.cliente_nome}</span>
                  </td>
                  <td style={S.td}>
                    {r.preventivo_numero ? (
                      <span style={{
                        fontSize: 12,
                        background: "rgba(14,165,233,0.1)",
                        color: "#38bdf8",
                        padding: "3px 10px",
                        borderRadius: 6,
                      }}>
                        {r.preventivo_numero}
                      </span>
                    ) : (
                      <span style={{ color: "#475569" }}>—</span>
                    )}
                  </td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600 }}>
                    {eurFmt(r.importo_lordo)}
                  </td>
                  <td style={{ ...S.td, textAlign: "right", color: r.ritenuta_importo > 0 ? "#f97316" : "#475569" }}>
                    {r.ritenuta_importo > 0 ? eurFmt(r.ritenuta_importo) : "—"}
                  </td>
                  <td style={{ ...S.td, textAlign: "right", fontWeight: 600, color: "#22c55e" }}>
                    {eurFmt(r.netto_pagare)}
                  </td>
                  <td style={{ ...S.td, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      {r.pdf_path && (
                        <>
                          <button
                            style={S.actionBtn}
                            title="Apri PDF"
                            onClick={() => apriPdf(r.pdf_path)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(14,165,233,0.15)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            📄
                          </button>
                          <button
                            style={S.actionBtn}
                            title="Mostra in cartella"
                            onClick={() => apriCartella(r.pdf_path)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(14,165,233,0.15)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            📂
                          </button>
                        </>
                      )}
                      <button
                        style={S.actionBtn}
                        title="Elimina ritenuta"
                        onClick={() => setEliminaId(r.id)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.15)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ MODALE CONFERMA ELIMINAZIONE ═══ */}
      {eliminaId !== null && (
        <div style={S.modal} onClick={() => setEliminaId(null)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
              ⚠️ Conferma eliminazione
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>
              Vuoi eliminare questa ritenuta dall'archivio?
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              Anche il file PDF associato verrà eliminato dalla cartella Documenti/Sparks3D/Ritenute/.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={S.btnCancel} onClick={() => setEliminaId(null)}>
                Annulla
              </button>
              <button style={S.btnDanger} onClick={() => eliminaRitenuta(eliminaId)}>
                🗑️ Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST ═══ */}
      {messaggio && (
        <div style={S.toast(messaggio.tipo)}>{messaggio.testo}</div>
      )}
    </div>
  );
}
