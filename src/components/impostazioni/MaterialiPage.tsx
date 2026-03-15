import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SlicerProfilePicker } from "./SlicerProfilePicker";

interface Materiale {
  id: number; nome: string; profilo_slicer: string; slicer_origin: string;
  peso_specifico_gcm3: number; prezzo_kg: number; markup_percentuale: number;
  fallimento_percentuale: number; magazzino_kg: number; link_acquisto: string;
}

const EMPTY: Omit<Materiale, "id"> = {
  nome: "", profilo_slicer: "", slicer_origin: "bambu", peso_specifico_gcm3: 1.24,
  prezzo_kg: 0, markup_percentuale: 0, fallimento_percentuale: 0, magazzino_kg: 0, link_acquisto: "",
};

export function MaterialiPage() {
  const [items, setItems] = useState<Materiale[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try { setItems(await invoke<Materiale[]>("get_materiali")); } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((m) => m.nome.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setForm(EMPTY); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (m: Materiale) => {
    setForm({ nome: m.nome, profilo_slicer: m.profilo_slicer, slicer_origin: m.slicer_origin,
      peso_specifico_gcm3: m.peso_specifico_gcm3, prezzo_kg: m.prezzo_kg,
      markup_percentuale: m.markup_percentuale, fallimento_percentuale: m.fallimento_percentuale,
      magazzino_kg: m.magazzino_kg, link_acquisto: m.link_acquisto });
    setEditingId(m.id); setError(""); setShowForm(true);
  };

  const handleImportProfile = (profile: any) => {
    const density = profile.params.filament_density
      ? parseFloat(String(profile.params.filament_density)) || 1.24 : 1.24;
    const cost = profile.params.filament_cost
      ? parseFloat(String(profile.params.filament_cost)) || 0 : 0;

    setForm({
      ...EMPTY,
      nome: profile.nome,
      profilo_slicer: profile.nome,
      slicer_origin: profile.origin,
      peso_specifico_gcm3: density,
      prezzo_kg: cost,
    });
    setEditingId(null);
    setError("");
    setShowPicker(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome del materiale non puo essere vuoto"); return; }
    if (form.prezzo_kg <= 0) { setError("Il prezzo deve essere maggiore di zero"); return; }
    try {
      if (editingId) { await invoke("update_materiale", { id: editingId, data: { id: editingId, ...form } }); }
      else { await invoke("create_materiale", { data: { id: 0, ...form } }); }
      setShowForm(false); setEditingId(null); setError(""); await load();
    } catch (e: any) { setError(String(e)); }
  };

  const handleDelete = async (id: number) => {
    await invoke("delete_materiale", { id }).catch(() => {});
    setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; }); await load();
  };
  const handleDeleteSelected = async () => {
    for (const id of selectedIds) await invoke("delete_materiale", { id }).catch(() => {});
    setSelectedIds(new Set()); await load();
  };
  const toggleSelect = (id: number) => setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((m) => m.id))); };
  const updateField = (field: string, value: string | number) => setForm((p) => ({ ...p, [field]: value }));
  const formatPrice = (v: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Materiali</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(true)}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium">
            Importa da Bambu Studio
          </button>
          <button onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Nuovo materiale
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
            Elimina selezionati ({selectedIds.size})
          </button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca materiale per nome"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{items.length === 0 ? 'Nessun materiale inserito. Usa "Importa da Bambu Studio" o "Nuovo materiale".' : "Nessun risultato."}</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50">
              <th className="w-10 px-4 py-3"></th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Nome materiale</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Peso sp.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Prezzo/kg</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Markup</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Fallim.</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Magazzino</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
            </tr></thead>
            <tbody>{filtered.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer" onClick={() => openEdit(m)}>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} className="w-4 h-4 rounded" />
                </td>
                <td className="px-4 py-3"><div className="flex items-center gap-2">
                  <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded font-medium">{m.slicer_origin === "bambu" ? "Bambu" : "Orca"}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{m.nome}</span>
                </div></td>
                <td className="px-4 py-3 text-gray-600">{m.peso_specifico_gcm3} g/cm3</td>
                <td className="px-4 py-3 font-medium">{formatPrice(m.prezzo_kg)}/kg</td>
                <td className="px-4 py-3 text-gray-600">{m.markup_percentuale}%</td>
                <td className="px-4 py-3 text-gray-600">{m.fallimento_percentuale}%</td>
                <td className="px-4 py-3"><span className={m.magazzino_kg <= 1.5 ? "text-red-600 font-medium" : ""}>{m.magazzino_kg.toFixed(2)} kg</span></td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(m)} className="text-blue-600 text-xs mr-3">Modifica</button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-500 text-xs">Elimina</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Slicer Profile Picker */}
      {showPicker && <SlicerProfilePicker tipo="filament" onSelect={handleImportProfile} onClose={() => setShowPicker(false)} />}

      {/* Form modale */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">{editingId ? "Modifica materiale" : "Nuovo materiale"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              {form.profilo_slicer && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  Profilo slicer: {form.profilo_slicer}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome materiale *</label>
                <input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Es. Bambu PLA Basic"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Peso specifico (g/cm3)</label>
                  <input type="number" step="0.01" value={form.peso_specifico_gcm3} onChange={(e) => updateField("peso_specifico_gcm3", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-100 dark:bg-gray-600 outline-none" readOnly={!!form.profilo_slicer} />
                  {form.profilo_slicer && <p className="text-xs text-gray-400 mt-1">Letto dal profilo slicer</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prezzo (EUR/kg) *</label>
                  <input type="number" step="0.01" value={form.prezzo_kg} onChange={(e) => updateField("prezzo_kg", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Markup materiale %</label>
                  <input type="number" step="0.1" value={form.markup_percentuale} onChange={(e) => updateField("markup_percentuale", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fallimento %</label>
                  <input type="number" step="0.1" value={form.fallimento_percentuale} onChange={(e) => updateField("fallimento_percentuale", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magazzino (kg)</label>
                  <input type="number" step="0.01" value={form.magazzino_kg} onChange={(e) => updateField("magazzino_kg", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link acquisto</label>
                  <input type="url" value={form.link_acquisto} onChange={(e) => updateField("link_acquisto", e.target.value)} placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {editingId ? "Salva modifiche" : "Crea materiale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
