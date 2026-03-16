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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Profili di stampa</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPicker(true)} className="s3d-btn s3d-btn-primary" style={{ background: "var(--orange)", boxShadow: "0 2px 12px rgba(249,115,22,0.3)" }}>Importa da Bambu Studio</button>
          <button onClick={openNew} className="s3d-btn s3d-btn-primary">Nuovo profilo</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
        {selectedIds.size > 0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger" style={{ padding: "6px 14px", fontSize: 12 }}>Elimina ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca profilo"
          className="s3d-input" style={{ flex: 1 }} />
      </div>

      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>{items.length === 0 ? 'Usa "Importa da Bambu Studio" per importare i profili di stampa.' : "Nessun risultato."}</div>
        ) : (
          <table className="s3d-table"><thead><tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
            <th style={{ width: 40 }}></th><th >Nome</th>
            <th >Layer</th>
            <th >Pareti</th>
            <th >Infill</th>
            <th >Top/Bot</th>
            <th >Supporti</th>
            <th style={{ textAlign: "right" }}>Azioni</th>
          </tr></thead><tbody>{filtered.map((p) => (
            <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => openEdit(p)}>
              <td  onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} /></td>
              <td ><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 10, padding: "2px 8px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, fontWeight: 600 }}>{p.slicer_origin === "bambu" ? "Bambu" : "Orca"}</span><span style={{ fontWeight: 600 }}>{p.nome}</span></div></td>
              <td style={{ color: "var(--text-secondary)" }}>{p.layer_height_mm}mm</td>
              <td style={{ color: "var(--text-secondary)" }}>{p.numero_pareti}</td>
              <td style={{ color: "var(--text-secondary)" }}>{p.infill_percentuale}%</td>
              <td style={{ color: "var(--text-secondary)" }}>{p.top_layers}/{p.bottom_layers}</td>
              <td >
                {p.supporti_albero && <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--green-soft)", color: "var(--green)", borderRadius: 4, marginRight: 4 }}>Albero</span>}
                {p.supporti_normali && <span style={{ fontSize: 10, padding: "2px 6px", background: "var(--orange-soft)", color: "var(--orange)", borderRadius: 4 }}>Normali</span>}
                {!p.supporti_albero && !p.supporti_normali && <span style={{ color: "var(--text-muted)" }}>-</span>}
              </td>
              <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>Modifica</button>
                <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Elimina</button>
              </td>
            </tr>
          ))}</tbody></table>
        )}
      </div>

      {showPicker && <SlicerProfilePicker tipo="process" onSelect={handleImportProfile} onClose={() => setShowPicker(false)} />}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, margin: "0 16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{editingId ? "Modifica profilo" : "Nuovo profilo"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>x</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {error && <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>{error}</div>}
              {form.profilo_slicer && <div style={{ padding: 8, background: "var(--accent-soft)", borderRadius: 8, fontSize: 12, color: "var(--accent)" }}>Profilo slicer: {form.profilo_slicer}</div>}
              <div><label className="block text-sm font-medium mb-1">Nome profilo *</label>
                <input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)}
                  className="s3d-input" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="block text-sm font-medium mb-1">Layer height (mm)</label>
                  <input type="number" step="0.01" value={form.layer_height_mm} onChange={(e) => updateField("layer_height_mm", parseFloat(e.target.value) || 0)}
                    className="s3d-input" /></div>
                <div><label className="block text-sm font-medium mb-1">Numero pareti</label>
                  <input type="number" step="1" value={form.numero_pareti} onChange={(e) => updateField("numero_pareti", parseInt(e.target.value) || 0)}
                    className="s3d-input" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label className="block text-sm font-medium mb-1">Infill %</label>
                  <input type="number" step="1" value={form.infill_percentuale} onChange={(e) => updateField("infill_percentuale", parseFloat(e.target.value) || 0)}
                    className="s3d-input" /></div>
                <div><label className="block text-sm font-medium mb-1">Top layers</label>
                  <input type="number" step="1" value={form.top_layers} onChange={(e) => updateField("top_layers", parseInt(e.target.value) || 0)}
                    className="s3d-input" /></div>
                <div><label className="block text-sm font-medium mb-1">Bottom layers</label>
                  <input type="number" step="1" value={form.bottom_layers} onChange={(e) => updateField("bottom_layers", parseInt(e.target.value) || 0)}
                    className="s3d-input" /></div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Supporti di stampa</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.supporti_albero}
                      onChange={(e) => { updateField("supporti_albero", e.target.checked); if (e.target.checked) updateField("supporti_normali", false); }}
                      style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} /><span className="text-sm">Albero (30°)</span></label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.supporti_normali}
                      onChange={(e) => { updateField("supporti_normali", e.target.checked); if (e.target.checked) updateField("supporti_albero", false); }}
                      style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} /><span className="text-sm">Normali snug (30°)</span></label>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, padding: "16px 24px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowForm(false)} className="s3d-btn s3d-btn-ghost">Annulla</button>
              <button onClick={handleSave} className="px-6 py-2 s3d-active-tab rounded-lg text-sm font-medium">{editingId ? "Salva" : "Crea"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
