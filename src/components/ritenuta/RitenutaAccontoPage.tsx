// src/components/ritenuta/RitenutaAccontoPage.tsx
// Sparks3D Preventivi – Generazione Ritenuta d'Acconto / Ricevuta
// =================================================================

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import { generaRitenutaPdf, esportaRitenutaConNome, DatiRitenuta } from "../../utils/ritenutaPdf";

interface Cliente {
  id: number; nome: string; cognome: string;
  denominazione_azienda: string; email: string; telefono: string;
  indirizzo: string; cap: string; citta: string; provincia: string;
  partita_iva: string; codice_fiscale: string; note: string;
}

interface Preventivo {
  id: number; numero: string; cliente_id: number | null;
  totale_finale: number; note: string;
}

const eur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

export function RitenutaAccontoPage({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [preventivi, setPreventivi] = useState<Preventivo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [preventivoId, setPreventivoId] = useState<number | null>(null);
  const [numero, setNumero] = useState("");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [descrizione, setDescrizione] = useState("");
  const [importoLordo, setImportoLordo] = useState(0);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const [cl, pr] = await Promise.all([
        invoke<Cliente[]>("get_clienti"),
        invoke<Preventivo[]>("get_preventivi"),
      ]);
      setClienti(cl);
      setPreventivi(pr);

      // Numero auto: RIC-{anno}-{prossimo}
      const anno = new Date().getFullYear();
      setNumero(`RIC-${anno}-${pr.length + 1}`);
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Cliente selezionato
  const cliente = clienti.find((c) => c.id === clienteId);
  const isAzienda = !!cliente?.partita_iva?.trim();

  // Calcoli
  const RITENUTA_PCT = 20;
  const ritenuta = isAzienda ? importoLordo * (RITENUTA_PCT / 100) : 0;
  const netto = importoLordo - ritenuta;
  const marcaBollo = importoLordo > 77.47 ? 2.0 : 0;
  const totaleAPagare = netto + marcaBollo;

  // Display nome cliente
  const displayCliente = (c: Cliente) => {
    if (c.denominazione_azienda) return c.denominazione_azienda;
    return [c.nome, c.cognome].filter(Boolean).join(" ") || `Cliente #${c.id}`;
  };

  // Quando si seleziona un preventivo, pre-compila
  const onSelectPreventivo = (id: number) => {
    setPreventivoId(id);
    const p = preventivi.find((pr) => pr.id === id);
    if (p) {
      setImportoLordo(p.totale_finale);
      setDescrizione(t("ritenuta.descDefault", { numero: p.numero }));
      if (p.cliente_id) setClienteId(p.cliente_id);
    }
  };

  // Genera PDF
  const handleGenera = async () => {
    if (!cliente) { setError(t("ritenuta.errCliente")); return; }
    if (importoLordo <= 0) { setError(t("ritenuta.errImporto")); return; }
    if (!descrizione.trim()) { setError(t("ritenuta.errDescrizione")); return; }

    try {
      setLoading(true); setError(""); setSuccess("");
      const prev = preventivi.find((p) => p.id === preventivoId);

      const dati: DatiRitenuta = {
        numero,
        data,
        cliente_nome: displayCliente(cliente),
        cliente_indirizzo: cliente.indirizzo,
        cliente_cap_citta: [cliente.cap, cliente.citta, cliente.provincia ? `(${cliente.provincia})` : ""].filter(Boolean).join(" "),
        cliente_cf: cliente.codice_fiscale,
        cliente_piva: cliente.partita_iva,
        descrizione,
        importo_lordo: importoLordo,
        preventivo_numero: prev?.numero,
        preventivo_id: prev?.id,
        cliente_id: cliente.id,
        note: note || undefined,
      };

      const risultato = await generaRitenutaPdf(dati);

      const tipoDoc = isAzienda ? t("ritenuta.tipoRitenuta") : t("ritenuta.tipoRicevuta");
      let msg = `✅ PDF "${tipoDoc}" → Documenti/Sparks3D/Ritenute/`;
      if (risultato.salvato_in_archivio) {
        msg += "\n📋 Archiviato nel database.";
      }
      setSuccess(msg);

      // Apri il PDF automaticamente
      try {
        await invoke("open_pdf_file", { path: risultato.pdf_path });
      } catch { /* ignore */ }
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }} className="animate-fade-in">
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
          onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          {t("ritenuta.torna")}
        </button>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>{t("ritenuta.title")}</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          {t("ritenuta.subtitle")}
        </p>
      </div>

      {/* Messaggi */}
      {error && (
        <div style={{ padding: 12, background: "var(--red-soft)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: 10, fontSize: 13, color: "var(--red)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg text-sm mb-4" style={{ background: "var(--green-soft, rgba(34,197,94,.12))", color: "var(--green, #22c55e)", border: "1px solid rgba(34,197,94,.25)" }}>
          ✅ {success}
        </div>
      )}

      <div className="s3d-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Carica da preventivo (opzionale) ── */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              {t("ritenuta.caricaDaPreventivo")}
            </p>
            <select
              className="s3d-input"
              value={preventivoId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v) onSelectPreventivo(Number(v));
                else { setPreventivoId(null); }
              }}
            >
              <option value="">{t("ritenuta.selezionaPreventivo")}</option>
              {preventivi.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero} — {eur(p.totale_finale)}
                </option>
              ))}
            </select>
          </div>

          {/* ── Numero e Data ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("ritenuta.numeroRicevuta")}</label>
              <input type="text" value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="s3d-input" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("common.date")}</label>
              <input type="date" value={data}
                onChange={(e) => setData(e.target.value)}
                className="s3d-input" />
            </div>
          </div>

          {/* ── Cliente ── */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
              {t("ritenuta.committente")}
            </p>
            <select
              className="s3d-input"
              value={clienteId ?? ""}
              onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t("ritenuta.selezionaCliente")}</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {displayCliente(c)}
                  {c.partita_iva ? ` (P.IVA: ${c.partita_iva})` : " (Privato)"}
                </option>
              ))}
            </select>

            {/* Badge tipo cliente */}
            {cliente && (
              <div className="mt-3 p-3 rounded-lg" style={{
                background: isAzienda ? "var(--accent-soft, rgba(14,165,233,.08))" : "var(--orange-soft, rgba(249,115,22,.1))",
                border: `1px solid ${isAzienda ? "rgba(14,165,233,.2)" : "rgba(249,115,22,.2)"}`,
              }}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: isAzienda ? "rgba(14,165,233,.15)" : "rgba(249,115,22,.15)",
                    color: isAzienda ? "var(--accent, #0ea5e9)" : "var(--orange, #f97316)",
                  }}>
                    {isAzienda ? `🏢 ${t("ritenuta.tipoAzienda")}` : `👤 ${t("ritenuta.tipoPrivato")}`}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary, #b8c5db)" }}>
                  {isAzienda
                    ? t("ritenuta.helpAzienda")
                    : t("ritenuta.helpPrivato")}
                </p>
              </div>
            )}
          </div>

          {/* ── Descrizione ── */}
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("ritenuta.descrizioneLabel")}</label>
            <textarea value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder={t("ritenuta.phDescrizione")}
              rows={3}
              className="s3d-input" style={{ resize: "vertical" }} />
          </div>

          {/* ── Importo ── */}
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("ritenuta.compensoLordo")}</label>
            <input type="number" step="0.01" min="0"
              value={importoLordo}
              onChange={(e) => setImportoLordo(parseFloat(e.target.value) || 0)}
              className="s3d-input"
              style={{ fontSize: 18, fontWeight: 700, padding: "12px 16px" }} />
          </div>

          {/* ── Riepilogo calcolo ── */}
          {importoLordo > 0 && (
            <div className="p-4 rounded-lg" style={{
              background: "var(--bg-surface, #151c32)",
              border: "1px solid var(--border-default, rgba(99,180,255,.22))",
            }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-label, #7dd3fc)" }}>
                {t("ritenuta.riepilogo")}
              </p>
              <div className="space-y-2">
                <Row label={t("ritenuta.compensoLordoLabel")} value={eur(importoLordo)} />
                {isAzienda && (
                  <Row label={`${t("ritenuta.ritenutaAcconto")} (${RITENUTA_PCT}%)`} value={`- ${eur(ritenuta)}`} color="var(--red, #f43f5e)" />
                )}
                {!isAzienda && (
                  <Row label={t("ritenuta.ritenutaAcconto")} value={t("ritenuta.nonApplicata")} muted />
                )}
                {marcaBollo > 0 && (
                  <Row label={t("ritenuta.marcaDaBollo")} value={`+ ${eur(marcaBollo)}`} />
                )}
                <div style={{ borderTop: "1px solid var(--border-default, rgba(99,180,255,.15))", paddingTop: 8, marginTop: 8 }}>
                  <Row label={t("ritenuta.nettoPagare")} value={eur(totaleAPagare)} bold color="var(--green, #22c55e)" />
                </div>
              </div>
            </div>
          )}

          {/* ── Note ── */}
          <div>
            <label style={{ display: "block", fontSize: "var(--font-size-label)", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>{t("ritenuta.noteLabel")}</label>
            <textarea value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("ritenuta.phNote")}
              rows={2}
              className="s3d-input" style={{ resize: "vertical" }} />
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid var(--border-subtle)" }}>
          <div className="text-xs" style={{ color: "var(--text-muted, #6b7fa0)" }}>
            {cliente ? (
              isAzienda
                ? t("ritenuta.helpRitenuta")
                : t("ritenuta.helpRicevuta")
            ) : t("ritenuta.selezionaClienteErr")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                if (!cliente) { setError(t("ritenuta.errCliente")); return; }
                if (importoLordo <= 0) { setError(t("ritenuta.errImporto")); return; }
                if (!descrizione.trim()) { setError(t("ritenuta.errDescrizioneCorta")); return; }
                const prev = preventivi.find((p) => p.id === preventivoId);
                const dati: DatiRitenuta = {
                  numero, data, cliente_nome: displayCliente(cliente),
                  cliente_indirizzo: cliente.indirizzo,
                  cliente_cap_citta: [cliente.cap, cliente.citta, cliente.provincia ? `(${cliente.provincia})` : ""].filter(Boolean).join(" "),
                  cliente_cf: cliente.codice_fiscale, cliente_piva: cliente.partita_iva,
                  descrizione, importo_lordo: importoLordo,
                  preventivo_numero: prev?.numero, preventivo_id: prev?.id, cliente_id: cliente.id,
                  note: note || undefined,
                };
                try {
                  const path = await esportaRitenutaConNome(dati);
                  if (path) setSuccess(`PDF salvato in: ${path}`);
                } catch (e: any) { setError(String(e)); }
              }}
              disabled={loading || !cliente || importoLordo <= 0 || !descrizione.trim()}
              className="px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", cursor: "pointer" }}
            >
              {t("ritenuta.salvaConNome")}
            </button>
            <button
              onClick={handleGenera}
              disabled={loading || !cliente || importoLordo <= 0 || !descrizione.trim()}
              className="s3d-btn s3d-btn-primary"
            >
              {loading ? "⏳ Generazione…" : t("ritenuta.generaPdf")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Riga riepilogo ──

function Row({ label, value, bold, color, muted }: {
  label: string; value: string; bold?: boolean; color?: string; muted?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span style={{ color: muted ? "var(--text-muted, #6b7fa0)" : "var(--text-secondary, #b8c5db)", fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span style={{
        fontWeight: bold ? 700 : 600,
        color: muted ? "var(--text-muted, #6b7fa0)" : color || "var(--text-primary, #fff)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </span>
    </div>
  );
}
