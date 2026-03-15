// src/lib/api.ts
// Sparks3D Preventivi - Tauri API wrapper
// ========================================
//
// Questo modulo centralizza tutte le chiamate al backend Rust
// tramite il sistema invoke di Tauri.

import { invoke } from "@tauri-apps/api/core";
import type {
  Azienda, Cliente, Materiale, Stampante, ProfiloStampa,
  Preventivo, RigaPreventivo, ServizioExtra, Corriere,
  MetodoPagamento, DashboardStats, MaterialeConsumo,
  StampanteOre, TrendFatturato, MagazzinoItem,
  SlicerProfile, SlicerResult, SlicerInfo,
} from "../types";

// ============================================================
// AZIENDA
// ============================================================
export const aziendaApi = {
  get: () => invoke<Azienda>("get_azienda"),
  update: (data: Partial<Azienda>) => invoke<Azienda>("update_azienda", { data }),
};

// ============================================================
// CLIENTI
// ============================================================
export const clientiApi = {
  getAll: () => invoke<Cliente[]>("get_clienti"),
  get: (id: number) => invoke<Cliente>("get_cliente", { id }),
  create: (data: Omit<Cliente, "id" | "created_at">) => invoke<Cliente>("create_cliente", { data }),
  update: (id: number, data: Partial<Cliente>) => invoke<Cliente>("update_cliente", { id, data }),
  delete: (id: number) => invoke<void>("delete_cliente", { id }),
  search: (query: string) => invoke<Cliente[]>("search_clienti", { query }),
};

// ============================================================
// MATERIALI
// ============================================================
export const materialiApi = {
  getAll: () => invoke<Materiale[]>("get_materiali"),
  create: (data: Omit<Materiale, "id">) => invoke<Materiale>("create_materiale", { data }),
  update: (id: number, data: Partial<Materiale>) => invoke<Materiale>("update_materiale", { id, data }),
  delete: (id: number) => invoke<void>("delete_materiale", { id }),
};

// ============================================================
// STAMPANTI
// ============================================================
export const stampantiApi = {
  getAll: () => invoke<Stampante[]>("get_stampanti"),
  create: (data: Omit<Stampante, "id">) => invoke<Stampante>("create_stampante", { data }),
  update: (id: number, data: Partial<Stampante>) => invoke<Stampante>("update_stampante", { id, data }),
  delete: (id: number) => invoke<void>("delete_stampante", { id }),
};

// ============================================================
// PROFILI DI STAMPA
// ============================================================
export const profiliApi = {
  getAll: () => invoke<ProfiloStampa[]>("get_profili"),
  create: (data: Omit<ProfiloStampa, "id">) => invoke<ProfiloStampa>("create_profilo", { data }),
  update: (id: number, data: Partial<ProfiloStampa>) => invoke<ProfiloStampa>("update_profilo", { id, data }),
  delete: (id: number) => invoke<void>("delete_profilo", { id }),
};

// ============================================================
// PREVENTIVI
// ============================================================
export const preventiviApi = {
  getAll: () => invoke<Preventivo[]>("get_preventivi"),
  get: (id: number) => invoke<Preventivo>("get_preventivo", { id }),
  create: () => invoke<Preventivo>("create_preventivo"),
  update: (id: number, data: Partial<Preventivo>) => invoke<Preventivo>("update_preventivo", { id, data }),
  delete: (id: number) => invoke<void>("delete_preventivo", { id }),
  updateStato: (id: number, stato: string) => invoke<Preventivo>("update_stato_preventivo", { id, stato }),
  duplica: (id: number) => invoke<Preventivo>("duplica_preventivo", { id }),
};

// ============================================================
// RIGHE PREVENTIVO
// ============================================================
export const righeApi = {
  add: (preventivoId: number, filePaths: string[], config: {
    materiale_id: number;
    stampante_id: number;
    profilo_stampa_id: number;
    post_processing: number;
  }) => invoke<RigaPreventivo[]>("add_riga", { preventivoId, filePaths, config }),
  update: (id: number, data: Partial<RigaPreventivo>) => invoke<RigaPreventivo>("update_riga", { id, data }),
  delete: (id: number) => invoke<void>("delete_riga", { id }),
  ricalcola: (id: number) => invoke<RigaPreventivo>("ricalcola_riga", { id }),
};

// ============================================================
// SERVIZI EXTRA
// ============================================================
export const serviziApi = {
  getAll: () => invoke<ServizioExtra[]>("get_servizi_extra"),
  create: (data: Omit<ServizioExtra, "id">) => invoke<ServizioExtra>("create_servizio_extra", { data }),
  update: (id: number, data: Partial<ServizioExtra>) => invoke<ServizioExtra>("update_servizio_extra", { id, data }),
  delete: (id: number) => invoke<void>("delete_servizio_extra", { id }),
};

// ============================================================
// CORRIERI
// ============================================================
export const corrieriApi = {
  getAll: () => invoke<Corriere[]>("get_corrieri"),
  create: (data: Omit<Corriere, "id">) => invoke<Corriere>("create_corriere", { data }),
  update: (id: number, data: Partial<Corriere>) => invoke<Corriere>("update_corriere", { id, data }),
  delete: (id: number) => invoke<void>("delete_corriere", { id }),
};

// ============================================================
// METODI PAGAMENTO
// ============================================================
export const pagamentiApi = {
  getAll: () => invoke<MetodoPagamento[]>("get_metodi_pagamento"),
  create: (data: Omit<MetodoPagamento, "id">) => invoke<MetodoPagamento>("create_metodo_pagamento", { data }),
  update: (id: number, data: Partial<MetodoPagamento>) => invoke<MetodoPagamento>("update_metodo_pagamento", { id, data }),
  delete: (id: number) => invoke<void>("delete_metodo_pagamento", { id }),
};

// ============================================================
// IMPOSTAZIONI
// ============================================================
export const impostazioniApi = {
  get: (chiave: string) => invoke<string>("get_impostazione", { chiave }),
  set: (chiave: string, valore: string) => invoke<void>("set_impostazione", { chiave, valore }),
  getAll: () => invoke<Record<string, string>>("get_tutte_impostazioni"),
};

// ============================================================
// DASHBOARD
// ============================================================
export const dashboardApi = {
  getStats: (from: string, to: string) => invoke<DashboardStats>("get_stats", { from, to }),
  getMaterialiConsumati: (from: string, to: string) => invoke<MaterialeConsumo[]>("get_materiali_consumati", { from, to }),
  getOrePerStampante: (from: string, to: string) => invoke<StampanteOre[]>("get_ore_per_stampante", { from, to }),
  getTrendFatturato: (from: string, to: string) => invoke<TrendFatturato[]>("get_trend_fatturato", { from, to }),
  getMagazzino: () => invoke<MagazzinoItem[]>("get_magazzino"),
};

// ============================================================
// SLICER
// ============================================================
export const slicerApi = {
  getInfo: () => invoke<SlicerInfo>("get_slicer_info"),
  getProfili: (tipo: "filament" | "machine" | "process") =>
    invoke<SlicerProfile[]>("get_profili_slicer", { tipo }),
  eseguiSlicing: (filePath: string, config: {
    materiale_profilo: string;
    stampante_profilo: string;
    processo_profilo: string;
    supporti_albero: boolean;
    supporti_normali: boolean;
  }) => invoke<SlicerResult>("esegui_slicing", { filePath, config }),
};

// ============================================================
// FILE SYSTEM
// ============================================================
export const filesystemApi = {
  backupDatabase: () => invoke<string>("backup_database"),
  importDatabase: (path: string) => invoke<void>("import_database", { path }),
  exportEntita: (tipo: string) => invoke<string>("export_entita", { tipo }),
  importEntita: (tipo: string, path: string) => invoke<void>("import_entita", { tipo, path }),
};
