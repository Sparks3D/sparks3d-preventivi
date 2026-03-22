use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

mod db;
mod slicer;
mod packlink;
mod preventivi;
mod dashboard;
mod gcode_parser;
mod ritenute;
mod backup;
mod export;
mod search;
mod updater;

pub struct AppState {
    pub db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Azienda {
    pub id: i64, pub ragione_sociale: String, pub indirizzo: String,
    pub cap: String, pub citta: String, pub provincia: String, pub paese: String,
    pub partita_iva: String, pub codice_fiscale: String,
    pub email: String, pub telefono: String, pub logo_path: String,
    pub regime_fiscale: String, pub iva_percentuale: f64,
    pub nota_regime: String, pub prefisso_preventivo: String, pub prossimo_numero: i64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Cliente {
    pub id: i64, pub nome: String, pub cognome: String,
    pub denominazione_azienda: String, pub email: String,
    pub telefono: String, pub indirizzo: String, pub cap: String,
    pub citta: String, pub provincia: String, pub partita_iva: String,
    pub codice_fiscale: String, pub note: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Materiale {
    pub id: i64, pub nome: String, pub profilo_slicer: String,
    pub slicer_origin: String, pub peso_specifico_gcm3: f64,
    pub prezzo_kg: f64, pub markup_percentuale: f64,
    pub fallimento_percentuale: f64, pub magazzino_kg: f64, pub link_acquisto: String,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Stampante {
    pub id: i64, pub nome: String, pub profilo_slicer: String,
    pub slicer_origin: String, pub consumo_kwh: f64, pub ammortamento_ora: f64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfiloStampa {
    pub id: i64, pub nome: String, pub profilo_slicer: String,
    pub slicer_origin: String, pub layer_height_mm: f64,
    pub numero_pareti: i64, pub infill_percentuale: f64,
    pub top_layers: i64, pub bottom_layers: i64,
    pub supporti_albero: bool, pub supporti_normali: bool,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServizioExtra {
    pub id: i64, pub nome: String, pub importo_predefinito: f64,
    pub addebita: bool, pub addebita_senza_costo: bool, pub markup_percentuale: f64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MetodoPagamento {
    pub id: i64, pub nome: String, pub descrizione_pdf: String,
    pub commissione_percentuale: f64, pub commissione_fissa: f64, pub addebita_al_cliente: bool,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Preventivo {
    pub id: i64, pub numero: String, pub cliente_id: Option<i64>,
    pub stato: String, pub data_creazione: String,
    pub markup_globale: f64, pub sconto_globale: f64, pub avvio_macchina: f64,
    pub metodo_pagamento_id: Option<i64>, pub corriere_id: Option<i64>,
    pub acconto_tipo: String, pub acconto_valore: f64,
    pub ritenuta_acconto: bool, pub note: String,
    pub totale_costo: f64, pub totale_cliente: f64, pub totale_profit: f64,
    pub totale_materiale_g: f64, pub totale_tempo_sec: i64, pub totale_finale: f64,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RigaPreventivo {
    pub id: i64, pub preventivo_id: i64,
    pub nome_file: String, pub titolo_visualizzato: String,
    pub stampante_id: Option<i64>, pub profilo_stampa_id: Option<i64>,
    pub quantita: i64, pub is_multicolore: bool,
    pub tempo_stampa_sec: i64, pub peso_totale_grammi: f64,
    pub ingombro_x_mm: f64, pub ingombro_y_mm: f64, pub ingombro_z_mm: f64,
    pub markup_riga: Option<f64>, pub sconto_riga: Option<f64>, pub post_processing: f64,
    pub costo_materiale_totale: f64, pub costo_energia: f64,
    pub costo_ammortamento: f64, pub costo_fallimento: f64,
    pub totale_costo: f64, pub totale_cliente: f64, pub profit: f64,
    pub materiali: Vec<RigaMateriale>,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RigaMateriale {
    pub id: i64, pub riga_preventivo_id: i64,
    pub materiale_id: i64, pub slot_ams: i64,
    pub colore_hex: String, pub peso_grammi: f64, pub percentuale_pezzo: f64,
    pub costo_materiale: f64, pub costo_fallimento: f64,
    pub materiale_nome: Option<String>, pub materiale_prezzo_kg: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct SlicerStatus {
    pub nome: String,
    pub codice: String,  // "bambu", "orca"
    pub installato: bool,
    pub path: Option<String>,
    pub exe_path: Option<String>,
}

// === AZIENDA ===
#[tauri::command]
fn get_azienda(state: State<AppState>) -> Result<Azienda, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.query_row("SELECT id,ragione_sociale,indirizzo,cap,citta,provincia,COALESCE(paese,'IT'),partita_iva,codice_fiscale,email,telefono,logo_path,regime_fiscale,iva_percentuale,nota_regime,prefisso_preventivo,prossimo_numero FROM azienda WHERE id=1", [], |row| Ok(Azienda { id:row.get(0)?,ragione_sociale:row.get(1)?,indirizzo:row.get(2)?,cap:row.get(3)?,citta:row.get(4)?,provincia:row.get(5)?,paese:row.get(6)?,partita_iva:row.get(7)?,codice_fiscale:row.get(8)?,email:row.get(9)?,telefono:row.get(10)?,logo_path:row.get(11)?,regime_fiscale:row.get(12)?,iva_percentuale:row.get(13)?,nota_regime:row.get(14)?,prefisso_preventivo:row.get(15)?,prossimo_numero:row.get(16)? })).map_err(|e| e.to_string()) }
#[tauri::command]
fn update_azienda(state: State<AppState>, data: Azienda) -> Result<Azienda, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE azienda SET ragione_sociale=?1,indirizzo=?2,cap=?3,citta=?4,provincia=?5,paese=?6,partita_iva=?7,codice_fiscale=?8,email=?9,telefono=?10,logo_path=?11,regime_fiscale=?12,iva_percentuale=?13,nota_regime=?14,prefisso_preventivo=?15,prossimo_numero=?16,updated_at=CURRENT_TIMESTAMP WHERE id=1", params![data.ragione_sociale,data.indirizzo,data.cap,data.citta,data.provincia,data.paese,data.partita_iva,data.codice_fiscale,data.email,data.telefono,data.logo_path,data.regime_fiscale,data.iva_percentuale,data.nota_regime,data.prefisso_preventivo,data.prossimo_numero]).map_err(|e| e.to_string())?; Ok(Azienda { id: 1, ..data }) }
#[derive(Debug, Serialize)]
pub struct LogoResult { pub dest_path: String, pub base64_data: String, pub mime_type: String }
#[tauri::command]
fn import_logo(source_path: String) -> Result<LogoResult, String> {
    use std::path::Path;
    use std::fs;
    let source = Path::new(&source_path);
    if !source.exists() { return Err(format!("File non trovato: {}", source_path)); }
    let ext = source.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase();
    let mime_type = match ext.as_str() {
        "jpg"|"jpeg" => "image/jpeg",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => "image/png",
    }.to_string();
    let app_data = dirs::data_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("Sparks3DPreventivi").join("logos");
    fs::create_dir_all(&app_data).map_err(|e| format!("Errore cartella logos: {e}"))?;

    // Elimina tutti i loghi precedenti dalla cartella
    if let Ok(entries) = fs::read_dir(&app_data) {
        for entry in entries.filter_map(|e| e.ok()) {
            let p = entry.path();
            if p.is_file() {
                let _ = fs::remove_file(&p);
            }
        }
    }

    let dest = app_data.join(source.file_name().and_then(|n| n.to_str()).unwrap_or("logo.png"));
    fs::copy(source, &dest).map_err(|e| format!("Errore copia: {e}"))?;
    let bytes = fs::read(&dest).map_err(|e| format!("Errore lettura: {e}"))?;
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(LogoResult {
        dest_path: dest.to_string_lossy().to_string(),
        base64_data: format!("data:{};base64,{}", mime_type, b64),
        mime_type,
    })
}
#[tauri::command]
fn load_logo_preview(logo_path: String) -> Result<String, String> { use std::path::Path; use std::fs; let path = Path::new(&logo_path); if !path.exists() { return Err("File logo non trovato".into()); } let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("png").to_lowercase(); let mime = match ext.as_str() { "jpg"|"jpeg"=>"image/jpeg","svg"=>"image/svg+xml","webp"=>"image/webp",_=>"image/png" }; let bytes = fs::read(path).map_err(|e| format!("Errore lettura: {e}"))?; use base64::Engine; Ok(format!("data:{};base64,{}", mime, base64::engine::general_purpose::STANDARD.encode(&bytes))) }

// === CLIENTI ===
#[tauri::command]
fn get_clienti(state: State<AppState>) -> Result<Vec<Cliente>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,nome,cognome,denominazione_azienda,email,telefono,indirizzo,cap,citta,provincia,partita_iva,codice_fiscale,note FROM clienti ORDER BY COALESCE(NULLIF(denominazione_azienda,''), nome, cognome)").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(Cliente { id:row.get(0)?,nome:row.get(1)?,cognome:row.get(2)?,denominazione_azienda:row.get(3)?,email:row.get(4)?,telefono:row.get(5)?,indirizzo:row.get(6)?,cap:row.get(7)?,citta:row.get(8)?,provincia:row.get(9)?,partita_iva:row.get(10)?,codice_fiscale:row.get(11)?,note:row.get(12)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn get_cliente(state: State<AppState>, id: i64) -> Result<Cliente, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.query_row("SELECT id,nome,cognome,denominazione_azienda,email,telefono,indirizzo,cap,citta,provincia,partita_iva,codice_fiscale,note FROM clienti WHERE id=?1", params![id], |row| Ok(Cliente { id:row.get(0)?,nome:row.get(1)?,cognome:row.get(2)?,denominazione_azienda:row.get(3)?,email:row.get(4)?,telefono:row.get(5)?,indirizzo:row.get(6)?,cap:row.get(7)?,citta:row.get(8)?,provincia:row.get(9)?,partita_iva:row.get(10)?,codice_fiscale:row.get(11)?,note:row.get(12)? })).map_err(|e| e.to_string()) }
#[tauri::command]
fn create_cliente(state: State<AppState>, data: Cliente) -> Result<Cliente, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT INTO clienti (nome,cognome,denominazione_azienda,email,telefono,indirizzo,cap,citta,provincia,partita_iva,codice_fiscale,note) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)", params![data.nome,data.cognome,data.denominazione_azienda,data.email,data.telefono,data.indirizzo,data.cap,data.citta,data.provincia,data.partita_iva,data.codice_fiscale,data.note]).map_err(|e| e.to_string())?; Ok(Cliente { id: db.last_insert_rowid(), ..data }) }
#[tauri::command]
fn update_cliente(state: State<AppState>, id: i64, data: Cliente) -> Result<Cliente, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE clienti SET nome=?1,cognome=?2,denominazione_azienda=?3,email=?4,telefono=?5,indirizzo=?6,cap=?7,citta=?8,provincia=?9,partita_iva=?10,codice_fiscale=?11,note=?12,updated_at=CURRENT_TIMESTAMP WHERE id=?13", params![data.nome,data.cognome,data.denominazione_azienda,data.email,data.telefono,data.indirizzo,data.cap,data.citta,data.provincia,data.partita_iva,data.codice_fiscale,data.note,id]).map_err(|e| e.to_string())?; Ok(Cliente { id, ..data }) }
#[tauri::command]
fn delete_cliente(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM clienti WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === MATERIALI ===
#[tauri::command]
fn get_materiali(state: State<AppState>) -> Result<Vec<Materiale>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,nome,profilo_slicer,slicer_origin,peso_specifico_gcm3,prezzo_kg,markup_percentuale,fallimento_percentuale,magazzino_kg,link_acquisto FROM materiali ORDER BY nome").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(Materiale { id:row.get(0)?,nome:row.get(1)?,profilo_slicer:row.get(2)?,slicer_origin:row.get(3)?,peso_specifico_gcm3:row.get(4)?,prezzo_kg:row.get(5)?,markup_percentuale:row.get(6)?,fallimento_percentuale:row.get(7)?,magazzino_kg:row.get(8)?,link_acquisto:row.get(9)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn create_materiale(state: State<AppState>, data: Materiale) -> Result<Materiale, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT INTO materiali (nome,profilo_slicer,slicer_origin,peso_specifico_gcm3,prezzo_kg,markup_percentuale,fallimento_percentuale,magazzino_kg,link_acquisto) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)", params![data.nome,data.profilo_slicer,data.slicer_origin,data.peso_specifico_gcm3,data.prezzo_kg,data.markup_percentuale,data.fallimento_percentuale,data.magazzino_kg,data.link_acquisto]).map_err(|e| e.to_string())?; Ok(Materiale { id: db.last_insert_rowid(), ..data }) }
#[tauri::command]
fn update_materiale(state: State<AppState>, id: i64, data: Materiale) -> Result<Materiale, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE materiali SET nome=?1,profilo_slicer=?2,slicer_origin=?3,peso_specifico_gcm3=?4,prezzo_kg=?5,markup_percentuale=?6,fallimento_percentuale=?7,magazzino_kg=?8,link_acquisto=?9 WHERE id=?10", params![data.nome,data.profilo_slicer,data.slicer_origin,data.peso_specifico_gcm3,data.prezzo_kg,data.markup_percentuale,data.fallimento_percentuale,data.magazzino_kg,data.link_acquisto,id]).map_err(|e| e.to_string())?; Ok(Materiale { id, ..data }) }
#[tauri::command]
fn delete_materiale(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM materiali WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === STAMPANTI ===
#[tauri::command]
fn get_stampanti(state: State<AppState>) -> Result<Vec<Stampante>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,nome,profilo_slicer,slicer_origin,consumo_kwh,ammortamento_ora FROM stampanti ORDER BY nome").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(Stampante { id:row.get(0)?,nome:row.get(1)?,profilo_slicer:row.get(2)?,slicer_origin:row.get(3)?,consumo_kwh:row.get(4)?,ammortamento_ora:row.get(5)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn create_stampante(state: State<AppState>, data: Stampante) -> Result<Stampante, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT INTO stampanti (nome,profilo_slicer,slicer_origin,consumo_kwh,ammortamento_ora) VALUES (?1,?2,?3,?4,?5)", params![data.nome,data.profilo_slicer,data.slicer_origin,data.consumo_kwh,data.ammortamento_ora]).map_err(|e| e.to_string())?; Ok(Stampante { id: db.last_insert_rowid(), ..data }) }
#[tauri::command]
fn update_stampante(state: State<AppState>, id: i64, data: Stampante) -> Result<Stampante, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE stampanti SET nome=?1,profilo_slicer=?2,slicer_origin=?3,consumo_kwh=?4,ammortamento_ora=?5 WHERE id=?6", params![data.nome,data.profilo_slicer,data.slicer_origin,data.consumo_kwh,data.ammortamento_ora,id]).map_err(|e| e.to_string())?; Ok(Stampante { id, ..data }) }
#[tauri::command]
fn delete_stampante(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM stampanti WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === PROFILI ===
#[tauri::command]
fn get_profili(state: State<AppState>) -> Result<Vec<ProfiloStampa>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,nome,profilo_slicer,slicer_origin,layer_height_mm,numero_pareti,infill_percentuale,top_layers,bottom_layers,supporti_albero,supporti_normali FROM profili_stampa ORDER BY nome").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(ProfiloStampa { id:row.get(0)?,nome:row.get(1)?,profilo_slicer:row.get(2)?,slicer_origin:row.get(3)?,layer_height_mm:row.get(4)?,numero_pareti:row.get(5)?,infill_percentuale:row.get(6)?,top_layers:row.get(7)?,bottom_layers:row.get(8)?,supporti_albero:row.get(9)?,supporti_normali:row.get(10)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn create_profilo(state: State<AppState>, data: ProfiloStampa) -> Result<ProfiloStampa, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT INTO profili_stampa (nome,profilo_slicer,slicer_origin,layer_height_mm,numero_pareti,infill_percentuale,top_layers,bottom_layers,supporti_albero,supporti_normali) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)", params![data.nome,data.profilo_slicer,data.slicer_origin,data.layer_height_mm,data.numero_pareti,data.infill_percentuale,data.top_layers,data.bottom_layers,data.supporti_albero,data.supporti_normali]).map_err(|e| e.to_string())?; Ok(ProfiloStampa { id: db.last_insert_rowid(), ..data }) }
#[tauri::command]
fn update_profilo(state: State<AppState>, id: i64, data: ProfiloStampa) -> Result<ProfiloStampa, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE profili_stampa SET nome=?1,profilo_slicer=?2,slicer_origin=?3,layer_height_mm=?4,numero_pareti=?5,infill_percentuale=?6,top_layers=?7,bottom_layers=?8,supporti_albero=?9,supporti_normali=?10 WHERE id=?11", params![data.nome,data.profilo_slicer,data.slicer_origin,data.layer_height_mm,data.numero_pareti,data.infill_percentuale,data.top_layers,data.bottom_layers,data.supporti_albero,data.supporti_normali,id]).map_err(|e| e.to_string())?; Ok(ProfiloStampa { id, ..data }) }
#[tauri::command]
fn delete_profilo(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM profili_stampa WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === SERVIZI EXTRA ===
#[tauri::command]
fn get_servizi_extra(state: State<AppState>) -> Result<Vec<ServizioExtra>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,nome,importo_predefinito,addebita,COALESCE(addebita_senza_costo,0),markup_percentuale FROM servizi_extra ORDER BY nome").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(ServizioExtra { id:row.get(0)?,nome:row.get(1)?,importo_predefinito:row.get(2)?,addebita:row.get(3)?,addebita_senza_costo:row.get(4)?,markup_percentuale:row.get(5)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn create_servizio_extra(state: State<AppState>, data: ServizioExtra) -> Result<ServizioExtra, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT INTO servizi_extra (nome,importo_predefinito,addebita,addebita_senza_costo,markup_percentuale) VALUES (?1,?2,?3,?4,?5)", params![data.nome,data.importo_predefinito,data.addebita,data.addebita_senza_costo,data.markup_percentuale]).map_err(|e| e.to_string())?; Ok(ServizioExtra { id: db.last_insert_rowid(), ..data }) }
#[tauri::command]
fn update_servizio_extra(state: State<AppState>, id: i64, data: ServizioExtra) -> Result<ServizioExtra, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE servizi_extra SET nome=?1,importo_predefinito=?2,addebita=?3,addebita_senza_costo=?4,markup_percentuale=?5 WHERE id=?6", params![data.nome,data.importo_predefinito,data.addebita,data.addebita_senza_costo,data.markup_percentuale,id]).map_err(|e| e.to_string())?; Ok(ServizioExtra { id, ..data }) }
#[tauri::command]
fn delete_servizio_extra(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM servizi_extra WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === METODI PAGAMENTO ===
#[tauri::command]
fn get_metodi_pagamento(state: State<AppState>) -> Result<Vec<MetodoPagamento>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,nome,COALESCE(descrizione_pdf,''),COALESCE(commissione_percentuale,0.0),COALESCE(commissione_fissa,0.0),COALESCE(addebita_al_cliente,0) FROM metodi_pagamento ORDER BY nome").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(MetodoPagamento { id:row.get(0)?,nome:row.get(1)?,descrizione_pdf:row.get(2)?,commissione_percentuale:row.get(3)?,commissione_fissa:row.get(4)?,addebita_al_cliente:row.get(5)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn create_metodo_pagamento(state: State<AppState>, data: MetodoPagamento) -> Result<MetodoPagamento, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT INTO metodi_pagamento (nome,descrizione_pdf,commissione_percentuale,commissione_fissa,addebita_al_cliente) VALUES (?1,?2,?3,?4,?5)", params![data.nome,data.descrizione_pdf,data.commissione_percentuale,data.commissione_fissa,data.addebita_al_cliente]).map_err(|e| e.to_string())?; Ok(MetodoPagamento { id: db.last_insert_rowid(), ..data }) }
#[tauri::command]
fn update_metodo_pagamento(state: State<AppState>, id: i64, data: MetodoPagamento) -> Result<MetodoPagamento, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("UPDATE metodi_pagamento SET nome=?1,descrizione_pdf=?2,commissione_percentuale=?3,commissione_fissa=?4,addebita_al_cliente=?5 WHERE id=?6", params![data.nome,data.descrizione_pdf,data.commissione_percentuale,data.commissione_fissa,data.addebita_al_cliente,id]).map_err(|e| e.to_string())?; Ok(MetodoPagamento { id, ..data }) }
#[tauri::command]
fn delete_metodo_pagamento(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM metodi_pagamento WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === IMPOSTAZIONI ===
#[tauri::command]
fn get_impostazione(state: State<AppState>, chiave: String) -> Result<String, String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.query_row("SELECT valore FROM impostazioni WHERE chiave=?1", params![chiave], |row| row.get(0)).map_err(|e| e.to_string()) }
#[tauri::command]
fn set_impostazione(state: State<AppState>, chiave: String, valore: String) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("INSERT OR REPLACE INTO impostazioni (chiave,valore) VALUES (?1,?2)", params![chiave,valore]).map_err(|e| e.to_string())?; Ok(()) }

// === PREVENTIVI (semplici) ===
#[tauri::command]
fn get_preventivi(state: State<AppState>) -> Result<Vec<Preventivo>, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let mut stmt = db.prepare("SELECT id,numero,cliente_id,stato,data_creazione,markup_globale,sconto_globale,avvio_macchina,metodo_pagamento_id,corriere_id,acconto_tipo,acconto_valore,ritenuta_acconto,note,totale_costo,totale_cliente,totale_profit,totale_materiale_g,totale_tempo_sec,totale_finale FROM preventivi ORDER BY data_creazione DESC").map_err(|e| e.to_string())?; let items = stmt.query_map([], |row| Ok(Preventivo { id:row.get(0)?,numero:row.get(1)?,cliente_id:row.get(2)?,stato:row.get(3)?,data_creazione:row.get(4)?,markup_globale:row.get(5)?,sconto_globale:row.get(6)?,avvio_macchina:row.get(7)?,metodo_pagamento_id:row.get(8)?,corriere_id:row.get(9)?,acconto_tipo:row.get::<_,String>(10)?,acconto_valore:row.get(11)?,ritenuta_acconto:row.get(12)?,note:row.get(13)?,totale_costo:row.get(14)?,totale_cliente:row.get(15)?,totale_profit:row.get(16)?,totale_materiale_g:row.get(17)?,totale_tempo_sec:row.get(18)?,totale_finale:row.get(19)? })).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect(); Ok(items) }
#[tauri::command]
fn create_preventivo(state: State<AppState>) -> Result<Preventivo, String> { let db = state.db.lock().map_err(|e| e.to_string())?; let (prefix, next_num): (String, i64) = db.query_row("SELECT prefisso_preventivo,prossimo_numero FROM azienda WHERE id=1", [], |row| Ok((row.get(0)?,row.get(1)?))).map_err(|e| e.to_string())?; let numero = format!("{}-{}", prefix, next_num); db.execute("INSERT INTO preventivi (numero,stato) VALUES (?1,'bozza')", params![numero]).map_err(|e| e.to_string())?; let id = db.last_insert_rowid(); db.execute("UPDATE azienda SET prossimo_numero=prossimo_numero+1 WHERE id=1", []).map_err(|e| e.to_string())?; Ok(Preventivo { id, numero, cliente_id:None, stato:"bozza".into(), data_creazione:chrono::Local::now().format("%Y-%m-%d").to_string(), markup_globale:0.0,sconto_globale:0.0,avvio_macchina:0.0, metodo_pagamento_id:None,corriere_id:None, acconto_tipo:String::new(),acconto_valore:0.0,ritenuta_acconto:false,note:String::new(), totale_costo:0.0,totale_cliente:0.0,totale_profit:0.0,totale_materiale_g:0.0,totale_tempo_sec:0,totale_finale:0.0 }) }
#[tauri::command]
fn delete_preventivo(state: State<AppState>, id: i64) -> Result<(), String> { let db = state.db.lock().map_err(|e| e.to_string())?; db.execute("DELETE FROM preventivi WHERE id=?1", params![id]).map_err(|e| e.to_string())?; Ok(()) }

// === SLICER ===
#[tauri::command]
fn get_slicer_info(is_beta: bool) -> Result<slicer::SlicerInfoResult, String> { Ok(slicer::get_info(is_beta)) }
#[tauri::command]
fn scan_slicer_profiles(tipo: String, is_beta: bool, solo_utente: bool, slicer_type: Option<String>) -> Result<Vec<slicer::SlicerProfileEntry>, String> {
    let st = slicer_type.as_deref().unwrap_or("bambu");
    match slicer::SlicerType::from_str(st) {
        Some(s) => Ok(slicer::scan_profiles_for(s, &tipo, is_beta, solo_utente)),
        None => Ok(slicer::scan_profiles(&tipo, is_beta, solo_utente)),
    }
}

// === VERSIONE APP ===
#[tauri::command]
fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// === SLICER STATUS (rilevamento installazione multi-slicer) ===
#[tauri::command]
fn check_slicer_status() -> Result<Vec<SlicerStatus>, String> {
    let appdata = std::env::var("APPDATA").unwrap_or_default();
    let mut slicers = Vec::new();

    // --- Bambu Studio ---
    let bambu_path = std::path::Path::new(&appdata).join("BambuStudio");
    let bambu_installato = bambu_path.exists() && bambu_path.is_dir();
    let bambu_exe = if bambu_installato {
        vec![
            std::path::PathBuf::from(r"C:\Program Files\Bambu Studio\bambu-studio.exe"),
            std::path::PathBuf::from(r"C:\Program Files (x86)\Bambu Studio\bambu-studio.exe"),
            {
                let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
                std::path::Path::new(&local).join("BambuStudio").join("bambu-studio.exe")
            },
        ].into_iter().find(|p| p.exists()).map(|p| p.to_string_lossy().to_string())
    } else { None };
    slicers.push(SlicerStatus {
        nome: "Bambu Studio".to_string(),
        codice: "bambu".to_string(),
        installato: bambu_installato,
        path: if bambu_installato { Some(bambu_path.to_string_lossy().to_string()) } else { None },
        exe_path: bambu_exe,
    });

    // --- Orca Slicer ---
    let orca_dir_names = ["OrcaSlicer", "Orca Slicer"];
    let mut orca_path_found: Option<std::path::PathBuf> = None;
    for name in &orca_dir_names {
        let p = std::path::Path::new(&appdata).join(name);
        if p.exists() && p.is_dir() { orca_path_found = Some(p); break; }
    }
    let orca_installato = orca_path_found.is_some();
    let orca_exe = if orca_installato {
        vec![
            std::path::PathBuf::from(r"C:\Program Files\OrcaSlicer\orca-slicer.exe"),
            std::path::PathBuf::from(r"C:\Program Files\OrcaSlicer\OrcaSlicer.exe"),
            std::path::PathBuf::from(r"C:\Program Files (x86)\OrcaSlicer\orca-slicer.exe"),
            std::path::PathBuf::from(r"C:\Program Files\Orca Slicer\orca-slicer.exe"),
        ].into_iter().find(|p| p.exists()).map(|p| p.to_string_lossy().to_string())
    } else { None };
    slicers.push(SlicerStatus {
        nome: "Orca Slicer".to_string(),
        codice: "orca".to_string(),
        installato: orca_installato,
        path: orca_path_found.map(|p| p.to_string_lossy().to_string()),
        exe_path: orca_exe,
    });

    // --- Anycubic Slicer Next ---
    let anycubic_dir_names = ["AnycubicSlicerNext", "Anycubic Slicer Next"];
    let mut anycubic_path_found: Option<std::path::PathBuf> = None;
    for name in &anycubic_dir_names {
        let p = std::path::Path::new(&appdata).join(name);
        if p.exists() && p.is_dir() { anycubic_path_found = Some(p); break; }
    }
    let anycubic_installato = anycubic_path_found.is_some();
    let anycubic_exe = if anycubic_installato {
        vec![
            std::path::PathBuf::from(r"C:\Program Files\AnycubicSlicerNext\AnycubicSlicerNext.exe"),
            std::path::PathBuf::from(r"C:\Program Files\AnycubicSlicerNext\anycubic-slicer-next.exe"),
            std::path::PathBuf::from(r"C:\Program Files (x86)\AnycubicSlicerNext\AnycubicSlicerNext.exe"),
            std::path::PathBuf::from(r"C:\Program Files\Anycubic Slicer Next\AnycubicSlicerNext.exe"),
        ].into_iter().find(|p| p.exists()).map(|p| p.to_string_lossy().to_string())
    } else { None };
    slicers.push(SlicerStatus {
        nome: "Anycubic Slicer Next".to_string(),
        codice: "anycubic".to_string(),
        installato: anycubic_installato,
        path: anycubic_path_found.map(|p| p.to_string_lossy().to_string()),
        exe_path: anycubic_exe,
    });

    Ok(slicers)
}

#[tauri::command]
fn open_slicer(slicer_code: Option<String>) -> Result<String, String> {
    let code = slicer_code.as_deref().unwrap_or("bambu");
    let (candidates, label): (Vec<std::path::PathBuf>, &str) = match code {
        "orca" => (vec![
            std::path::PathBuf::from(r"C:\Program Files\OrcaSlicer\orca-slicer.exe"),
            std::path::PathBuf::from(r"C:\Program Files\OrcaSlicer\OrcaSlicer.exe"),
            std::path::PathBuf::from(r"C:\Program Files (x86)\OrcaSlicer\orca-slicer.exe"),
            std::path::PathBuf::from(r"C:\Program Files\Orca Slicer\orca-slicer.exe"),
        ], "Orca Slicer"),
        "anycubic" => (vec![
            std::path::PathBuf::from(r"C:\Program Files\AnycubicSlicerNext\AnycubicSlicerNext.exe"),
            std::path::PathBuf::from(r"C:\Program Files\AnycubicSlicerNext\anycubic-slicer-next.exe"),
            std::path::PathBuf::from(r"C:\Program Files (x86)\AnycubicSlicerNext\AnycubicSlicerNext.exe"),
            std::path::PathBuf::from(r"C:\Program Files\Anycubic Slicer Next\AnycubicSlicerNext.exe"),
        ], "Anycubic Slicer Next"),
        _ => (vec![
            std::path::PathBuf::from(r"C:\Program Files\Bambu Studio\bambu-studio.exe"),
            std::path::PathBuf::from(r"C:\Program Files (x86)\Bambu Studio\bambu-studio.exe"),
            {
                let local = std::env::var("LOCALAPPDATA").unwrap_or_default();
                std::path::Path::new(&local).join("BambuStudio").join("bambu-studio.exe")
            },
        ], "Bambu Studio"),
    };

    if let Some(exe) = candidates.iter().find(|p| p.exists()) {
        std::process::Command::new(exe)
            .spawn()
            .map_err(|e| format!("Errore avvio {}: {}", label, e))?;
        Ok(exe.to_string_lossy().to_string())
    } else {
        Err(format!("Eseguibile {} non trovato. Verifica l'installazione.", label))
    }
}

// === RESET DATABASE ===
#[derive(Debug, Serialize)]
pub struct ResetResult {
    pub success: bool,
    pub messaggio: String,
    pub preventivi_rimossi: i64,
    pub clienti_rimossi: i64,
    pub materiali_rimossi: i64,
    pub stampanti_rimosse: i64,
    pub profili_rimossi: i64,
}

#[tauri::command]
fn reset_database(state: State<AppState>, reset_preventivi: bool, reset_clienti: bool, reset_catalogo: bool, reset_impostazioni: bool) -> Result<ResetResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut prev_del: i64 = 0;
    let mut cli_del: i64 = 0;
    let mut mat_del: i64 = 0;
    let mut sta_del: i64 = 0;
    let mut pro_del: i64 = 0;

    if reset_preventivi {
        prev_del = db.query_row("SELECT COUNT(*) FROM preventivi", [], |r| r.get(0)).unwrap_or(0);
        // Singole query — se una tabella non esiste non blocca le altre
        let _ = db.execute("DELETE FROM riga_materiali", []);
        let _ = db.execute("DELETE FROM righe_preventivo", []);
        let _ = db.execute("DELETE FROM servizi_preventivo", []);
        let _ = db.execute("DELETE FROM preventivo_servizi", []);
        let _ = db.execute("DELETE FROM preventivi", []);
        let _ = db.execute("DELETE FROM ritenute", []);
    }

    if reset_clienti {
        cli_del = db.query_row("SELECT COUNT(*) FROM clienti", [], |r| r.get(0)).unwrap_or(0);
        let _ = db.execute("DELETE FROM clienti", []);
    }

    if reset_catalogo {
        mat_del = db.query_row("SELECT COUNT(*) FROM materiali", [], |r| r.get(0)).unwrap_or(0);
        sta_del = db.query_row("SELECT COUNT(*) FROM stampanti", [], |r| r.get(0)).unwrap_or(0);
        pro_del = db.query_row("SELECT COUNT(*) FROM profili_stampa", [], |r| r.get(0)).unwrap_or(0);
        let _ = db.execute("DELETE FROM materiali", []);
        let _ = db.execute("DELETE FROM stampanti", []);
        let _ = db.execute("DELETE FROM profili_stampa", []);
        let _ = db.execute("DELETE FROM servizi_extra", []);
        let _ = db.execute("DELETE FROM metodi_pagamento", []);
        let _ = db.execute("DELETE FROM corrieri", []);
    }

    if reset_impostazioni {
        // Reset dati azienda ai valori vuoti, mantieni la riga
        db.execute(
            "UPDATE azienda SET ragione_sociale='', indirizzo='', cap='', citta='', provincia='', paese='IT', partita_iva='', codice_fiscale='', email='', telefono='', logo_path='', regime_fiscale='forfettario', iva_percentuale=0.0, nota_regime='', prefisso_preventivo='PRV', prossimo_numero=1 WHERE id=1",
            [],
        ).map_err(|e| e.to_string())?;
        // Pulisci impostazioni tranne ui_settings
        db.execute("DELETE FROM impostazioni WHERE chiave != 'ui_settings'", []).map_err(|e| e.to_string())?;
        // Pulisci loghi
        let app_data = dirs::data_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("Sparks3DPreventivi").join("logos");
        if app_data.exists() {
            if let Ok(entries) = std::fs::read_dir(&app_data) {
                for entry in entries.filter_map(|e| e.ok()) {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }

    // VACUUM per liberare spazio
    let _ = db.execute_batch("VACUUM;");

    let tot = prev_del + cli_del + mat_del + sta_del + pro_del;
    Ok(ResetResult {
        success: true,
        messaggio: format!("Reset completato. {} elementi rimossi.", tot),
        preventivi_rimossi: prev_del,
        clienti_rimossi: cli_del,
        materiali_rimossi: mat_del,
        stampanti_rimosse: sta_del,
        profili_rimossi: pro_del,
    })
}

// === ENTRY POINT ===
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Controlla se c'è un ripristino DB in attesa dal backup
    db::apply_pending_restore();

    let db_path = db::get_db_path();
    let conn = Connection::open(&db_path).expect("Impossibile aprire il database");
    db::init_schema(&conn).expect("Impossibile inizializzare lo schema");
    let state = AppState { db: Mutex::new(conn) };
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(state)
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                use tauri::Manager;
                let sleep = |ms: u64| std::thread::sleep(std::time::Duration::from_millis(ms));

                // Helper: esegue JS direttamente nella finestra splash
                let update_splash = |pct: u32, msg: &str, det: Option<String>| {
                    if let Some(splash) = handle.get_webview_window("splash") {
                        let det_js = match &det {
                            Some(d) => format!("'{}'", d.replace('\'', "\\'")),
                            None => "null".to_string(),
                        };
                        let js = format!(
                            "if(typeof updateProgress==='function')updateProgress({},\"{}\",{})",
                            pct, msg.replace('"', "\\\""), det_js
                        );
                        let _ = splash.eval(&js);
                    }
                };

                // ══════════════════════════════════════════════════
                // FASE 1: Raccogli TUTTI i dati (istantaneo)
                // ══════════════════════════════════════════════════
                let db_ok = handle.state::<AppState>().db.lock().is_ok();

                let (n_mat, n_stamp, n_prof, n_prev) = {
                    if let Ok(db) = handle.state::<AppState>().db.lock() {
                        let mat: i64 = db.query_row("SELECT COUNT(*) FROM materiali", [], |r| r.get(0)).unwrap_or(0);
                        let sta: i64 = db.query_row("SELECT COUNT(*) FROM stampanti", [], |r| r.get(0)).unwrap_or(0);
                        let pro: i64 = db.query_row("SELECT COUNT(*) FROM profili_stampa", [], |r| r.get(0)).unwrap_or(0);
                        let pre: i64 = db.query_row("SELECT COUNT(*) FROM preventivi", [], |r| r.get::<_,i64>(0)).unwrap_or(0);
                        (mat, sta, pro, pre)
                    } else { (0, 0, 0, 0) }
                };

                let appdata = std::env::var("APPDATA").unwrap_or_default();
                let bambu_path = std::path::Path::new(&appdata).join("BambuStudio");
                let bambu_ok = bambu_path.exists() && bambu_path.is_dir();
                let orca_candidates = ["OrcaSlicer", "Orca Slicer"];
                let orca_ok = orca_candidates.iter().any(|name| {
                    std::path::Path::new(&appdata).join(name).is_dir()
                });
                let anycubic_candidates = ["AnycubicSlicerNext", "Anycubic Slicer Next"];
                let anycubic_ok = anycubic_candidates.iter().any(|name| {
                    std::path::Path::new(&appdata).join(name).is_dir()
                });

                // ══════════════════════════════════════════════════
                // FASE 2: Attendi che lo splash sia pronto
                // ══════════════════════════════════════════════════
                for _ in 0..30 {
                    sleep(100);
                    if let Some(splash) = handle.get_webview_window("splash") {
                        if splash.eval("window.__splashOk=typeof updateProgress==='function'").is_ok() {
                            break;
                        }
                    }
                }
                // Pausa extra per assicurarsi che il DOM sia renderizzato
                sleep(5000);

                // Invia la versione allo splash
                if let Some(splash) = handle.get_webview_window("splash") {
                    let ver = env!("CARGO_PKG_VERSION");
                    let _ = splash.eval(&format!("if(typeof setVersion==='function')setVersion('{}')", ver));
                }
                sleep(300);

                // ══════════════════════════════════════════════════
                // FASE 3: Mostra avanzamento (solo visual, dati già pronti)
                // ══════════════════════════════════════════════════

                update_splash(15, "Database inizializzato",
                    Some(if db_ok { "Connessione OK".into() } else { "Errore connessione".into() }));
                sleep(1500);

                update_splash(35, "Caricamento dati...", None);
                sleep(1200);

                update_splash(50, "Dati caricati",
                    Some(format!("{} materiali · {} stampanti · {} profili", n_mat, n_stamp, n_prof)));
                sleep(1500);

                update_splash(65, "Archivio preventivi",
                    Some(format!("{} preventivi in archivio", n_prev)));
                sleep(1500);

                update_splash(80, "Verifica slicer installati...", None);
                sleep(1200);

                update_splash(90, "Slicer verificati",
                    Some({
                        let mut parts = Vec::new();
                        if bambu_ok { parts.push("Bambu Studio ✓"); }
                        if orca_ok { parts.push("Orca Slicer ✓"); }
                        if anycubic_ok { parts.push("Anycubic Slicer ✓"); }
                        if parts.is_empty() { "Nessuno slicer rilevato".to_string() }
                        else { parts.join(" · ") }
                    }));
                sleep(1500);

                update_splash(95, "Preparazione interfaccia...", None);
                sleep(1200);

                update_splash(100, "Pronto!", None);
                sleep(1500);

                // Mostra finestra principale e chiudi splash
                if let Some(main_win) = handle.get_webview_window("main") {
                    let _ = main_win.show();
                    let _ = main_win.set_focus();
                }
                if let Some(splash_win) = handle.get_webview_window("splash") {
                    let _ = splash_win.close();
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_azienda, update_azienda, import_logo, load_logo_preview,
            get_clienti, get_cliente, create_cliente, update_cliente, delete_cliente,
            get_materiali, create_materiale, update_materiale, delete_materiale,
            get_stampanti, create_stampante, update_stampante, delete_stampante,
            get_profili, create_profilo, update_profilo, delete_profilo,
            get_servizi_extra, create_servizio_extra, update_servizio_extra, delete_servizio_extra,
            get_metodi_pagamento, create_metodo_pagamento, update_metodo_pagamento, delete_metodo_pagamento,
            get_impostazione, set_impostazione,
            get_preventivi, create_preventivo, delete_preventivo,
            preventivi::get_preventivi_list, preventivi::get_preventivo_completo,
            preventivi::update_preventivo, preventivi::update_stato_preventivo,
            preventivi::add_riga_preventivo, preventivi::update_riga_preventivo,
            preventivi::delete_riga_preventivo, preventivi::set_riga_materiali,
            preventivi::ricalcola_preventivo, preventivi::duplica_preventivo,
            preventivi::add_servizio_preventivo, preventivi::remove_servizio_preventivo,
            dashboard::get_dashboard_stats,
            packlink::get_corrieri, packlink::create_corriere,
            packlink::update_corriere, packlink::delete_corriere,
            packlink::get_tariffe_corrieri,
            gcode_parser::parse_slice_file,
            ritenute::get_documents_folder, ritenute::save_pdf_to_documents,
            ritenute::open_file_in_explorer, ritenute::open_pdf_file,
            ritenute::get_ritenute, ritenute::create_ritenuta,
            ritenute::delete_ritenuta, ritenute::get_prossimo_numero_ritenuta,
            backup::get_backup_info, backup::create_backup, backup::restore_backup,
            export::export_data,
            search::global_search,
            updater::check_for_updates,
            get_slicer_info, scan_slicer_profiles,
            check_slicer_status,
            open_slicer,
            reset_database,
            get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("Errore avvio applicazione");
}
