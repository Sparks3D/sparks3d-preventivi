// src/utils/ritenutaPdf.ts
// Sparks3D Preventivi – Generazione PDF Ritenuta d'Acconto / Ricevuta
// Con auto-salvataggio in Documenti/Sparks3D/Ritenute/ e archivio DB
// =====================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

// ── Tipi ──

export interface DatiRitenuta {
  numero: string;
  data: string;
  cliente_nome: string;
  cliente_indirizzo: string;
  cliente_cap_citta: string;
  cliente_cf: string;
  cliente_piva: string;
  descrizione: string;
  importo_lordo: number;
  preventivo_numero?: string;
  preventivo_id?: number;
  cliente_id?: number;
  note?: string;
}

export interface RisultatoSalvataggio {
  pdf_path: string;
  salvato_in_archivio: boolean;
  salvato_con_nome: boolean;
}

interface Azienda {
  ragione_sociale: string; indirizzo: string; cap: string;
  citta: string; provincia: string; partita_iva: string;
  codice_fiscale: string; email: string; telefono: string;
  logo_path: string; regime_fiscale: string;
  iva_percentuale: number; nota_regime: string;
}

interface DocumentsFolders {
  base: string;
  preventivi: string;
  ritenute: string;
}

// ── Costanti ──

const RITENUTA_PCT = 20;
const MARCA_BOLLO_SOGLIA = 77.47;
const MARCA_BOLLO_IMPORTO = 2.0;

const eurFmt = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const dataFmt = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// ── Helper: Blob → base64 ──

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Helper: Blob → Uint8Array ──

function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

// ── Generatore PDF (invariato nella struttura, restituisce Blob) ──

async function generaPdfBlob(dati: DatiRitenuta): Promise<Blob> {
  const az = await invoke<Azienda>("get_azienda");

  const isAzienda = !!dati.cliente_piva?.trim();
  const haRitenuta = isAzienda;

  const lordo = dati.importo_lordo;
  const ritenuta = haRitenuta ? lordo * (RITENUTA_PCT / 100) : 0;
  const netto = lordo - ritenuta;
  const marcaBollo = lordo > MARCA_BOLLO_SOGLIA ? MARCA_BOLLO_IMPORTO : 0;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 18;
  const mr = 18;
  const cw = pw - ml - mr;

  let y = 18;

  // ═══ HEADER AZIENDA ═══

  let logoLoaded = false;
  if (az.logo_path) {
    try {
      const logoBase64: string = await invoke("load_logo_preview", { logoPath: az.logo_path });
      if (logoBase64 && logoBase64.startsWith("data:")) {
        const props = doc.getImageProperties(logoBase64);
        const ratio = props.width / props.height;
        const logoH = 18;
        const logoW = logoH * ratio;
        doc.addImage(logoBase64, "PNG", pw - mr - logoW, y, logoW, logoH);
        logoLoaded = true;
      }
    } catch { /* logo non disponibile */ }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 60);
  doc.text(az.ragione_sociale || "Sparks3D", ml, y + 5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 100);

  const righeAz: string[] = [];
  if (az.indirizzo) righeAz.push(az.indirizzo);
  const capCitta = [az.cap, az.citta, az.provincia ? `(${az.provincia})` : ""].filter(Boolean).join(" ");
  if (capCitta.trim()) righeAz.push(capCitta);

  const fiscale: string[] = [];
  if (az.partita_iva) fiscale.push(`P.IVA: ${az.partita_iva}`);
  if (az.codice_fiscale) fiscale.push(`C.F.: ${az.codice_fiscale}`);
  if (fiscale.length) righeAz.push(fiscale.join("  |  "));

  const contatti: string[] = [];
  if (az.email) contatti.push(`Email: ${az.email}`);
  if (az.telefono) contatti.push(`Tel: ${az.telefono}`);
  if (contatti.length) righeAz.push(contatti.join("  |  "));

  let yAz = y + 10;
  for (const riga of righeAz) {
    doc.text(riga, ml, yAz);
    yAz += 4;
  }

  y = Math.max(yAz, y + (logoLoaded ? 20 : 0)) + 6;

  doc.setDrawColor(14, 165, 233);
  doc.setLineWidth(0.6);
  doc.line(ml, y, pw - mr, y);
  y += 10;

  // ═══ TITOLO DOCUMENTO ═══

  const titoloDoc = haRitenuta
    ? "RICEVUTA PER PRESTAZIONE OCCASIONALE"
    : "RICEVUTA PER PRESTAZIONE OCCASIONALE TRA PRIVATI";

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233);
  doc.text(titoloDoc, pw / 2, y, { align: "center" });
  y += 5;

  const sottotitolo = haRitenuta
    ? "con applicazione della ritenuta d'acconto"
    : "senza ritenuta d'acconto";
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text(sottotitolo, pw / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 60);
  doc.text(`Ricevuta n. ${dati.numero}`, ml, y);
  doc.text(`Data: ${dataFmt(dati.data)}`, pw - mr, y, { align: "right" });
  y += 10;

  // ═══ COMMITTENTE ═══

  doc.setFillColor(240, 245, 255);
  doc.setDrawColor(200, 215, 240);
  doc.roundedRect(ml, y, cw, isAzienda ? 28 : 24, 3, 3, "FD");
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233);
  doc.text("COMMITTENTE", ml + 5, y);
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 60);
  doc.text(dati.cliente_nome, ml + 5, y);
  y += 4.5;

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 80);
  if (dati.cliente_indirizzo) {
    doc.text(`${dati.cliente_indirizzo} — ${dati.cliente_cap_citta}`, ml + 5, y);
    y += 4;
  }

  const cfPiva: string[] = [];
  if (dati.cliente_piva) cfPiva.push(`P.IVA: ${dati.cliente_piva}`);
  if (dati.cliente_cf) cfPiva.push(`C.F.: ${dati.cliente_cf}`);
  if (cfPiva.length) {
    doc.text(cfPiva.join("  |  "), ml + 5, y);
    y += 4;
  }

  y += 8;

  // ═══ DESCRIZIONE ═══

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233);
  doc.text("DESCRIZIONE DELLA PRESTAZIONE", ml, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 60);

  const righeDesc = doc.splitTextToSize(dati.descrizione, cw - 10);
  doc.text(righeDesc, ml + 2, y);
  y += righeDesc.length * 5 + 2;

  if (dati.preventivo_numero) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 120);
    doc.text(`Rif. preventivo: ${dati.preventivo_numero}`, ml + 2, y);
    y += 5;
  }

  y += 6;

  // ═══ TABELLA IMPORTI ═══

  const righeTabella: string[][] = [];

  righeTabella.push(["Compenso lordo", eurFmt(lordo)]);

  if (haRitenuta) {
    righeTabella.push([`Ritenuta d'acconto (${RITENUTA_PCT}%)`, `- ${eurFmt(ritenuta)}`]);
  }

  if (marcaBollo > 0) {
    righeTabella.push(["Marca da bollo (art. 2 DPR 642/72)", eurFmt(marcaBollo)]);
  }

  righeTabella.push(["NETTO A PAGARE", eurFmt(netto + marcaBollo)]);

  autoTable(doc, {
    startY: y,
    head: [["Voce", "Importo"]],
    body: righeTabella,
    margin: { left: ml, right: mr },
    theme: "plain",
    headStyles: {
      fillColor: [14, 165, 233],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: [30, 30, 60],
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: cw * 0.65 },
      1: { cellWidth: cw * 0.35, halign: "right" as const, fontStyle: "bold" },
    },
    didParseCell: (data: any) => {
      if (data.row.index === righeTabella.length - 1) {
        data.cell.styles.fillColor = [230, 245, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ═══ DICHIARAZIONI LEGALI ═══

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 165, 233);
  doc.text("DICHIARAZIONI", ml, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 80);

  const dichiarazioni: string[] = [];

  if (haRitenuta) {
    dichiarazioni.push(
      "Il/La sottoscritto/a dichiara che la presente prestazione è di natura occasionale " +
      "ai sensi dell'art. 2222 e seguenti del Codice Civile e non è svolta in modo abituale " +
      "e continuativo."
    );
    dichiarazioni.push(
      "Il compenso è soggetto a ritenuta d'acconto del 20% ai sensi dell'art. 25 del " +
      "D.P.R. 29 settembre 1973, n. 600."
    );
    dichiarazioni.push(
      "Il reddito derivante dalla presente prestazione è classificato come reddito diverso " +
      "ai sensi dell'art. 67, comma 1, lettera l) del T.U.I.R. (D.P.R. 917/1986)."
    );
    dichiarazioni.push(
      "La presente prestazione non è soggetta ad IVA ai sensi dell'art. 5 del D.P.R. " +
      "633/1972 in quanto priva del requisito di abitualità."
    );
  } else {
    dichiarazioni.push(
      "Il/La sottoscritto/a dichiara che la presente prestazione è di natura occasionale " +
      "ai sensi dell'art. 2222 e seguenti del Codice Civile."
    );
    dichiarazioni.push(
      "Trattandosi di prestazione occasionale tra privati, il committente non riveste la " +
      "qualifica di sostituto d'imposta, pertanto non si applica la ritenuta d'acconto " +
      "di cui all'art. 25 del D.P.R. 600/1973."
    );
    dichiarazioni.push(
      "L'importo lordo corrisponde al netto a pagare."
    );
    dichiarazioni.push(
      "La presente prestazione non è soggetta ad IVA ai sensi dell'art. 5 del D.P.R. " +
      "633/1972 in quanto priva del requisito di abitualità."
    );
  }

  if (marcaBollo > 0) {
    dichiarazioni.push(
      `Sull'originale della presente ricevuta è stata apposta marca da bollo da € ${MARCA_BOLLO_IMPORTO.toFixed(2)} ` +
      "ai sensi dell'art. 2 del D.P.R. 26 ottobre 1972, n. 642, " +
      `in quanto l'importo supera € ${MARCA_BOLLO_SOGLIA.toFixed(2)}.`
    );
  }

  dichiarazioni.push(
    "Il/La sottoscritto/a dichiara altresì di non aver percepito nell'anno in corso " +
    "compensi per prestazioni occasionali superiori a € 5.000,00 complessivi."
  );

  for (const dich of dichiarazioni) {
    const righe = doc.splitTextToSize(`• ${dich}`, cw - 4);
    if (y + righe.length * 3.5 > ph - 40) {
      doc.addPage();
      y = 20;
    }
    doc.text(righe, ml + 2, y);
    y += righe.length * 3.5 + 1.5;
  }

  y += 6;

  // ═══ NOTE ═══

  if (dati.note?.trim()) {
    if (y + 20 > ph - 40) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(14, 165, 233);
    doc.text("NOTE", ml, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 80);
    const noteRighe = doc.splitTextToSize(dati.note, cw - 4);
    doc.text(noteRighe, ml + 2, y);
    y += noteRighe.length * 3.5 + 4;
  }

  // ═══ FIRME ═══

  if (y + 35 > ph - 20) { doc.addPage(); y = 20; }
  y += 10;

  doc.setDrawColor(180, 190, 210);
  doc.setLineWidth(0.3);

  doc.line(ml, y + 15, ml + 65, y + 15);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 120);
  doc.text("Il Prestatore", ml + 15, y + 20);
  doc.setFontSize(7.5);
  doc.text(az.ragione_sociale || "", ml + 5, y + 24);

  doc.line(pw - mr - 65, y + 15, pw - mr, y + 15);
  doc.text("Il Committente", pw - mr - 50, y + 20);
  doc.setFontSize(7.5);
  doc.text(dati.cliente_nome, pw - mr - 60, y + 24);

  // ═══ FOOTER ═══

  doc.setFontSize(7);
  doc.setTextColor(150, 160, 175);
  doc.text(
    `Documento generato da Sparks3D Preventivi — ${dataFmt(dati.data)}`,
    pw / 2, ph - 10,
    { align: "center" }
  );

  return doc.output("blob");
}

// ══════════════════════════════════════════════════════════════════════
// FUNZIONE PRINCIPALE: genera PDF + salva automaticamente + archivia DB
// ══════════════════════════════════════════════════════════════════════

export async function generaRitenutaPdf(dati: DatiRitenuta): Promise<RisultatoSalvataggio> {
  const isAzienda = !!dati.cliente_piva?.trim();
  const haRitenuta = isAzienda;
  const lordo = dati.importo_lordo;
  const ritenuta = haRitenuta ? lordo * (RITENUTA_PCT / 100) : 0;
  const netto = lordo - ritenuta;
  const marcaBollo = lordo > MARCA_BOLLO_SOGLIA ? MARCA_BOLLO_IMPORTO : 0;

  // 1) Genera il PDF blob
  const blob = await generaPdfBlob(dati);
  const base64 = await blobToBase64(blob);

  // 2) Crea cartelle Documenti/Sparks3D/Ritenute/ (se non esistono)
  const folders = await invoke<DocumentsFolders>("get_documents_folder");

  // 3) Auto-salva il PDF nella cartella Ritenute
  const sanitizedName = dati.cliente_nome.replace(/[^a-zA-Z0-9àèìòùÀÈÌÒÙ\s-]/g, "").trim().replace(/\s+/g, "_");
  const filename = `${dati.numero}_${sanitizedName}_${dati.data}.pdf`;

  const pdfPath = await invoke<string>("save_pdf_to_documents", {
    folder: folders.ritenute,
    filename,
    base64Data: base64,
  });

  // 4) Salva nel DB (archivio ritenute)
  let salvatoInArchivio = false;
  try {
    await invoke("create_ritenuta", {
      data: {
        preventivo_id: dati.preventivo_id ?? null,
        preventivo_numero: dati.preventivo_numero ?? "",
        numero_ritenuta: dati.numero,
        data: dati.data,
        cliente_id: dati.cliente_id ?? null,
        cliente_nome: dati.cliente_nome,
        importo_lordo: lordo,
        ritenuta_importo: ritenuta,
        netto_pagare: netto + marcaBollo,
        marca_bollo: marcaBollo,
        descrizione: dati.descrizione,
        pdf_path: pdfPath,
        note: dati.note ?? "",
      },
    });
    salvatoInArchivio = true;
  } catch (err) {
    console.error("Errore salvataggio archivio ritenuta:", err);
  }

  return {
    pdf_path: pdfPath,
    salvato_in_archivio: salvatoInArchivio,
    salvato_con_nome: false,
  };
}

// ══════════════════════════════════════════════════════════════════════
// FUNZIONE: Dialog "Salva con nome" per esportare la ritenuta altrove
// ══════════════════════════════════════════════════════════════════════

export async function esportaRitenutaConNome(dati: DatiRitenuta): Promise<string | null> {
  const blob = await generaPdfBlob(dati);
  const uint8 = await blobToUint8Array(blob);

  const sanitizedName = dati.cliente_nome.replace(/[^a-zA-Z0-9àèìòùÀÈÌÒÙ\s-]/g, "").trim().replace(/\s+/g, "_");
  const defaultFilename = `${dati.numero}_${sanitizedName}_${dati.data}.pdf`;

  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (!filePath) return null;

  await writeFile(filePath, uint8);
  return filePath;
}

// ══════════════════════════════════════════════════════════════════════
// FUNZIONE: Salva PDF preventivo in Documenti/Sparks3D/Preventivi/
// (da usare quando si genera il PDF del preventivo)
// ══════════════════════════════════════════════════════════════════════

export async function salvaPdfPreventivo(
  pdfBlob: Blob,
  numero: string,
  clienteNome: string,
): Promise<string> {
  const base64 = await blobToBase64(pdfBlob);
  const folders = await invoke<DocumentsFolders>("get_documents_folder");

  const sanitizedName = clienteNome.replace(/[^a-zA-Z0-9àèìòùÀÈÌÒÙ\s-]/g, "").trim().replace(/\s+/g, "_");
  const filename = `Preventivo_${numero}_${sanitizedName}.pdf`;

  return invoke<string>("save_pdf_to_documents", {
    folder: folders.preventivi,
    filename,
    base64Data: base64,
  });
}
