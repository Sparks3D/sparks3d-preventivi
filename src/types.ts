// src/types.ts
// Sparks3D Preventivi — Tipi condivisi
// ======================================

export type PageId =
  | "dashboard"
  | "preventivi"
  | "nuovo-preventivo"
  | "clienti"
  | "cliente-form"
  | "impostazioni"
  | "materiali"
  | "stampanti"
  | "profili"
  | "servizi"
  | "corrieri"
  | "pagamenti"
  | "interfaccia"
  | "ritenuta"
  | "nuova-ritenuta"
  | "archivio-ritenute"
  | "backup"
  | "licenza"
  | "guida"
  | "slicer-import"
  | "sicurezza"
  | "settings-form";

// ── Entità principali ──

export interface Azienda {
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
  created_at?: string;
}

export interface Materiale {
  id: number;
  nome: string;
  profilo_slicer: string;
  slicer_origin: string;
  peso_specifico_gcm3: number;
  prezzo_kg: number;
  markup_percentuale: number;
  fallimento_percentuale: number;
  magazzino_kg: number;
  link_acquisto: string;
}

export interface Stampante {
  id: number;
  nome: string;
  profilo_slicer: string;
  slicer_origin: string;
  consumo_kwh: number;
  ammortamento_ora: number;
}

export interface ProfiloStampa {
  id: number;
  nome: string;
  profilo_slicer: string;
  slicer_origin: string;
  layer_height_mm: number;
  numero_pareti: number;
  infill_percentuale: number;
  top_layers: number;
  bottom_layers: number;
  supporti_albero: boolean;
  supporti_normali: boolean;
}

export interface Preventivo {
  id: number;
  numero: string;
  cliente_id: number | null;
  stato: string;
  data_creazione: string;
  markup_globale: number;
  sconto_globale: number;
  avvio_macchina: number;
  metodo_pagamento_id: number | null;
  corriere_id: number | null;
  acconto_tipo: string;
  acconto_valore: number;
  ritenuta_acconto: boolean;
  note: string;
  totale_costo: number;
  totale_cliente: number;
  totale_profit: number;
  totale_materiale_g: number;
  totale_tempo_sec: number;
  totale_finale: number;
}

export interface RigaMateriale {
  id: number;
  riga_preventivo_id: number;
  materiale_id: number;
  slot_ams: number;
  colore_hex: string;
  peso_grammi: number;
  percentuale_pezzo: number;
  costo_materiale: number;
  costo_fallimento: number;
  materiale_nome?: string;
  materiale_prezzo_kg?: number;
}

export interface RigaPreventivo {
  id: number;
  preventivo_id: number;
  nome_file: string;
  titolo_visualizzato: string;
  stampante_id: number | null;
  profilo_stampa_id: number | null;
  quantita: number;
  is_multicolore: boolean;
  tempo_stampa_sec: number;
  peso_totale_grammi: number;
  ingombro_x_mm: number;
  ingombro_y_mm: number;
  ingombro_z_mm: number;
  markup_riga: number | null;
  sconto_riga: number | null;
  post_processing: number;
  costo_materiale_totale: number;
  costo_energia: number;
  costo_ammortamento: number;
  costo_fallimento: number;
  totale_costo: number;
  totale_cliente: number;
  profit: number;
  materiali: RigaMateriale[];
}

export interface ServizioExtra {
  id: number;
  nome: string;
  importo_predefinito: number;
  addebita: boolean;
  addebita_senza_costo: boolean;
  markup_percentuale: number;
}

export interface Corriere {
  id: number;
  nome: string;
  servizio: string;
  costo_spedizione: number;
  tempo_consegna: string;
  packlink_service_id: string;
  note: string;
}

export interface MetodoPagamento {
  id: number;
  nome: string;
  descrizione_pdf: string;
  commissione_percentuale: number;
  commissione_fissa: number;
  addebita_al_cliente: boolean;
}

// ── Dashboard ──

export interface DashboardStats {
  totale_preventivi: number;
  fatturato_totale: number;
  profitto_totale: number;
  materiale_usato_kg: number;
  tempo_stampa_ore: number;
  confermati: number;
  tasso_conversione: number;
  per_stato: Record<string, number>;
  ultimi_preventivi: UltimoPreventivo[];
  top_clienti: TopCliente[];
}

export interface UltimoPreventivo {
  id: number;
  numero: string;
  stato: string;
  data_creazione: string;
  totale_finale: number;
  cliente_nome: string;
}

export interface TopCliente {
  cliente_id: number;
  cliente_nome: string;
  totale_fatturato: number;
  num_preventivi: number;
}

export interface MaterialeConsumo {
  materiale_id: number;
  materiale_nome: string;
  peso_totale_kg: number;
}

export interface StampanteOre {
  stampante_id: number;
  stampante_nome: string;
  ore_totali: number;
}

export interface TrendFatturato {
  mese: string;
  fatturato: number;
  profitto: number;
}

export interface MagazzinoItem {
  materiale_id: number;
  materiale_nome: string;
  magazzino_kg: number;
  prezzo_kg: number;
}

// ── Slicer ──

export interface SlicerProfile {
  nome: string;
  path: string;
  tipo: string;
  origin: string;
  is_user: boolean;
  params: Record<string, any>;
}

export interface SlicerResult {
  tempo_stampa_sec: number;
  peso_grammi: number;
  materiale_tipo: string;
  materiali: SlicerResultMaterial[];
}

export interface SlicerResultMaterial {
  slot: number;
  tipo: string;
  peso_grammi: number;
  colore_hex: string;
}

export interface SlicerInfo {
  installed: boolean;
  path: string;
  is_beta: boolean;
  user_profiles_path: string;
  builtin_profiles_path: string;
}
