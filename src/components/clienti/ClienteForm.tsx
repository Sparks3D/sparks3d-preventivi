// src/components/clienti/ClienteForm.tsx
// Sparks3D Preventivi – Form Cliente (pagina dedicata)
// =====================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";
import {
  validateEmail,
  validateCAP,
  validatePartitaIVA,
  validateCodiceFiscale,
  validateTelefono,
  validateProvincia,
  validateClienteForm,
} from "../../utils/validation";

interface Cliente {
  id: number; nome: string; cognome: string; denominazione_azienda: string;
  email: string; telefono: string; indirizzo: string; cap: string;
  citta: string; provincia: string; partita_iva: string;
  codice_fiscale: string; note: string;
}

const EMPTY: Omit<Cliente, "id"> = {
  nome: "", cognome: "", denominazione_azienda: "",
  email: "", telefono: "",
  indirizzo: "", cap: "", citta: "", provincia: "",
  partita_iva: "", codice_fiscale: "", note: "",
};

interface Props {
  clienteId: number | null;
  onBack: () => void;
}

const cardStyle: React.CSSProperties = {
  background: "#13233d", border: "1px solid rgba(56,119,214,0.12)",
  borderRadius: 14, padding: 20,
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "var(--font-size-label)", fontWeight: 600,
  color: "var(--text-muted)", marginBottom: 4,
};
const sectionTitle: React.CSSProperties = {
  fontSize: "var(--font-size-label)", fontWeight: 700, color: "var(--text-label)",
  textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12,
};
const fieldErrorStyle: React.CSSProperties = {
  fontSize: 11, color: "var(--red)", marginTop: 3,
  display: "flex", alignItems: "center", gap: 4,
};

export function ClienteForm({ clienteId, onBack }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!clienteId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const loadCliente = useCallback(async () => {
    if (!clienteId) return;
    try {
      const c = await invoke<Cliente>("get_cliente", { id: clienteId });
      setForm({
        nome: c.nome, cognome: c.cognome, denominazione_azienda: c.denominazione_azienda,
        email: c.email, telefono: c.telefono, indirizzo: c.indirizzo, cap: c.cap,
        citta: c.citta, provincia: c.provincia, partita_iva: c.partita_iva,
        codice_fiscale: c.codice_fiscale, note: c.note,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clienteId]);

  useEffect(() => { loadCliente(); }, [loadCliente]);

  const updateField = (field: string, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    // Valida in tempo reale solo se il campo è già stato toccato
    if (touched[field]) {
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

  const handleSave = async () => {
    if (!form.nome.trim() && !form.cognome.trim() && !form.denominazione_azienda.trim()) {
      setError(t("clienti.errNomeVuoto")); return;
    }

    // Validazione completa prima del salvataggio
    const errors = validateClienteForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Segna tutti i campi con errori come toccati
      const allTouched: Record<string, boolean> = {};
      for (const key of Object.keys(errors)) allTouched[key] = true;
      setTouched((prev) => ({ ...prev, ...allTouched }));
      setError(t("clienti.errCampi"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (clienteId) {
        await invoke("update_cliente", { id: clienteId, data: { id: clienteId, ...form } });
      } else {
        await invoke("create_cliente", { data: { id: 0, ...form } });
      }
      onBack();
    } catch (e: any) { setError(String(e)); }
    finally { setSaving(false); }
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--text-muted)" }}>
      {t("common.loading")}
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-default)",
          color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
            {clienteId ? t("clienti.formTitleEdit") : t("clienti.formTitleNew")}
          </h1>
          {clienteId && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>ID: {clienteId}</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="s3d-btn s3d-btn-ghost" onClick={onBack}>{t("common.cancel")}</button>
          <button className="s3d-btn s3d-btn-primary" onClick={handleSave} disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? t("common.saving") : clienteId ? t("clienti.salvaModifiche") : t("clienti.creaCliente")}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)", marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Dati anagrafici */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>{t("clienti.sezAnagrafici")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={labelStyle}>{t("clienti.nome")}</label><input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder={t("clienti.phNome")} className="s3d-input" /></div>
          <div><label style={labelStyle}>{t("clienti.cognome")}</label><input type="text" value={form.cognome} onChange={(e) => updateField("cognome", e.target.value)} placeholder={t("clienti.phCognome")} className="s3d-input" /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>{t("clienti.azienda")}</label>
          <input type="text" value={form.denominazione_azienda} onChange={(e) => updateField("denominazione_azienda", e.target.value)} placeholder={t("clienti.phAzienda")} className="s3d-input" />
        </div>
      </div>

      {/* Contatti */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>{t("clienti.sezContatti")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>{t("clienti.thEmail")}</label>
            <input type="email" value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder={t("clienti.phEmail")}
              className="s3d-input" style={inputErrorBorder("email")} />
            <FieldError field="email" />
          </div>
          <div>
            <label style={labelStyle}>{t("clienti.thTelefono")}</label>
            <input type="tel" value={form.telefono}
              onChange={(e) => updateField("telefono", e.target.value)}
              onBlur={() => handleBlur("telefono")}
              placeholder={t("clienti.phTelefono")}
              className="s3d-input" style={inputErrorBorder("telefono")} />
            <FieldError field="telefono" />
          </div>
        </div>
      </div>

      {/* Indirizzo */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>{t("common.address")}</p>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>{t("common.address")}</label>
          <input type="text" value={form.indirizzo} onChange={(e) => updateField("indirizzo", e.target.value)} placeholder={t("clienti.phIndirizzo")} className="s3d-input" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
          <div>
            <label style={labelStyle}>{t("clienti.cap")}</label>
            <input type="text" value={form.cap}
              onChange={(e) => updateField("cap", e.target.value)}
              onBlur={() => handleBlur("cap")}
              placeholder={t("clienti.phCap")} maxLength={5}
              className="s3d-input" style={inputErrorBorder("cap")} />
            <FieldError field="cap" />
          </div>
          <div><label style={labelStyle}>{t("clienti.thCitta")}</label><input type="text" value={form.citta} onChange={(e) => updateField("citta", e.target.value)} placeholder={t("clienti.phCitta")} className="s3d-input" /></div>
          <div>
            <label style={labelStyle}>{t("clienti.provincia")}</label>
            <input type="text" value={form.provincia}
              onChange={(e) => updateField("provincia", e.target.value.toUpperCase())}
              onBlur={() => handleBlur("provincia")}
              placeholder={t("clienti.phProvincia")} maxLength={2}
              className="s3d-input" style={{ textTransform: "uppercase", ...inputErrorBorder("provincia") }} />
            <FieldError field="provincia" />
          </div>
        </div>
      </div>

      {/* Dati fiscali */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>{t("clienti.sezFiscali")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>{t("clienti.piva")}</label>
            <input type="text" value={form.partita_iva}
              onChange={(e) => updateField("partita_iva", e.target.value)}
              onBlur={() => handleBlur("partita_iva")}
              placeholder={t("clienti.phPiva")}
              className="s3d-input" style={inputErrorBorder("partita_iva")} />
            <FieldError field="partita_iva" />
          </div>
          <div>
            <label style={labelStyle}>{t("clienti.cf")}</label>
            <input type="text" value={form.codice_fiscale}
              onChange={(e) => updateField("codice_fiscale", e.target.value.toUpperCase())}
              onBlur={() => handleBlur("codice_fiscale")}
              placeholder={t("clienti.phCf")}
              className="s3d-input" style={{ textTransform: "uppercase", ...inputErrorBorder("codice_fiscale") }} />
            <FieldError field="codice_fiscale" />
          </div>
        </div>
      </div>

      {/* Note */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>{t("clienti.note")}</p>
        <textarea value={form.note} onChange={(e) => updateField("note", e.target.value)} placeholder={t("clienti.phNote")} rows={4} className="s3d-input" style={{ resize: "vertical" }} />
      </div>
    </div>
  );
}
