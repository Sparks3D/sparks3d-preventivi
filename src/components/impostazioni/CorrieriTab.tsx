// src/components/impostazioni/CorrieriTab.tsx
// Sparks3D Preventivi – Corrieri CRUD + PackLink Pro tariffe live
// ================================================================

import { useState, useEffect, CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";

// ── Tipi (match con packlink.rs) ──

interface Corriere {
  id: number;
  nome: string;
  servizio: string;
  costo_spedizione: number;
  tempo_consegna: string;
  packlink_service_id: string;
  note: string;
}

interface ServizioCorrere {
  id: string;
  nome_corriere: string;
  nome_servizio: string;
  prezzo_totale: number;
  prezzo_base: number;
  prezzo_iva: number;
  valuta: string;
  tempo_transito: string;
  ore_transito: number | null;
  categoria: string;
  data_consegna_stimata: string;
  logo_url: string | null;
  drop_off: boolean;
  consegna_punto_ritiro: boolean;
  dimensioni_max: string;
}

interface RispostaSpedizione {
  servizi: ServizioCorrere[];
  errore: string | null;
}

// ── Costanti ──

const C = {
  bg: "#0b1426",
  card: "#0f1d35",
  border: "#1a2d4d",
  borderLight: "#243a5c",
  text: "#e8edf5",
  textMuted: "#7a8ba8",
  textDim: "#4a5f80",
  accent: "#3b82f6",
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  cyan: "#06b6d4",
  inputBg: "#0a1222",
  overlay: "rgba(4,8,20,.75)",
};

const COUNTRIES = [
  { code: "IT", label: "Italia" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" },
  { code: "ES", label: "Spagna" },
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgio" },
  { code: "NL", label: "Paesi Bassi" },
  { code: "PT", label: "Portogallo" },
  { code: "CH", label: "Svizzera" },
  { code: "GB", label: "Regno Unito" },
  { code: "PL", label: "Polonia" },
  { code: "SE", label: "Svezia" },
  { code: "DK", label: "Danimarca" },
  { code: "CZ", label: "Rep. Ceca" },
  { code: "RO", label: "Romania" },
  { code: "GR", label: "Grecia" },
  { code: "HR", label: "Croazia" },
  { code: "US", label: "USA" },
];

const eur = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const EMPTY: Corriere = {
  id: 0, nome: "", servizio: "", costo_spedizione: 0,
  tempo_consegna: "", packlink_service_id: "", note: "",
};

// ── Componente principale ──

export function CorrieriTab() {
  const [corrieri, setCorrieri] = useState<Corriere[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Corriere>(EMPTY);
  const [saving, setSaving] = useState(false);

  // PackLink
  const [showPl, setShowPl] = useState(false);
  const [plForm, setPlForm] = useState({
    paese: "IT", cap: "",
    peso: 1.0, larghezza: 30, altezza: 20, lunghezza: 15,
  });
  const [plResult, setPlResult] = useState<RispostaSpedizione | null>(null);
  const [plLoading, setPlLoading] = useState(false);

  // Conferma eliminazione
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const data = await invoke<Corriere[]>("get_corrieri");
      setCorrieri(data);
      setError("");
    } catch (e: any) {
      setError(e?.toString() || "Errore");
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD ──

  const openNew = () => { setEditItem({ ...EMPTY }); setModalOpen(true); };
  const openEdit = (c: Corriere) => { setEditItem({ ...c }); setModalOpen(true); };

  const save = async () => {
    if (!editItem.nome.trim()) return;
    try {
      setSaving(true);
      if (editItem.id === 0) {
        await invoke("create_corriere", { data: editItem });
      } else {
        await invoke("update_corriere", { id: editItem.id, data: editItem });
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.toString() || "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id: number) => {
    try {
      await invoke("delete_corriere", { id });
      setDeleteId(null);
      await load();
    } catch (e: any) {
      setError(e?.toString() || "Errore eliminazione");
    }
  };

  // ── PackLink ──

  const searchPl = async () => {
    if (!plForm.cap.trim()) return;
    try {
      setPlLoading(true);
      setPlResult(null);
      // Chiama con la struct RichiestaSpedizione del backend
      const result = await invoke<RispostaSpedizione>("get_tariffe_corrieri", {
        richiesta: {
          pacco: {
            peso_kg: plForm.peso,
            larghezza_cm: plForm.larghezza,
            altezza_cm: plForm.altezza,
            lunghezza_cm: plForm.lunghezza,
          },
          cap_destinatario: plForm.cap,
          paese_destinatario: plForm.paese,
        },
      });
      setPlResult(result);
      if (result.errore) setError(result.errore);
    } catch (e: any) {
      setError(e?.toString() || "Errore ricerca");
    } finally {
      setPlLoading(false);
    }
  };

  const importFromPl = (s: ServizioCorrere) => {
    const tempo = s.ore_transito
      ? `${s.ore_transito}h (${s.tempo_transito})`
      : s.tempo_transito || "—";
    setEditItem({
      id: 0,
      nome: s.nome_corriere,
      servizio: s.nome_servizio,
      costo_spedizione: s.prezzo_totale,
      tempo_consegna: tempo,
      packlink_service_id: s.id,
      note: [
        s.consegna_punto_ritiro ? "Punto di ritiro" : "Domicilio",
        s.data_consegna_stimata ? `Consegna stimata: ${s.data_consegna_stimata}` : "",
        s.dimensioni_max ? `Max: ${s.dimensioni_max}` : "",
      ].filter(Boolean).join(" • "),
    });
    setModalOpen(true);
  };

  // ── Render ──

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={st.title}>Corrieri</h2>
          <p style={st.subtitle}>Gestisci corrieri e cerca tariffe live con PackLink Pro</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={st.btnSec} onClick={() => setShowPl(!showPl)}>
            {showPl ? "✕ Chiudi PackLink" : "🔍 Cerca tariffe"}
          </button>
          <button style={st.btnPri} onClick={openNew}>+ Aggiungi corriere</button>
        </div>
      </div>

      {error && (
        <div style={st.errBanner}>
          <span>⚠️ {error}</span>
          <button style={st.errClose} onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* ── Pannello PackLink ── */}
      {showPl && (
        <div style={st.plPanel}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 16px" }}>
            🔗 Ricerca tariffe PackLink Pro
          </h3>
          <div style={st.plGrid}>
            <Fl label="Paese destinazione">
              <select style={st.select} value={plForm.paese}
                onChange={e => setPlForm({ ...plForm, paese: e.target.value })}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
              </select>
            </Fl>
            <Fl label="CAP destinazione">
              <input style={st.input} placeholder="es. 20100" value={plForm.cap}
                onChange={e => setPlForm({ ...plForm, cap: e.target.value })} />
            </Fl>
            <Fl label="Peso (kg)">
              <input style={st.input} type="number" min="0.1" step="0.1" value={plForm.peso}
                onChange={e => setPlForm({ ...plForm, peso: +e.target.value })} />
            </Fl>
            <Fl label="Larghezza (cm)">
              <input style={st.input} type="number" min="1" value={plForm.larghezza}
                onChange={e => setPlForm({ ...plForm, larghezza: +e.target.value })} />
            </Fl>
            <Fl label="Altezza (cm)">
              <input style={st.input} type="number" min="1" value={plForm.altezza}
                onChange={e => setPlForm({ ...plForm, altezza: +e.target.value })} />
            </Fl>
            <Fl label="Lunghezza (cm)">
              <input style={st.input} type="number" min="1" value={plForm.lunghezza}
                onChange={e => setPlForm({ ...plForm, lunghezza: +e.target.value })} />
            </Fl>
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <button style={st.btnPri} onClick={searchPl} disabled={plLoading || !plForm.cap.trim()}>
              {plLoading ? "⏳ Ricerca…" : "🚀 Cerca tariffe"}
            </button>
            {plResult && !plResult.errore && (
              <span style={{ fontSize: 12, color: C.textMuted }}>
                {plResult.servizi.length} tariffe trovate
              </span>
            )}
          </div>

          {/* Risultati */}
          {plResult && plResult.servizi.length > 0 && (
            <div style={{ marginTop: 16, maxHeight: 420, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["", "Corriere", "Servizio", "Prezzo", "IVA", "Tempo", "Tipo", ""].map((h, i) => (
                      <th key={i} style={st.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plResult.servizi.map((r, i) => (
                    <tr key={`${r.id}-${i}`} style={st.tr}>
                      {/* Logo */}
                      <td style={{ ...st.td, width: 36, padding: "8px 6px 8px 14px" }}>
                        {r.logo_url ? (
                          <img src={r.logo_url} alt={r.nome_corriere}
                            style={{ width: 28, height: 28, objectFit: "contain", borderRadius: 4, background: "#fff", padding: 2 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: 4, background: "rgba(255,255,255,.06)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🚚</div>
                        )}
                      </td>
                      <td style={st.td}>
                        <span style={{ fontWeight: 600, color: C.text }}>{r.nome_corriere}</span>
                      </td>
                      <td style={st.td}>
                        <span style={{ fontSize: 12 }}>{r.nome_servizio}</span>
                        {r.categoria && (
                          <span style={{ display: "block", fontSize: 10, color: C.textDim, marginTop: 2 }}>
                            {r.categoria}
                          </span>
                        )}
                      </td>
                      <td style={{ ...st.td, fontWeight: 700, color: C.green, fontVariantNumeric: "tabular-nums" }}>
                        {eur(r.prezzo_totale)}
                      </td>
                      <td style={{ ...st.td, fontSize: 11, color: C.textDim, fontVariantNumeric: "tabular-nums" }}>
                        +{eur(r.prezzo_iva)}
                      </td>
                      <td style={st.td}>
                        {r.ore_transito ? `${r.ore_transito}h` : r.tempo_transito || "—"}
                        {r.data_consegna_stimata && (
                          <span style={{ display: "block", fontSize: 10, color: C.textDim, marginTop: 1 }}>
                            {r.data_consegna_stimata}
                          </span>
                        )}
                      </td>
                      <td style={st.td}>
                        {r.consegna_punto_ritiro ? (
                          <span style={st.badgeAmber}>📦 Ritiro</span>
                        ) : (
                          <span style={st.badgeBlue}>🏠 Casa</span>
                        )}
                      </td>
                      <td style={{ ...st.td, textAlign: "right" }}>
                        <button style={st.btnSaveSmall} onClick={() => importFromPl(r)}>
                          💾 Salva
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {plResult && plResult.servizi.length === 0 && !plResult.errore && (
            <div style={{ ...st.emptyBox, marginTop: 16, padding: 24 }}>
              Nessuna tariffa disponibile per questa tratta
            </div>
          )}
        </div>
      )}

      {/* ── Tabella corrieri salvati ── */}
      {loading ? (
        <div style={st.loadingBox}>
          <div style={st.spinner} />
          <span style={{ color: C.textMuted, fontSize: 13 }}>Caricamento…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : corrieri.length === 0 ? (
        <div style={st.emptyBox}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🚚</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 6px" }}>
            Nessun corriere salvato
          </p>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
            Aggiungi manualmente o cerca tariffe con PackLink
          </p>
        </div>
      ) : (
        <div style={st.tableCard}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Corriere", "Servizio", "Costo", "Tempo", "PackLink ID", "Note", ""].map((h, i) => (
                  <th key={i} style={st.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {corrieri.map(c => (
                <tr key={c.id} style={st.tr}>
                  <td style={st.td}>
                    <span style={{ fontWeight: 600, color: C.text }}>{c.nome}</span>
                  </td>
                  <td style={st.td}>{c.servizio || "—"}</td>
                  <td style={{ ...st.td, fontWeight: 600, color: C.green, fontVariantNumeric: "tabular-nums" }}>
                    {eur(c.costo_spedizione)}
                  </td>
                  <td style={st.td}>{c.tempo_consegna || "—"}</td>
                  <td style={st.td}>
                    {c.packlink_service_id ? (
                      <span style={{ fontSize: 11, color: C.cyan, fontFamily: "monospace" }}>
                        {c.packlink_service_id}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ ...st.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.note || "—"}
                  </td>
                  <td style={{ ...st.td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={st.btnIcon} title="Modifica" onClick={() => openEdit(c)}>✏️</button>
                    {deleteId === c.id ? (
                      <>
                        <button style={{ ...st.btnIcon, color: C.red }} onClick={() => doDelete(c.id)}>✓ Sì</button>
                        <button style={st.btnIcon} onClick={() => setDeleteId(null)}>✕</button>
                      </>
                    ) : (
                      <button style={st.btnIcon} title="Elimina" onClick={() => setDeleteId(c.id)}>🗑️</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Crea/Modifica ── */}
      {modalOpen && (
        <div style={st.modalOv} onClick={() => setModalOpen(false)}>
          <div style={st.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: C.text, margin: "0 0 20px" }}>
              {editItem.id === 0 ? "Nuovo corriere" : "Modifica corriere"}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Fl label="Nome corriere *">
                <input style={st.input} placeholder="es. BRT, GLS, DHL"
                  value={editItem.nome}
                  onChange={e => setEditItem({ ...editItem, nome: e.target.value })} />
              </Fl>
              <Fl label="Servizio">
                <input style={st.input} placeholder="es. Express, Economy"
                  value={editItem.servizio}
                  onChange={e => setEditItem({ ...editItem, servizio: e.target.value })} />
              </Fl>
              <Fl label="Costo spedizione (€)">
                <input style={st.input} type="number" min="0" step="0.01"
                  value={editItem.costo_spedizione}
                  onChange={e => setEditItem({ ...editItem, costo_spedizione: +e.target.value })} />
              </Fl>
              <Fl label="Tempo consegna">
                <input style={st.input} placeholder="es. 24-48h"
                  value={editItem.tempo_consegna}
                  onChange={e => setEditItem({ ...editItem, tempo_consegna: e.target.value })} />
              </Fl>
              <Fl label="PackLink Service ID" span2>
                <input style={st.input} placeholder="Auto da PackLink"
                  value={editItem.packlink_service_id}
                  onChange={e => setEditItem({ ...editItem, packlink_service_id: e.target.value })} />
              </Fl>
              <Fl label="Note" span2>
                <textarea style={{ ...st.input, minHeight: 60, resize: "vertical" as const }}
                  placeholder="Note libere…"
                  value={editItem.note}
                  onChange={e => setEditItem({ ...editItem, note: e.target.value })} />
              </Fl>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button style={st.btnSec} onClick={() => setModalOpen(false)}>Annulla</button>
              <button style={st.btnPri} onClick={save} disabled={saving || !editItem.nome.trim()}>
                {saving ? "Salvataggio…" : editItem.id === 0 ? "Crea corriere" : "Salva modifiche"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Field label wrapper ──

function Fl({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div style={span2 ? { gridColumn: "1 / -1" } : undefined}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted,
        marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em",
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Stili ──

const st: Record<string, CSSProperties> = {
  title: { fontSize: 22, fontWeight: 700, color: C.text, margin: 0 },
  subtitle: { fontSize: 13, color: C.textMuted, marginTop: 4, marginBottom: 0 },

  btnPri: {
    padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer",
    background: C.accent, color: "#fff", fontSize: 13, fontWeight: 600,
  },
  btnSec: {
    padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`,
    cursor: "pointer", background: "transparent", color: C.textMuted, fontSize: 13, fontWeight: 500,
  },
  btnSaveSmall: {
    padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`,
    cursor: "pointer", background: C.card, color: C.text, fontSize: 12, fontWeight: 500,
  },
  btnIcon: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 14, padding: "4px 6px", borderRadius: 4, color: C.textMuted,
  },

  input: {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.inputBg,
    color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  },
  select: {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: C.inputBg,
    color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" as const,
  },

  tableCard: {
    background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden",
  },
  th: {
    textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: C.textDim,
    textTransform: "uppercase" as const, letterSpacing: "0.04em", padding: "10px 14px",
    borderBottom: `1px solid ${C.border}`,
  },
  tr: { borderBottom: `1px solid rgba(255,255,255,.03)` },
  td: { padding: "12px 14px", fontSize: 13, color: C.textMuted, verticalAlign: "middle" as const },

  badgeAmber: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
    background: "rgba(245,158,11,.12)", color: C.amber,
  },
  badgeBlue: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
    background: "rgba(59,130,246,.12)", color: "#60a5fa",
  },

  plPanel: {
    background: C.card, border: `1px solid rgba(6,182,212,.2)`,
    borderRadius: 14, padding: 20, marginBottom: 20,
  },
  plGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },

  loadingBox: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 60 },
  spinner: {
    width: 18, height: 18, border: `2px solid ${C.border}`,
    borderTopColor: C.accent, borderRadius: "50%", animation: "spin 1s linear infinite",
  },
  emptyBox: {
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 14, padding: 48, textAlign: "center" as const,
  },
  errBanner: {
    background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)",
    borderRadius: 10, padding: "10px 16px", marginBottom: 16,
    fontSize: 13, color: "#f87171", display: "flex",
    justifyContent: "space-between", alignItems: "center",
  },
  errClose: { background: "none", border: "none", cursor: "pointer", color: "#f87171", fontSize: 16 },

  modalOv: {
    position: "fixed" as const, inset: 0, background: C.overlay,
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: C.card, border: `1px solid ${C.borderLight}`,
    borderRadius: 16, padding: 28, width: 560, maxHeight: "85vh",
    overflowY: "auto" as const, boxShadow: "0 24px 60px rgba(0,0,0,.5)",
  },
};
