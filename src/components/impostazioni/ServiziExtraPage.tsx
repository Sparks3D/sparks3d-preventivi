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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Servizi extra</h3>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">+ Nuovo servizio</button>
      </div>

      {/* Predefiniti — SEMPRE VISIBILI */}
      <div className="s3d-card-glow p-5 mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Servizi comuni per la stampa 3D</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button key={p.nome} onClick={() => addPreset(p)} className="s3d-btn s3d-btn-ghost text-xs">+ {p.nome} ({eur(p.importo_predefinito)})</button>
          ))}
        </div>
      </div>

      {/* Ricerca */}
      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50">Elimina selezionati ({selectedIds.size})</button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca servizio extra"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{items.length === 0 ? 'Nessun servizio extra. Clicca "Nuovo servizio" o usa i predefiniti sopra.' : "Nessun risultato."}</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-10 px-4 py-3"></th><th className="text-left px-4 py-3 font-medium text-gray-500">Servizio</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Costo base</th><th className="text-left px-4 py-3 font-medium text-gray-500">Markup</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">→ Cliente</th><th className="text-left px-4 py-3 font-medium text-gray-500">Addebito</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
            </tr></thead>
            <tbody>{filtered.map((s) => {
              const pc = calcPrezzoCliente(s.importo_predefinito, s.markup_percentuale);
              return (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(s)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="w-4 h-4 rounded" /></td>
                  <td className="px-4 py-3"><span className="font-medium text-gray-900">{s.nome}</span></td>
                  <td className="px-4 py-3" style={{ fontVariantNumeric: "tabular-nums" }}>{eur(s.importo_predefinito)}</td>
                  <td className="px-4 py-3">{s.markup_percentuale > 0 ? <span style={{ color: "var(--purple, #c084fc)", fontWeight: 600 }}>+{s.markup_percentuale}%</span> : <span className="text-gray-500">—</span>}</td>
                  <td className="px-4 py-3" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{s.addebita || s.addebita_senza_costo ? <span style={{ color: "var(--green, #34d399)" }}>{eur(pc)}</span> : <span className="text-gray-500">—</span>}</td>
                  <td className="px-4 py-3">{s.addebita ? <span className="s3d-badge" style={{ background: "var(--green-soft, rgba(52,211,153,.15))", color: "var(--green, #34d399)" }}>Sì, al cliente</span> : s.addebita_senza_costo ? <span className="s3d-badge" style={{ background: "var(--orange-soft, rgba(251,146,60,.15))", color: "var(--orange, #fb923c)" }}>Visibile, no costo</span> : <span className="text-gray-500 text-xs">Costo interno</span>}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} className="text-blue-600 text-xs mr-3">Modifica</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-500 text-xs">Elimina</button>
                  </td>
                </tr>);
            })}</tbody>
          </table>
        )}
      </div>
      {items.length > 0 && <div className="mt-3 text-xs text-gray-500">{filtered.length} di {items.length} servizi</div>}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">{editingId ? "Modifica servizio" : "Nuovo servizio extra"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome servizio *</label><input type="text" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Es. Levigatura, Verniciatura" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Costo base (€)</label><input type="number" step="0.01" min="0" value={form.importo_predefinito} onChange={(e) => setForm({ ...form, importo_predefinito: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Markup %</label><input type="number" step="0.1" min="0" value={form.markup_percentuale} onChange={(e) => setForm({ ...form, markup_percentuale: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              </div>
              {form.importo_predefinito > 0 && (
                <div className="p-3 rounded-lg" style={{ background: "var(--accent-soft, rgba(99,102,241,.08))" }}>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Costo base</span><span>{eur(form.importo_predefinito)}</span></div>
                  {form.markup_percentuale > 0 && <div className="flex justify-between text-sm mt-1"><span className="text-gray-600">+ Markup {form.markup_percentuale}%</span><span>{eur(form.importo_predefinito * form.markup_percentuale / 100)}</span></div>}
                  <div className="flex justify-between text-sm mt-1 pt-1 border-t" style={{ borderColor: "var(--border-subtle, rgba(120,100,220,.15))" }}>
                    <span className="font-medium text-gray-900">Prezzo al cliente</span>
                    <span className="font-bold" style={{ color: "var(--green, #34d399)" }}>{eur(calcPrezzoCliente(form.importo_predefinito, form.markup_percentuale))}</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Comportamento nel preventivo</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={form.addebita} onChange={(e) => setForm({ ...form, addebita: e.target.checked, addebita_senza_costo: e.target.checked ? false : form.addebita_senza_costo })} className="w-4 h-4 rounded mt-0.5" /><div><span className="text-sm text-gray-700 font-medium">Addebita al cliente</span><p className="text-xs text-gray-500 mt-0.5">Il costo viene aggiunto al totale del preventivo</p></div></label>
                  <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={form.addebita_senza_costo} onChange={(e) => setForm({ ...form, addebita_senza_costo: e.target.checked, addebita: e.target.checked ? false : form.addebita })} className="w-4 h-4 rounded mt-0.5" /><div><span className="text-sm text-gray-700 font-medium">Mostra nel PDF ma non addebitare</span><p className="text-xs text-gray-500 mt-0.5">Appare come incluso</p></div></label>
                  {!form.addebita && !form.addebita_senza_costo && <p className="text-xs text-gray-500 ml-7">Costo solo interno</p>}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50" disabled={!form.nome.trim()}>{editingId ? "Salva modifiche" : "Crea servizio"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
