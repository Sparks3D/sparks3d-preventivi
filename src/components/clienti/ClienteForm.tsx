// src/components/clienti/ClienteForm.tsx
// Sparks3D Preventivi – Form Cliente (pagina dedicata)
// =====================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

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

export function ClienteForm({ clienteId, onBack }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!clienteId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  const updateField = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.nome.trim() && !form.cognome.trim() && !form.denominazione_azienda.trim()) {
      setError("Inserisci almeno il nome o la denominazione azienda"); return;
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--text-muted)" }}>
      Caricamento…
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
            {clienteId ? "Modifica cliente" : "Nuovo cliente"}
          </h1>
          {clienteId && <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>ID: {clienteId}</p>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="s3d-btn s3d-btn-ghost" onClick={onBack}>Annulla</button>
          <button className="s3d-btn s3d-btn-primary" onClick={handleSave} disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}>
            {saving ? "Salvataggio..." : clienteId ? "Salva modifiche" : "Crea cliente"}
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
        <p style={sectionTitle}>Dati anagrafici</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={labelStyle}>Nome</label><input type="text" value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Mario" className="s3d-input" /></div>
          <div><label style={labelStyle}>Cognome</label><input type="text" value={form.cognome} onChange={(e) => updateField("cognome", e.target.value)} placeholder="Rossi" className="s3d-input" /></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>Denominazione azienda</label>
          <input type="text" value={form.denominazione_azienda} onChange={(e) => updateField("denominazione_azienda", e.target.value)} placeholder="Acme S.r.l." className="s3d-input" />
        </div>
      </div>

      {/* Contatti */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>Contatti</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={labelStyle}>Email</label><input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="mario@esempio.it" className="s3d-input" /></div>
          <div><label style={labelStyle}>Telefono</label><input type="tel" value={form.telefono} onChange={(e) => updateField("telefono", e.target.value)} placeholder="+39 333 1234567" className="s3d-input" /></div>
        </div>
      </div>

      {/* Indirizzo */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>Indirizzo</p>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Indirizzo</label>
          <input type="text" value={form.indirizzo} onChange={(e) => updateField("indirizzo", e.target.value)} placeholder="Via Roma 1" className="s3d-input" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", gap: 12 }}>
          <div><label style={labelStyle}>CAP</label><input type="text" value={form.cap} onChange={(e) => updateField("cap", e.target.value)} placeholder="25031" className="s3d-input" /></div>
          <div><label style={labelStyle}>Città</label><input type="text" value={form.citta} onChange={(e) => updateField("citta", e.target.value)} placeholder="Capriolo" className="s3d-input" /></div>
          <div><label style={labelStyle}>Prov.</label><input type="text" value={form.provincia} onChange={(e) => updateField("provincia", e.target.value)} placeholder="BS" maxLength={2} className="s3d-input" style={{ textTransform: "uppercase" }} /></div>
        </div>
      </div>

      {/* Dati fiscali */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>Dati fiscali</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={labelStyle}>Partita IVA</label><input type="text" value={form.partita_iva} onChange={(e) => updateField("partita_iva", e.target.value)} placeholder="IT01234567890" className="s3d-input" /></div>
          <div><label style={labelStyle}>Codice fiscale</label><input type="text" value={form.codice_fiscale} onChange={(e) => updateField("codice_fiscale", e.target.value.toUpperCase())} placeholder="RSSMRA80A01B157H" className="s3d-input" style={{ textTransform: "uppercase" }} /></div>
        </div>
      </div>

      {/* Note */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={sectionTitle}>Note</p>
        <textarea value={form.note} onChange={(e) => updateField("note", e.target.value)} placeholder="Note libere sul cliente…" rows={4} className="s3d-input" style={{ resize: "vertical" }} />
      </div>
    </div>
  );
}
