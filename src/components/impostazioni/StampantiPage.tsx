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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Stampanti</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPicker(true)} className="s3d-btn s3d-btn-primary" style={{ background: "var(--orange)", boxShadow: "0 2px 12px rgba(249,115,22,0.3)" }}>Importa da Bambu Studio</button>
          <button onClick={openNew} className="s3d-btn s3d-btn-primary">Nuova stampante</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: 12, background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 10 }}>
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Costo energia EUR/kWh</span>
        <input type="number" step="0.01" value={costoEnergia} onChange={(e) => saveCostoEnergia(e.target.value)}
          className="s3d-input" style={{ width: 96 }} />
        <span className="text-xs text-amber-600">Controlla con il tuo fornitore il reale costo</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
        {selectedIds.size > 0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger" style={{ padding: "6px 14px", fontSize: 12 }}>Elimina ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca stampante"
          className="s3d-input" style={{ flex: 1 }} />
      </div>

      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>{items.length === 0 ? 'Usa "Importa da Bambu Studio" o "Nuova stampante".' : "Nessun risultato."}</div>
        ) : (
          <table className="s3d-table"><thead><tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
            <th style={{ width: 40 }}></th><th >Nome</th>
            <th >Consumo kW/h</th>
            <th >Ammortamento/h</th>
            <th style={{ textAlign: "right" }}>Azioni</th>
          </tr></thead><tbody>{filtered.map((s) => (
            <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => openEdit(s)}>
              <td  onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleSelect(s.id)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} /></td>
              <td ><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 10, padding: "2px 8px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, fontWeight: 600 }}>{s.slicer_origin === "bambu" ? "Bambu" : "Orca"}</span><span style={{ fontWeight: 600 }}>{s.nome}</span></div></td>
              <td style={{ color: "var(--text-secondary)" }}>{s.consumo_kwh} kW/h</td>
              <td style={{ color: "var(--text-secondary)" }}>{"\u20AC"} {s.ammortamento_ora.toFixed(2)}/h</td>
              <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(s)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>Modifica</button>
                <button onClick={() => handleDelete(s.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Elimina</button>
              </td>
            </tr>
          ))}</tbody></table>
        )}
      </div>

      {showPicker && <SlicerProfilePicker tipo="machine" onSelect={handleImportProfile} onClose={() => setShowPicker(false)} />}

      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, margin: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{editingId ? "Modifica" : "Nuova stampante"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>x</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {error && <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>{error}</div>}
              {form.profilo_slicer && <div style={{ padding: 8, background: "var(--accent-soft)", borderRadius: 8, fontSize: 12, color: "var(--accent)" }}>Profilo slicer: {form.profilo_slicer}</div>}
              <div><label className="block text-sm font-medium mb-1">Nome stampante *</label>
                <input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Es. Bambu Lab X1C"
                  className="s3d-input" /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="block text-sm font-medium mb-1">Consumo medio kW/h</label>
                  <input type="number" step="0.01" value={form.consumo_kwh} onChange={(e) => updateField("consumo_kwh", parseFloat(e.target.value) || 0)}
                    className="s3d-input" /></div>
                <div><label className="block text-sm font-medium mb-1">Ammortamento EUR/h</label>
                  <input type="number" step="0.01" value={form.ammortamento_ora} onChange={(e) => updateField("ammortamento_ora", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Ricambi, manutenzione, svalutamento</p></div>
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
