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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Corrieri</h3>
        <div className="flex gap-2">
          <button onClick={() => setShowPl(!showPl)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              showPl
                ? "bg-red-50 text-red-600 border-red-300 hover:bg-red-50"
                : "bg-amber-500 text-white border-transparent hover:bg-amber-600"
            }`}>
            {showPl ? "✕ Chiudi PackLink" : "🔍 Cerca tariffe PackLink"}
          </button>
          <button onClick={openNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            Nuovo corriere
          </button>
        </div>
      </div>

      {/* Errore */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4 flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 text-lg leading-none">✕</button>
        </div>
      )}

      {/* ── PackLink Panel ── */}
      {showPl && (
        <div className="s3d-card-glow p-5 mb-5">
          <h4 className="text-sm font-bold text-gray-300 mb-4">🔗 PACKLINK PRO</h4>

          {/* API Key */}
          <div style={{ marginBottom: 16, padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">API Key PackLink Pro</label>
            <div className="flex gap-2">
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
          <h5 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">Ricerca tariffe</h5>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Paese destinazione</label>
              <select className="s3d-select" value={plForm.paese}
                onChange={e => setPlForm({ ...plForm, paese: e.target.value })}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">CAP destinazione</label>
              <input className="s3d-input" placeholder="es. 20100" value={plForm.cap}
                onChange={e => setPlForm({ ...plForm, cap: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Peso (kg)</label>
              <input className="s3d-input" type="number" min="0.1" step="0.1" value={plForm.peso}
                onChange={e => setPlForm({ ...plForm, peso: +e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Larghezza (cm)</label>
              <input className="s3d-input" type="number" min="1" value={plForm.larghezza}
                onChange={e => setPlForm({ ...plForm, larghezza: +e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Altezza (cm)</label>
              <input className="s3d-input" type="number" min="1" value={plForm.altezza}
                onChange={e => setPlForm({ ...plForm, altezza: +e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Lunghezza (cm)</label>
              <input className="s3d-input" type="number" min="1" value={plForm.lunghezza}
                onChange={e => setPlForm({ ...plForm, lunghezza: +e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="s3d-btn s3d-btn-primary" onClick={searchPl} disabled={plLoading || !plForm.cap.trim() || !apiKey.trim()}>
              {plLoading ? "⏳ Ricerca…" : "🚀 Cerca tariffe"}
            </button>
            {plResult && !plResult.errore && (
              <span className="text-xs text-gray-500">{plResult.servizi.length} tariffe trovate</span>
            )}
          </div>

          {/* Risultati PackLink */}
          {plResult && plResult.servizi.length > 0 && (
            <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-gray-200">
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
                      <td className="font-medium text-gray-900">{r.nome_corriere}</td>
                      <td>
                        <span className="text-xs">{r.nome_servizio}</span>
                        {r.categoria && <span className="block text-xs text-gray-500 mt-0.5">{r.categoria}</span>}
                      </td>
                      <td className="font-bold" style={{ color: "var(--green)" }}>{eur(r.prezzo_totale)}</td>
                      <td className="text-xs text-gray-500">+{eur(r.prezzo_iva)}</td>
                      <td>
                        {r.ore_transito ? `${r.ore_transito}h` : r.tempo_transito || "—"}
                        {r.data_consegna_stimata && (
                          <span className="block text-xs text-gray-500">{r.data_consegna_stimata}</span>
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
            <div className="mt-4 p-4 text-center text-gray-500 text-sm">Nessuna tariffa disponibile per questa tratta</div>
          )}
        </div>
      )}

      {/* ── Barra ricerca + selezione ── */}
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
          placeholder="Cerca corriere"
          className="flex-1 s3d-input" />
      </div>

      {/* ── Tabella corrieri ── */}
      <div className="s3d-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
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
                      onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded" />
                  </td>
                  <td className="font-medium text-gray-900">{c.nome}</td>
                  <td>{c.servizio || "—"}</td>
                  <td className="font-medium" style={{ color: "var(--green)" }}>{eur(c.costo_spedizione)}</td>
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
                    <button onClick={() => openEdit(c)} className="text-blue-600 text-xs mr-3">Modifica</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 text-xs">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal Crea/Modifica ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">{editingId ? "Modifica corriere" : "Nuovo corriere"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
              {form.packlink_service_id && (
                <div className="p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                  PackLink Service ID: {form.packlink_service_id}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome corriere *</label>
                <input type="text" value={form.nome} onChange={e => updateField("nome", e.target.value)}
                  placeholder="Es. BRT, GLS, DHL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Servizio</label>
                  <input type="text" value={form.servizio} onChange={e => updateField("servizio", e.target.value)}
                    placeholder="Es. Express, Economy"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo spedizione (€)</label>
                  <input type="number" step="0.01" min="0" value={form.costo_spedizione}
                    onChange={e => updateField("costo_spedizione", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo consegna</label>
                  <input type="text" value={form.tempo_consegna} onChange={e => updateField("tempo_consegna", e.target.value)}
                    placeholder="Es. 24-48h"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PackLink Service ID</label>
                  <input type="text" value={form.packlink_service_id}
                    onChange={e => updateField("packlink_service_id", e.target.value)}
                    placeholder="Auto da PackLink"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea value={form.note} onChange={e => updateField("note", e.target.value)}
                  placeholder="Note libere…" rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button onClick={handleSave} disabled={saving || !form.nome.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {saving ? "Salvataggio…" : editingId ? "Salva modifiche" : "Crea corriere"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
