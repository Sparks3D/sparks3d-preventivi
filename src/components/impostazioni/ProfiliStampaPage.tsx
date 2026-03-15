import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { SlicerProfilePicker } from "./SlicerProfilePicker";

interface ProfiloStampa {
  id: number; nome: string; profilo_slicer: string; slicer_origin: string;
  layer_height_mm: number; numero_pareti: number; infill_percentuale: number;
  top_layers: number; bottom_layers: number; supporti_albero: boolean; supporti_normali: boolean;
}

const EMPTY: Omit<ProfiloStampa, "id"> = {
  nome: "", profilo_slicer: "", slicer_origin: "bambu", layer_height_mm: 0.20,
  numero_pareti: 2, infill_percentuale: 15, top_layers: 4, bottom_layers: 4,
  supporti_albero: false, supporti_normali: false,
};

export function ProfiliStampaPage() {
  const [items, setItems] = useState<ProfiloStampa[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try { setItems(await invoke<ProfiloStampa[]>("get_profili")); } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((p) => p.nome.toLowerCase().includes(search.toLowerCase()));
  const openNew = () => { setForm(EMPTY); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (p: ProfiloStampa) => {
    setForm({ nome: p.nome, profilo_slicer: p.profilo_slicer, slicer_origin: p.slicer_origin,
      layer_height_mm: p.layer_height_mm, numero_pareti: p.numero_pareti,
      infill_percentuale: p.infill_percentuale, top_layers: p.top_layers, bottom_layers: p.bottom_layers,
      supporti_albero: p.supporti_albero, supporti_normali: p.supporti_normali });
    setEditingId(p.id); setError(""); setShowForm(true);
  };

  const handleImportProfile = (profile: any) => {
    const p = profile.params;
    const parseNum = (v: any, def: number) => v ? parseFloat(String(v).replace('%', '')) || def : def;
    const parseInt2 = (v: any, def: number) => v ? parseInt(String(v)) || def : def;

    const supportEnabled = p.enable_support ? (String(p.enable_support) === "1" || String(p.enable_support) === "true") : false;
    const isTree = supportEnabled && p.support_type ? String(p.support_type).includes("tree") : false;

    setForm({
      nome: profile.nome,
      profilo_slicer: profile.nome,
      slicer_origin: profile.origin,
      layer_height_mm: parseNum(p.layer_height, 0.2),
      numero_pareti: parseInt2(p.wall_loops, 2),
      infill_percentuale: parseNum(p.sparse_infill_density, 15),
      top_layers: parseInt2(p.top_shell_layers, 4),
      bottom_layers: parseInt2(p.bottom_shell_layers, 4),
      supporti_albero: isTree,
      supporti_normali: supportEnabled && !isTree,
    });
    setEditingId(null); setError(""); setShowPicker(false); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome del profilo non puo essere vuoto"); return; }
    try {
      const payload = { id: editingId || 0, ...form };
      if (editingId) { await invoke("update_profilo", { id: editingId, data: payload }); }
      else { await invoke("create_profilo", { data: payload }); }
      setShowForm(false); setEditingId(null); setError(""); await load();
    } catch (e: any) { setError(String(e)); }
  };

  const handleDelete = async (id: number) => { await invoke("delete_profilo", { id }).catch(() => {}); setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; }); await load(); };
  const handleDeleteSelected = async () => { for (const id of selectedIds) await invoke("delete_profilo", { id }).catch(() => {}); setSelectedIds(new Set()); await load(); };
  const toggleSelect = (id: number) => setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map((p) => p.id))); };
  const updateField = (field: string, value: string | number | boolean) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profili di stampa</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(true)} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 text-sm font-medium">Importa da Bambu Studio</button>
          <button onClick={openNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Nuovo profilo</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
        {selectedIds.size > 0 && <button onClick={handleDeleteSelected} className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg">Elimina ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca profilo"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{items.length === 0 ? 'Usa "Importa da Bambu Studio" per importare i profili di stampa.' : "Nessun risultato."}</div>
        ) : (
          <table className="w-full text-sm"><thead><tr className="border-b bg-gray-50">
            <th className="w-10 px-4 py-3"></th><th className="text-left px-4 py-3 font-medium text-gray-500">Nome</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Layer</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Pareti</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Infill</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Top/Bot</th>
            <th className="text-left px-4 py-3 font-medium text-gray-500">Supporti</th>
            <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
          </tr></thead><tbody>{filtered.map((p) => (
            <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => openEdit(p)}>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 rounded" /></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{p.slicer_origin === "bambu" ? "Bambu" : "Orca"}</span><span className="font-medium">{p.nome}</span></div></td>
              <td className="px-4 py-3 text-gray-600">{p.layer_height_mm}mm</td>
              <td className="px-4 py-3 text-gray-600">{p.numero_pareti}</td>
              <td className="px-4 py-3 text-gray-600">{p.infill_percentuale}%</td>
              <td className="px-4 py-3 text-gray-600">{p.top_layers}/{p.bottom_layers}</td>
              <td className="px-4 py-3">
                {p.supporti_albero && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded mr-1">Albero</span>}
                {p.supporti_normali && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Normali</span>}
                {!p.supporti_albero && !p.supporti_normali && <span className="text-gray-400">-</span>}
              </td>
              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(p)} className="text-blue-600 text-xs mr-3">Modifica</button>
                <button onClick={() => handleDelete(p.id)} className="text-red-500 text-xs">Elimina</button>
              </td>
            </tr>
          ))}</tbody></table>
        )}
      </div>

      {showPicker && <SlicerProfilePicker tipo="process" onSelect={handleImportProfile} onClose={() => setShowPicker(false)} />}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold">{editingId ? "Modifica profilo" : "Nuovo profilo"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              {form.profilo_slicer && <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700">Profilo slicer: {form.profilo_slicer}</div>}
              <div><label className="block text-sm font-medium mb-1">Nome profilo *</label>
                <input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Layer height (mm)</label>
                  <input type="number" step="0.01" value={form.layer_height_mm} onChange={(e) => updateField("layer_height_mm", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Numero pareti</label>
                  <input type="number" step="1" value={form.numero_pareti} onChange={(e) => updateField("numero_pareti", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Infill %</label>
                  <input type="number" step="1" value={form.infill_percentuale} onChange={(e) => updateField("infill_percentuale", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Top layers</label>
                  <input type="number" step="1" value={form.top_layers} onChange={(e) => updateField("top_layers", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
                <div><label className="block text-sm font-medium mb-1">Bottom layers</label>
                  <input type="number" step="1" value={form.bottom_layers} onChange={(e) => updateField("bottom_layers", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 outline-none" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Supporti di stampa</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.supporti_albero}
                      onChange={(e) => { updateField("supporti_albero", e.target.checked); if (e.target.checked) updateField("supporti_normali", false); }}
                      className="w-4 h-4 rounded" /><span className="text-sm">Albero (30°)</span></label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.supporti_normali}
                      onChange={(e) => { updateField("supporti_normali", e.target.checked); if (e.target.checked) updateField("supporti_albero", false); }}
                      className="w-4 h-4 rounded" /><span className="text-sm">Normali snug (30°)</span></label>
                </div>
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
