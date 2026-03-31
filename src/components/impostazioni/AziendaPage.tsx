// src/components/impostazioni/AziendaPage.tsx
// Sparks3D Preventivi — Dati azienda / privato
// v1.4.0: aggiunta validazione inline (CAP, email, P.IVA, CF, telefono, provincia)

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  validateEmail,
  validateCAP,
  validatePartitaIVA,
  validateCodiceFiscale,
  validateTelefono,
  validateProvincia,
  validateAziendaForm,
} from "../../utils/validation";

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


const PAESI = [
  "IT", "DE", "FR", "ES", "AT", "BE", "NL", "PT", "CH", "GB",
  "PL", "CZ", "RO", "HR", "SI", "SK", "HU", "BG", "GR", "SE",
  "DK", "FI", "IE", "LT", "LV", "EE", "LU", "MT", "CY",
];

const fieldErrorStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--red)", marginTop: 3,
  display: "flex", alignItems: "center", gap: 4,
};

export function AziendaPage() {
  const { t } = useTranslation();

  // Le note regime sono testi legali italiani — devono restare in italiano nel DB/PDF
  const NOTA_FORFETTARIO = "Operazione senza applicazione dell'IVA ai sensi dell'art. 1, commi 54-89, Legge n. 190/2014 – Regime Forfettario";
  const NOTA_MINIMI = "Operazione effettuata ai sensi dell'art. 27, commi 1 e 2, D.L. 98/2011 – Regime dei Minimi";
  const NOTA_PRIVATO = "Vendita tra privati – Non soggetta ad IVA";

  const REGIMI = [
    { id: "ordinario", label: t("azienda.ordinario"), iva: 22.0, nota: "" },
    { id: "forfettario", label: t("azienda.forfettario"), iva: 0.0, nota: NOTA_FORFETTARIO },
    { id: "minimo", label: t("azienda.minimi"), iva: 0.0, nota: NOTA_MINIMI },
    { id: "privato", label: t("azienda.privato"), iva: 0.0, nota: NOTA_PRIVATO },
  ];

  const [form, setForm] = useState<Azienda>(EMPTY);
  const [original, setOriginal] = useState<Azienda>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
    // Valida in tempo reale solo se il campo è già stato toccato
    if (touched[field] && typeof value === "string") {
      validateSingleField(field, value);
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateSingleField(field, (form as any)[field]);
  };

  const validateSingleField = (field: string, value: string) => {
    let err: string | null = null;
    switch (field) {
      case "email": err = validateEmail(value); break;
      case "cap": err = validateCAP(value); break;
      case "partita_iva": err = validatePartitaIVA(value); break;
      case "codice_fiscale": err = validateCodiceFiscale(value); break;
      case "telefono": err = validateTelefono(value); break;
      case "provincia": err = validateProvincia(value); break;
    }
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  // Helper per lo stile dell'input con errore
  const inputErrorBorder = (field: string): React.CSSProperties =>
    fieldErrors[field] ? { borderColor: "var(--red)", boxShadow: "0 0 0 1px rgba(244,63,94,0.3)" } : {};

  // Helper per il messaggio di errore sotto il campo
  const FieldError = ({ field }: { field: string }) =>
    fieldErrors[field] ? (
      <p style={fieldErrorStyle}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
        </svg>
        {fieldErrors[field]}
      </p>
    ) : null;

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
    // Validazione completa prima del salvataggio
    const errors = validateAziendaForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const allTouched: Record<string, boolean> = {};
      for (const key of Object.keys(errors)) allTouched[key] = true;
      setTouched((prev) => ({ ...prev, ...allTouched }));
      setError(t("azienda.errCampi"));
      return;
    }

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
    return <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>{t("azienda.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{t("azienda.title")}</h3>
        <button onClick={handleSave} disabled={saving || !isModified}
          className="s3d-btn s3d-btn-primary">
          {saving ? `⟳ ${t("common.saving")}` : saved ? t("common.saved") : t("common.save")}
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
              {t("azienda.sezIdentita")}
            </h4>
            <div className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                  {t("azienda.ragioneSociale")}
                </label>
                <input type="text" value={form.ragione_sociale}
                  onChange={(e) => updateField("ragione_sociale", e.target.value)}
                  placeholder={t("azienda.phRagioneSociale")}
                  className="s3d-input" />
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{t("azienda.ragioneSocialeHelp")}</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                    {t("azienda.piva")}
                  </label>
                  <input type="text" value={form.partita_iva}
                    onChange={(e) => updateField("partita_iva", e.target.value)}
                    onBlur={() => handleBlur("partita_iva")}
                    placeholder="IT01234567890"
                    className="s3d-input" style={inputErrorBorder("partita_iva")} />
                  <FieldError field="partita_iva" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                    {t("azienda.cf")}
                  </label>
                  <input type="text" value={form.codice_fiscale}
                    onChange={(e) => updateField("codice_fiscale", e.target.value.toUpperCase())}
                    onBlur={() => handleBlur("codice_fiscale")}
                    placeholder="RSSMRA90A01B157Y"
                    className="s3d-input" style={inputErrorBorder("codice_fiscale")} />
                  <FieldError field="codice_fiscale" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("azienda.email")}</label>
                  <input type="email" value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    placeholder={t("azienda.phEmail")}
                    className="s3d-input" style={inputErrorBorder("email")} />
                  <FieldError field="email" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("azienda.telefono")}</label>
                  <input type="tel" value={form.telefono}
                    onChange={(e) => updateField("telefono", e.target.value)}
                    onBlur={() => handleBlur("telefono")}
                    placeholder={t("azienda.phTelefono")}
                    className="s3d-input" style={inputErrorBorder("telefono")} />
                  <FieldError field="telefono" />
                </div>
              </div>
            </div>
          </div>

          {/* Indirizzo */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              {t("azienda.sezIndirizzo")}
            </h4>
            <div className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("azienda.indirizzo")}</label>
                <input type="text" value={form.indirizzo}
                  onChange={(e) => updateField("indirizzo", e.target.value)}
                  placeholder={t("azienda.phIndirizzo")}
                  className="s3d-input" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("common.cap")}</label>
                  <input type="text" value={form.cap}
                    onChange={(e) => updateField("cap", e.target.value)}
                    onBlur={() => handleBlur("cap")}
                    placeholder="00000" maxLength={5}
                    className="s3d-input" style={inputErrorBorder("cap")} />
                  <FieldError field="cap" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("common.city")}</label>
                  <input type="text" value={form.citta}
                    onChange={(e) => updateField("citta", e.target.value)}
                    placeholder={t("common.city")}
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("common.province")}</label>
                  <input type="text" value={form.provincia} maxLength={2}
                    onChange={(e) => updateField("provincia", e.target.value.toUpperCase())}
                    onBlur={() => handleBlur("provincia")}
                    placeholder="XX"
                    className="s3d-input" style={inputErrorBorder("provincia")} />
                  <FieldError field="provincia" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("common.country")}</label>
                  <select value={form.paese}
                    onChange={(e) => updateField("paese", e.target.value)}
                    className="s3d-input">
                    {PAESI.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {t("azienda.indHelp")}
              </p>
            </div>
          </div>

          {/* Regime Fiscale */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              {t("azienda.sezRegime")}
            </h4>
            <div className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>{t("azienda.regime")}</label>
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
                        {t("azienda.iva")}: {r.iva > 0 ? `${r.iva}%` : t("azienda.esente")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("azienda.iva")}</label>
                  <input type="number" step="0.5" value={form.iva_percentuale}
                    onChange={(e) => updateField("iva_percentuale", parseFloat(e.target.value) || 0)}
                    className="s3d-input" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("azienda.prefissoPreventivo")}</label>
                  <input type="text" value={form.prefisso_preventivo}
                    onChange={(e) => updateField("prefisso_preventivo", e.target.value.toUpperCase())}
                    placeholder="S3D"
                    className="s3d-input" />
                </div>
              </div>

              {currentRegime?.nota && (
                <div style={{ padding: 12, background: "rgba(249,115,22,0.08)", borderRadius: 10 }}>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>{t("azienda.notaFattura")}</strong> {form.nota_regime}
                  </p>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                  {t("azienda.notaPersonalizzata")}
                </label>
                <textarea value={form.nota_regime}
                  onChange={(e) => updateField("nota_regime", e.target.value)}
                  rows={2} placeholder={t("azienda.phNotaPersonalizzata")}
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
              {t("azienda.sezLogo")}
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
                  <span className="text-xs">{t("azienda.nessunLogo")}</span>
                </div>
              )}
              <button onClick={handleLogoSelect}
                className="s3d-btn s3d-btn-ghost" style={{ width: "100%" }}>
                {logoPreview ? t("azienda.cambiaLogo") : t("azienda.caricaLogo")}
              </button>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                {t("azienda.logoHelp")}
              </p>
            </div>
          </div>

          {/* Riepilogo */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              {t("azienda.sezRiepilogo")}
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span style={{ color: "var(--text-muted)" }}>{t("azienda.ragSociale")}</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.ragione_sociale || "—"}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>{t("azienda.indirizzo")}</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.indirizzo ? `${form.indirizzo}, ${form.cap} ${form.citta} (${form.provincia})` : "—"}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>{t("azienda.regime")}</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {currentRegime?.label || "—"} — IVA {form.iva_percentuale}%
                </p>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>{t("azienda.prossimoPreventivo")}</span>
                <p style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {form.prefisso_preventivo}-{form.prossimo_numero}
                </p>
              </div>
              {(form.partita_iva || form.codice_fiscale) && (
                <div>
                  <span style={{ color: "var(--text-muted)" }}>{t("azienda.fiscale")}</span>
                  <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>
                    {form.partita_iva && <span>{t("azienda.pivaLabel")}: {form.partita_iva}<br /></span>}
                    {form.codice_fiscale && <span>{t("azienda.cfLabel")}: {form.codice_fiscale}</span>}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Numerazione */}
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 24 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
              {t("azienda.sezNumerazione")}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("azienda.prossimoNumero")}</label>
                <input type="number" min={1} value={form.prossimo_numero}
                  onChange={(e) => updateField("prossimo_numero", parseInt(e.target.value) || 1)}
                  className="s3d-input" />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {t("azienda.prossimoPreventivoPrev")} <strong style={{ color: "var(--text-secondary)" }}>{form.prefisso_preventivo}-{form.prossimo_numero}</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
