// src/components/impostazioni/AziendaPage.tsx
// Sparks3D Preventivi — Dati azienda / privato

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

interface Azienda {
  id: number;
  ragione_sociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  paese: string;
  partita_iva: string;
  codice_fiscale: string;
  email: string;
  telefono: string;
  logo_path: string;
  regime_fiscale: string;
  iva_percentuale: number;
  nota_regime: string;
  prefisso_preventivo: string;
  prossimo_numero: number;
}

interface LogoResult {
  dest_path: string;
  base64_data: string;
  mime_type: string;
}

const EMPTY: Azienda = {
  id: 1, ragione_sociale: "", indirizzo: "", cap: "", citta: "", provincia: "",
  paese: "IT", partita_iva: "", codice_fiscale: "", email: "", telefono: "",
  logo_path: "", regime_fiscale: "ordinario", iva_percentuale: 22.0,
  nota_regime: "", prefisso_preventivo: "S3D", prossimo_numero: 1,
};

const REGIMI = [
  { id: "ordinario", label: "Regime Ordinario", iva: 22.0, nota: "" },
  { id: "forfettario", label: "Regime Forfettario", iva: 0.0, nota: "Operazione senza applicazione dell'IVA ai sensi dell'art. 1, commi 54-89, Legge n. 190/2014 – Regime Forfettario" },
  { id: "minimo", label: "Regime dei Minimi", iva: 0.0, nota: "Operazione effettuata ai sensi dell'art. 27, commi 1 e 2, D.L. 98/2011 – Regime dei Minimi" },
  { id: "privato", label: "Privato (no P.IVA)", iva: 0.0, nota: "Vendita tra privati – Non soggetta ad IVA" },
];

const PAESI = [
  "IT", "DE", "FR", "ES", "AT", "BE", "NL", "PT", "CH", "GB",
  "PL", "CZ", "RO", "HR", "SI", "SK", "HU", "BG", "GR", "SE",
  "DK", "FI", "IE", "LT", "LV", "EE", "LU", "MT", "CY",
];

export function AziendaPage() {
  const [form, setForm] = useState<Azienda>(EMPTY);
  const [original, setOriginal] = useState<Azienda>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await invoke<Azienda>("get_azienda");
      setForm(data);
      setOriginal(data);
      if (data.logo_path) {
        try {
          const b64 = await invoke<string>("load_logo_preview", { logoPath: data.logo_path });
          setLogoPreview(b64);
        } catch {
          setLogoPreview(null);
        }
      }
    } catch (e: any) {
      console.error("Errore caricamento azienda:", e);
      setError(`Errore caricamento dati: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateField = (field: keyof Azienda, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleRegimeChange = (regimeId: string) => {
    const regime = REGIMI.find((r) => r.id === regimeId);
    if (regime) {
      setForm((prev) => ({
        ...prev,
        regime_fiscale: regime.id,
        iva_percentuale: regime.iva,
        nota_regime: regime.nota,
      }));
      setSaved(false);
    }
  };

  const handleLogoSelect = async () => {
    try {
      const result = await open({
        multiple: false,
        filters: [{ name: "Immagini", extensions: ["png", "jpg", "jpeg", "svg", "webp"] }],
      });

      // Tauri 2.0: open() può restituire string, string[], o null
      const selected = typeof result === "string" ? result
        : Array.isArray(result) ? result[0]
        : (result as any)?.path ?? null;

      if (!selected) return;

      // Tutto gestito in Rust: copia il file + restituisce base64
      const logo = await invoke<LogoResult>("import_logo", { sourcePath: selected });

      setForm((prev) => ({ ...prev, logo_path: logo.dest_path }));
      setLogoPreview(logo.base64_data);
      setSaved(false);
    } catch (e: any) {
      setError(`Errore selezione logo: ${e?.message || e}`);
    }
  };

  const handleLogoRemove = () => {
    setForm((prev) => ({ ...prev, logo_path: "" }));
    setLogoPreview(null);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await invoke("update_azienda", { data: form });
      console.log("Salvataggio riuscito:", result);
      setOriginal(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      console.error("Errore salvataggio:", e);
      setError(`Errore salvataggio: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  const isModified = JSON.stringify(form) !== JSON.stringify(original);
  const currentRegime = REGIMI.find((r) => r.id === form.regime_fiscale);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Caricamento dati azienda...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Dati azienda</h3>
        <button onClick={handleSave} disabled={saving || !isModified}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "⟳ Salvataggio..." : saved ? "✓ Salvato!" : "Salva modifiche"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* ── Colonna sinistra: Identità + Logo ── */}
        <div className="col-span-2 space-y-6">

          {/* Identità */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Identità
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ragione sociale / Nome e cognome
                </label>
                <input type="text" value={form.ragione_sociale}
                  onChange={(e) => updateField("ragione_sociale", e.target.value)}
                  placeholder="Es. Sparks3D di Mario Rossi oppure Mario Rossi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Comparirà nell'intestazione dei preventivi e documenti PDF</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Partita IVA <span className="text-gray-400 font-normal">(facoltativo)</span>
                  </label>
                  <input type="text" value={form.partita_iva}
                    onChange={(e) => updateField("partita_iva", e.target.value)}
                    placeholder="IT01234567890"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Codice Fiscale <span className="text-gray-400 font-normal">(facoltativo)</span>
                  </label>
                  <input type="text" value={form.codice_fiscale}
                    onChange={(e) => updateField("codice_fiscale", e.target.value.toUpperCase())}
                    placeholder="RSSMRA90A01B157Y"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="info@sparks3d.it"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefono</label>
                  <input type="tel" value={form.telefono}
                    onChange={(e) => updateField("telefono", e.target.value)}
                    placeholder="+39 030 1234567"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Indirizzo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Indirizzo (mittente spedizioni)
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Indirizzo</label>
                <input type="text" value={form.indirizzo}
                  onChange={(e) => updateField("indirizzo", e.target.value)}
                  placeholder="Via IV Novembre 59/B"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CAP</label>
                  <input type="text" value={form.cap}
                    onChange={(e) => updateField("cap", e.target.value)}
                    placeholder="25031"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Città</label>
                  <input type="text" value={form.citta}
                    onChange={(e) => updateField("citta", e.target.value)}
                    placeholder="Capriolo"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Provincia</label>
                  <input type="text" value={form.provincia} maxLength={2}
                    onChange={(e) => updateField("provincia", e.target.value.toUpperCase())}
                    placeholder="BS"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paese</label>
                  <select value={form.paese}
                    onChange={(e) => updateField("paese", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none">
                    {PAESI.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Questo indirizzo viene usato come mittente nel calcolo spedizioni PackLink.
              </p>
            </div>
          </div>

          {/* Regime Fiscale */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Regime fiscale e IVA
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Regime</label>
                <div className="grid grid-cols-2 gap-2">
                  {REGIMI.map((r) => (
                    <button key={r.id} onClick={() => handleRegimeChange(r.id)}
                      className={`text-left px-4 py-3 rounded-lg border-2 text-sm transition-colors ${
                        form.regime_fiscale === r.id
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300"
                      }`}>
                      <div className="font-medium">{r.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        IVA: {r.iva > 0 ? `${r.iva}%` : "Esente"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IVA %</label>
                  <input type="number" step="0.5" value={form.iva_percentuale}
                    onChange={(e) => updateField("iva_percentuale", parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prefisso preventivo</label>
                  <input type="text" value={form.prefisso_preventivo}
                    onChange={(e) => updateField("prefisso_preventivo", e.target.value.toUpperCase())}
                    placeholder="S3D"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {currentRegime?.nota && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Nota in fattura/preventivo:</strong> {form.nota_regime}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nota personalizzata regime <span className="text-gray-400 font-normal">(opzionale)</span>
                </label>
                <textarea value={form.nota_regime}
                  onChange={(e) => updateField("nota_regime", e.target.value)}
                  rows={2} placeholder="Verrà stampata nel PDF del preventivo..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonna destra: Logo + Riepilogo ── */}
        <div className="space-y-6">

          {/* Logo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Logo
            </h4>
            <div className="flex flex-col items-center gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="Logo"
                    className="w-40 h-40 object-contain rounded-lg border border-gray-200 dark:border-gray-600 bg-white p-2" />
                  <button onClick={handleLogoRemove}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400">
                  <span className="text-3xl mb-1">🖼️</span>
                  <span className="text-xs">Nessun logo</span>
                </div>
              )}
              <button onClick={handleLogoSelect}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium w-full">
                {logoPreview ? "Cambia logo" : "Carica logo"}
              </button>
              <p className="text-xs text-gray-400 text-center">
                PNG, JPG o SVG. Verrà usato nei PDF dei preventivi.
              </p>
            </div>
          </div>

          {/* Riepilogo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Riepilogo
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Ragione sociale</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {form.ragione_sociale || "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Indirizzo</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {form.indirizzo ? `${form.indirizzo}, ${form.cap} ${form.citta} (${form.provincia})` : "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Regime</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentRegime?.label || "—"} — IVA {form.iva_percentuale}%
                </p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Prossimo preventivo</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {form.prefisso_preventivo}-{form.prossimo_numero}
                </p>
              </div>
              {(form.partita_iva || form.codice_fiscale) && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Fiscale</span>
                  <p className="font-medium text-gray-900 dark:text-white text-xs">
                    {form.partita_iva && <span>P.IVA: {form.partita_iva}<br /></span>}
                    {form.codice_fiscale && <span>C.F.: {form.codice_fiscale}</span>}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Numerazione */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
              Numerazione preventivi
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prossimo numero</label>
                <input type="number" min={1} value={form.prossimo_numero}
                  onChange={(e) => updateField("prossimo_numero", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <p className="text-xs text-gray-400">
                Il prossimo preventivo sarà: <strong className="text-gray-600 dark:text-gray-300">{form.prefisso_preventivo}-{form.prossimo_numero}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
