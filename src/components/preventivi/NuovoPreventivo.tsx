// src/components/preventivi/NuovoPreventivo.tsx
// ================================================
// Form preventivo completo — Dark Navy Premium Theme

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as shellOpen } from "@tauri-apps/plugin-shell";
import { exportPdfPreventivo, generaPdfPreventivoBlob } from "../../utils/pdfExport";
import { salvaPdfPreventivo } from "../../utils/ritenutaPdf";
import { SliceFileImporter, SliceData } from "./SliceFileImporter";
import { CorrieriModal } from "../corrieri/CorrieriModal";
import type { CorriereSelezionato } from "../corrieri/CorrieriModal";

// ── Tipi (stessi di prima) ──
interface MaterialeSlotOutput {
  id: number; riga_preventivo_id: number; materiale_id: number;
  materiale_nome: string; materiale_prezzo_kg: number; materiale_fallimento: number;
  slot_ams: number; colore_hex: string; peso_grammi: number;
  percentuale_pezzo: number; costo_materiale: number; costo_fallimento: number;
}
interface RigaCompleta {
  id: number; preventivo_id: number; nome_file: string; titolo_visualizzato: string;
  stampante_id: number | null; stampante_nome: string | null;
  profilo_stampa_id: number | null; profilo_nome: string | null;
  quantita: number; is_multicolore: boolean; tempo_stampa_sec: number;
  peso_totale_grammi: number; ingombro_x_mm: number; ingombro_y_mm: number; ingombro_z_mm: number;
  markup_riga: number | null; sconto_riga: number | null; fallimento_riga: number | null;
  post_processing: number; tempo_manuale: boolean; peso_manuale: boolean; ordine: number;
  costo_materiale_totale: number; costo_energia: number; costo_ammortamento: number;
  costo_fallimento: number; totale_costo: number; totale_cliente: number; profit: number;
  materiali: MaterialeSlotOutput[];
}
interface PreventivoCompleto {
  id: number; numero: string; cliente_id: number | null; cliente_nome: string | null;
  stato: string; data_creazione: string; markup_globale: number; sconto_globale: number;
  avvio_macchina: number; metodo_pagamento_id: number | null; corriere_id: number | null;
  acconto_tipo: string; acconto_valore: number; ritenuta_acconto: boolean; note: string;
  congelato: boolean; totale_costo: number; totale_cliente: number; totale_profit: number;
  totale_materiale_g: number; totale_tempo_sec: number; totale_servizi: number;
  totale_spedizione: number; totale_finale: number; righe: RigaCompleta[]; servizi: any[];
}
interface Cliente { id: number; nome: string; cognome: string; denominazione_azienda: string; email: string; cap: string; }
interface Materiale { id: number; nome: string; prezzo_kg: number; fallimento_percentuale: number; }
interface Stampante { id: number; nome: string; }
interface ProfiloStampa { id: number; nome: string; }
interface ServizioExtraItem { id: number; nome: string; importo_predefinito: number; addebita: boolean; addebita_senza_costo: boolean; markup_percentuale: number; }
interface MetodoPagamentoItem { id: number; nome: string; descrizione_pdf: string; commissione_percentuale: number; commissione_fissa: number; addebita_al_cliente: boolean; }
interface Props { preventivoId: number | null; onBack: () => void; }

// ── Config ──
const STATI: Record<string, { label: string; color: string; bg: string }> = {
  bozza:          { label: "Bozza",          color: "#8899b4", bg: "rgba(136,153,180,0.1)" },
  non_confermato: { label: "Bozza",          color: "#8899b4", bg: "rgba(136,153,180,0.1)" },
  inviato:        { label: "Inviato",        color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  accettato:      { label: "Accettato",      color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  in_produzione:  { label: "In produzione",  color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  completato:     { label: "Completato",     color: "#6ee7b7", bg: "rgba(110,231,183,0.12)" },
  rifiutato:      { label: "Rifiutato",      color: "#f87171", bg: "rgba(248,113,113,0.12)" },
};
const TRANSIZIONI: Record<string, { label: string; target: string; color: string }[]> = {
  bozza:          [{ label: "Invia al cliente", target: "inviato", color: "#3b82f6" }],
  non_confermato: [{ label: "Invia al cliente", target: "inviato", color: "#3b82f6" }],
  inviato:        [{ label: "Accettato", target: "accettato", color: "#34d399" },
                   { label: "Rifiutato", target: "rifiutato", color: "#f87171" },
                   { label: "↩ Bozza", target: "bozza", color: "#8899b4" }],
  accettato:      [{ label: "Avvia produzione", target: "in_produzione", color: "#fb923c" },
                   { label: "Rifiutato", target: "rifiutato", color: "#f87171" }],
  in_produzione:  [{ label: "Completato", target: "completato", color: "#6ee7b7" }],
  rifiutato:      [{ label: "↩ Riapri", target: "bozza", color: "#8899b4" }],
  completato:     [],
};

// ── Helpers ──
function formatTempo(sec: number) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function formatEuro(v: number) { return "€ " + v.toFixed(2).replace(".", ","); }
function formatDate(d: string) { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }

// ── Styles shorthand ──
const cardStyle: React.CSSProperties = {
  background: "#13233d", border: "1px solid rgba(56,119,214,0.12)",
  borderRadius: 14, padding: 20,
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: "#556a89", marginBottom: 4, display: "block", fontWeight: 600 };

// ══════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════
export function NuovoPreventivo({ preventivoId, onBack }: Props) {
  const [prev, setPrev] = useState<PreventivoCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [materiali, setMateriali] = useState<Materiale[]>([]);
  const [stampanti, setStampanti] = useState<Stampante[]>([]);
  const [profili, setProfili] = useState<ProfiloStampa[]>([]);
  const [serviziDisponibili, setServiziDisponibili] = useState<ServizioExtraItem[]>([]);
  const [metodiPagamento, setMetodiPagamento] = useState<MetodoPagamentoItem[]>([]);

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [markupGlobale, setMarkupGlobale] = useState(0);
  const [scontoGlobale, setScontoGlobale] = useState(0);
  const [avvioMacchina, setAvvioMacchina] = useState(0);
  const [note, setNote] = useState("");
  const [rigaEdit, setRigaEdit] = useState<RigaEditState | null>(null);
  const [invioResult, setInvioResult] = useState<{ pdfPath: string; clienteNome: string; clienteEmail: string; numero: string } | null>(null);
  const [showCorrieriModal, setShowCorrieriModal] = useState(false);
  const [deleteRigaTarget, setDeleteRigaTarget] = useState<number | null>(null);

  const loadLookups = useCallback(async () => {
    const [c, m, s, p, se, mp] = await Promise.all([
      invoke<Cliente[]>("get_clienti"), invoke<Materiale[]>("get_materiali"),
      invoke<Stampante[]>("get_stampanti"), invoke<ProfiloStampa[]>("get_profili"),
      invoke<ServizioExtraItem[]>("get_servizi_extra"), invoke<MetodoPagamentoItem[]>("get_metodi_pagamento"),
    ]);
    setClienti(c); setMateriali(m); setStampanti(s); setProfili(p);
    setServiziDisponibili(se); setMetodiPagamento(mp);
  }, []);

  const loadPreventivo = useCallback(async (id: number) => {
    try {
      const data = await invoke<PreventivoCompleto>("get_preventivo_completo", { id });
      setPrev(data); setClienteId(data.cliente_id); setMarkupGlobale(data.markup_globale);
      setScontoGlobale(data.sconto_globale); setAvvioMacchina(data.avvio_macchina); setNote(data.note);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLookups(); if (preventivoId) loadPreventivo(preventivoId); else setLoading(false); }, [preventivoId, loadLookups, loadPreventivo]);

  const saveHeader = useCallback(async () => {
    if (!prev) return; setSaving(true);
    try {
      await invoke("update_preventivo", { id: prev.id, data: {
        cliente_id: clienteId, markup_globale: markupGlobale, sconto_globale: scontoGlobale,
        avvio_macchina: avvioMacchina, metodo_pagamento_id: prev.metodo_pagamento_id,
        corriere_id: prev.corriere_id, acconto_tipo: prev.acconto_tipo,
        acconto_valore: prev.acconto_valore, ritenuta_acconto: prev.ritenuta_acconto, note,
        corriere_nome: null, corriere_servizio: null,
        costo_spedizione: prev.totale_spedizione > 0 ? prev.totale_spedizione : null,
      }});
      setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id }));
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { console.error(e); setSaving(false); }
  }, [prev, clienteId, markupGlobale, scontoGlobale, avvioMacchina, note]);

  const cambiaStato = async (nuovoStato: string) => {
    if (!prev) return;
    // "Invia al cliente" → flusso dedicato
    if (nuovoStato === "inviato") { await inviaAlCliente(); return; }
    await saveHeader();
    try { await invoke("update_stato_preventivo", { id: prev.id, nuovoStato }); loadPreventivo(prev.id); }
    catch (e) { alert(`Errore: ${e}`); }
  };

  const inviaAlCliente = async () => {
    if (!prev) return;
    setSaving(true);
    try {
      // 1) Salva header
      await saveHeader();
      // 2) Genera PDF blob
      const blob = await generaPdfPreventivoBlob(prev);
      // 3) Auto-salva in Documenti/Sparks3D/Preventivi/
      const clienteNome = clienteId
        ? (clienti.find(c => c.id === clienteId)?.denominazione_azienda
          || `${clienti.find(c => c.id === clienteId)?.nome ?? ""} ${clienti.find(c => c.id === clienteId)?.cognome ?? ""}`.trim())
        : "SenzaCliente";
      const pdfPath = await salvaPdfPreventivo(blob, prev.numero, clienteNome);
      // 4) Cambia stato a "inviato"
      await invoke("update_stato_preventivo", { id: prev.id, nuovoStato: "inviato" });
      // 5) Ricarica preventivo
      await loadPreventivo(prev.id);
      // 6) Mostra dialog con azioni
      const clienteEmail = clienti.find(c => c.id === clienteId)?.email ?? "";
      setInvioResult({ pdfPath, clienteNome, clienteEmail, numero: prev.numero });
    } catch (e) {
      console.error(e);
      alert(`Errore invio: ${e}`);
    } finally {
      setSaving(false);
    }
  };

  const addRiga = () => {
    setRigaEdit({
      mode: "new", rigaId: null, nome_file: "", titolo_visualizzato: "",
      stampante_id: stampanti[0]?.id ?? null, profilo_stampa_id: profili[0]?.id ?? null,
      quantita: 1, is_multicolore: false, tempo_ore: 0, tempo_min: 0,
      peso_totale_grammi: 0, post_processing: 0, markup_riga: null, sconto_riga: null, fallimento_riga: null,
      materiali_slots: [{ materiale_id: materiali[0]?.id ?? 0, slot_ams: 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 100 }],
    });
  };

  const editRiga = (r: RigaCompleta) => {
    setRigaEdit({
      mode: "edit", rigaId: r.id, nome_file: r.nome_file, titolo_visualizzato: r.titolo_visualizzato,
      stampante_id: r.stampante_id, profilo_stampa_id: r.profilo_stampa_id,
      quantita: r.quantita, is_multicolore: r.is_multicolore,
      tempo_ore: Math.floor(r.tempo_stampa_sec / 3600), tempo_min: Math.floor((r.tempo_stampa_sec % 3600) / 60),
      peso_totale_grammi: r.peso_totale_grammi, post_processing: r.post_processing,
      markup_riga: r.markup_riga, sconto_riga: r.sconto_riga, fallimento_riga: r.fallimento_riga,
      materiali_slots: r.materiali.length > 0
        ? r.materiali.map(m => ({ materiale_id: m.materiale_id, slot_ams: m.slot_ams, colore_hex: m.colore_hex, peso_grammi: m.peso_grammi, percentuale_pezzo: m.percentuale_pezzo }))
        : [{ materiale_id: materiali[0]?.id ?? 0, slot_ams: 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 100 }],
    });
  };

  const saveRiga = async () => {
    if (!prev || !rigaEdit) return; setSaving(true);
    try {
      const tempoSec = rigaEdit.tempo_ore * 3600 + rigaEdit.tempo_min * 60;
      const rigaData = {
        nome_file: rigaEdit.nome_file, titolo_visualizzato: rigaEdit.titolo_visualizzato || rigaEdit.nome_file,
        stampante_id: rigaEdit.stampante_id, profilo_stampa_id: rigaEdit.profilo_stampa_id,
        quantita: rigaEdit.quantita, is_multicolore: rigaEdit.is_multicolore,
        tempo_stampa_sec: tempoSec, peso_totale_grammi: rigaEdit.materiali_slots.reduce((s, m) => s + m.peso_grammi, 0),
        ingombro_x_mm: 0, ingombro_y_mm: 0, ingombro_z_mm: 0,
        markup_riga: rigaEdit.markup_riga, sconto_riga: rigaEdit.sconto_riga,
        fallimento_riga: rigaEdit.fallimento_riga, post_processing: rigaEdit.post_processing,
        tempo_manuale: true, peso_manuale: true, ordine: prev.righe.length,
      };
      let rigaId: number;
      if (rigaEdit.mode === "new") {
        rigaId = await invoke<number>("add_riga_preventivo", { preventivoId: prev.id, data: rigaData });
      } else { rigaId = rigaEdit.rigaId!; await invoke("update_riga_preventivo", { rigaId, data: rigaData }); }
      await invoke("set_riga_materiali", { rigaId, materiali: rigaEdit.materiali_slots.filter(m => m.materiale_id > 0) });
      setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id }));
      setRigaEdit(null);
    } catch (e) { console.error(e); alert(`Errore: ${e}`); } finally { setSaving(false); }
  };

  const deleteRiga = (rigaId: number) => {
    if (!prev) return;
    setDeleteRigaTarget(rigaId);
  };
  const confirmDeleteRiga = async () => {
    if (!prev || deleteRigaTarget === null) return;
    try { await invoke("delete_riga_preventivo", { rigaId: deleteRigaTarget }); setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id })); }
    catch (e) { console.error(e); }
    setDeleteRigaTarget(null);
  };

  // ── Export PDF ──
  const exportPdf = async () => {
    if (!prev) return;
    try {
      await exportPdfPreventivo(prev);
    } catch (e) {
      console.error(e);
      alert(`Errore export PDF: ${e}`);
    }
  };

  // ── Selezione corriere da PackLink ──
  const handleSelezionaCorriere = async (corriere: CorriereSelezionato) => {
    if (!prev) return;
    try {
      // Crea/salva il corriere nel DB
      const nuovoCorriere = await invoke<{ id: number }>("create_corriere", {
        data: {
          id: 0,
          nome: corriere.nome_corriere,
          servizio: corriere.nome_servizio,
          costo_spedizione: corriere.prezzo_totale,
          tempo_consegna: corriere.tempo_transito,
          packlink_service_id: corriere.id,
          note: [
            corriere.consegna_punto_ritiro ? "Punto di ritiro" : "Consegna a domicilio",
            corriere.data_consegna_stimata ? `Consegna: ${corriere.data_consegna_stimata}` : "",
            `Pacco: ${corriere.pacco_peso_kg}kg — ${corriere.pacco_lunghezza_cm}×${corriere.pacco_larghezza_cm}×${corriere.pacco_altezza_cm}cm`,
          ].filter(Boolean).join(" • "),
        },
      });
      // Aggiorna il preventivo con il corriere selezionato
      setPrev({ ...prev, corriere_id: nuovoCorriere.id, totale_spedizione: corriere.prezzo_totale });
      setShowCorrieriModal(false);
    } catch (e) {
      console.error(e);
      alert(`Errore selezione corriere: ${e}`);
    }
  };

  const rimuoviCorriere = () => {
    if (!prev) return;
    setPrev({ ...prev, corriere_id: null, totale_spedizione: 0 });
  };

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "#556a89" }}>Caricamento...</div>;
  if (!prev) return <div style={{ textAlign: "center", padding: "60px 0", color: "#f87171" }}>Preventivo non trovato</div>;

  const isEditable = ["bozza", "non_confermato"].includes(prev.stato);
  const sc = STATI[prev.stato] || STATI.bozza;
  const trans = TRANSIZIONI[prev.stato] || [];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ padding: 8, borderRadius: 8, border: "none", background: "rgba(56,119,214,0.08)", color: "#8899b4", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#e8edf5", fontFamily: "monospace", margin: 0 }}>{prev.numero}</h1>
              <span style={{ padding: "3px 14px", borderRadius: 100, fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg }}>
                {sc.label}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#556a89", marginTop: 2 }}>{formatDate(prev.data_creazione)}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isEditable && (
            <button
              onClick={saveHeader}
              disabled={saving}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "background 0.3s, color 0.3s, box-shadow 0.3s",
                background: saved
                  ? "linear-gradient(135deg, #059669, #10b981)"
                  : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                color: "#fff",
                boxShadow: saved
                  ? "0 2px 12px rgba(16,185,129,0.35)"
                  : "0 2px 12px rgba(14,165,233,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Salvataggio..." : saved ? "✓ Salvato!" : "💾 Salva"}
            </button>
          )}
          <button className="s3d-btn s3d-btn-ghost" onClick={exportPdf} style={{ gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
            </svg>
            Esporta PDF
          </button>
          {trans.map(t => (
            <button key={t.target} onClick={() => cambiaStato(t.target)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              background: `${t.color}18`, color: t.color,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* ═══ COLONNA SINISTRA ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Cliente */}
          <div style={cardStyle}>
            <div className="s3d-section-title">Cliente</div>
            <select value={clienteId ?? ""} onChange={e => setClienteId(e.target.value ? Number(e.target.value) : null)} disabled={!isEditable} className="s3d-select">
              <option value="">— Seleziona cliente —</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.denominazione_azienda || `${c.nome} ${c.cognome}`.trim() || `#${c.id}`}</option>)}
            </select>
          </div>

          {/* Parametri globali */}
          <div style={cardStyle}>
            <div className="s3d-section-title">Parametri globali</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Markup (%)</label>
                <input type="number" step="0.1" value={markupGlobale} onChange={e => setMarkupGlobale(Number(e.target.value))} disabled={!isEditable} className="s3d-input" style={{ textAlign: "right" }} />
              </div>
              <div>
                <label style={labelStyle}>Sconto (%)</label>
                <input type="number" step="0.1" value={scontoGlobale} onChange={e => setScontoGlobale(Number(e.target.value))} disabled={!isEditable} className="s3d-input" style={{ textAlign: "right" }} />
              </div>
              <div>
                <label style={labelStyle}>Avvio macchina (€)</label>
                <input type="number" step="0.5" value={avvioMacchina} onChange={e => setAvvioMacchina(Number(e.target.value))} disabled={!isEditable} className="s3d-input" style={{ textAlign: "right" }} />
              </div>
            </div>
          </div>

          {/* Righe stampa */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>Righe stampa ({prev.righe.length})</div>
              {isEditable && (
                <button className="s3d-btn s3d-btn-primary" onClick={addRiga} style={{ padding: "6px 14px", fontSize: 12 }}>
                  + Aggiungi riga
                </button>
              )}
            </div>
            {prev.righe.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#3d5170" }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>🖨️</div>
                <p>Nessuna riga. Aggiungi il primo modello 3D.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {prev.righe.map((riga, idx) => (
                  <RigaCard key={riga.id} riga={riga} index={idx} isEditable={isEditable}
                            onEdit={() => editRiga(riga)} onDelete={() => deleteRiga(riga.id)} />
                ))}
              </div>
            )}
          </div>

          {/* Note */}
          <div style={cardStyle}>
            <div className="s3d-section-title">Note</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} disabled={!isEditable}
                      rows={3} placeholder="Note interne o per il cliente..."
                      className="s3d-input" style={{ resize: "none", minHeight: 70 }} />
          </div>

          {/* ═══ SERVIZI EXTRA ═══ */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>Servizi extra</div>
            </div>
            {/* Lista servizi già aggiunti */}
            {prev.servizi.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {prev.servizi.map(s => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", background: "#0e1a2f", borderRadius: 8,
                    border: "1px solid rgba(56,119,214,0.08)",
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#e8edf5" }}>{s.nome}</span>
                      {s.addebito_cliente > 0 && (
                        <span style={{ fontSize: 11, color: "#34d399", marginLeft: 8 }}>→ {formatEuro(s.addebito_cliente)}</span>
                      )}
                      {s.addebito_cliente === 0 && s.costo_effettivo > 0 && (
                        <span style={{ fontSize: 11, color: "#556a89", marginLeft: 8 }}>(costo interno {formatEuro(s.costo_effettivo)})</span>
                      )}
                    </div>
                    {isEditable && (
                      <button onClick={async () => {
                        await invoke("remove_servizio_preventivo", { id: s.id });
                        setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id }));
                      }} style={{ padding: 4, border: "none", background: "transparent", color: "#f87171", cursor: "pointer", fontSize: 14 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Pulsanti per aggiungere servizi */}
            {isEditable && serviziDisponibili.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {serviziDisponibili.map(se => (
                  <button key={se.id} onClick={async () => {
                    await invoke("add_servizio_preventivo", { preventivoId: prev.id, servizioExtraId: se.id });
                    setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id }));
                  }} style={{
                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    border: "1px solid rgba(56,119,214,0.15)", background: "rgba(56,119,214,0.06)",
                    color: "#8899b4", cursor: "pointer", transition: "all 0.2s",
                  }}>
                    + {se.nome} {se.addebita ? `(${formatEuro(se.importo_predefinito * (1 + se.markup_percentuale / 100))})` : ""}
                  </button>
                ))}
              </div>
            )}
            {serviziDisponibili.length === 0 && prev.servizi.length === 0 && (
              <p style={{ color: "#3d5170", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
                Nessun servizio extra configurato. Aggiungili in Impostazioni → Servizi extra.
              </p>
            )}
          </div>

          {/* ═══ SPEDIZIONE ═══ */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>📦 Spedizione</div>
              {isEditable && (
                <button
                  onClick={() => setShowCorrieriModal(true)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "none", background: "rgba(251,146,60,0.12)", color: "#fb923c",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {prev.corriere_id ? "🔄 Cambia corriere" : "🔍 Calcola spedizione"}
                </button>
              )}
            </div>
            {prev.totale_spedizione > 0 ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", background: "rgba(52,211,153,0.06)", borderRadius: 10,
                border: "1px solid rgba(52,211,153,0.12)",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e8edf5" }}>
                    Spedizione inclusa
                  </div>
                  <div style={{ fontSize: 11, color: "#556a89", marginTop: 2 }}>
                    Costo spedizione applicato al preventivo
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "#34d399" }}>
                    {formatEuro(prev.totale_spedizione)}
                  </span>
                  {isEditable && (
                    <button onClick={rimuoviCorriere} style={{
                      padding: "4px 8px", border: "none", background: "transparent",
                      color: "#f87171", cursor: "pointer", fontSize: 13,
                    }}>✕</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#3d5170", fontSize: 12 }}>
                Nessuna spedizione. Clicca "Calcola spedizione" per cercare le tariffe PackLink.
              </div>
            )}
          </div>

          {/* ═══ METODO PAGAMENTO ═══ */}
          <div style={cardStyle}>
            <div className="s3d-section-title">Metodo di pagamento</div>
            <select
              value={prev.metodo_pagamento_id ?? ""}
              onChange={async (e) => {
                const mpId = e.target.value ? Number(e.target.value) : null;
                setPrev({ ...prev, metodo_pagamento_id: mpId });
              }}
              disabled={!isEditable}
              className="s3d-select"
            >
              <option value="">— Nessuno —</option>
              {metodiPagamento.map(mp => (
                <option key={mp.id} value={mp.id}>
                  {mp.nome}
                  {mp.commissione_percentuale > 0 ? ` (${mp.commissione_percentuale}% + ${formatEuro(mp.commissione_fissa)})` : ""}
                </option>
              ))}
            </select>
            {metodiPagamento.length === 0 && (
              <p style={{ color: "#3d5170", fontSize: 11, marginTop: 6 }}>
                Configura i metodi in Impostazioni → Pagamenti.
              </p>
            )}
          </div>
        </div>

        {/* ═══ COLONNA DESTRA: Riepilogo ═══ */}
        <div><RiepilogoCard prev={prev} /></div>
      </div>

      {/* ═══ MODALE RIGA ═══ */}
      {rigaEdit && <RigaModal edit={rigaEdit} setEdit={setRigaEdit} materiali={materiali}
                              stampanti={stampanti} profili={profili} onSave={saveRiga}
                              onCancel={() => setRigaEdit(null)} saving={saving} />}

      {/* ═══ MODALE INVIO AL CLIENTE ═══ */}
      {invioResult && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(4,8,20,0.8)", backdropFilter: "blur(8px)",
        }} onClick={() => setInvioResult(null)}>
          <div style={{
            background: "#13233d", border: "1px solid rgba(56,119,214,0.2)", borderRadius: 18,
            padding: 28, maxWidth: 520, width: "90%", boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e8edf5", margin: 0 }}>
                Preventivo inviato!
              </h3>
              <p style={{ fontSize: 13, color: "#556a89", marginTop: 6 }}>
                Il PDF è stato salvato automaticamente e lo stato è cambiato a "Inviato".
              </p>
            </div>

            <div style={{
              background: "rgba(56,119,214,0.06)", borderRadius: 10, padding: 14,
              marginBottom: 20, fontSize: 12, color: "#8899b4", wordBreak: "break-all",
              border: "1px solid rgba(56,119,214,0.1)",
            }}>
              📁 {invioResult.pdfPath}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={async () => {
                try { await invoke("open_pdf_file", { path: invioResult.pdfPath }); } catch {}
              }} style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(96,165,250,0.2)",
                background: "rgba(96,165,250,0.08)", color: "#60a5fa", fontSize: 14, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              }}>
                📄 Apri PDF
              </button>

              <button onClick={async () => {
                try { await invoke("open_file_in_explorer", { path: invioResult.pdfPath }); } catch {}
              }} style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(136,153,180,0.15)",
                background: "rgba(136,153,180,0.06)", color: "#8899b4", fontSize: 14, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              }}>
                📂 Apri cartella
              </button>

              {invioResult.clienteEmail && (
                <button onClick={async () => {
                  const subject = encodeURIComponent(`Preventivo ${invioResult.numero}`);
                  const body = encodeURIComponent(
                    `Gentile ${invioResult.clienteNome},\n\nIn allegato il preventivo ${invioResult.numero}.\n\nCordiali saluti`
                  );
                  const mailtoUrl = `mailto:${invioResult.clienteEmail}?subject=${subject}&body=${body}`;
                  try { await shellOpen(mailtoUrl); } catch (e) { console.error("Errore apertura email:", e); }
                }} style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(52,211,153,0.2)",
                  background: "rgba(52,211,153,0.08)", color: "#34d399", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
                }}>
                  ✉️ Invia email a {invioResult.clienteEmail}
                </button>
              )}
            </div>

            <button onClick={() => setInvioResult(null)} style={{
              width: "100%", marginTop: 16, padding: "10px 16px", borderRadius: 10,
              border: "none", background: "rgba(56,119,214,0.08)", color: "#556a89",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* ═══ MODALE CORRIERI PACKLINK ═══ */}
      <CorrieriModal
        isOpen={showCorrieriModal}
        onClose={() => setShowCorrieriModal(false)}
        onSeleziona={handleSelezionaCorriere}
        capCliente={clienteId ? (clienti.find(c => c.id === clienteId)?.cap ?? "") : ""}
        paeseCliente="IT"
      />

      {/* ═══ MODALE CONFERMA ELIMINA RIGA ═══ */}
      {deleteRigaTarget !== null && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }} onClick={() => setDeleteRigaTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#141c2e", border: "1px solid rgba(96,165,250,0.12)",
            borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(248,113,113,0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e8edf5" }}>Elimina riga</h3>
            </div>
            <p style={{ color: "#8899b4", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
              Sei sicuro di voler eliminare questa riga di stampa?
              <br />Questa azione non può essere annullata.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteRigaTarget(null)} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "1px solid rgba(136,153,180,0.2)", background: "transparent",
                color: "#8899b4", cursor: "pointer",
              }}>Annulla</button>
              <button onClick={confirmDeleteRiga} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", background: "#dc2626", color: "#fff", cursor: "pointer",
              }}>Elimina</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════
// RIGA CARD
// ══════════════════════════
function RigaCard({ riga, index, isEditable, onEdit, onDelete }: {
  riga: RigaCompleta; index: number; isEditable: boolean; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div style={{
      background: "#0e1a2f", border: "1px solid rgba(56,119,214,0.1)", borderRadius: 12,
      padding: 16, transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", background: "rgba(59,130,246,0.1)", color: "#60a5fa", padding: "2px 8px", borderRadius: 4 }}>#{index + 1}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#e8edf5" }}>{riga.titolo_visualizzato || riga.nome_file || "Senza nome"}</span>
            {riga.is_multicolore && <span style={{ fontSize: 10, background: "rgba(167,139,250,0.12)", color: "#a78bfa", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>AMS Multi</span>}
            <span style={{ fontSize: 12, color: "#556a89" }}>×{riga.quantita}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", fontSize: 12, color: "#556a89" }}>
            {riga.stampante_nome && <span>🖨 {riga.stampante_nome}</span>}
            {riga.profilo_nome && <span>📐 {riga.profilo_nome}</span>}
            <span>⏱ {formatTempo(riga.tempo_stampa_sec)}</span>
            <span>⚖ {riga.peso_totale_grammi.toFixed(1)}g</span>
          </div>
          {riga.materiali.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {riga.materiali.map(m => (
                <span key={m.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, background: "rgba(56,119,214,0.08)", padding: "3px 10px", borderRadius: 100,
                  color: "#8899b4",
                }}>
                  {m.colore_hex && <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.colore_hex, border: "1px solid rgba(255,255,255,0.15)" }} />}
                  {m.materiale_nome} — {m.peso_grammi.toFixed(1)}g
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", marginLeft: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#556a89" }}>Costo</div>
          <div style={{ fontSize: 13, fontFamily: "monospace", color: "#8899b4" }}>{formatEuro(riga.totale_costo)}</div>
          <div style={{ fontSize: 10, color: "#556a89", marginTop: 4 }}>Cliente</div>
          <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "#e8edf5" }}>{formatEuro(riga.totale_cliente)}</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, marginTop: 4, color: riga.profit >= 0 ? "#34d399" : "#f87171" }}>
            {formatEuro(riga.profit)}
          </div>
        </div>
      </div>
      {/* Breakdown */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(56,119,214,0.06)", display: "flex", flexWrap: "wrap", gap: "0 16px", fontSize: 11, color: "#3d5170" }}>
        <span>Mat: {formatEuro(riga.costo_materiale_totale)}</span>
        <span>Energia: {formatEuro(riga.costo_energia)}</span>
        <span>Ammort: {formatEuro(riga.costo_ammortamento)}</span>
        <span>Fall: {formatEuro(riga.costo_fallimento)}</span>
        {riga.post_processing > 0 && <span>Post: {formatEuro(riga.post_processing)}</span>}
      </div>
      {isEditable && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
          <button onClick={onEdit} className="s3d-btn s3d-btn-ghost" style={{ padding: "4px 12px", fontSize: 12 }}>✏️ Modifica</button>
          <button onClick={onDelete} className="s3d-btn s3d-btn-danger" style={{ padding: "4px 12px", fontSize: 12 }}>🗑 Elimina</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════
// RIEPILOGO CARD
// ══════════════════════════
function RiepilogoCard({ prev }: { prev: PreventivoCompleto }) {
  const stats = prev.righe.reduce((a, r) => ({ pezzi: a.pezzi + r.quantita, tempo: a.tempo + r.tempo_stampa_sec * r.quantita }), { pezzi: 0, tempo: 0 });
  return (
    <div style={{
      background: "linear-gradient(180deg, #13233d 0%, #111d33 100%)",
      border: "1px solid rgba(56,119,214,0.15)", borderRadius: 14, padding: 20,
      position: "sticky", top: 24,
      boxShadow: "0 0 30px rgba(59,130,246,0.06)",
    }}>
      <div className="s3d-section-title">Riepilogo</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ v: prev.righe.length, l: "Modelli" }, { v: stats.pezzi, l: "Pezzi" },
          { v: formatTempo(stats.tempo), l: "Tempo stampa" }, { v: `${(prev.totale_materiale_g / 1000).toFixed(2)}kg`, l: "Materiale" }
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(56,119,214,0.06)", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#e8edf5" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#556a89", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* Costi */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        {[{ l: "Subtotale righe", v: prev.totale_cliente },
          ...(prev.avvio_macchina > 0 ? [{ l: "Avvio macchina", v: prev.avvio_macchina }] : []),
          ...(prev.totale_servizi > 0 ? [{ l: "Servizi extra", v: prev.totale_servizi }] : []),
          ...(prev.totale_spedizione > 0 ? [{ l: "Spedizione", v: prev.totale_spedizione }] : []),
        ].map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#556a89" }}>{r.l}</span>
            <span style={{ fontFamily: "monospace", color: "#8899b4" }}>{formatEuro(r.v)}</span>
          </div>
        ))}
      </div>
      {/* Totale */}
      <div style={{ margin: "16px 0", padding: "14px 0", borderTop: "1px solid rgba(56,119,214,0.15)", borderBottom: "1px solid rgba(56,119,214,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "#e8edf5" }}>TOTALE</span>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "#60a5fa" }}>{formatEuro(prev.totale_finale)}</span>
        </div>
      </div>
      {/* Profit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: prev.totale_profit >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#556a89", marginBottom: 4 }}>Profitto</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: prev.totale_profit >= 0 ? "#34d399" : "#f87171" }}>
            {formatEuro(prev.totale_profit)}
          </div>
        </div>
        <div style={{ background: "rgba(56,119,214,0.06)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#556a89", marginBottom: 4 }}>Margine</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: "#60a5fa" }}>
            {prev.totale_finale > 0 ? ((prev.totale_profit / prev.totale_finale) * 100).toFixed(1) + "%" : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════
// MODALE RIGA
// ══════════════════════════
interface MaterialeSlotEdit { materiale_id: number; slot_ams: number; colore_hex: string; peso_grammi: number; percentuale_pezzo: number; }
interface RigaEditState {
  mode: "new" | "edit"; rigaId: number | null; nome_file: string; titolo_visualizzato: string;
  stampante_id: number | null; profilo_stampa_id: number | null; quantita: number; is_multicolore: boolean;
  tempo_ore: number; tempo_min: number; peso_totale_grammi: number; post_processing: number;
  markup_riga: number | null; sconto_riga: number | null; fallimento_riga: number | null;
  materiali_slots: MaterialeSlotEdit[];
}

function RigaModal({ edit, setEdit, materiali, stampanti, profili, onSave, onCancel, saving }: {
  edit: RigaEditState; setEdit: (e: RigaEditState | null) => void; materiali: Materiale[];
  stampanti: Stampante[]; profili: ProfiloStampa[]; onSave: () => void; onCancel: () => void; saving: boolean;
}) {
  const upd = (p: Partial<RigaEditState>) => setEdit({ ...edit, ...p });
  const updSlot = (i: number, p: Partial<MaterialeSlotEdit>) => { const s = [...edit.materiali_slots]; s[i] = { ...s[i], ...p }; upd({ materiali_slots: s }); };
  const addSlot = () => upd({ is_multicolore: true, materiali_slots: [...edit.materiali_slots, { materiale_id: materiali[0]?.id ?? 0, slot_ams: edit.materiali_slots.length + 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 0 }] });
  const rmSlot = (i: number) => { const s = edit.materiali_slots.filter((_, j) => j !== i); upd({ is_multicolore: s.length > 1, materiali_slots: s.length ? s : [{ materiale_id: 0, slot_ams: 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 100 }] }); };

  const modalBg: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,8,20,0.8)", backdropFilter: "blur(8px)", padding: 16 };
  const modalBox: React.CSSProperties = { background: "#13233d", border: "1px solid rgba(56,119,214,0.2)", borderRadius: 18, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" };
  const row3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 };
  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
  const row4: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 };

  // ── Importazione da GCode/3MF ──
  const handleSliceImport = (data: SliceData) => {
    const ore = Math.floor(data.tempo_stampa_sec / 3600);
    const min = Math.floor((data.tempo_stampa_sec % 3600) / 60);
    const nomeFile = data.nome_file || edit.nome_file;

    let slots: MaterialeSlotEdit[];
    if (data.materiali.length > 1) {
      slots = data.materiali.map((m) => {
        const matched = materiali.find(db => db.nome.toLowerCase().includes(m.tipo.toLowerCase()));
        return { materiale_id: matched?.id ?? materiali[0]?.id ?? 0, slot_ams: m.slot, colore_hex: m.colore || "", peso_grammi: m.peso_grammi, percentuale_pezzo: data.peso_totale_grammi > 0 ? Math.round((m.peso_grammi / data.peso_totale_grammi) * 100) : 0 };
      });
    } else if (data.materiali.length === 1) {
      const m = data.materiali[0];
      const matched = materiali.find(db => db.nome.toLowerCase().includes(m.tipo.toLowerCase()));
      slots = [{ materiale_id: matched?.id ?? edit.materiali_slots[0]?.materiale_id ?? materiali[0]?.id ?? 0, slot_ams: 1, colore_hex: m.colore || "", peso_grammi: m.peso_grammi > 0 ? m.peso_grammi : data.peso_totale_grammi, percentuale_pezzo: 100 }];
    } else {
      const currentSlot = edit.materiali_slots[0] || { materiale_id: materiali[0]?.id ?? 0, slot_ams: 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 100 };
      if (data.filamento_tipo) { const matched = materiali.find(db => db.nome.toLowerCase().includes(data.filamento_tipo.toLowerCase())); if (matched) currentSlot.materiale_id = matched.id; }
      slots = [{ ...currentSlot, peso_grammi: data.peso_totale_grammi, percentuale_pezzo: 100 }];
    }

    upd({ nome_file: nomeFile, titolo_visualizzato: edit.titolo_visualizzato || nomeFile.replace(/\.(gcode|3mf|gco|g)$/i, ""), tempo_ore: ore, tempo_min: min, peso_totale_grammi: data.peso_totale_grammi, is_multicolore: data.materiali.length > 1, materiali_slots: slots });
  };

  return (
    <div style={modalBg}>
      <div style={modalBox} className="animate-fade-in">
        <div style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "#e8edf5", marginBottom: 24, margin: 0 }}>
            {edit.mode === "new" ? "Nuova riga" : "Modifica riga"}
          </h3>

          {/* ═══ IMPORTAZIONE GCODE / 3MF ═══ */}
          <div style={{ marginBottom: 20 }}>
            <SliceFileImporter onImport={handleSliceImport} />
          </div>

          <div style={{ ...row2, marginBottom: 16 }}>
            <div><label style={labelStyle}>Nome file / modello</label><input className="s3d-input" value={edit.nome_file} onChange={e => upd({ nome_file: e.target.value })} placeholder="es. Cover iPhone.3mf" /></div>
            <div><label style={labelStyle}>Titolo visualizzato</label><input className="s3d-input" value={edit.titolo_visualizzato} onChange={e => upd({ titolo_visualizzato: e.target.value })} placeholder="es. Cover iPhone 15 Pro" /></div>
          </div>

          <div style={{ ...row3, marginBottom: 16 }}>
            <div><label style={labelStyle}>Stampante</label><select className="s3d-select" value={edit.stampante_id ?? ""} onChange={e => upd({ stampante_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{stampanti.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
            <div><label style={labelStyle}>Profilo stampa</label><select className="s3d-select" value={edit.profilo_stampa_id ?? ""} onChange={e => upd({ profilo_stampa_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{profili.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div><label style={labelStyle}>Quantità</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={1} value={edit.quantita} onChange={e => upd({ quantita: Math.max(1, Number(e.target.value)) })} /></div>
          </div>

          <div style={{ ...row4, marginBottom: 16 }}>
            <div><label style={labelStyle}>Ore</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={0} value={edit.tempo_ore} onChange={e => upd({ tempo_ore: Math.max(0, Number(e.target.value)) })} /></div>
            <div><label style={labelStyle}>Minuti</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={0} max={59} value={edit.tempo_min} onChange={e => upd({ tempo_min: Math.max(0, Math.min(59, Number(e.target.value))) })} /></div>
            <div><label style={labelStyle}>Post-proc (€)</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.5" value={edit.post_processing} onChange={e => upd({ post_processing: Number(e.target.value) })} /></div>
            <div><label style={labelStyle}>Fall. override (%)</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={edit.fallimento_riga ?? ""} onChange={e => upd({ fallimento_riga: e.target.value ? Number(e.target.value) : null })} placeholder="auto" /></div>
          </div>

          <div style={{ ...row2, marginBottom: 20 }}>
            <div><label style={labelStyle}>Markup override (%)</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={edit.markup_riga ?? ""} onChange={e => upd({ markup_riga: e.target.value ? Number(e.target.value) : null })} placeholder="globale" /></div>
            <div><label style={labelStyle}>Sconto override (%)</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={edit.sconto_riga ?? ""} onChange={e => upd({ sconto_riga: e.target.value ? Number(e.target.value) : null })} placeholder="globale" /></div>
          </div>

          {/* Materiali AMS */}
          <div style={{ borderTop: "1px solid rgba(56,119,214,0.1)", paddingTop: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>Materiali {edit.is_multicolore && "(Multi AMS)"}</div>
              <button onClick={addSlot} style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, border: "none", background: "rgba(167,139,250,0.12)", color: "#a78bfa", cursor: "pointer" }}>
                + Slot AMS
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {edit.materiali_slots.map((slot, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: 12, background: "rgba(56,119,214,0.04)", borderRadius: 10 }}>
                  <div style={{ width: 28, fontSize: 11, fontFamily: "monospace", color: "#556a89", alignSelf: "center" }}>S{slot.slot_ams}</div>
                  <div style={{ flex: 1 }}><label style={labelStyle}>Materiale</label>
                    <select className="s3d-select" value={slot.materiale_id} onChange={e => updSlot(idx, { materiale_id: Number(e.target.value) })}>
                      <option value={0}>—</option>{materiali.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.prezzo_kg.toFixed(2)} €/kg)</option>)}
                    </select>
                  </div>
                  <div style={{ width: 90 }}><label style={labelStyle}>Peso (g)</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={slot.peso_grammi} onChange={e => updSlot(idx, { peso_grammi: Number(e.target.value) })} /></div>
                  <div style={{ width: 60 }}><label style={labelStyle}>%</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} value={slot.percentuale_pezzo} onChange={e => updSlot(idx, { percentuale_pezzo: Number(e.target.value) })} /></div>
                  <div style={{ width: 40 }}><label style={labelStyle}>Col.</label><input type="color" value={slot.colore_hex || "#000000"} onChange={e => updSlot(idx, { colore_hex: e.target.value })} style={{ width: "100%", height: 36, padding: 2, border: "1px solid rgba(56,119,214,0.15)", borderRadius: 6, cursor: "pointer", background: "transparent" }} /></div>
                  {edit.materiali_slots.length > 1 && (
                    <button onClick={() => rmSlot(idx)} style={{ padding: 6, border: "none", background: "transparent", color: "#f87171", cursor: "pointer", alignSelf: "center" }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottoni */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid rgba(56,119,214,0.1)" }}>
            <button className="s3d-btn s3d-btn-ghost" onClick={onCancel}>Annulla</button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                padding: "9px 18px",
                borderRadius: 12,
                border: "none",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "background 0.3s, box-shadow 0.3s",
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                color: "#fff",
                boxShadow: "0 2px 12px rgba(14,165,233,0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Salvataggio..." : edit.mode === "new" ? "Aggiungi riga" : "Salva modifiche"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
