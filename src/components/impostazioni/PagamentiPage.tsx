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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Metodi di pagamento</h3>
        <button onClick={openNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuovo metodo
        </button>
      </div>

      {/* Predefiniti rapidi — sempre visibili */}
      {(
        <div className="s3d-card-glow p-5 mb-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
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
      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox"
          checked={selectedIds.size === filtered.length && filtered.length > 0}
          onChange={toggleSelectAll} className="w-4 h-4 rounded" />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
            Elimina selezionati ({selectedIds.size})
          </button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca metodo di pagamento"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {items.length === 0
              ? 'Nessun metodo di pagamento. Clicca "Nuovo metodo" o usa i predefiniti sopra.'
              : "Nessun risultato."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Descrizione PDF</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Commissione</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Addebita</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEdit(m)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(m.id)}
                      onChange={() => toggleSelect(m.id)} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getIcon(m.nome)}</span>
                      <span className="font-medium text-gray-900">{m.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600" style={{ maxWidth: 300 }}>
                    <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.descrizione_pdf || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.commissione_percentuale > 0 || m.commissione_fissa > 0 ? (
                      <span style={{ color: "var(--orange, #fb923c)", fontWeight: 600, fontSize: 13 }}>
                        {m.commissione_percentuale > 0 && `${m.commissione_percentuale}%`}
                        {m.commissione_percentuale > 0 && m.commissione_fissa > 0 && " + "}
                        {m.commissione_fissa > 0 && eur(m.commissione_fissa)}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.addebita_al_cliente ? (
                      <span className="s3d-badge" style={{
                        background: "var(--green-soft, rgba(52,211,153,.15))",
                        color: "var(--green, #34d399)"
                      }}>
                        Al cliente
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(m)} className="text-blue-600 text-xs mr-3">Modifica</button>
                    <button onClick={() => handleDelete(m.id)} className="text-red-500 text-xs">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {filtered.length} di {items.length} metodi
        </div>
      )}

      {/* ── Modal Crea/Modifica ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">
                {editingId ? "Modifica metodo" : "Nuovo metodo di pagamento"}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome metodo *</label>
                <input type="text" value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Es. Bonifico bancario, PayPal, Contanti"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              {/* Descrizione PDF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione per PDF</label>
                <textarea value={form.descrizione_pdf}
                  onChange={(e) => setForm({ ...form, descrizione_pdf: e.target.value })}
                  placeholder="Testo stampato nel preventivo PDF…"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
                <p className="text-xs text-gray-500 mt-1">Stampato nel PDF accanto al metodo di pagamento</p>
              </div>

              {/* Commissioni */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Commissioni transazione
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Percentuale %</label>
                    <input type="number" step="0.01" min="0"
                      value={form.commissione_percentuale}
                      onChange={(e) => setForm({ ...form, commissione_percentuale: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">Es. PayPal Italia: 3,40%</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fisso (€)</label>
                    <input type="number" step="0.01" min="0"
                      value={form.commissione_fissa}
                      onChange={(e) => setForm({ ...form, commissione_fissa: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <p className="text-xs text-gray-500 mt-1">Es. PayPal Italia: € 0,35</p>
                  </div>
                </div>

                {/* Toggle addebita al cliente */}
                <label className="flex items-center gap-3 mt-4 cursor-pointer">
                  <input type="checkbox"
                    checked={form.addebita_al_cliente}
                    onChange={(e) => setForm({ ...form, addebita_al_cliente: e.target.checked })}
                    className="w-4 h-4 rounded" />
                  <span className="text-sm text-gray-700 font-medium">
                    Addebita commissione al cliente
                  </span>
                </label>
                {form.addebita_al_cliente && (
                  <p className="text-xs text-gray-500 mt-1.5 ml-7">
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
                          <span className="text-gray-600">Preventivo {eur(importo)}</span>
                          <span className="font-medium" style={{ color: "var(--orange, #fb923c)" }}>
                            + {eur(comm)} commissione
                            {form.addebita_al_cliente && (
                              <span className="text-gray-500 font-normal"> → cliente paga {eur(importo + comm)}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
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
