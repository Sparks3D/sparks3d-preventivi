// src/components/impostazioni/CorrieriPage.tsx
// Sparks3D Preventivi – Corrieri CRUD + PackLink Pro tariffe live
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

// ── Tipi (match con packlink.rs) ──

interface Corriere {
  id: number;
  nome: string;
  servizio: string;
  costo_spedizione: number;
  tempo_consegna: string;
  packlink_service_id: string;
  note: string;
}

interface ServizioCorrere {
  id: string;
  nome_corriere: string;
  nome_servizio: string;
  prezzo_totale: number;
  prezzo_base: number;
  prezzo_iva: number;
  valuta: string;
  tempo_transito: string;
  ore_transito: number | null;
  categoria: string;
  data_consegna_stimata: string;
  logo_url: string | null;
  drop_off: boolean;
  consegna_punto_ritiro: boolean;
  dimensioni_max: string;
}

interface RispostaSpedizione {
  servizi: ServizioCorrere[];
  errore: string | null;
}

// ── Costanti ──

const COUNTRIES = [
  { code: "IT", label: "Italia" }, { code: "DE", label: "Germania" },
  { code: "FR", label: "Francia" }, { code: "ES", label: "Spagna" },
  { code: "AT", label: "Austria" }, { code: "BE", label: "Belgio" },
  { code: "NL", label: "Paesi Bassi" }, { code: "PT", label: "Portogallo" },
  { code: "CH", label: "Svizzera" }, { code: "GB", label: "Regno Unito" },
  { code: "PL", label: "Polonia" }, { code: "SE", label: "Svezia" },
  { code: "DK", label: "Danimarca" }, { code: "CZ", label: "Rep. Ceca" },
  { code: "RO", label: "Romania" }, { code: "GR", label: "Grecia" },
  { code: "HR", label: "Croazia" }, { code: "US", label: "USA" },
];

const EMPTY: Corriere = {
  id: 0, nome: "", servizio: "", costo_spedizione: 0,
  tempo_consegna: "", packlink_service_id: "", note: "",
};

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

// ── Componente ──

export function CorrieriPage() {
  const [items, setItems] = useState<Corriere[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Corriere>(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // PackLink
  const [showPl, setShowPl] = useState(false);
  const [plForm, setPlForm] = useState({
    paese: "IT", cap: "",
    peso: 1.0, larghezza: 30, altezza: 20, lunghezza: 15,
  });
  const [plResult, setPlResult] = useState<RispostaSpedizione | null>(null);
  const [plLoading, setPlLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Selezione multipla
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setItems(await invoke<Corriere[]>("get_corrieri"));
      const key = await invoke<string>("get_impostazione", { chiave: "packlink_api_key" }).catch(() => "");
      setApiKey(key);
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.servizio.toLowerCase().includes(search.toLowerCase())
  );

  // ── CRUD ──

  const openNew = () => { setForm({ ...EMPTY }); setEditingId(null); setError(""); setShowForm(true); };
  const openEdit = (c: Corriere) => {
    setForm({ ...c }); setEditingId(c.id); setError(""); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome del corriere non può essere vuoto"); return; }
    try {
      setSaving(true);
      if (editingId) {
        await invoke("update_corriere", { id: editingId, data: form });
      } else {
        await invoke("create_corriere", { data: form });
      }
      setShowForm(false); setEditingId(null); setError(""); await load();
    } catch (e: any) { setError(String(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await invoke("delete_corriere", { id }).catch(() => {});
    setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; });
    await load();
  };
  const handleDeleteSelected = async () => {
    for (const id of selectedIds) await invoke("delete_corriere", { id }).catch(() => {});
    setSelectedIds(new Set()); await load();
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  const updateField = (field: keyof Corriere, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  // ── PackLink ──

  const saveApiKey = async () => {
    try {
      await invoke("set_impostazione", { chiave: "packlink_api_key", valore: apiKey });
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 3000);
    } catch (e: any) { setError(String(e)); }
  };

  const searchPl = async () => {
    if (!plForm.cap.trim()) return;
    try {
      setPlLoading(true); setPlResult(null); setError("");
      const result = await invoke<RispostaSpedizione>("get_tariffe_corrieri", {
        richiesta: {
          pacco: {
            peso_kg: plForm.peso,
            larghezza_cm: plForm.larghezza,
            altezza_cm: plForm.altezza,
            lunghezza_cm: plForm.lunghezza,
          },
          cap_destinatario: plForm.cap,
          paese_destinatario: plForm.paese,
        },
      });
      setPlResult(result);
      if (result.errore) setError(result.errore);
    } catch (e: any) { setError(String(e)); }
    finally { setPlLoading(false); }
  };

  const importFromPl = (s: ServizioCorrere) => {
    const tempo = s.ore_transito
      ? `${s.ore_transito}h (${s.tempo_transito})`
      : s.tempo_transito || "";
    setForm({
      id: 0,
      nome: s.nome_corriere,
      servizio: s.nome_servizio,
      costo_spedizione: s.prezzo_totale,
      tempo_consegna: tempo,
      packlink_service_id: s.id,
      note: [
        s.consegna_punto_ritiro ? "Punto di ritiro" : "Consegna a domicilio",
        s.data_consegna_stimata ? `Consegna: ${s.data_consegna_stimata}` : "",
      ].filter(Boolean).join(" • "),
    });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  // ── Render ──

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Corrieri</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPl(!showPl)}
            style={{
              padding: "9px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "none", transition: "all 0.2s",
              background: showPl ? "var(--red-soft)" : "var(--orange)",
              color: showPl ? "var(--red)" : "#fff",
              boxShadow: showPl ? "none" : "0 2px 12px rgba(249,115,22,0.3)",
            }}>
            {showPl ? "✕ Chiudi PackLink" : "🔍 Cerca tariffe PackLink"}
          </button>
          <button onClick={openNew}
            className="s3d-btn s3d-btn-primary">
            Nuovo corriere
          </button>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* ── PackLink Panel ── */}
      {showPl && (
        <div className="s3d-card-glow p-5 mb-5">
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>🔗 PACKLINK PRO</h4>

          {/* API Key */}
          <div style={{ marginBottom: 16, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>API Key PackLink Pro</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                className="s3d-input flex-1"
                placeholder="Incolla la API key (senza Bearer, senza < >)..."
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setApiKeySaved(false); }}
              />
              <button
                className="s3d-btn s3d-btn-primary"
                style={{ padding: "6px 16px", fontSize: 12, whiteSpace: "nowrap" }}
                onClick={saveApiKey}
                disabled={!apiKey.trim()}
              >
                {apiKeySaved ? "✅ Salvata" : "💾 Salva"}
              </button>
            </div>
            {!apiKey.trim() && (
              <p className="text-xs mt-2" style={{ color: "#f97316" }}>
                ⚠️ Inserisci la API key per cercare le tariffe. La trovi nel tuo account PackLink Pro → Impostazioni → API.
              </p>
            )}
          </div>

          {/* Ricerca tariffe */}
          <h5 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.6 }}>Ricerca tariffe</h5>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Paese destinazione</label>
              <select className="s3d-select" value={plForm.paese}
                onChange={e => setPlForm({ ...plForm, paese: e.target.value })}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>CAP destinazione</label>
              <input className="s3d-input" placeholder="es. 20100" value={plForm.cap}
                onChange={e => setPlForm({ ...plForm, cap: e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Peso (kg)</label>
              <input className="s3d-input" type="number" min="0.1" step="0.1" value={plForm.peso}
                onChange={e => setPlForm({ ...plForm, peso: +e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Larghezza (cm)</label>
              <input className="s3d-input" type="number" min="1" value={plForm.larghezza}
                onChange={e => setPlForm({ ...plForm, larghezza: +e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Altezza (cm)</label>
              <input className="s3d-input" type="number" min="1" value={plForm.altezza}
                onChange={e => setPlForm({ ...plForm, altezza: +e.target.value })} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Lunghezza (cm)</label>
              <input className="s3d-input" type="number" min="1" value={plForm.lunghezza}
                onChange={e => setPlForm({ ...plForm, lunghezza: +e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="s3d-btn s3d-btn-primary" onClick={searchPl} disabled={plLoading || !plForm.cap.trim() || !apiKey.trim()}>
              {plLoading ? "⏳ Ricerca…" : "🚀 Cerca tariffe"}
            </button>
            {plResult && !plResult.errore && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{plResult.servizi.length} tariffe trovate</span>
            )}
          </div>

          {/* Risultati PackLink */}
          {plResult && plResult.servizi.length > 0 && (
            <div style={{ marginTop: 16, maxHeight: 384, overflowY: "auto", borderRadius: 10, border: "1px solid var(--border-subtle)" }}>
              <table className="s3d-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}></th>
                    <th>Corriere</th>
                    <th>Servizio</th>
                    <th>Prezzo</th>
                    <th>IVA</th>
                    <th>Tempo</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {plResult.servizi.map((r, i) => (
                    <tr key={`${r.id}-${i}`}>
                      <td style={{ padding: "8px 6px 8px 14px" }}>
                        {r.logo_url ? (
                          <img src={r.logo_url} alt="" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 4, background: "rgba(255,255,255,.9)", padding: 2 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : (
                          <span style={{ fontSize: 16 }}>🚚</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.nome_corriere}</td>
                      <td>
                        <span className="text-xs">{r.nome_servizio}</span>
                        {r.categoria && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{r.categoria}</span>}
                      </td>
                      <td className="font-bold" style={{ color: "var(--green)" }}>{eur(r.prezzo_totale)}</td>
                      <td style={{ fontSize: 11, color: "var(--text-muted)" }}>+{eur(r.prezzo_iva)}</td>
                      <td>
                        {r.ore_transito ? `${r.ore_transito}h` : r.tempo_transito || "—"}
                        {r.data_consegna_stimata && (
                          <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)" }}>{r.data_consegna_stimata}</span>
                        )}
                      </td>
                      <td>
                        <span className="s3d-badge" style={{
                          background: r.consegna_punto_ritiro ? "var(--orange-soft)" : "var(--accent-soft)",
                          color: r.consegna_punto_ritiro ? "var(--orange)" : "var(--text-accent)",
                        }}>
                          {r.consegna_punto_ritiro ? "📦 Ritiro" : "🏠 Casa"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button onClick={() => importFromPl(r)}
                          className="s3d-btn s3d-btn-ghost text-xs" style={{ padding: "4px 10px" }}>
                          💾 Salva
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {plResult && plResult.servizi.length === 0 && !plResult.errore && (
            <div style={{ marginTop: 16, padding: 16, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Nessuna tariffa disponibile per questa tratta</div>
          )}
        </div>
      )}

      {/* ── Barra ricerca + selezione ── */}
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
          placeholder="Cerca corriere"
          className="flex-1 s3d-input" />
      </div>

      {/* ── Tabella corrieri ── */}
      <div className="s3d-card overflow-hidden">
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
            {items.length === 0
              ? 'Nessun corriere. Usa "Cerca tariffe PackLink" o "Nuovo corriere".'
              : "Nessun risultato."}
          </div>
        ) : (
          <table className="s3d-table">
            <thead><tr>
              <th style={{ width: 40 }}></th>
              <th>Corriere</th>
              <th>Servizio</th>
              <th>Costo</th>
              <th>Tempo</th>
              <th>PackLink ID</th>
              <th>Note</th>
              <th style={{ textAlign: "right" }}>Azioni</th>
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                  <td onClick={(e) => e.stopPropagation()} style={{ padding: "12px 16px" }}>
                    <input type="checkbox" checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)} style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{c.nome}</td>
                  <td>{c.servizio || "—"}</td>
                  <td style={{ fontWeight: 600, color: "var(--green)" }}>{eur(c.costo_spedizione)}</td>
                  <td>{c.tempo_consegna || "—"}</td>
                  <td>
                    {c.packlink_service_id ? (
                      <span className="text-xs font-mono" style={{ color: "var(--text-accent)" }}>
                        {c.packlink_service_id}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.note || "—"}
                  </td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>Modifica</button>
                    <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Crea/Modifica ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 520, margin: "0 16px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{editingId ? "Modifica corriere" : "Nuovo corriere"}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {error && <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>{error}</div>}
              {form.packlink_service_id && (
                <div style={{ padding: 8, background: "var(--accent-soft)", borderRadius: 8, fontSize: 12, color: "var(--accent)" }}>
                  PackLink Service ID: {form.packlink_service_id}
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Nome corriere *</label>
                <input type="text" value={form.nome} onChange={e => updateField("nome", e.target.value)}
                  placeholder="Es. BRT, GLS, DHL"
                  className="s3d-input" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Servizio</label>
                  <input type="text" value={form.servizio} onChange={e => updateField("servizio", e.target.value)}
                    placeholder="Es. Express, Economy"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Costo spedizione (€)</label>
                  <input type="number" step="0.01" min="0" value={form.costo_spedizione}
                    onChange={e => updateField("costo_spedizione", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Tempo consegna</label>
                  <input type="text" value={form.tempo_consegna} onChange={e => updateField("tempo_consegna", e.target.value)}
                    placeholder="Es. 24-48h"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>PackLink Service ID</label>
                  <input type="text" value={form.packlink_service_id}
                    onChange={e => updateField("packlink_service_id", e.target.value)}
                    placeholder="Auto da PackLink"
                    className="s3d-input" style={{ opacity: 0.6 }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Note</label>
                <textarea value={form.note} onChange={e => updateField("note", e.target.value)}
                  placeholder="Note libere…" rows={2}
                  className="s3d-input" style={{ resize: "vertical" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowForm(false)}
                className="s3d-btn s3d-btn-ghost">Annulla</button>
              <button onClick={handleSave} disabled={saving || !form.nome.trim()}
                className="s3d-btn s3d-btn-primary">
                {saving ? "Salvataggio…" : editingId ? "Salva modifiche" : "Crea corriere"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
