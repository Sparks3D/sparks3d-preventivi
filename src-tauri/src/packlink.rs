// ============================================================
// packlink.rs — Modulo PackLink Pro + Corrieri CRUD
// Copiare in src-tauri/src/packlink.rs
// ============================================================

use reqwest::header::{HeaderMap, AUTHORIZATION};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;

// ══════════════════════════════════════════════════════════════
//  CORRIERI CRUD
// ══════════════════════════════════════════════════════════════

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Corriere {
    pub id: i64,
    pub nome: String,
    pub servizio: String,
    pub costo_spedizione: f64,
    pub tempo_consegna: String,
    pub packlink_service_id: String,
    pub note: String,
}

#[tauri::command]
pub fn get_corrieri(state: State<AppState>) -> Result<Vec<Corriere>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, nome, COALESCE(servizio,''), costo_spedizione,
                COALESCE(tempo_consegna,''), COALESCE(packlink_service_id,''),
                COALESCE(note,'')
         FROM corrieri ORDER BY nome"
    ).map_err(|e| e.to_string())?;
    let items = stmt.query_map([], |row| {
        Ok(Corriere {
            id: row.get(0)?, nome: row.get(1)?, servizio: row.get(2)?,
            costo_spedizione: row.get(3)?, tempo_consegna: row.get(4)?,
            packlink_service_id: row.get(5)?, note: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(items)
}

#[tauri::command]
pub fn create_corriere(state: State<AppState>, data: Corriere) -> Result<Corriere, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO corrieri (nome, servizio, costo_spedizione, tempo_consegna,
         packlink_service_id, note) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![data.nome, data.servizio, data.costo_spedizione,
                data.tempo_consegna, data.packlink_service_id, data.note],
    ).map_err(|e| e.to_string())?;
    Ok(Corriere { id: db.last_insert_rowid(), ..data })
}

#[tauri::command]
pub fn update_corriere(state: State<AppState>, id: i64, data: Corriere) -> Result<Corriere, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "UPDATE corrieri SET nome=?1, servizio=?2, costo_spedizione=?3,
         tempo_consegna=?4, packlink_service_id=?5, note=?6 WHERE id=?7",
        params![data.nome, data.servizio, data.costo_spedizione,
                data.tempo_consegna, data.packlink_service_id, data.note, id],
    ).map_err(|e| e.to_string())?;
    Ok(Corriere { id, ..data })
}

#[tauri::command]
pub fn delete_corriere(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM corrieri WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ══════════════════════════════════════════════════════════════
//  PACKLINK PRO — Ricerca tariffe live
// ══════════════════════════════════════════════════════════════

#[derive(Debug, Deserialize)]
pub struct PaccoDimensioni {
    pub peso_kg: f64,
    pub lunghezza_cm: f64,
    pub larghezza_cm: f64,
    pub altezza_cm: f64,
}

#[derive(Debug, Deserialize)]
pub struct RichiestaSpedizione {
    pub pacco: PaccoDimensioni,
    pub cap_destinatario: String,
    pub paese_destinatario: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct ServizioCorrere {
    pub id: String,
    pub nome_corriere: String,
    pub nome_servizio: String,
    pub prezzo_totale: f64,
    pub prezzo_base: f64,
    pub prezzo_iva: f64,
    pub valuta: String,
    pub tempo_transito: String,
    pub ore_transito: Option<i32>,
    pub categoria: String,
    pub data_consegna_stimata: String,
    pub logo_url: Option<String>,
    pub drop_off: bool,
    pub consegna_punto_ritiro: bool,
    pub dimensioni_max: String,
}

#[derive(Debug, Serialize)]
pub struct RispostaSpedizione {
    pub servizi: Vec<ServizioCorrere>,
    pub errore: Option<String>,
}

#[derive(Debug, Deserialize)]
struct PLService {
    id: Option<serde_json::Value>,
    carrier_name: Option<String>,
    name: Option<String>,
    #[serde(default)]
    price: PLPrice,
    transit_time: Option<String>,
    transit_hours: Option<String>,
    category: Option<String>,
    first_estimated_delivery_date: Option<String>,
    logo_id: Option<String>,
    #[serde(default)]
    dropoff: bool,
    #[serde(default)]
    delivery_to_parcelshop: bool,
    max_dimensions_message: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct PLPrice {
    base_price: Option<f64>,
    tax_price: Option<f64>,
    total_price: Option<f64>,
    currency: Option<String>,
}

#[tauri::command]
pub async fn get_tariffe_corrieri(
    state: tauri::State<'_, crate::AppState>,
    richiesta: RichiestaSpedizione,
) -> Result<RispostaSpedizione, String> {

    // 1) Leggo API key + dati mittente dal DB
    let (api_key, from_zip, from_country) = {
        let db = state.db.lock().map_err(|e| e.to_string())?;

        let api_key_raw = db.query_row(
            "SELECT valore FROM impostazioni WHERE chiave='packlink_api_key'",
            [], |row| row.get::<_, String>(0),
        ).unwrap_or_default();

        // Pulizia: rimuovi "Bearer ", "< >", spazi
        let api_key = api_key_raw
            .trim()
            .trim_start_matches("Bearer ")
            .trim_start_matches("bearer ")
            .trim_start_matches('<')
            .trim_end_matches('>')
            .trim()
            .to_string();

        let (cap, paese) = db.query_row(
            "SELECT cap, COALESCE(paese, 'IT') FROM azienda WHERE id=1",
            [], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
        ).unwrap_or_else(|_| ("".to_string(), "IT".to_string()));

        (api_key, cap.trim().to_string(), paese.trim().to_string())
    };

    if api_key.is_empty() {
        return Ok(RispostaSpedizione {
            servizi: vec![],
            errore: Some("API key PackLink non configurata. Vai in Impostazioni → Corrieri.".into()),
        });
    }
    if from_zip.is_empty() {
        return Ok(RispostaSpedizione {
            servizi: vec![],
            errore: Some("CAP azienda mancante. Vai in Impostazioni → Intestazione per inserirlo.".into()),
        });
    }
    if richiesta.pacco.peso_kg <= 0.0 {
        return Ok(RispostaSpedizione {
            servizi: vec![],
            errore: Some("Il peso del pacco deve essere maggiore di 0.".into()),
        });
    }

    let cap_dest = richiesta.cap_destinatario.trim().to_string();
    let paese_dest = richiesta.paese_destinatario.trim().to_string();

    if cap_dest.is_empty() {
        return Ok(RispostaSpedizione {
            servizi: vec![],
            errore: Some("CAP destinatario mancante. Seleziona un cliente con indirizzo.".into()),
        });
    }

    // 2) Costruisco URL con brackets URL-encoded (come nella chiamata PowerShell funzionante)
    let url = format!(
        "https://api.packlink.com/v1/services\
         ?from%5Bcountry%5D={}&from%5Bzip%5D={}\
         &to%5Bcountry%5D={}&to%5Bzip%5D={}\
         &packages%5B0%5D%5Bweight%5D={}&packages%5B0%5D%5Blength%5D={}\
         &packages%5B0%5D%5Bwidth%5D={}&packages%5B0%5D%5Bheight%5D={}",
        from_country,
        from_zip,
        paese_dest,
        cap_dest,
        richiesta.pacco.peso_kg,
        richiesta.pacco.lunghezza_cm,
        richiesta.pacco.larghezza_cm,
        richiesta.pacco.altezza_cm,
    );

    // 3) Headers: API key nuda (senza Bearer) + Accept JSON
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        api_key.parse().map_err(|e| format!("API key non valida: {e}"))?,
    );
    headers.insert(
        reqwest::header::ACCEPT,
        "application/json".parse().unwrap(),
    );

    // 4) Chiamata HTTP GET
    let client = reqwest::Client::new();
    // Usiamo Url::parse per evitare che reqwest ri-codifichi i %5B/%5D
    let parsed_url = reqwest::Url::parse(&url)
        .map_err(|e| format!("URL non valido: {e}"))?;
    let response = match client.get(parsed_url).headers(headers).send().await {
        Ok(r) => r,
        Err(e) => {
            return Ok(RispostaSpedizione {
                servizi: vec![], errore: Some(format!("Errore di rete: {e}")),
            });
        }
    };

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Ok(RispostaSpedizione {
            servizi: vec![], errore: Some(format!("PackLink errore {status}: {body}")),
        });
    }

    // 5) Leggi body
    let body_text = response.text().await
        .map_err(|e| format!("Errore lettura risposta: {e}"))?;

    // 6) Parse JSON
    let servizi_raw: Vec<PLService> = serde_json::from_str(&body_text)
        .map_err(|e| format!("Errore parsing JSON: {e}. Body: {}", &body_text[..body_text.len().min(300)]))?;

    // 7) Trasformo in strutture interne
    let mut servizi: Vec<ServizioCorrere> = servizi_raw
        .into_iter()
        .filter_map(|s| {
            let prezzo = s.price.total_price?;
            let id_str = match &s.id {
                Some(serde_json::Value::Number(n)) => n.to_string(),
                Some(serde_json::Value::String(s)) => s.clone(),
                _ => "0".to_string(),
            };
            let ore: Option<i32> = s.transit_hours.as_ref().and_then(|h| h.parse().ok());
            Some(ServizioCorrere {
                id: id_str,
                nome_corriere: s.carrier_name.unwrap_or_else(|| "Sconosciuto".into()),
                nome_servizio: s.name.unwrap_or_else(|| "Standard".into()),
                prezzo_totale: prezzo,
                prezzo_base: s.price.base_price.unwrap_or(0.0),
                prezzo_iva: s.price.tax_price.unwrap_or(0.0),
                valuta: s.price.currency.unwrap_or_else(|| "EUR".into()),
                tempo_transito: s.transit_time.unwrap_or_default(),
                ore_transito: ore,
                categoria: s.category.unwrap_or_default(),
                data_consegna_stimata: s.first_estimated_delivery_date.unwrap_or_default(),
                logo_url: s.logo_id.map(|id| format!("https://cdn.packlink.com/apps/giger/logos/carriers/{id}.svg")),
                drop_off: s.dropoff,
                consegna_punto_ritiro: s.delivery_to_parcelshop,
                dimensioni_max: s.max_dimensions_message.unwrap_or_default(),
            })
        })
        .collect();

    // 8) Ordina per prezzo crescente
    servizi.sort_by(|a, b| a.prezzo_totale.partial_cmp(&b.prezzo_totale).unwrap_or(std::cmp::Ordering::Equal));

    Ok(RispostaSpedizione { servizi, errore: None })
}
