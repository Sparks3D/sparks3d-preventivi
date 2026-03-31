// src/utils/pdfExport.ts
// ======================
// Generazione PDF preventivo con jsPDF
// Layout A4 professionale: logo, dati azienda, cliente,
// tabella righe, breakdown, totali, acconto, note, condizioni.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-shell";
import i18n from "../i18n";

// ── Tipi ──

interface Azienda {
  ragione_sociale: string; indirizzo: string; cap: string;
  citta: string; provincia: string; partita_iva: string;
  codice_fiscale: string; email: string; telefono: string;
  logo_path: string; regime_fiscale: string; iva_percentuale: number;
  nota_regime: string;
}

interface PreventivoCompleto {
  id: number; numero: string; cliente_id: number | null;
  cliente_nome: string | null; stato: string; data_creazione: string;
  markup_globale: number; sconto_globale: number; avvio_macchina: number;
  metodo_pagamento_id: number | null; corriere_id: number | null;
  acconto_tipo: string; acconto_valore: number; ritenuta_acconto: boolean;
  note: string; congelato: boolean;
  totale_costo: number; totale_cliente: number; totale_profit: number;
  totale_materiale_g: number; totale_tempo_sec: number;
  totale_servizi: number; totale_spedizione: number; totale_finale: number;
  righe: RigaCompleta[];
  servizi: ServizioInPreventivo[];
}

interface RigaCompleta {
  id: number; nome_file: string; titolo_visualizzato: string;
  quantita: number; is_multicolore: boolean;
  tempo_stampa_sec: number; peso_totale_grammi: number;
  stampante_nome: string | null; profilo_nome: string | null;
  costo_materiale_totale: number; costo_energia: number;
  costo_ammortamento: number; costo_fallimento: number;
  totale_costo: number; totale_cliente: number; profit: number;
  post_processing: number; thumbnail_path: string; thumbnails_json: string;
  materiali: { materiale_nome: string; peso_grammi: number; colore_hex: string }[];
}

interface Cliente {
  id: number; nome: string; cognome: string;
  denominazione_azienda: string; email: string; telefono: string;
  indirizzo: string; cap: string; citta: string; provincia: string;
  partita_iva: string; codice_fiscale: string;
}

interface MetodoPagamento {
  id: number; nome: string; descrizione_pdf: string;
  commissione_percentuale: number; commissione_fissa: number;
  addebita_al_cliente: boolean;
}

interface ServizioInPreventivo {
  id: number; preventivo_id: number; servizio_extra_id: number;
  nome: string; importo_override: number | null;
  addebita_override: boolean | null; markup_override: number | null;
  costo_effettivo: number; addebito_cliente: number; profit_servizio: number;
}

// ── Helpers ──

function fe(v: number): string { return "€ " + v.toFixed(2).replace(".", ","); }
function fd(d: string): string {
  const p = d.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
}
function ft(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Colori tema ──

const COL = {
  primary: [20, 60, 120] as [number, number, number],      // blu scuro
  primaryLight: [230, 240, 250] as [number, number, number], // sfondo titolo
  text: [30, 30, 30] as [number, number, number],
  textLight: [100, 100, 100] as [number, number, number],
  textMuted: [150, 150, 150] as [number, number, number],
  line: [180, 195, 220] as [number, number, number],
  lineAccent: [50, 100, 200] as [number, number, number],
  tableHead: [25, 50, 90] as [number, number, number],
  tableStripe: [245, 247, 252] as [number, number, number],
  green: [16, 150, 72] as [number, number, number],
  red: [200, 50, 50] as [number, number, number],
};

// ══════════════════════════════════════════
// GENERA PDF
// ══════════════════════════════════════════

export interface PdfOptions {
  showThumbnails?: boolean;
}

export async function generatePreventivosPdf(
  preventivo: PreventivoCompleto,
  options?: PdfOptions,
): Promise<Uint8Array> {
  // Carica dati azienda
  const az = await invoke<Azienda>("get_azienda");

  // Carica cliente (se presente)
  let cliente: Cliente | null = null;
  if (preventivo.cliente_id) {
    const clienti = await invoke<Cliente[]>("get_clienti");
    cliente = clienti.find(c => c.id === preventivo.cliente_id) ?? null;
  }

  // Carica metodo di pagamento (se presente)
  let metodoPagamento: MetodoPagamento | null = null;
  if (preventivo.metodo_pagamento_id) {
    const metodi = await invoke<MetodoPagamento[]>("get_metodi_pagamento");
    metodoPagamento = metodi.find(m => m.id === preventivo.metodo_pagamento_id) ?? null;
  }

  // Carica corriere (se presente)
  let corriereNome = "";
  if (preventivo.corriere_id) {
    try {
      const corrieri = await invoke<{ id: number; nome: string; servizio: string; costo_spedizione: number }[]>("get_corrieri");
      const c = corrieri.find(c => c.id === preventivo.corriere_id);
      if (c) corriereNome = `${c.nome}${c.servizio ? ` — ${c.servizio}` : ""}`;
    } catch { /* ignore */ }
  }

  // Carica logo base64 (se presente)
  let logoBase64: string | null = null;
  if (az.logo_path) {
    try {
      logoBase64 = await invoke<string>("load_logo_preview", { logoPath: az.logo_path });
    } catch { /* nessun logo */ }
  }

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = 210, ph = 297;
  const ml = 18, mr = 18, mt = 16;
  const cw = pw - ml - mr;
  let y = mt;
  const pv = preventivo;

  // ═══════════════════════════════════════
  // HEADER: Dati azienda (sinistra) + Logo (destra)
  // ═══════════════════════════════════════

  const headerStartY = y;
  const maxLogoH = 22; // altezza max logo in mm

  // ── Logo a destra (proporzioni originali) ──
  if (logoBase64) {
    try {
      // Crea un img temporaneo per leggere le dimensioni reali
      const imgProps = doc.getImageProperties(logoBase64);
      const ratio = imgProps.width / imgProps.height;
      // Scala per altezza max, calcola larghezza proporzionale
      const logoH = maxLogoH;
      const logoW = logoH * ratio;
      // Posiziona a destra dentro i margini
      const logoX = pw - mr - logoW;
      doc.addImage(logoBase64, "PNG", logoX, y, logoW, logoH);
    } catch {
      // logo non valido, ignora
    }
  }

  // ── Dati azienda a sinistra ──

  // Ragione sociale
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COL.primary);
  doc.text(az.ragione_sociale, ml, y + 6);

  // Indirizzo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL.textLight);
  const addr = `${az.indirizzo}, ${az.cap} ${az.citta} (${az.provincia})`;
  doc.text(addr, ml, y + 12);

  // P.IVA / CF
  const fiscale: string[] = [];
  if (az.partita_iva) fiscale.push(`P.IVA: ${az.partita_iva}`);
  if (az.codice_fiscale) fiscale.push(`C.F.: ${az.codice_fiscale}`);
  if (fiscale.length) {
    doc.text(fiscale.join("  |  "), ml, y + 16);
  }

  // Contatti
  const contatti: string[] = [];
  if (az.email) contatti.push(`Email: ${az.email}`);
  if (az.telefono) contatti.push(`Tel: ${az.telefono}`);
  if (contatti.length) {
    doc.text(contatti.join("  |  "), ml, y + 20);
  }

  y = headerStartY + maxLogoH + 4;

  // Linea accent
  doc.setDrawColor(...COL.lineAccent);
  doc.setLineWidth(0.6);
  doc.line(ml, y, ml + cw, y);
  y += 6;

  // ═══════════════════════════════════════
  // TITOLO PREVENTIVO
  // ═══════════════════════════════════════

  // Sfondo
  doc.setFillColor(...COL.primaryLight);
  doc.rect(ml, y - 2, cw, 14, "F");

  // Testo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COL.primary);
  doc.text(i18n.t("pdf.preventivo"), ml + 5, y + 7);

  doc.setFontSize(11);
  doc.setTextColor(...COL.text);
  doc.text(`N. ${pv.numero}   |   Data: ${fd(pv.data_creazione)}`, ml + 60, y + 7);

  y += 18;

  // ═══════════════════════════════════════
  // DESTINATARIO
  // ═══════════════════════════════════════

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COL.textMuted);
  doc.text(i18n.t("pdf.destinatario"), ml, y);
  y += 5;

  if (cliente) {
    const nomeCliente = cliente.denominazione_azienda ||
      `${cliente.nome} ${cliente.cognome}`.trim() || `Cliente #${cliente.id}`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COL.text);
    doc.text(nomeCliente, ml, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COL.textLight);

    if (cliente.indirizzo || cliente.citta) {
      doc.text(`${cliente.indirizzo}, ${cliente.cap} ${cliente.citta} (${cliente.provincia})`, ml, y);
      y += 4;
    }
    const clInfo: string[] = [];
    if (cliente.partita_iva) clInfo.push(`P.IVA: ${cliente.partita_iva}`);
    if (cliente.codice_fiscale) clInfo.push(`C.F.: ${cliente.codice_fiscale}`);
    if (clInfo.length) { doc.text(clInfo.join("  |  "), ml, y); y += 4; }

    const clContatti: string[] = [];
    if (cliente.email) clContatti.push(cliente.email);
    if (cliente.telefono) clContatti.push(cliente.telefono);
    if (clContatti.length) { doc.text(clContatti.join("  |  "), ml, y); y += 4; }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...COL.textMuted);
    doc.text(i18n.t("pdf.nessunoClienteSelezionato"), ml, y);
    y += 5;
  }

  y += 3;
  doc.setDrawColor(...COL.line);
  doc.setLineWidth(0.3);
  doc.line(ml, y, ml + cw, y);
  y += 6;

  // ═══════════════════════════════════════
  // TABELLA RIGHE
  // ═══════════════════════════════════════

  // Pre-carica thumbnails per il PDF (solo se abilitati)
  const thumbMap: Record<number, string[]> = {};
  if (options?.showThumbnails !== false) {
    for (const r of pv.righe) {
      const paths: string[] = r.thumbnails_json ? JSON.parse(r.thumbnails_json || "[]") : [];
      if (paths.length > 0) {
        thumbMap[r.id] = [];
        for (const p of paths) {
          try { thumbMap[r.id].push(await invoke<string>("load_logo_preview", { logoPath: p })); } catch {}
        }
      } else if (r.thumbnail_path) {
        try { thumbMap[r.id] = [await invoke<string>("load_logo_preview", { logoPath: r.thumbnail_path })]; } catch {}
      }
    }
  }

  if (pv.righe.length > 0) {
    const tableHead = [[i18n.t("pdf.thHash"), i18n.t("pdf.thModello"), i18n.t("pdf.thQta"), i18n.t("pdf.thTempo"), i18n.t("pdf.thPeso"), i18n.t("pdf.thCosto"), i18n.t("pdf.thPrezzo")]];

    // Mappa indice riga tabella → riga_id (per disegnare thumbnail)
    const rowToRigaId: Record<number, number> = {};
    const tableBody: any[][] = [];
    let tableRowIdx = 0;
    pv.righe.forEach((r, idx) => {
      // Rimuovi estensione file dal nome
      const nomeRaw = r.titolo_visualizzato || r.nome_file || "—";
      const nome = nomeRaw.replace(/\.(gcode|3mf|gco|g|stl|obj|step|stp)$/i, "");

      const thumbs = thumbMap[r.id] || [];
      rowToRigaId[tableRowIdx] = r.id;

      // Riga principale (senza padding per thumbnail — le immagini vanno in sotto-riga)
      tableBody.push([
        { content: `${idx + 1}`, styles: { halign: "center" } },
        { content: nome, styles: { fontStyle: "bold" } },
        { content: `${r.quantita}`, styles: { halign: "center" } },
        { content: ft(r.tempo_stampa_sec), styles: { halign: "center" } },
        { content: `${r.peso_totale_grammi.toFixed(1)}g`, styles: { halign: "right" } },
        { content: fe(r.totale_costo), styles: { halign: "right" } },
        { content: fe(r.totale_cliente), styles: { halign: "right", fontStyle: "bold" } },
      ]);
      tableRowIdx++;

      // Sotto-riga: solo materiale usato (senza breakdown costi)
      const matStr = r.materiali.map(m => m.materiale_nome).join(", ");

      if (matStr) {
        tableBody.push([
          { content: "", styles: {} },
          { content: `${i18n.t("pdf.materiale")} ${matStr}`, colSpan: 6, styles: { fontSize: 7, textColor: COL.textMuted, cellPadding: { top: 0, bottom: 2, left: 2, right: 0 } } },
        ]);
        tableRowIdx++;
      }

      // Sotto-riga per thumbnails (sotto il nome del modello)
      if (thumbs.length > 0) {
        const thumbH = 16; // altezza immagine in mm
        rowToRigaId[tableRowIdx] = -r.id; // id negativo = riga thumbnail
        tableBody.push([
          { content: "", styles: {} },
          { content: "", colSpan: 6, styles: { minCellHeight: thumbH + 2, cellPadding: { top: 1, bottom: 1, left: 2, right: 0 } } },
        ]);
        tableRowIdx++;
      }
    });

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      margin: { left: ml, right: mr },
      theme: "plain",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: COL.text,
        lineColor: [220, 225, 235],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COL.tableHead,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 3.5,
      },
      alternateRowStyles: {
        fillColor: COL.tableStripe,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 14 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 24 },
        6: { cellWidth: 26 },
      },
      didDrawCell: (data: any) => {
        // Disegna thumbnails nella sotto-riga dedicata (id negativo)
        if (data.section === "body" && data.column.index === 1) {
          const mappedId = rowToRigaId[data.row.index];
          if (mappedId && mappedId < 0) {
            // Sotto-riga thumbnail: id negativo = -rigaId
            const realId = -mappedId;
            const imgs = thumbMap[realId];
            if (imgs && imgs.length > 0) {
              const imgSize = 14;
              imgs.forEach((img, i) => {
                try {
                  doc.addImage(img, "PNG", data.cell.x + 2 + i * (imgSize + 2), data.cell.y + 1, imgSize, imgSize);
                } catch { /* thumbnail non valido */ }
              });
            }
          }
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════
  // SERVIZI EXTRA (dettagliati)
  // ═══════════════════════════════════════

  if (pv.servizi.length > 0) {
    if (y > ph - 50) { doc.addPage(); y = mt; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COL.textMuted);
    doc.text(i18n.t("pdf.serviziExtra"), ml, y);
    y += 5;

    const serviziHead = [[i18n.t("pdf.servizio"), i18n.t("pdf.thCosto"), i18n.t("pdf.alCliente")]];
    const serviziBody: any[][] = pv.servizi.map(s => [
      { content: s.nome, styles: { fontStyle: "bold" } },
      { content: fe(s.costo_effettivo), styles: { halign: "right" } },
      { content: s.addebito_cliente > 0 ? fe(s.addebito_cliente) : i18n.t("pdf.incluso"), styles: { halign: "right", fontStyle: "bold", textColor: s.addebito_cliente > 0 ? COL.text : COL.green } },
    ]);

    // Riga totale servizi
    serviziBody.push([
      { content: i18n.t("pdf.totaleServizi"), styles: { fontStyle: "bold" } },
      { content: "", styles: {} },
      { content: fe(pv.totale_servizi), styles: { halign: "right", fontStyle: "bold" } },
    ]);

    autoTable(doc, {
      startY: y,
      head: serviziHead,
      body: serviziBody,
      margin: { left: ml, right: mr },
      theme: "plain",
      styles: { fontSize: 8.5, cellPadding: 2.5, textColor: COL.text, lineColor: [220, 225, 235], lineWidth: 0.1 },
      headStyles: { fillColor: [60, 90, 140], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 30 }, 2: { cellWidth: 30 } },
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ═══════════════════════════════════════
  // SPEDIZIONE
  // ═══════════════════════════════════════

  if (pv.totale_spedizione > 0) {
    if (y > ph - 30) { doc.addPage(); y = mt; }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COL.textMuted);
    doc.text(i18n.t("pdf.spedizione"), ml, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COL.text);
    if (corriereNome) {
      doc.text(`${i18n.t("pdf.corriere")} ${corriereNome}`, ml, y);
      y += 4.5;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`${i18n.t("pdf.costoSpedizione")} ${fe(pv.totale_spedizione)}`, ml, y);
    y += 6;

    doc.setDrawColor(...COL.line);
    doc.setLineWidth(0.2);
    doc.line(ml, y, ml + cw, y);
    y += 6;
  }

  // ═══════════════════════════════════════
  // SEZIONE TOTALI + PAGAMENTO (layout a due colonne)
  // Colonna sinistra: pagamento/spedizione/acconto
  // Colonna destra: breakdown totali
  // ═══════════════════════════════════════

  if (y > ph - 80) { doc.addPage(); y = mt; }

  const sectionStartY = y;
  const leftColW = cw * 0.52; // colonna sinistra
  const rightColX = ml + cw - 80; // colonna destra
  const rightColEnd = ml + cw;

  // ── COLONNA DESTRA: Totali ──
  let ry = sectionStartY;

  doc.setDrawColor(...COL.lineAccent);
  doc.setLineWidth(0.5);
  doc.line(rightColX, ry, rightColEnd, ry);
  ry += 6;

  const totRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(...COL.text);
    doc.text(label, rightColX, ry);
    doc.text(value, rightColEnd, ry, { align: "right" });
    ry += 5;
  };

  totRow(i18n.t("pdf.subtotaleRighe"), fe(pv.totale_cliente));
  if (pv.avvio_macchina > 0) totRow(i18n.t("pdf.avvioMacchina"), fe(pv.avvio_macchina));
  if (pv.totale_servizi > 0) totRow(i18n.t("pdf.totaleServizi") + ":", fe(pv.totale_servizi));
  if (pv.totale_spedizione > 0) totRow(i18n.t("pdf.spedizioneLabel"), fe(pv.totale_spedizione));

  let commissionePagamento = 0;
  if (metodoPagamento && metodoPagamento.addebita_al_cliente) {
    commissionePagamento = pv.totale_finale * (metodoPagamento.commissione_percentuale / 100) + metodoPagamento.commissione_fissa;
    if (commissionePagamento > 0) {
      totRow(i18n.t("pdf.commissionePagamento"), fe(commissionePagamento));
    }
  }

  const totaleConCommissione = pv.totale_finale + commissionePagamento;

  ry += 2;
  // TOTALE FINALE (evidenziato)
  doc.setFillColor(...COL.primaryLight);
  doc.rect(rightColX - 3, ry - 5, 83, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COL.primary);
  doc.text(i18n.t("pdf.totale"), rightColX, ry + 3);
  doc.text(fe(totaleConCommissione), rightColEnd, ry + 3, { align: "right" });
  ry += 16;

  // IVA
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COL.textLight);
  if (az.regime_fiscale === "forfettario") {
    doc.setFont("helvetica", "italic");
    doc.text(i18n.t("pdf.noIvaForfettario"), rightColX, ry);
    ry += 5;
  } else if (az.regime_fiscale === "occasionale") {
    doc.setFont("helvetica", "italic");
    doc.text(i18n.t("pdf.noIvaOccasionale"), rightColX, ry);
    ry += 5;
  } else {
    const iva = totaleConCommissione * (az.iva_percentuale / 100);
    const totIva = totaleConCommissione + iva;
    doc.text(`${i18n.t("pdf.imponibile")} ${fe(totaleConCommissione)}`, rightColX, ry); ry += 4;
    doc.text(`IVA ${az.iva_percentuale.toFixed(0)}%: ${fe(iva)}`, rightColX, ry); ry += 4;
    doc.setFont("helvetica", "bold");
    doc.text(`${i18n.t("pdf.totaleIva")} ${fe(totIva)}`, rightColX, ry); ry += 6;
  }

  // ── COLONNA SINISTRA: Pagamento / Spedizione / Acconto ──
  let ly = sectionStartY;
  const leftMaxW = leftColW - 8;

  if (metodoPagamento) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COL.text);
    doc.text(`${i18n.t("pdf.metodoPagamento")} ${metodoPagamento.nome}`, ml, ly);
    ly += 5;
    if (metodoPagamento.descrizione_pdf) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...COL.textLight);
      const descLines = doc.splitTextToSize(metodoPagamento.descrizione_pdf, leftMaxW);
      doc.text(descLines, ml + 2, ly);
      ly += descLines.length * 3.5 + 2;
    }
  }

  if (pv.acconto_valore > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COL.text);
    let accDesc = "";
    if (pv.acconto_tipo === "percentuale") {
      const imp = totaleConCommissione * (pv.acconto_valore / 100);
      accDesc = `${i18n.t("pdf.accontoRichiesto")} ${pv.acconto_valore.toFixed(0)}% = ${fe(imp)}`;
    } else if (pv.acconto_tipo === "fisso") {
      accDesc = `${i18n.t("pdf.accontoRichiesto")} ${fe(pv.acconto_valore)}`;
    }
    if (accDesc) { doc.text(accDesc, ml, ly); ly += 6; }
  }

  // y avanza al massimo tra le due colonne
  y = Math.max(ry, ly) + 4;

  // ═══════════════════════════════════════
  // NOTE
  // ═══════════════════════════════════════

  if (pv.note) {
    if (y > ph - 35) { doc.addPage(); y = mt; }

    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COL.text);
    doc.text(i18n.t("pdf.noteLabel"), ml, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...COL.textLight);
    const noteLines = doc.splitTextToSize(pv.note, cw - 4);
    doc.text(noteLines, ml + 2, y);
    y += noteLines.length * 3.8 + 3;
  }

  // ═══════════════════════════════════════
  // CONDIZIONI / NOTA REGIME
  // ═══════════════════════════════════════

  if (az.nota_regime) {
    if (y > ph - 30) { doc.addPage(); y = mt; }

    y += 4;
    doc.setDrawColor(...COL.line);
    doc.setLineWidth(0.2);
    doc.line(ml, y, ml + cw, y);
    y += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COL.textLight);
    doc.text(i18n.t("pdf.condizioni"), ml, y);
    y += 4;

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...COL.textMuted);
    const condLines = doc.splitTextToSize(az.nota_regime, cw - 4);
    doc.text(condLines, ml + 2, y);
    y += condLines.length * 3.2;
  }

  // ═══════════════════════════════════════
  // FOOTER (tutte le pagine)
  // ═══════════════════════════════════════

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const fy = ph - 12;

    doc.setDrawColor(...COL.line);
    doc.setLineWidth(0.2);
    doc.line(ml, fy, ml + cw, fy);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COL.textMuted);
    doc.text(`${pv.numero} — ${az.ragione_sociale} — ${i18n.t("pdf.generatoCon")}`, ml, fy + 4);
    doc.text(i18n.t("pdf.pagina", { num: i, total: totalPages }), ml + cw, fy + 4, { align: "right" });
  }

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

// ── Export diretto (salva + apri) ──

export async function exportPdfPreventivo(preventivo: PreventivoCompleto, options?: PdfOptions): Promise<void> {
  // save e writeFile importati staticamente in testa al file

  const path = await save({
    defaultPath: `${preventivo.numero}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (!path) return;

  const pdfBytes = await generatePreventivosPdf(preventivo, options);
  await writeFile(path, new Uint8Array(pdfBytes));

  // Apri il PDF con il viewer di sistema
  try {
    // open importato staticamente in testa al file
    await open(path);
  } catch {
    // Se non riesce ad aprire, il file è comunque salvato
  }
}

// ── Genera PDF come Blob (per auto-salvataggio in Documenti/) ──

export async function generaPdfPreventivoBlob(preventivo: PreventivoCompleto): Promise<Blob> {
  const pdfBytes = await generatePreventivosPdf(preventivo);
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}
