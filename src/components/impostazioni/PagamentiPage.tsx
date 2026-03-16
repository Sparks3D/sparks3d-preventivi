// src/components/impostazioni/PagamentiPage.tsx
// Sparks3D Preventivi – Metodi di Pagamento (CRUD + Commissioni)
// ===============================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface MetodoPagamento {
  id: number;
  nome: string;
  descrizione_pdf: string;
  commissione_percentuale: number;
  commissione_fissa: number;
  addebita_al_cliente: boolean;
}

const EMPTY: Omit<MetodoPagamento, "id"> = {
  nome: "",
  descrizione_pdf: "",
  commissione_percentuale: 0,
  commissione_fissa: 0,
  addebita_al_cliente: false,
};

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export function PagamentiPage() {
  const [items, setItems] = useState<MetodoPagamento[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try { setItems(await invoke<MetodoPagamento[]>("get_metodi_pagamento")); }
    catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((m) =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.descrizione_pdf.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => { setForm({ ...EMPTY }); setEditingId(null); setError(""); setShowForm(true); };

  const openEdit = (m: MetodoPagamento) => {
    setForm({
      nome: m.nome, descrizione_pdf: m.descrizione_pdf,
      commissione_percentuale: m.commissione_percentuale,
      commissione_fissa: m.commissione_fissa,
      addebita_al_cliente: m.addebita_al_cliente,
    });
    setEditingId(m.id); setError(""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome del metodo di pagamento non può essere vuoto"); return; }
    try {
      if (editingId) {
        await invoke("update_metodo_pagamento", { id: editingId, data: { id: editingId, ...form } });
      } else {
        await invoke("create_metodo_pagamento", { data: { id: 0, ...form } });
      }
      setShowForm(false); setEditingId(null); setError(""); await load();
    } catch (e: any) { setError(String(e)); }
  };

  const handleDelete = async (id: number) => {
    await invoke("delete_metodo_pagamento", { id }).catch(() => {});
    setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; });
    await load();
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) await invoke("delete_metodo_pagamento", { id }).catch(() => {});
    setSelectedIds(new Set()); await load();
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((m) => m.id)));
  };

  // ── Predefiniti con commissioni PayPal reali ──
  const PRESETS: (Omit<MetodoPagamento, "id">)[] = [
    {
      nome: "PayPal",
      descrizione_pdf: "Pagamento tramite PayPal all'indirizzo: ___@___.com",
      commissione_percentuale: 3.4,
      commissione_fissa: 0.35,
      addebita_al_cliente: true,
    },
    {
      nome: "Bonifico bancario",
      descrizione_pdf: "Pagamento tramite bonifico bancario.\nIBAN: IT___ intestato a ___",
      commissione_percentuale: 0,
      commissione_fissa: 0,
      addebita_al_cliente: false,
    },
    {
      nome: "Carta di credito",
      descrizione_pdf: "Pagamento con carta di credito/debito",
      commissione_percentuale: 0,
      commissione_fissa: 0,
      addebita_al_cliente: false,
    },
    {
      nome: "Contanti",
      descrizione_pdf: "Pagamento in contanti alla consegna",
      commissione_percentuale: 0,
      commissione_fissa: 0,
      addebita_al_cliente: false,
    },
    {
      nome: "Satispay",
      descrizione_pdf: "Pagamento tramite Satispay",
      commissione_percentuale: 0,
      commissione_fissa: 0,
      addebita_al_cliente: false,
    },
  ];

  const addPreset = (preset: Omit<MetodoPagamento, "id">) => {
    setForm({ ...preset });
    setEditingId(null); setError(""); setShowForm(true);
  };

  // Esempio di costo commissione per anteprima
  const calcCommissioneEsempio = (importo: number) => {
    if (form.commissione_percentuale === 0 && form.commissione_fissa === 0) return 0;
    return (importo * form.commissione_percentuale / 100) + form.commissione_fissa;
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Metodi di pagamento</h3>
        <button onClick={openNew}
          className="s3d-btn s3d-btn-primary">
          + Nuovo metodo
        </button>
      </div>

      {/* Predefiniti rapidi — sempre visibili */}
      {(
        <div className="s3d-card-glow p-5 mb-5">
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
            Aggiungi rapidamente
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.nome} onClick={() => addPreset(p)}
                className="s3d-btn s3d-btn-ghost text-xs">
                {getIcon(p.nome)} {p.nome}
                {p.commissione_percentuale > 0 && (
                  <span style={{ opacity: 0.6, marginLeft: 4 }}>
                    ({p.commissione_percentuale}% + {eur(p.commissione_fissa)})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra ricerca */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input type="checkbox"
          checked={selectedIds.size === filtered.length && filtered.length > 0}
          onChange={toggleSelectAll} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected}
            className="s3d-btn s3d-btn-danger">
            Elimina selezionati ({selectedIds.size})
          </button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca metodo di pagamento"
          className="s3d-input" style={{ flex: 1 }} />
      </div>

      {/* Tabella */}
      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
            {items.length === 0
              ? 'Nessun metodo di pagamento. Clicca "Nuovo metodo" o usa i predefiniti sopra.'
              : "Nessun risultato."}
          </div>
        ) : (
          <table className="s3d-table">
            <thead>
              <tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
                <th style={{ width: 40 }}></th>
                <th >Nome</th>
                <th >Descrizione PDF</th>
                <th >Commissione</th>
                <th >Addebita</th>
                <th style={{ textAlign: "right" }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => openEdit(m)}>
                  <td  onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelect(m.id)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
                  </td>
                  <td >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="text-lg">{getIcon(m.nome)}</span>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.nome}</span>
                    </div>
                  </td>
                  <td style={{ color: "var(--text-secondary)", maxWidth: 300 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.descrizione_pdf || "—"}
                    </span>
                  </td>
                  <td >
                    {m.commissione_percentuale > 0 || m.commissione_fissa > 0 ? (
                      <span style={{ color: "var(--orange, #fb923c)", fontWeight: 600, fontSize: 13 }}>
                        {m.commissione_percentuale > 0 && `${m.commissione_percentuale}%`}
                        {m.commissione_percentuale > 0 && m.commissione_fissa > 0 && " + "}
                        {m.commissione_fissa > 0 && eur(m.commissione_fissa)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td >
                    {m.addebita_al_cliente ? (
                      <span className="s3d-badge" style={{
                        background: "var(--green-soft, rgba(52,211,153,.15))",
                        color: "var(--green, #34d399)"
                      }}>
                        Al cliente
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(m)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>Modifica</button>
                    <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          {filtered.length} di {items.length} metodi
        </div>
      )}

      {/* ── Modal Crea/Modifica ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, margin: "0 16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
                {editingId ? "Modifica metodo" : "Nuovo metodo di pagamento"}
              </h3>
              <button onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {error && (
                <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>{error}</div>
              )}

              {/* Nome */}
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Nome metodo *</label>
                <input type="text" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Es. Bonifico bancario, PayPal, Contanti"
                  className="s3d-input" />
              </div>

              {/* Descrizione PDF */}
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Descrizione per PDF</label>
                <textarea value={form.descrizione_pdf}
                  onChange={(e) => setForm({ ...form, descrizione_pdf: e.target.value })}
                  placeholder="Testo stampato nel preventivo PDF…"
                  rows={3}
                  className="s3d-input" style={{ resize: "vertical" }} />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Stampato nel PDF accanto al metodo di pagamento</p>
              </div>

              {/* Commissioni */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                  Commissioni transazione
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Percentuale %</label>
                    <input type="number" step="0.01" min="0"
                      value={form.commissione_percentuale}
                      onChange={(e) => setForm({ ...form, commissione_percentuale: parseFloat(e.target.value) || 0 })}
                      className="s3d-input" />
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Es. PayPal Italia: 3,40%</p>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Fisso (€)</label>
                    <input type="number" step="0.01" min="0"
                      value={form.commissione_fissa}
                      onChange={(e) => setForm({ ...form, commissione_fissa: parseFloat(e.target.value) || 0 })}
                      className="s3d-input" />
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Es. PayPal Italia: € 0,35</p>
                  </div>
                </div>

                {/* Toggle addebita al cliente */}
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                  <input type="checkbox"
                    checked={form.addebita_al_cliente}
                    onChange={(e) => setForm({ ...form, addebita_al_cliente: e.target.checked })}
                    style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                    Addebita commissione al cliente
                  </span>
                </label>
                {form.addebita_al_cliente && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, marginLeft: 28 }}>
                    La commissione verrà aggiunta automaticamente al totale del preventivo
                  </p>
                )}
              </div>

              {/* Anteprima costo */}
              {(form.commissione_percentuale > 0 || form.commissione_fissa > 0) && (
                <div className="p-4 rounded-lg" style={{ background: "var(--orange-soft, rgba(251,146,60,.1))", border: "1px solid var(--orange, rgba(251,146,60,.25))" }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--orange, #fb923c)" }}>
                    Simulazione commissione
                  </p>
                  <div className="space-y-1">
                    {[50, 100, 200, 500].map((importo) => {
                      const comm = calcCommissioneEsempio(importo);
                      return (
                        <div key={importo} className="flex justify-between text-sm">
                          <span style={{ color: "var(--text-secondary)" }}>Preventivo {eur(importo)}</span>
                          <span style={{ fontWeight: 600, color: "var(--orange, #fb923c)" }}>
                            + {eur(comm)} commissione
                            {form.addebita_al_cliente && (
                              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> → cliente paga {eur(importo + comm)}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowForm(false)}
                className="s3d-btn s3d-btn-ghost">Annulla</button>
              <button onClick={handleSave}
                className="s3d-btn s3d-btn-primary"
                disabled={!form.nome.trim()}>
                {editingId ? "Salva modifiche" : "Crea metodo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getIcon(nome: string): string {
  const n = nome.toLowerCase();
  if (n.includes("paypal")) return "🅿️";
  if (n.includes("bonifico") || n.includes("iban") || n.includes("banca")) return "🏦";
  if (n.includes("carta") || n.includes("credit") || n.includes("debit")) return "💳";
  if (n.includes("contant") || n.includes("cash")) return "💵";
  if (n.includes("satispay")) return "📱";
  if (n.includes("assegno") || n.includes("check")) return "📝";
  if (n.includes("stripe")) return "⚡";
  return "💰";
}
