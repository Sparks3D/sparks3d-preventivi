// src/types/index.ts
// Sparks3D Preventivi - Type definitions
// =======================================

// ============================================================
// AZIENDA
// ============================================================
export interface Azienda {
  id: number;
  ragione_sociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  partita_iva: string;
  codice_fiscale: string;
  email: string;
  telefono: string;
  logo_path: string;
  regime_fiscale: "ordinario" | "forfettario" | "occasionale";
  iva_percentuale: number;
  nota_regime: string;
  prefisso_preventivo: string;
  prossimo_numero: number;
}

// ============================================================
// CLIENTI
// ============================================================
export interface Cliente {
  id: number;
  nome: string;
  cognome: string;
  denominazione_azienda: string;
  email: string;
  telefono: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  partita_iva: string;
  codice_fiscale: string;
  note: string;
  created_at: string;
}

// ============================================================
// MATERIALI
// ============================================================
export interface Materiale {
  id: number;
  nome: string;
  profilo_slicer: string;
  slicer_origin: "bambu" | "orca";
  peso_specifico_gcm3: number;
  prezzo_kg: number;
  markup_percentuale: number;
  fallimento_percentuale: number;
  magazzino_kg: number;
  link_acquisto: string;
}

// ============================================================
// STAMPANTI
// ============================================================
export interface Stampante {
  id: number;
  nome: string;
  profilo_slicer: string;
  slicer_origin: "bambu" | "orca";
  consumo_kwh: number;
  ammortamento_ora: number;
}

// ============================================================
// PROFILI DI STAMPA
// ============================================================
export interface ProfiloStampa {
  id: number;
  nome: string;
  profilo_slicer: string;
  slicer_origin: "bambu" | "orca";
  layer_height_mm: number;
  numero_pareti: number;
  infill_percentuale: number;
  top_layers: number;
  bottom_layers: number;
  supporti_albero: boolean;
  supporti_normali: boolean;
}

// ============================================================
// PREVENTIVI
// ============================================================
export type StatoPreventivo = "non_confermato" | "in_lavorazione" | "completato";

export interface Preventivo {
  id: number;
  numero: string;
  cliente_id: number | null;
  stato: StatoPreventivo;
  data_creazione: string;
  markup_globale: number;
  sconto_globale: number;
  avvio_macchina: number;
  metodo_pagamento_id: number | null;
  corriere_id: number | null;
  acconto_tipo: "" | "percentuale" | "fisso";
  acconto_valore: number;
  ritenuta_acconto: boolean;
  note: string;
  congelato: boolean;
  // Campi calcolati
  totale_costo: number;
  totale_cliente: number;
  totale_profit: number;
  totale_materiale_g: number;
  totale_tempo_sec: number;
  totale_servizi: number;
  totale_spedizione: number;
  totale_finale: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// RIGHE PREVENTIVO
// ============================================================
export interface RigaPreventivo {
  id: number;
  preventivo_id: number;
  nome_file: string;
  titolo_visualizzato: string;
  file_path: string;
  thumbnail_path: string;
  materiale_id: number | null;
  stampante_id: number | null;
  profilo_stampa_id: number | null;
  quantita: number;
  // Dati slicer
  tempo_stampa_sec: number;
  peso_grammi: number;
  ingombro_x_mm: number;
  ingombro_y_mm: number;
  ingombro_z_mm: number;
  // Override
  markup_riga: number | null;
  sconto_riga: number | null;
  fallimento_riga: number | null;
  post_processing: number;
  supporti_albero_override: boolean | null;
  supporti_normali_override: boolean | null;
  // Calcolati
  costo_materiale: number;
  costo_energia: number;
  costo_ammortamento: number;
  costo_fallimento: number;
  totale_costo: number;
  totale_cliente: number;
  profit: number;
  // Meta
  orientamento_json: string;
  tempo_manuale: boolean;
  peso_manuale: boolean;
  ordine: number;
}

// ============================================================
// SERVIZI EXTRA
// ============================================================
export interface ServizioExtra {
  id: number;
  nome: string;
  importo_predefinito: number;
  addebita: boolean;
  addebita_senza_costo: boolean;
  markup_percentuale: number;
}

// ============================================================
// CORRIERI
// ============================================================
export interface Corriere {
  id: number;
  nome: string;
  servizio: string;
  costo_spedizione: number;
}

// ============================================================
// METODI PAGAMENTO
// ============================================================
export interface MetodoPagamento {
  id: number;
  nome: string;
  descrizione_pdf: string;
}

// ============================================================
// DASHBOARD
// ============================================================
export interface DashboardStats {
  num_preventivi: number;
  fatturato: number;
  profit: number;
  oggetti_stampati: number;
  materiale_kg: number;
  tempo_totale_sec: number;
}

export interface MaterialeConsumo {
  nome: string;
  kg: number;
}

export interface StampanteOre {
  nome: string;
  ore: number;
}

export interface TrendFatturato {
  data: string;
  fatturato: number;
  profit: number;
}

export interface MagazzinoItem {
  id: number;
  nome: string;
  magazzino_kg: number;
  soglia: number;
  riordino_necessario: boolean;
  link_acquisto: string;
}

// ============================================================
// SLICER
// ============================================================
export interface SlicerProfile {
  nome: string;
  path: string;
  origin: "bambu" | "orca";
  tipo: "filament" | "machine" | "process";
}

export interface SlicerResult {
  tempo_sec: number;
  peso_grammi: number;
  ingombro_x: number;
  ingombro_y: number;
  ingombro_z: number;
  success: boolean;
  error: string | null;
}

export interface SlicerInfo {
  installed: boolean;
  path: string;
  version: string;
  is_beta: boolean;
}

// ============================================================
// NAVIGAZIONE
// ============================================================
export type PageId =
  | "dashboard"
  | "preventivi"
  | "nuovo-preventivo"
  | "clienti"
  | "impostazioni"
  | "materiali"
  | "stampanti"
  | "profili"
  | "servizi"
  | "corrieri"
  | "pagamenti";
