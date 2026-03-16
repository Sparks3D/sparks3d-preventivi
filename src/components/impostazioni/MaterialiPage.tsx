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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Materiali</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPicker(true)}
            className="s3d-btn s3d-btn-primary" style={{ background: "var(--orange)", boxShadow: "0 2px 12px rgba(249,115,22,0.3)" }}>
            Importa da Bambu Studio
          </button>
          <button onClick={openNew}
            className="s3d-btn s3d-btn-primary">
            Nuovo materiale
          </button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger">
            Elimina selezionati ({selectedIds.size})
          </button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca materiale per nome"
          className="s3d-input" style={{ flex: 1 }} />
      </div>

      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>{items.length === 0 ? 'Nessun materiale inserito. Usa "Importa da Bambu Studio" o "Nuovo materiale".' : "Nessun risultato."}</div>
        ) : (
          <table className="s3d-table">
            <thead><tr style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-default)" }}>
              <th style={{ width: 40 }}></th>
              <th >Nome materiale</th>
              <th >Peso sp.</th>
              <th >Prezzo/kg</th>
              <th >Markup</th>
              <th >Fallim.</th>
              <th >Magazzino</th>
              <th style={{ textAlign: "right" }}>Azioni</th>
            </tr></thead>
            <tbody>{filtered.map((m) => (
              <tr key={m.id} style={{ cursor: "pointer" }} onClick={() => openEdit(m)}>
                <td  onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
                </td>
                <td ><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, padding: "2px 8px", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: 4, fontWeight: 600 }}>{m.slicer_origin === "bambu" ? "Bambu" : "Orca"}</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.nome}</span>
                </div></td>
                <td style={{ color: "var(--text-secondary)" }}>{m.peso_specifico_gcm3} g/cm3</td>
                <td >{formatPrice(m.prezzo_kg)}/kg</td>
                <td style={{ color: "var(--text-secondary)" }}>{m.markup_percentuale}%</td>
                <td style={{ color: "var(--text-secondary)" }}>{m.fallimento_percentuale}%</td>
                <td ><span style={{ color: m.magazzino_kg <= 1.5 ? "var(--red)" : "inherit", fontWeight: m.magazzino_kg <= 1.5 ? 600 : 400 }}>{m.magazzino_kg.toFixed(2)} kg</span></td>
                <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(m)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>Modifica</button>
                  <button onClick={() => handleDelete(m.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Elimina</button>
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
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, margin: "0 16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{editingId ? "Modifica materiale" : "Nuovo materiale"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>x</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {error && <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>{error}</div>}
              {form.profilo_slicer && (
                <div style={{ padding: 8, background: "var(--accent-soft)", borderRadius: 8, fontSize: 12, color: "var(--accent)" }}>
                  Profilo slicer: {form.profilo_slicer}
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Nome materiale *</label>
                <input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Es. Bambu PLA Basic"
                  className="s3d-input" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Peso specifico (g/cm3)</label>
                  <input type="number" step="0.01" value={form.peso_specifico_gcm3} onChange={(e) => updateField("peso_specifico_gcm3", parseFloat(e.target.value) || 0)}
                    className="s3d-input" style={{ opacity: 0.6 }} readOnly={!!form.profilo_slicer} />
                  {form.profilo_slicer && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Letto dal profilo slicer</p>}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Prezzo (EUR/kg) *</label>
                  <input type="number" step="0.01" value={form.prezzo_kg} onChange={(e) => updateField("prezzo_kg", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Markup materiale %</label>
                  <input type="number" step="0.1" value={form.markup_percentuale} onChange={(e) => updateField("markup_percentuale", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Fallimento %</label>
                  <input type="number" step="0.1" value={form.fallimento_percentuale} onChange={(e) => updateField("fallimento_percentuale", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Magazzino (kg)</label>
                  <input type="number" step="0.01" value={form.magazzino_kg} onChange={(e) => updateField("magazzino_kg", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Link acquisto</label>
                  <input type="url" value={form.link_acquisto} onChange={(e) => updateField("link_acquisto", e.target.value)} placeholder="https://..."
                    className="s3d-input" />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowForm(false)} className="s3d-btn s3d-btn-ghost">Annulla</button>
              <button onClick={handleSave} className="s3d-btn s3d-btn-primary">
                {editingId ? "Salva modifiche" : "Crea materiale"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
