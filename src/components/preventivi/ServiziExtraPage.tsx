// src/components/impostazioni/ServiziExtraPage.tsx
// Sparks3D Preventivi – Servizi Extra (CRUD)
// Predefiniti sempre visibili

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ServizioExtra {
  id: number; nome: string; importo_predefinito: number;
  addebita: boolean; addebita_senza_costo: boolean; markup_percentuale: number;
}

const EMPTY: Omit<ServizioExtra, "id"> = { nome: "", importo_predefinito: 0, addebita: false, addebita_senza_costo: false, markup_percentuale: 0 };
const eur = (n: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
const calcPrezzoCliente = (importo: number, markup: number) => importo + (importo * markup / 100);

const PRESETS: (Omit<ServizioExtra, "id">)[] = [
  { nome: "Post-processing (levigatura)", importo_predefinito: 10, addebita: true, addebita_senza_costo: false, markup_percentuale: 0 },
  { nome: "Verniciatura", importo_predefinito: 15, addebita: true, addebita_senza_costo: false, markup_percentuale: 0 },
  { nome: "Inserti filettati", importo_predefinito: 2, addebita: true, addebita_senza_costo: false, markup_percentuale: 0 },
  { nome: "Assemblaggio", importo_predefinito: 5, addebita: true, addebita_senza_costo: false, markup_percentuale: 0 },
  { nome: "Urgenza (priorità coda)", importo_predefinito: 20, addebita: true, addebita_senza_costo: false, markup_percentuale: 50 },
  { nome: "Imballaggio rinforzato", importo_predefinito: 3, addebita: false, addebita_senza_costo: false, markup_percentuale: 0 },
];

export function ServiziExtraPage() {
  const [items, setItems] = useState<ServizioExtra[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => { try { setItems(await invoke<ServizioExtra[]>("get_servizi_extra")); } catch (e) { console.error(e); } }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((s) => s.nome.toLowerCase().includes(search.toLowerCase()));
  const openNew = () => { setForm({ ...EMPTY }); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (s: ServizioExtra) => { setForm({ nome: s.nome, importo_predefinito: s.importo_predefinito, addebita: s.addebita, addebita_senza_costo: s.addebita_senza_costo, markup_percentuale: s.markup_percentuale }); setEditingId(s.id); setError(""); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome non può essere vuoto"); return; }
    try {
      if (editingId) { await invoke("update_servizio_extra", { id: editingId, data: { id: editingId, ...form } }); }
      else { await invoke("create_servizio_extra", { data: { id: 0, ...form } }); }
      setShowForm(false); setEditingId(null); setError(""); await load();
    } catch (e: any) { setError(String(e)); }
  };

  const handleDelete = async (id: number) => { await invoke("delete_servizio_extra", { id }).catch(() => {}); setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; }); await load(); };
  const handleDeleteSelected = async () => { for (const id of selectedIds) await invoke("delete_servizio_extra", { id }).catch(() => {}); setSelectedIds(new Set()); await load(); };
  const toggleSelect = (id: number) => setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((s) => s.id))); };

  const addPreset = (p: Omit<ServizioExtra, "id">) => { setForm({ ...p }); setEditingId(null); setError(""); setShowForm(true); };

  // Filtra predefiniti già presenti
  const presetsDisponibili = PRESETS.filter(p => !items.some(i => i.nome.toLowerCase() === p.nome.toLowerCase()));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Servizi extra</h3>
        <button onClick={openNew} className="s3d-btn s3d-btn-primary">+ Nuovo servizio</button>
      </div>

      {/* Predefiniti — SEMPRE VISIBILI (nasconde solo quelli già creati) */}
      {presetsDisponibili.length > 0 && (
        <div className="s3d-card-glow p-5 mb-5">
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Servizi comuni per la stampa 3D</p>
          <div className="flex flex-wrap gap-2">
            {presetsDisponibili.map((p) => (
              <button key={p.nome} onClick={() => addPreset(p)} className="s3d-btn s3d-btn-ghost text-xs">+ {p.nome} ({eur(p.importo_predefinito)})</button>
            ))}
          </div>
        </div>
      )}

      {/* Ricerca */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger">Elimina selezionati ({selectedIds.size})</button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca servizio extra"
          className="s3d-input" style={{ flex: 1 }} />
      </div>

      {/* Tabella */}
      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>{items.length === 0 ? 'Nessun servizio extra. Clicca "Nuovo servizio" o usa i predefiniti sopra.' : "Nessun risultato."}</div>
        ) : (
          <table className="s3d-table">
            <thead><tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
              <th style={{ width: 40 }}></th><th >Servizio</th>
              <th >Costo base</th><th >Markup</th>
              <th >→ Cliente</th><th >Addebito</th>
              <th style={{ textAlign: "right" }}>Azioni</th>
            </tr></thead>
            <tbody>{filtered.map((s) => {
              const pc = calcPrezzoCliente(s.importo_predefinito, s.markup_percentuale);
              return (
                <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => openEdit(s)}>
                  <td  onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} /></td>
                  <td ><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.nome}</span></td>
                  <td  style={{ fontVariantNumeric: "tabular-nums" }}>{eur(s.importo_predefinito)}</td>
                  <td >{s.markup_percentuale > 0 ? <span style={{ color: "var(--purple, #c084fc)", fontWeight: 600 }}>+{s.markup_percentuale}%</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td  style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{s.addebita || s.addebita_senza_costo ? <span style={{ color: "var(--green, #34d399)" }}>{eur(pc)}</span> : <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                  <td >{s.addebita ? <span className="s3d-badge" style={{ background: "var(--green-soft, rgba(52,211,153,.15))", color: "var(--green, #34d399)" }}>Sì, al cliente</span> : s.addebita_senza_costo ? <span className="s3d-badge" style={{ background: "var(--orange-soft, rgba(251,146,60,.15))", color: "var(--orange, #fb923c)" }}>Visibile, no costo</span> : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Costo interno</span>}</td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>Modifica</button>
                    <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Elimina</button>
                  </td>
                </tr>);
            })}</tbody>
          </table>
        )}
      </div>
      {items.length > 0 && <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>{filtered.length} di {items.length} servizi</div>}

      {/* Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, margin: "0 16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{editingId ? "Modifica servizio" : "Nuovo servizio extra"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {error && <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>{error}</div>}
              <div><label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Nome servizio *</label><input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Levigatura, Verniciatura" className="s3d-input" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Costo base (€)</label><input type="number" step="0.01" min="0" value={form.importo_predefinito} onChange={(e) => setForm({ ...form, importo_predefinito: parseFloat(e.target.value) || 0 })} className="s3d-input" /></div>
                <div><label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Markup %</label><input type="number" step="0.1" min="0" value={form.markup_percentuale} onChange={(e) => setForm({ ...form, markup_percentuale: parseFloat(e.target.value) || 0 })} className="s3d-input" /></div>
              </div>
              {form.importo_predefinito > 0 && (
                <div className="p-3 rounded-lg" style={{ background: "var(--accent-soft, rgba(99,102,241,.08))" }}>
                  <div className="flex justify-between text-sm"><span style={{ color: "var(--text-secondary)" }}>Costo base</span><span>{eur(form.importo_predefinito)}</span></div>
                  {form.markup_percentuale > 0 && <div className="flex justify-between text-sm mt-1"><span style={{ color: "var(--text-secondary)" }}>+ Markup {form.markup_percentuale}%</span><span>{eur(form.importo_predefinito * form.markup_percentuale / 100)}</span></div>}
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t" style={{ borderColor: "var(--border-subtle, rgba(120,100,220,.15))" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Prezzo al cliente</span>
                    <span className="font-bold" style={{ color: "var(--green, #34d399)" }}>{eur(calcPrezzoCliente(form.importo_predefinito, form.markup_percentuale))}</span>
                  </div>
                </div>
              )}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Comportamento nel preventivo</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={form.addebita} onChange={(e) => setForm({ ...form, addebita: e.target.checked, addebita_senza_costo: e.target.checked ? false : form.addebita_senza_costo })} style={{ width: 16, height: 16, borderRadius: 4, marginTop: 2, accentColor: "var(--accent)" }} /><div><span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Addebita al cliente</span><p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Il costo viene aggiunto al totale del preventivo</p></div></label>
                  <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={form.addebita_senza_costo} onChange={(e) => setForm({ ...form, addebita_senza_costo: e.target.checked, addebita: e.target.checked ? false : form.addebita })} style={{ width: 16, height: 16, borderRadius: 4, marginTop: 2, accentColor: "var(--accent)" }} /><div><span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>Mostra nel PDF ma non addebitare</span><p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Appare come incluso</p></div></label>
                  {!form.addebita && !form.addebita_senza_costo && <p style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 28 }}>Costo solo interno</p>}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowForm(false)} className="s3d-btn s3d-btn-ghost">Annulla</button>
              <button onClick={handleSave} className="s3d-btn s3d-btn-primary" disabled={!form.nome.trim()}>{editingId ? "Salva modifiche" : "Crea servizio"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
