// src/components/preventivi/NuovoPreventivo.tsx
// ================================================
// Form preventivo completo — Dark Navy Premium Theme

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  piatto: number; thumbnail_path: string; thumbnails_json: string; foto_prodotto_path: string;
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
const STATI_STYLES: Record<string, { key: string; color: string; bg: string }> = {
  bozza:          { key: "bozza",          color: "var(--text-secondary)", bg: "rgba(136,153,180,0.1)" },
  non_confermato: { key: "bozza",          color: "var(--text-secondary)", bg: "rgba(136,153,180,0.1)" },
  inviato:        { key: "inviato",        color: "var(--accent)", bg: "rgba(96,165,250,0.12)" },
  accettato:      { key: "accettato",      color: "var(--green)", bg: "rgba(52,211,153,0.12)" },
  in_produzione:  { key: "in_produzione",  color: "var(--orange)", bg: "rgba(251,146,60,0.12)" },
  completato:     { key: "completato",     color: "#6ee7b7", bg: "rgba(110,231,183,0.12)" },
  rifiutato:      { key: "rifiutato",      color: "var(--red)", bg: "rgba(248,113,113,0.12)" },
};
const TRANSIZIONI_DEF: Record<string, { tKey: string; target: string; color: string }[]> = {
  bozza:          [{ tKey: "preventivi.inviaAlCliente", target: "inviato", color: "#3b82f6" }],
  non_confermato: [{ tKey: "preventivi.inviaAlCliente", target: "inviato", color: "#3b82f6" }],
  inviato:        [{ tKey: "stati.accettato", target: "accettato", color: "var(--green)" },
                   { tKey: "stati.rifiutato", target: "rifiutato", color: "var(--red)" },
                   { tKey: "preventivi.bozza", target: "bozza", color: "var(--text-secondary)" }],
  accettato:      [{ tKey: "preventivi.avviaProduzione", target: "in_produzione", color: "var(--orange)" },
                   { tKey: "stati.rifiutato", target: "rifiutato", color: "var(--red)" }],
  in_produzione:  [{ tKey: "stati.completato", target: "completato", color: "#6ee7b7" }],
  rifiutato:      [{ tKey: "preventivi.riapri", target: "bozza", color: "var(--text-secondary)" }],
  completato:     [],
};

// ── Helpers ──
function formatTempo(sec: number) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function formatEuro(v: number) { return "€ " + v.toFixed(2).replace(".", ","); }
function formatDate(d: string) { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }

// ── Styles shorthand ──
const cardStyle: React.CSSProperties = {
  background: "var(--bg-card)", border: "1px solid rgba(56,119,214,0.12)",
  borderRadius: 14, padding: 20,
};
const labelStyle: React.CSSProperties = { fontSize: 11, color: "var(--text-muted)", marginBottom: 4, display: "block", fontWeight: 600 };

// ══════════════════════════
// COMPONENTE PRINCIPALE
// ══════════════════════════
export function NuovoPreventivo({ preventivoId, onBack }: Props) {
  const { t } = useTranslation();
  const [prev, setPrev] = useState<PreventivoCompleto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showThumbnailPdf, setShowThumbnailPdf] = useState(true);
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

  // Salva header e ricalcola — chiamato onBlur degli input parametri globali
  const salvaERicalcola = useCallback(async () => {
    if (!prev) return;
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
    } catch (e) { console.error(e); }
  }, [prev, clienteId, markupGlobale, scontoGlobale, avvioMacchina, note]);

  const cambiaStato = async (nuovoStato: string) => {
    if (!prev) return;
    // "Invia al cliente" → flusso dedicato
    if (nuovoStato === "inviato") { await inviaAlCliente(); return; }
    await saveHeader();
    try { await invoke("update_stato_preventivo", { id: prev.id, nuovoStato }); loadPreventivo(prev.id); }
    catch (e) { alert(`${t("preventivi.errorePrefisso")}: ${e}`); }
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
      alert(`${t("preventivi.erroreInvio")}: ${e}`);
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
      thumbnail_base64: null, all_thumbnails: [], piatto: 1, dim_x: 0, dim_y: 0, dim_z: 0, foto_prodotto_preview: null,
    });
  };

  const editRiga = async (r: RigaCompleta) => {
    // Carica tutte le thumbnails
    let thumbBase64: string | null = null;
    const allThumbs: string[] = [];
    const thumbPaths: string[] = r.thumbnails_json ? JSON.parse(r.thumbnails_json || "[]") : [];
    if (thumbPaths.length > 0) {
      for (const p of thumbPaths) {
        try { const b = await invoke<string>("load_logo_preview", { logoPath: p }); allThumbs.push(b); } catch {}
      }
      thumbBase64 = allThumbs[0] || null;
    } else if (r.thumbnail_path) {
      try { thumbBase64 = await invoke<string>("load_logo_preview", { logoPath: r.thumbnail_path }); if (thumbBase64) allThumbs.push(thumbBase64); } catch {}
    }
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
      thumbnail_base64: thumbBase64, all_thumbnails: allThumbs, piatto: r.piatto || 1,
      dim_x: r.ingombro_x_mm, dim_y: r.ingombro_y_mm, dim_z: r.ingombro_z_mm,
      foto_prodotto_preview: null,
    });
    // Carica anteprima foto prodotto se presente
    if (r.foto_prodotto_path) {
      try { const fp = await invoke<string>("load_logo_preview", { logoPath: r.foto_prodotto_path }); setRigaEdit(prev => prev ? { ...prev, foto_prodotto_preview: fp } : null); } catch {}
    }
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
        ingombro_x_mm: rigaEdit.dim_x, ingombro_y_mm: rigaEdit.dim_y, ingombro_z_mm: rigaEdit.dim_z,
        markup_riga: rigaEdit.markup_riga, sconto_riga: rigaEdit.sconto_riga,
        fallimento_riga: rigaEdit.fallimento_riga, post_processing: rigaEdit.post_processing,
        tempo_manuale: true, peso_manuale: true, ordine: prev.righe.length, piatto: rigaEdit.piatto,
      };
      let rigaId: number;
      if (rigaEdit.mode === "new") {
        rigaId = await invoke<number>("add_riga_preventivo", { preventivoId: prev.id, data: rigaData });
      } else { rigaId = rigaEdit.rigaId!; await invoke("update_riga_preventivo", { rigaId, data: rigaData }); }
      await invoke("set_riga_materiali", { rigaId, materiali: rigaEdit.materiali_slots.filter(m => m.materiale_id > 0) });
      if (rigaEdit.all_thumbnails.length > 0) {
        await invoke("save_riga_thumbnails", { rigaId, images: rigaEdit.all_thumbnails }).catch(() => {});
      } else if (rigaEdit.thumbnail_base64) {
        await invoke("save_riga_thumbnail", { rigaId, base64Data: rigaEdit.thumbnail_base64 }).catch(() => {});
      }
      setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id }));
      setRigaEdit(null);
    } catch (e) { console.error(e); alert(`${t("preventivi.errorePrefisso")}: ${e}`); } finally { setSaving(false); }
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
      await exportPdfPreventivo(prev, { showThumbnails: showThumbnailPdf });
    } catch (e) {
      console.error(e);
      alert(`${t("preventivi.erroreExportPdf")}: ${e}`);
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
            corriere.consegna_punto_ritiro ? t("corrieriModal.puntoRitiro") : t("corrieriModal.domicilio"),
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
      alert(`${t("preventivi.erroreSelezione")}: ${e}`);
    }
  };

  const rimuoviCorriere = () => {
    if (!prev) return;
    setPrev({ ...prev, corriere_id: null, totale_spedizione: 0 });
  };

  if (loading) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>{t("common.loading")}</div>;
  if (!prev) return <div style={{ textAlign: "center", padding: "60px 0", color: "var(--red)" }}>{t("preventivi.preventivoNonTrovato")}</div>;

  const isEditable = ["bozza", "non_confermato"].includes(prev.stato);
  const sc = STATI_STYLES[prev.stato] || STATI_STYLES.bozza;
  const trans = TRANSIZIONI_DEF[prev.stato] || [];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ padding: 8, borderRadius: 8, border: "none", background: "rgba(56,119,214,0.08)", color: "var(--text-secondary)", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", fontFamily: "monospace", margin: 0 }}>{prev.numero}</h1>
              <span style={{ padding: "3px 14px", borderRadius: 100, fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg }}>
                {t(`stati.${sc.key}`)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{formatDate(prev.data_creazione)}</p>
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
              {saving ? t("common.saving") : saved ? t("common.saved") : t("preventivi.salva")}
            </button>
          )}
          <button className="s3d-btn s3d-btn-ghost" onClick={exportPdf} style={{ gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
            </svg>
            {t("preventivi.esportaPdf")}
          </button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)", cursor: "pointer" }}>
            <input type="checkbox" checked={showThumbnailPdf} onChange={e => setShowThumbnailPdf(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: "var(--accent)" }} />
            {t("preventivi.mostraThumbnailPdf")}
          </label>
          {trans.map(tr => (
            <button key={tr.target} onClick={() => cambiaStato(tr.target)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              background: `${tr.color}18`, color: tr.color,
            }}>
              {t(tr.tKey)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* ═══ COLONNA SINISTRA ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Cliente */}
          <div style={cardStyle}>
            <div className="s3d-section-title">{t("preventivi.cliente")}</div>
            <select value={clienteId ?? ""} onChange={e => setClienteId(e.target.value ? Number(e.target.value) : null)} disabled={!isEditable} className="s3d-select">
              <option value="">{t("preventivi.selezionaClienteOption")}</option>
              {clienti.map(c => <option key={c.id} value={c.id}>{c.denominazione_azienda || `${c.nome} ${c.cognome}`.trim() || `#${c.id}`}</option>)}
            </select>
          </div>

          {/* Parametri globali */}
          <div style={cardStyle}>
            <div className="s3d-section-title">{t("preventivi.parametriGlobali")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>{t("preventivi.markup")}</label>
                <input type="number" step="0.1" value={markupGlobale} onChange={e => setMarkupGlobale(Number(e.target.value))} onBlur={salvaERicalcola} disabled={!isEditable} className="s3d-input" style={{ textAlign: "right" }} />
              </div>
              <div>
                <label style={labelStyle}>{t("preventivi.sconto")}</label>
                <input type="number" step="0.1" value={scontoGlobale} onChange={e => setScontoGlobale(Number(e.target.value))} onBlur={salvaERicalcola} disabled={!isEditable} className="s3d-input" style={{ textAlign: "right" }} />
              </div>
              <div>
                <label style={labelStyle}>{t("preventivi.avvioMacchinaLabel")}</label>
                <input type="number" step="0.5" value={avvioMacchina} onChange={e => setAvvioMacchina(Number(e.target.value))} onBlur={salvaERicalcola} disabled={!isEditable} className="s3d-input" style={{ textAlign: "right" }} />
              </div>
            </div>
          </div>

          {/* Righe stampa */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>{t("preventivi.righeStampa")} ({prev.righe.length})</div>
              {isEditable && (
                <button className="s3d-btn s3d-btn-primary" onClick={addRiga} style={{ padding: "6px 14px", fontSize: 12 }}>
                  {t("preventivi.aggiungiRiga")}
                </button>
              )}
            </div>
            {prev.righe.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>🖨️</div>
                <p>{t("preventivi.nessunaRiga")}</p>
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
            <div className="s3d-section-title">{t("preventivi.noteLabel")}</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} disabled={!isEditable}
                      rows={3} placeholder={t("preventivi.notePlaceholder")}
                      className="s3d-input" style={{ resize: "none", minHeight: 70 }} />
          </div>

          {/* ═══ SERVIZI EXTRA ═══ */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>{t("preventivi.serviziExtra")}</div>
            </div>
            {/* Lista servizi già aggiunti */}
            {prev.servizi.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {prev.servizi.map(s => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", background: "var(--bg-surface)", borderRadius: 8,
                    border: "1px solid rgba(56,119,214,0.08)",
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{s.nome}</span>
                      {s.addebito_cliente > 0 && (
                        <span style={{ fontSize: 11, color: "var(--green)", marginLeft: 8 }}>→ {formatEuro(s.addebito_cliente)}</span>
                      )}
                      {s.addebito_cliente === 0 && s.costo_effettivo > 0 && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>({t("preventivi.costoInternoLabel")} {formatEuro(s.costo_effettivo)})</span>
                      )}
                    </div>
                    {isEditable && (
                      <button onClick={async () => {
                        await invoke("remove_servizio_preventivo", { id: s.id });
                        setPrev(await invoke<PreventivoCompleto>("ricalcola_preventivo", { id: prev.id }));
                      }} style={{ padding: 4, border: "none", background: "transparent", color: "var(--red)", cursor: "pointer", fontSize: 14 }}>✕</button>
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
                    color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
                  }}>
                    + {se.nome} {se.addebita ? `(${formatEuro(se.importo_predefinito * (1 + se.markup_percentuale / 100))})` : ""}
                  </button>
                ))}
              </div>
            )}
            {serviziDisponibili.length === 0 && prev.servizi.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
                {t("preventivi.noServiziConfigurati")}
              </p>
            )}
          </div>

          {/* ═══ SPEDIZIONE ═══ */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>{t("preventivi.spedizione")}</div>
              {isEditable && (
                <button
                  onClick={() => setShowCorrieriModal(true)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "none", background: "rgba(251,146,60,0.12)", color: "var(--orange)",
                    cursor: "pointer", transition: "all 0.2s",
                  }}
                >
                  {prev.corriere_id ? t("preventivi.cambiaCorriere") : t("preventivi.calcolaSpedizioneBtn")}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {t("preventivi.spedizioneInclusa")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {t("preventivi.costoSpedizioneApplicato")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: "var(--green)" }}>
                    {formatEuro(prev.totale_spedizione)}
                  </span>
                  {isEditable && (
                    <button onClick={rimuoviCorriere} style={{
                      padding: "4px 8px", border: "none", background: "transparent",
                      color: "var(--red)", cursor: "pointer", fontSize: 13,
                    }}>✕</button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)", fontSize: 12 }}>
                {t("preventivi.noSpedizione")}
              </div>
            )}
          </div>

          {/* ═══ METODO PAGAMENTO ═══ */}
          <div style={cardStyle}>
            <div className="s3d-section-title">{t("preventivi.metodoPagamentoLabel")}</div>
            <select
              value={prev.metodo_pagamento_id ?? ""}
              onChange={async (e) => {
                const mpId = e.target.value ? Number(e.target.value) : null;
                setPrev({ ...prev, metodo_pagamento_id: mpId });
              }}
              disabled={!isEditable}
              className="s3d-select"
            >
              <option value="">{t("preventivi.nessunMetodo")}</option>
              {metodiPagamento.map(mp => (
                <option key={mp.id} value={mp.id}>
                  {mp.nome}
                  {mp.commissione_percentuale > 0 ? ` (${mp.commissione_percentuale}% + ${formatEuro(mp.commissione_fissa)})` : ""}
                </option>
              ))}
            </select>
            {metodiPagamento.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6 }}>
                {t("preventivi.configMetodi")}
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
                              onCancel={() => setRigaEdit(null)} saving={saving}
                              onLookupsUpdated={loadLookups} />}

      {/* ═══ MODALE INVIO AL CLIENTE ═══ */}
      {invioResult && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center",
          justifyContent: "center", background: "rgba(4,8,20,0.8)", backdropFilter: "blur(8px)",
        }} onClick={() => setInvioResult(null)}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(56,119,214,0.2)", borderRadius: 18,
            padding: 28, maxWidth: 520, width: "90%", boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                {t("preventivi.preventivoInviato")}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
                {t("preventivi.pdfSalvato")}
              </p>
            </div>

            <div style={{
              background: "rgba(56,119,214,0.06)", borderRadius: 10, padding: 14,
              marginBottom: 20, fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-all",
              border: "1px solid rgba(56,119,214,0.1)",
            }}>
              📁 {invioResult.pdfPath}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={async () => {
                try { await invoke("open_pdf_file", { path: invioResult.pdfPath }); } catch {}
              }} style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(96,165,250,0.2)",
                background: "rgba(96,165,250,0.08)", color: "var(--accent)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              }}>
                {t("preventivi.apriPdf")}
              </button>

              <button onClick={async () => {
                try { await invoke("open_file_in_explorer", { path: invioResult.pdfPath }); } catch {}
              }} style={{
                width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(136,153,180,0.15)",
                background: "rgba(136,153,180,0.06)", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
              }}>
                {t("preventivi.apriCartella")}
              </button>

              {invioResult.clienteEmail && (
                <button onClick={async () => {
                  const subject = encodeURIComponent(t("preventivi.preventivoSubject", { numero: invioResult.numero }));
                  const body = encodeURIComponent(
                    t("preventivi.preventivoEmailBody", { nome: invioResult.clienteNome, numero: invioResult.numero })
                  );
                  const mailtoUrl = `mailto:${invioResult.clienteEmail}?subject=${subject}&body=${body}`;
                  try { await shellOpen(mailtoUrl); } catch (e) { console.error(e); }
                }} style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(52,211,153,0.2)",
                  background: "rgba(52,211,153,0.08)", color: "var(--green)", fontSize: 14, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 10, justifyContent: "center",
                }}>
                  {t("preventivi.inviaEmailA", { email: invioResult.clienteEmail })}
                </button>
              )}
            </div>

            <button onClick={() => setInvioResult(null)} style={{
              width: "100%", marginTop: 16, padding: "10px 16px", borderRadius: 10,
              border: "none", background: "rgba(56,119,214,0.08)", color: "var(--text-muted)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              {t("common.close")}
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
            background: "var(--bg-card)", border: "1px solid rgba(96,165,250,0.12)",
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{t("preventivi.deleteRigaTitle")}</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
              {t("preventivi.deleteRigaMessage")}
              <br />{t("preventivi.deleteIrreversible")}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteRigaTarget(null)} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "1px solid rgba(136,153,180,0.2)", background: "transparent",
                color: "var(--text-secondary)", cursor: "pointer",
              }}>{t("common.cancel")}</button>
              <button onClick={confirmDeleteRiga} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", background: "var(--red)", color: "#fff", cursor: "pointer",
              }}>{t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════
// THUMBNAIL IMG (carica async da path)
// ══════════════════════════
function ThumbnailImg({ path, size = 48 }: { path: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    invoke<string>("load_logo_preview", { logoPath: path }).then(setSrc).catch(() => {});
  }, [path]);
  if (!src) return null;
  return <img src={src} alt="" style={{ width: size, height: size, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-input)", flexShrink: 0 }} />;
}

// ══════════════════════════
// RIGA CARD
// ══════════════════════════
function RigaCard({ riga, index, isEditable, onEdit, onDelete }: {
  riga: RigaCompleta; index: number; isEditable: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid rgba(56,119,214,0.1)", borderRadius: 12,
      padding: 16, transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        {riga.thumbnails_json && (() => {
          const paths: string[] = JSON.parse(riga.thumbnails_json || "[]");
          return paths.length > 0 ? (
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {paths.map((p, i) => <ThumbnailImg key={i} path={p} size={44} />)}
            </div>
          ) : riga.thumbnail_path ? <ThumbnailImg path={riga.thumbnail_path} /> : null;
        })()}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", background: "rgba(59,130,246,0.1)", color: "var(--accent)", padding: "2px 8px", borderRadius: 4 }}>#{index + 1}</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{riga.titolo_visualizzato || riga.nome_file || t("preventivi.senzaNome")}</span>
            {riga.is_multicolore && <span style={{ fontSize: 10, background: "rgba(167,139,250,0.12)", color: "var(--purple)", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>{t("preventivi.multiMateriale")}</span>}
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>×{riga.quantita}</span>
            {riga.piatto > 1 && <span style={{ fontSize: 10, background: "rgba(59,130,246,0.1)", color: "var(--accent)", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>{t("preventivi.piatto")} {riga.piatto}</span>}
            {riga.foto_prodotto_path && <span style={{ fontSize: 10, background: "rgba(52,211,153,0.12)", color: "var(--green)", padding: "2px 8px", borderRadius: 100, fontWeight: 600 }}>{t("preventivi.fotoPresente")}</span>}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", fontSize: 12, color: "var(--text-muted)" }}>
            {riga.stampante_nome && <span>🖨 {riga.stampante_nome}</span>}
            {riga.profilo_nome && <span>📐 {riga.profilo_nome}</span>}
            <span>⏱ {formatTempo(riga.tempo_stampa_sec)}</span>
            <span>⚖ {riga.peso_totale_grammi.toFixed(1)}g</span>
            {(riga.ingombro_x_mm > 0 || riga.ingombro_y_mm > 0 || riga.ingombro_z_mm > 0) && (
              <span>📏 {riga.ingombro_x_mm.toFixed(1)}×{riga.ingombro_y_mm.toFixed(1)}×{riga.ingombro_z_mm.toFixed(1)}mm</span>
            )}
          </div>
          {riga.materiali.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {riga.materiali.map(m => (
                <span key={m.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, background: "rgba(56,119,214,0.08)", padding: "3px 10px", borderRadius: 100,
                  color: "var(--text-secondary)",
                }}>
                  {m.colore_hex && <span style={{ width: 10, height: 10, borderRadius: "50%", background: m.colore_hex, border: "1px solid rgba(255,255,255,0.15)" }} />}
                  {m.materiale_nome} — {m.peso_grammi.toFixed(1)}g
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right", marginLeft: 16, flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t("preventivi.costoLabel")}</div>
          <div style={{ fontSize: 13, fontFamily: "monospace", color: "var(--text-secondary)" }}>{formatEuro(riga.totale_costo)}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{t("preventivi.clienteLabel")}</div>
          <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>{formatEuro(riga.totale_cliente)}</div>
          <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, marginTop: 4, color: riga.profit >= 0 ? "#34d399" : "#f87171" }}>
            {formatEuro(riga.profit)}
          </div>
        </div>
      </div>
      {/* Breakdown */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(56,119,214,0.06)", display: "flex", flexWrap: "wrap", gap: "0 16px", fontSize: 11, color: "var(--text-muted)" }}>
        <span>{t("preventivi.mat")}: {formatEuro(riga.costo_materiale_totale)}</span>
        <span>{t("preventivi.energia")}: {formatEuro(riga.costo_energia)}</span>
        <span>{t("preventivi.ammort")}: {formatEuro(riga.costo_ammortamento)}</span>
        <span>{t("preventivi.fall")}: {formatEuro(riga.costo_fallimento)}</span>
        {riga.post_processing > 0 && <span>{t("preventivi.post")}: {formatEuro(riga.post_processing)}</span>}
      </div>
      {isEditable && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
          <button onClick={onEdit} className="s3d-btn s3d-btn-ghost" style={{ padding: "4px 12px", fontSize: 12 }}>✏️ {t("common.edit")}</button>
          <button onClick={onDelete} className="s3d-btn s3d-btn-danger" style={{ padding: "4px 12px", fontSize: 12 }}>🗑 {t("common.delete")}</button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════
// RIEPILOGO CARD
// ══════════════════════════
function RiepilogoCard({ prev }: { prev: PreventivoCompleto }) {
  const { t } = useTranslation();
  // Il tempo slicer è per piatto (non per pezzo) — non moltiplicare per quantità
  const stats = prev.righe.reduce((a, r) => ({ pezzi: a.pezzi + r.quantita, tempo: a.tempo + r.tempo_stampa_sec }), { pezzi: 0, tempo: 0 });
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 20,
      position: "sticky", top: 24,
      boxShadow: "var(--shadow-md)",
    }}>
      <div className="s3d-section-title">{t("preventivi.riepilogo")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ v: prev.righe.length, l: t("preventivi.modelli") }, { v: stats.pezzi, l: t("preventivi.pezzi") },
          { v: formatTempo(stats.tempo), l: t("preventivi.tempoStampa") }, { v: `${(prev.totale_materiale_g / 1000).toFixed(2)}kg`, l: t("preventivi.materialeKg") }
        ].map((s, i) => (
          <div key={i} style={{ background: "rgba(56,119,214,0.06)", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {/* Costi */}
      {(() => {
        // Calcola subtotale lordo (senza sconto) per mostrare l'importo risparmiato
        const hasSconto = prev.righe.some(r => (r.sconto_riga ?? prev.sconto_globale) > 0);
        let subtotaleLordo = prev.totale_cliente;
        if (hasSconto) {
          subtotaleLordo = prev.righe.reduce((sum, r) => {
            const sc = r.sconto_riga ?? prev.sconto_globale;
            return sum + (sc < 100 ? r.totale_cliente / (1 - sc / 100) : r.totale_cliente);
          }, 0);
        }
        const importoSconto = subtotaleLordo - prev.totale_cliente;

        return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        {[
          ...(hasSconto ? [{ l: t("preventivi.subtotaleLordo"), v: subtotaleLordo }] : []),
          ...(hasSconto && importoSconto > 0 ? [{ l: `${t("preventivi.sconto")} (${prev.sconto_globale}%)`, v: importoSconto, isSconto: true }] : []),
          { l: t("preventivi.subtotaleRighe"), v: prev.totale_cliente },
          ...(prev.avvio_macchina > 0 ? [{ l: t("preventivi.avvioMacchina"), v: prev.avvio_macchina }] : []),
          ...(prev.totale_servizi > 0 ? [{ l: t("preventivi.serviziExtraLabel"), v: prev.totale_servizi }] : []),
          ...(prev.totale_spedizione > 0 ? [{ l: t("preventivi.spedizioneLabel"), v: prev.totale_spedizione }] : []),
        ].map((r: any, i: number) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: r.isSconto ? "var(--green)" : "var(--text-muted)" }}>{r.l}</span>
            <span style={{ fontFamily: "monospace", color: r.isSconto ? "var(--green)" : "var(--text-secondary)" }}>{r.isSconto ? `- ${formatEuro(r.v)}` : formatEuro(r.v)}</span>
          </div>
        ))}
      </div>
        );
      })()}
      {/* Totale */}
      <div style={{ margin: "16px 0", padding: "14px 0", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{t("preventivi.totale")}</span>
          <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: "var(--accent)" }}>{formatEuro(prev.totale_finale)}</span>
        </div>
      </div>
      {/* Profit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: prev.totale_profit >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("preventivi.profitto")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: prev.totale_profit >= 0 ? "var(--green)" : "var(--red)" }}>
            {formatEuro(prev.totale_profit)}
          </div>
        </div>
        <div style={{ background: "rgba(56,119,214,0.06)", borderRadius: 10, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{t("preventivi.margine")}</div>
          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "monospace", color: "var(--accent)" }}>
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
  thumbnail_base64: string | null;
  all_thumbnails: string[];
  piatto: number;
  dim_x: number; dim_y: number; dim_z: number;
  foto_prodotto_preview: string | null;
}

function RigaModal({ edit, setEdit, materiali, stampanti, profili, onSave, onCancel, saving, onLookupsUpdated }: {
  edit: RigaEditState; setEdit: (e: RigaEditState | null) => void; materiali: Materiale[];
  stampanti: Stampante[]; profili: ProfiloStampa[]; onSave: () => void; onCancel: () => void; saving: boolean;
  onLookupsUpdated?: () => void;
}) {
  const { t } = useTranslation();
  const upd = (p: Partial<RigaEditState>) => setEdit({ ...edit, ...p });
  const updSlot = (i: number, p: Partial<MaterialeSlotEdit>) => { const s = [...edit.materiali_slots]; s[i] = { ...s[i], ...p }; upd({ materiali_slots: s }); };
  const addSlot = () => upd({ is_multicolore: true, materiali_slots: [...edit.materiali_slots, { materiale_id: materiali[0]?.id ?? 0, slot_ams: edit.materiali_slots.length + 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 0 }] });
  const rmSlot = (i: number) => { const s = edit.materiali_slots.filter((_, j) => j !== i); upd({ is_multicolore: s.length > 1, materiali_slots: s.length ? s : [{ materiale_id: 0, slot_ams: 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 100 }] }); };

  const modalBg: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(4,8,20,0.8)", backdropFilter: "blur(8px)", padding: 16 };
  const modalBox: React.CSSProperties = { background: "var(--bg-card)", border: "1px solid rgba(56,119,214,0.2)", borderRadius: 18, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" };

  const row2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
  const row4: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 };

  // ── Importazione da GCode/3MF ──
  // Cerca materiale per nome nel DB; se non esiste lo crea automaticamente
  const resolveMatId = async (tipo: string, densita: number): Promise<number> => {
    if (!tipo) return materiali[0]?.id ?? 0;
    // Prima cerca localmente
    const local = materiali.find(db => db.nome.toLowerCase().includes(tipo.toLowerCase()));
    if (local) return local.id;
    // Non trovato: chiedi al backend di cercarlo/crearlo
    try {
      const mat = await invoke<{ id: number }>("find_or_create_materiale", { nome: tipo, densita });
      return mat.id;
    } catch { return materiali[0]?.id ?? 0; }
  };

  const handleSliceImport = async (data: SliceData) => {
    const ore = Math.floor(data.tempo_stampa_sec / 3600);
    const min = Math.floor((data.tempo_stampa_sec % 3600) / 60);
    const nomeFile = data.nome_file || edit.nome_file;

    let slots: MaterialeSlotEdit[];
    if (data.materiali.length > 1) {
      slots = await Promise.all(data.materiali.map(async (m) => {
        const matId = await resolveMatId(m.tipo, m.densita);
        return { materiale_id: matId, slot_ams: m.slot, colore_hex: m.colore || "", peso_grammi: m.peso_grammi, percentuale_pezzo: data.peso_totale_grammi > 0 ? Math.round((m.peso_grammi / data.peso_totale_grammi) * 100) : 0 };
      }));
    } else if (data.materiali.length === 1) {
      const m = data.materiali[0];
      const matId = await resolveMatId(m.tipo, m.densita);
      slots = [{ materiale_id: matId, slot_ams: 1, colore_hex: m.colore || "", peso_grammi: m.peso_grammi > 0 ? m.peso_grammi : data.peso_totale_grammi, percentuale_pezzo: 100 }];
    } else {
      const currentSlot = edit.materiali_slots[0] || { materiale_id: materiali[0]?.id ?? 0, slot_ams: 1, colore_hex: "", peso_grammi: 0, percentuale_pezzo: 100 };
      if (data.filamento_tipo) {
        const matId = await resolveMatId(data.filamento_tipo, data.filamento_densita);
        currentSlot.materiale_id = matId;
      }
      slots = [{ ...currentSlot, peso_grammi: data.peso_totale_grammi, percentuale_pezzo: 100 }];
    }

    // Auto-crea stampante se presente nel file
    let stampanteId = edit.stampante_id;
    if (data.printer_model) {
      try {
        const s = await invoke<{ id: number }>("find_or_create_stampante", { nome: data.printer_model });
        stampanteId = s.id;
      } catch {}
    }

    // Auto-crea profilo di stampa se presente nel file
    let profiloId = edit.profilo_stampa_id;
    if (data.layer_height > 0 || data.print_profile_name) {
      try {
        const p = await invoke<{ id: number }>("find_or_create_profilo", {
          nome: data.print_profile_name || "",
          layerHeight: data.layer_height, pareti: data.wall_loops,
          infill: data.infill_percent, topLayers: data.top_layers,
          bottomLayers: data.bottom_layers, supporti: data.support_enabled,
        });
        profiloId = p.id;
      } catch {}
    }

    // Ricarica liste (potrebbero essere stati creati nuovi elementi)
    onLookupsUpdated?.();

    upd({
      nome_file: nomeFile, titolo_visualizzato: edit.titolo_visualizzato || nomeFile.replace(/\.(gcode|3mf|gco|g)$/i, ""),
      tempo_ore: ore, tempo_min: min, peso_totale_grammi: data.peso_totale_grammi,
      is_multicolore: data.materiali.length > 1, materiali_slots: slots,
      thumbnail_base64: data.thumbnail_base64 || null,
      all_thumbnails: data.plates?.filter(p => p.thumbnail_base64).map(p => p.thumbnail_base64!) || (data.thumbnail_base64 ? [data.thumbnail_base64] : []),
      stampante_id: stampanteId, profilo_stampa_id: profiloId,
      piatto: data.piatto || 1,
      dim_x: data.dim_x || 0, dim_y: data.dim_y || 0, dim_z: data.dim_z || 0,
    });
  };

  return (
    <div style={modalBg}>
      <div style={modalBox} className="animate-fade-in">
        <div style={{ padding: 28 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24, margin: 0 }}>
            {edit.mode === "new" ? t("preventivi.nuovaRiga") : t("preventivi.modificaRiga")}
          </h3>

          {/* ═══ IMPORTAZIONE GCODE / 3MF ═══ */}
          <div style={{ marginBottom: 20 }}>
            <SliceFileImporter onImport={handleSliceImport} />
            {edit.all_thumbnails.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600 }}>{t("sliceImporter.anteprima")} — {t("preventivi.selezionaImmaginiPdf")}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {edit.all_thumbnails.map((thumb, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      <img src={thumb} alt={`${t("preventivi.piatto")} ${i + 1}`}
                        style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border-subtle)", background: "var(--bg-input)" }} />
                      <div style={{ textAlign: "center", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{t("preventivi.piatto")} {i + 1}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ ...row2, marginBottom: 16 }}>
            <div><label style={labelStyle}>{t("preventivi.nomeFile")}</label><input className="s3d-input" value={edit.nome_file} onChange={e => upd({ nome_file: e.target.value })} placeholder={t("preventivi.phNomeFile")} /></div>
            <div><label style={labelStyle}>{t("preventivi.titoloVisualizzato")}</label><input className="s3d-input" value={edit.titolo_visualizzato} onChange={e => upd({ titolo_visualizzato: e.target.value })} placeholder={t("preventivi.phTitolo")} /></div>
          </div>

          <div style={{ ...row4, marginBottom: 16 }}>
            <div><label style={labelStyle}>{t("preventivi.stampante")}</label><select className="s3d-select" value={edit.stampante_id ?? ""} onChange={e => upd({ stampante_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{stampanti.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
            <div><label style={labelStyle}>{t("preventivi.profiloStampa")}</label><select className="s3d-select" value={edit.profilo_stampa_id ?? ""} onChange={e => upd({ profilo_stampa_id: e.target.value ? Number(e.target.value) : null })}><option value="">—</option>{profili.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div><label style={labelStyle}>{t("common.quantity")}</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={1} value={edit.quantita} onChange={e => upd({ quantita: Math.max(1, Number(e.target.value)) })} /></div>
            <div><label style={labelStyle}>{t("preventivi.piatto")}</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={1} value={edit.piatto} onChange={e => upd({ piatto: Math.max(1, Number(e.target.value)) })} /></div>
          </div>

          <div style={{ ...row4, marginBottom: 16 }}>
            <div><label style={labelStyle}>{t("preventivi.ore")}</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={0} value={edit.tempo_ore} onChange={e => upd({ tempo_ore: Math.max(0, Number(e.target.value)) })} /></div>
            <div><label style={labelStyle}>{t("preventivi.minuti")}</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} min={0} max={59} value={edit.tempo_min} onChange={e => upd({ tempo_min: Math.max(0, Math.min(59, Number(e.target.value))) })} /></div>
            <div><label style={labelStyle}>{t("preventivi.postProc")}</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.5" value={edit.post_processing} onChange={e => upd({ post_processing: Number(e.target.value) })} /></div>
            <div><label style={labelStyle}>{t("preventivi.fallOverride")}</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={edit.fallimento_riga ?? ""} onChange={e => upd({ fallimento_riga: e.target.value ? Number(e.target.value) : null })} placeholder={t("preventivi.phFallAuto")} /></div>
          </div>

          <div style={{ ...row2, marginBottom: 20 }}>
            <div><label style={labelStyle}>{t("preventivi.markupOverride")}</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={edit.markup_riga ?? ""} onChange={e => upd({ markup_riga: e.target.value ? Number(e.target.value) : null })} placeholder={t("preventivi.phOverrideGlobale")} /></div>
            <div><label style={labelStyle}>{t("preventivi.scontoOverride")}</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={edit.sconto_riga ?? ""} onChange={e => upd({ sconto_riga: e.target.value ? Number(e.target.value) : null })} placeholder={t("preventivi.phOverrideGlobale")} /></div>
          </div>

          {/* Materiali AMS */}
          <div style={{ borderTop: "1px solid rgba(56,119,214,0.1)", paddingTop: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>{edit.is_multicolore ? t("preventivi.materialiMultiAms") : t("preventivi.materialiLabel")}</div>
              <button onClick={addSlot} style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, border: "none", background: "rgba(167,139,250,0.12)", color: "var(--purple)", cursor: "pointer" }}>
                {t("preventivi.slotAms")}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {edit.materiali_slots.map((slot, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-end", gap: 10, padding: 12, background: "rgba(56,119,214,0.04)", borderRadius: 10 }}>
                  <div style={{ width: 28, fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)", alignSelf: "center" }}>S{slot.slot_ams}</div>
                  <div style={{ flex: 1 }}><label style={labelStyle}>{t("sliceImporter.materiale")}</label>
                    <select className="s3d-select" value={slot.materiale_id} onChange={e => updSlot(idx, { materiale_id: Number(e.target.value) })}>
                      <option value={0}>—</option>{materiali.map(m => <option key={m.id} value={m.id}>{m.nome} ({m.prezzo_kg.toFixed(2)} €/kg)</option>)}
                    </select>
                  </div>
                  <div style={{ width: 90 }}><label style={labelStyle}>{t("preventivi.peso")}</label><input type="number" className="s3d-input" style={{ textAlign: "right" }} step="0.1" value={slot.peso_grammi} onChange={e => updSlot(idx, { peso_grammi: Number(e.target.value) })} /></div>
                  <div style={{ width: 60 }}><label style={labelStyle}>%</label><input type="number" className="s3d-input" style={{ textAlign: "center" }} value={slot.percentuale_pezzo} onChange={e => updSlot(idx, { percentuale_pezzo: Number(e.target.value) })} /></div>
                  <div style={{ width: 40 }}><label style={labelStyle}>{t("preventivi.colore")}</label><input type="color" value={slot.colore_hex || "#000000"} onChange={e => updSlot(idx, { colore_hex: e.target.value })} style={{ width: "100%", height: 36, padding: 2, border: "1px solid rgba(56,119,214,0.15)", borderRadius: 6, cursor: "pointer", background: "transparent" }} /></div>
                  {edit.materiali_slots.length > 1 && (
                    <button onClick={() => rmSlot(idx)} style={{ padding: 6, border: "none", background: "transparent", color: "var(--red)", cursor: "pointer", alignSelf: "center" }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Foto prodotto stampato */}
          <div style={{ borderTop: "1px solid rgba(56,119,214,0.1)", paddingTop: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="s3d-section-title" style={{ marginBottom: 0 }}>{t("preventivi.fotoProdotto")}</div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await (await import("@tauri-apps/plugin-dialog")).open({
                      multiple: false,
                      filters: [{ name: t("preventivi.immagini"), extensions: ["png", "jpg", "jpeg", "webp"] }],
                    });
                    const selected = typeof result === "string" ? result : Array.isArray(result) ? result[0] : null;
                    if (!selected || !edit.rigaId) return;
                    const savedPath = await invoke<string>("save_foto_prodotto", { rigaId: edit.rigaId, sourcePath: selected });
                    const preview = await invoke<string>("load_logo_preview", { logoPath: savedPath });
                    upd({ foto_prodotto_preview: preview } as any);
                  } catch (e) { console.error(e); }
                }}
                disabled={!edit.rigaId}
                style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8, border: "none", background: "rgba(52,211,153,0.12)", color: "var(--green)", cursor: edit.rigaId ? "pointer" : "not-allowed" }}
              >
                {t("preventivi.caricaFoto")}
              </button>
              {edit.foto_prodotto_preview && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!edit.rigaId) return;
                    try { await invoke("delete_foto_prodotto", { rigaId: edit.rigaId }); upd({ foto_prodotto_preview: null } as any); } catch {}
                  }}
                  style={{ fontSize: 12, padding: "4px 12px", borderRadius: 8, border: "none", background: "rgba(248,113,113,0.12)", color: "var(--red)", cursor: "pointer" }}
                >
                  {t("preventivi.rimuoviFoto")}
                </button>
              )}
              {!edit.rigaId && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t("preventivi.salvaPrimaDiFoto")}</span>}
            </div>
            {edit.foto_prodotto_preview && (
              <div style={{ marginTop: 10 }}>
                <img src={edit.foto_prodotto_preview} alt="" style={{ maxWidth: 200, maxHeight: 200, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-input)" }} />
              </div>
            )}
          </div>

          {/* Bottoni */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid rgba(56,119,214,0.1)" }}>
            <button className="s3d-btn s3d-btn-ghost" onClick={onCancel}>{t("common.cancel")}</button>
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
              {saving ? t("common.saving") : edit.mode === "new" ? t("preventivi.aggiungiRigaBtn") : t("preventivi.salvaModificheRiga")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
