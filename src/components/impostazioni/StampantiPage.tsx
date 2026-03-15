import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SlicerProfilePicker } from "./SlicerProfilePicker";

interface Stampante {
  id: number; nome: string; profilo_slicer: string; slicer_origin: string;
  consumo_kwh: number; ammortamento_ora: number;
}

const EMPTY: Omit<Stampante, "id"> = { nome: "", profilo_slicer: "", slicer_origin: "bambu", consumo_kwh: 0.12, ammortamento_ora: 1.5 };

export function StampantiPage() {
  const [items, setItems] = useState<Stampante[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [costoEnergia, setCostoEnergia] = useState("0.30");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setItems(await invoke<Stampante[]>("get_stampanti"));
      setCostoEnergia(await invoke<string>("get_impostazione", { chiave: "costo_energia_kwh" }));
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((s) => s.nome.toLowerCase().includes(search.toLowerCase()));
  const openNew = () => { setForm(EMPTY); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (s: Stampante) => {
    setForm({ nome: s.nome, profilo_slicer: s.profilo_slicer, slicer_origin: s.slicer_origin, consumo_kwh: s.consumo_kwh, ammortamento_ora: s.ammortamento_ora });
    setEditingId(s.id); setError(""); setShowForm(true);
  };

  const handleImportProfile = (profile: any) => {
    setForm({ ...EMPTY, nome: profile.nome, profilo_slicer: profile.nome, slicer_origin: profile.origin });
    setEditingId(null); setError(""); setShowPicker(false); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome della stampante non puo essere vuoto"); return; }
    try {
      if (editingId) { await invoke("update_stampante", { id: editingId, data: { id: editingId, ...form } }); }
      else { await invoke("create_stampante", { data: { id: 0, ...form } }); }
      setShowForm(false); setEditingId(null); setError(""); await load();
    } catch (e: any) { setError(String(e)); }
  };

  const handleDelete = async (id: number) => { await invoke("delete_stampante", { id }).catch(() => {}); setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; }); await load(); };
  const handleDeleteSelected = async () => { for (const id of selectedIds) await invoke("delete_stampante", { id }).catch(() => {}); setSelectedIds(new Set()); await load(); };
  const saveCostoEnergia = async (val: string) => { setCostoEnergia(val); await invoke("set_impostazione", { chiave: "costo_energia_kwh", valore: val }).catch(() => {}); };
  const toggleSelect = (id: number) => setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((s) => s.id))); };
  const updateField = (field: string, value: string | number) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Stampanti</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(true)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium">Importa da Bambu Studio</button>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Nuova stampante</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Costo energia EUR/kWh</span>
        <input type="number" step="0.01" value={costoEnergia} onChange={(e) => saveCostoEnergia(e.target.value)}
          className="w-24 px-2 py-1 border border-amber-300 rounded text-sm bg-white dark:bg-gray-800 outline-none" />
        <span className="text-xs text-amber-600">Controlla con il tuo fornitore il reale costo</span>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
        {selectedIds.size > 0 && <button onClick={handleDeleteSelected} className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg">Elimina ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca stampante"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{items.length === 0 ? 'Usa "Importa da Bambu Studio" o "Nuova stampante".' : "Nessun risultato."}</div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
            <th className="w-10 px-4 py-3"></th><th className="text-left px-4 py-3 font-medium text-gray-500">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Consumo kW/h</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Ammortamento/h</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
          </tr></thead><tbody>{filtered.map((s) => (
            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(s)}>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} className="w-4 h-4 rounded" /></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{s.slicer_origin === "bambu" ? "Bambu" : "Orca"}</span><span className="font-medium">{s.nome}</span></div></td>
              <td className="px-4 py-3 text-gray-600">{s.consumo_kwh} kW/h</td>
              <td className="px-4 py-3 text-gray-600">{"\u20AC"} {s.ammortamento_ora.toFixed(2)}/h</td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(s)} className="text-blue-600 text-xs mr-3">Modifica</button>
                <button onClick={() => handleDelete(s.id)} className="text-red-500 text-xs">Elimina</button>
              </td>
            </tr>
          ))}</tbody></table>
        )}
      </div>

      {showPicker && <SlicerProfilePicker tipo="machine" onSelect={handleImportProfile} onClose={() => setShowPicker(false)} />}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">{editingId ? "Modifica" : "Nuova stampante"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              {form.profilo_slicer && <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700">Profilo slicer: {form.profilo_slicer}</div>}
              <div><label className="block text-sm font-medium mb-1">Nome stampante *</label>
                <input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Es. Bambu Lab X1C"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Consumo medio kW/h</label>
                  <input type="number" step="0.01" value={form.consumo_kwh} onChange={(e) => updateField("consumo_kwh", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Ammortamento EUR/h</label>
                  <input type="number" step="0.01" value={form.ammortamento_ora} onChange={(e) => updateField("ammortamento_ora", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" />
                  <p className="text-xs text-gray-400 mt-1">Ricambi, manutenzione, svalutamento</p></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">{editingId ? "Salva" : "Crea"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
