// src/types.ts
// Sparks3D Preventivi — Tipi condivisi
// ======================================

export type PageId =
  | "dashboard"
  | "preventivi"
  | "nuovo-preventivo"
  | "archivio-ritenute"
  | "backup"
  | "clienti"
  | "ritenuta"
  | "impostazioni"
  | "materiali"
  | "stampanti"
  | "profili"
  | "servizi"
  | "corrieri"
  | "pagamenti"
  | "interfaccia"
  | "licenza"
  | "guida";

// ── Tipi entità (usati da api.ts) ──

export interface Azienda {
  id: number; ragione_sociale: string; indirizzo: string;
  cap: string; citta: string; provincia: string; paese: string;
  partita_iva: string; codice_fiscale: string;
  email: string; telefono: string; logo_path: string;
  regime_fiscale: string; iva_percentuale: number;
  nota_regime: string; prefisso_preventivo: string; prossimo_numero: number;
}

export interface Cliente {
  id: number; nome: string; cognome: string;
  denominazione_azienda: string; email: string;
  telefono: string; indirizzo: string; cap: string;
  citta: string; provincia: string; partita_iva: string;
  codice_fiscale: string; note: string;
  created_at?: string;
}

export interface Materiale {
  id: number; nome: string; profilo_slicer: string;
  slicer_origin: string; peso_specifico_gcm3: number;
  prezzo_kg: number; markup_percentuale: number;
  fallimento_percentuale: number; magazzino_kg: number; link_acquisto: string;
}

export interface Stampante {
  id: number; nome: string; profilo_slicer: string;
  slicer_origin: string; consumo_kwh: number; ammortamento_ora: number;
}

export interface ProfiloStampa {
  id: number; nome: string; profilo_slicer: string;
  slicer_origin: string; layer_height_mm: number;
  numero_pareti: number; infill_percentuale: number;
  top_layers: number; bottom_layers: number;
  supporti_albero: boolean; supporti_normali: boolean;
}

export interface ServizioExtra {
  id: number; nome: string; importo_predefinito: number;
  addebita: boolean; addebita_senza_costo: boolean; markup_percentuale: number;
}

export interface MetodoPagamento {
  id: number; nome: string; descrizione_pdf: string;
  commissione_percentuale: number; commissione_fissa: number; addebita_al_cliente: boolean;
}

export interface Corriere {
  id: number; nome: string; servizio: string;
  costo_spedizione: number; tempo_consegna: string;
  packlink_service_id: string; note: string;
}

export interface Preventivo {
  id: number; numero: string; cliente_id: number | null;
  stato: string; data_creazione: string;
  markup_globale: number; sconto_globale: number; avvio_macchina: number;
  metodo_pagamento_id: number | null; corriere_id: number | null;
  acconto_tipo: string; acconto_valore: number;
  ritenuta_acconto: boolean; note: string;
  totale_costo: number; totale_cliente: number; totale_profit: number;
  totale_materiale_g: number; totale_tempo_sec: number; totale_finale: number;
}

export interface RigaPreventivo {
  id: number; preventivo_id: number;
  nome_file: string; titolo_visualizzato: string;
  stampante_id: number | null; profilo_stampa_id: number | null;
  quantita: number; is_multicolore: boolean;
  tempo_stampa_sec: number; peso_totale_grammi: number;
  totale_costo: number; totale_cliente: number; profit: number;
}

export interface DashboardStats {
  totale_preventivi: number; preventivi_confermati: number;
  fatturato_totale: number; profit_totale: number;
  materiale_totale_kg: number; tempo_stampa_totale_ore: number;
  tasso_conversione: number; valore_medio: number;
}

export interface MaterialeConsumo {
  materiale_id: number; nome: string; peso_kg: number; num_utilizzi: number;
}

export interface StampanteOre {
  stampante_id: number; nome: string; ore_totali: number;
}

export interface TrendFatturato {
  mese: string; fatturato: number; profit: number; num_preventivi: number;
}

export interface MagazzinoItem {
  id: number; nome: string; magazzino_kg: number; soglia: number;
}

export interface SlicerProfile {
  nome: string; path: string; tipo: string;
}

export interface SlicerResult {
  tempo_sec: number; peso_grammi: number; filamento_mm: number;
}

export interface SlicerInfo {
  slicer: string; versione: string; path: string; trovato: boolean;
}
