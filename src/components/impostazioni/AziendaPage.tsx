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
    return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>Caricamento dati azienda...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Dati azienda</h3>
        <button onClick={handleSave} disabled={saving || !isModified}
          className="s3d-btn s3d-btn-primary">
          {saving ? "⟳ Salvataggio..." : saved ? "✓ Salvato!" : "Salva modifiche"}
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* ── Colonna sinistra: Identità + Logo ── */}
        <div className="col-span-2 space-y-6">

          {/* Identità */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Identità
            </h4>
            <div className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                  Ragione sociale / Nome e cognome
                </label>
                <input type="text" value={form.ragione_sociale}
                  onChange={(e) => updateField("ragione_sociale", e.target.value)}
                  placeholder="Es. Sparks3D di Mario Rossi oppure Mario Rossi"
                  className="s3d-input" />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Comparirà nell'intestazione dei preventivi e documenti PDF</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                    Partita IVA <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(facoltativo)</span>
                  </label>
                  <input type="text" value={form.partita_iva}
                    onChange={(e) => updateField("partita_iva", e.target.value)}
                    placeholder="IT01234567890"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                    Codice Fiscale <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(facoltativo)</span>
                  </label>
                  <input type="text" value={form.codice_fiscale}
                    onChange={(e) => updateField("codice_fiscale", e.target.value.toUpperCase())}
                    placeholder="RSSMRA90A01B157Y"
                    className="s3d-input" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Email</label>
                  <input type="email" value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="info@sparks3d.it"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Telefono</label>
                  <input type="tel" value={form.telefono}
                    onChange={(e) => updateField("telefono", e.target.value)}
                    placeholder="+39 030 1234567"
                    className="s3d-input" />
                </div>
              </div>
            </div>
          </div>

          {/* Indirizzo */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Indirizzo (mittente spedizioni)
            </h4>
            <div className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Indirizzo</label>
                <input type="text" value={form.indirizzo}
                  onChange={(e) => updateField("indirizzo", e.target.value)}
                  placeholder="Via IV Novembre 59/B"
                  className="s3d-input" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>CAP</label>
                  <input type="text" value={form.cap}
                    onChange={(e) => updateField("cap", e.target.value)}
                    placeholder="25031"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Città</label>
                  <input type="text" value={form.citta}
                    onChange={(e) => updateField("citta", e.target.value)}
                    placeholder="Capriolo"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Provincia</label>
                  <input type="text" value={form.provincia} maxLength={2}
                    onChange={(e) => updateField("provincia", e.target.value.toUpperCase())}
                    placeholder="BS"
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Paese</label>
                  <select value={form.paese}
                    onChange={(e) => updateField("paese", e.target.value)}
                    className="s3d-input">
                    {PAESI.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Questo indirizzo viene usato come mittente nel calcolo spedizioni PackLink.
              </p>
            </div>
          </div>

          {/* Regime Fiscale */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Regime fiscale e IVA
            </h4>
            <div className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Regime</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {REGIMI.map((r) => (
                    <button key={r.id} onClick={() => handleRegimeChange(r.id)}
                      style={{
                        textAlign: "left", padding: "12px 16px", borderRadius: 10, fontSize: 13,
                        transition: "all 0.2s", cursor: "pointer",
                        border: form.regime_fiscale === r.id ? "2px solid var(--accent)" : "2px solid var(--border-subtle)",
                        background: form.regime_fiscale === r.id ? "var(--accent-soft)" : "transparent",
                        color: form.regime_fiscale === r.id ? "var(--accent)" : "var(--text-secondary)",
                      }}>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        IVA: {r.iva > 0 ? `${r.iva}%` : "Esente"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>IVA %</label>
                  <input type="number" step="0.5" value={form.iva_percentuale}
                    onChange={(e) => updateField("iva_percentuale", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Prefisso preventivo</label>
                  <input type="text" value={form.prefisso_preventivo}
                    onChange={(e) => updateField("prefisso_preventivo", e.target.value.toUpperCase())}
                    placeholder="S3D"
                    className="s3d-input" />
                </div>
              </div>

              {currentRegime?.nota && (
                <div style={{ padding: 12, background: "rgba(249,115,22,0.08)", borderRadius: 10 }}>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Nota in fattura/preventivo:</strong> {form.nota_regime}
                  </p>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                  Nota personalizzata regime <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(opzionale)</span>
                </label>
                <textarea value={form.nota_regime}
                  onChange={(e) => updateField("nota_regime", e.target.value)}
                  rows={2} placeholder="Verrà stampata nel PDF del preventivo..."
                  className="s3d-input" style={{ resize: "none" }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonna destra: Logo + Riepilogo ── */}
        <div className="space-y-6">

          {/* Logo */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Logo
            </h4>
            <div className="flex flex-col items-center gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <img src={logoPreview} alt="Logo"
                    style={{ width: 160, height: 160, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)", padding: 8 }} />
                  <button onClick={handleLogoRemove}
                    style={{ position: "absolute", top: -8, right: -8, width: 24, height: 24, background: "var(--red)", color: "white", borderRadius: "50%", fontSize: 11, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    ✕
                  </button>
                </div>
              ) : (
                <div style={{ width: 160, height: 160, border: "2px dashed var(--border-default)", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  <span className="text-3xl mb-1">🖼️</span>
                  <span className="text-xs">Nessun logo</span>
                </div>
              )}
              <button onClick={handleLogoSelect}
                className="s3d-btn s3d-btn-ghost" style={{ width: "100%" }}>
                {logoPreview ? "Cambia logo" : "Carica logo"}
              </button>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                PNG, JPG o SVG. Verrà usato nei PDF dei preventivi.
              </p>
            </div>
          </div>

          {/* Riepilogo */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Riepilogo
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span style={{ color: "var(--text-muted)" }}>Ragione sociale</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.ragione_sociale || "—"}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Indirizzo</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.indirizzo ? `${form.indirizzo}, ${form.cap} ${form.citta} (${form.provincia})` : "—"}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Regime</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {currentRegime?.label || "—"} — IVA {form.iva_percentuale}%
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Prossimo preventivo</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.prefisso_preventivo}-{form.prossimo_numero}
                </p>
              </div>
              {(form.partita_iva || form.codice_fiscale) && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Fiscale</span>
                  <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>
                    {form.partita_iva && <span>P.IVA: {form.partita_iva}<br /></span>}
                    {form.codice_fiscale && <span>C.F.: {form.codice_fiscale}</span>}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Numerazione */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              Numerazione preventivi
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>Prossimo numero</label>
                <input type="number" min={1} value={form.prossimo_numero}
                  onChange={(e) => updateField("prossimo_numero", parseInt(e.target.value) || 1)}
                  className="s3d-input" />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Il prossimo preventivo sarà: <strong style={{ color: "var(--text-secondary)" }}>{form.prefisso_preventivo}-{form.prossimo_numero}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
