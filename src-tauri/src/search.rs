// src-tauri/src/search.rs
// Sparks3D Preventivi – Ricerca globale
// =======================================

use serde::Serialize;
use tauri::State;
use crate::AppState;

#[derive(Debug, Serialize, Clone)]
pub struct SearchResult {
    pub categoria: String,    // "preventivo" | "cliente" | "materiale" | "stampante" | "profilo"
    pub id: i64,
    pub titolo: String,
    pub sottotitolo: String,
    pub extra: String,         // info aggiuntiva (es. totale, prezzo, ecc.)
    pub icona: String,         // emoji per UI
    pub page_id: String,       // pagina di navigazione
    pub preventivo_id: Option<i64>, // solo per preventivi
}

#[tauri::command]
pub fn global_search(state: State<AppState>, query: String) -> Result<Vec<SearchResult>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let q = query.trim().to_lowercase();

    if q.is_empty() || q.len() < 2 {
        return Ok(vec![]);
    }

    let like = format!("%{}%", q);
    let mut results: Vec<SearchResult> = Vec::new();

    // ── Preventivi ──
    {
        let mut stmt = db.prepare(
            "SELECT p.id, p.numero, p.stato, p.data_creazione, p.totale_finale,
                    COALESCE(c.denominazione_azienda,
                        CASE WHEN c.nome != '' OR c.cognome != ''
                             THEN c.nome || ' ' || c.cognome ELSE '' END, '') AS cliente
             FROM preventivi p
             LEFT JOIN clienti c ON c.id = p.cliente_id
             WHERE LOWER(p.numero) LIKE ?1
                OR LOWER(COALESCE(c.denominazione_azienda,'')) LIKE ?1
                OR LOWER(COALESCE(c.nome,'') || ' ' || COALESCE(c.cognome,'')) LIKE ?1
                OR LOWER(p.note) LIKE ?1
             ORDER BY p.data_creazione DESC
             LIMIT 8"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([&like], |row| {
            let stato: String = row.get(2)?;
            let stato_label = match stato.as_str() {
                "bozza" => "Bozza",
                "non_confermato" => "Non confermato",
                "confermato" => "Confermato",
                "in_lavorazione" => "In lavorazione",
                "completato" => "Completato",
                "annullato" => "Annullato",
                s => s,
            };
            Ok(SearchResult {
                categoria: "preventivo".into(),
                id: row.get(0)?,
                titolo: row.get(1)?,
                sottotitolo: format!("{} · {}", stato_label, row.get::<_,String>(5)?),
                extra: format!("€ {:.2}", row.get::<_,f64>(4)?),
                icona: "📄".into(),
                page_id: "nuovo-preventivo".into(),
                preventivo_id: Some(row.get(0)?),
            })
        }).map_err(|e| e.to_string())?;
        for r in rows.filter_map(|r| r.ok()) { results.push(r); }
    }

    // ── Clienti ──
    {
        let mut stmt = db.prepare(
            "SELECT id, nome, cognome, denominazione_azienda, email, telefono, citta
             FROM clienti
             WHERE LOWER(nome) LIKE ?1
                OR LOWER(cognome) LIKE ?1
                OR LOWER(denominazione_azienda) LIKE ?1
                OR LOWER(email) LIKE ?1
                OR LOWER(telefono) LIKE ?1
                OR LOWER(partita_iva) LIKE ?1
                OR LOWER(codice_fiscale) LIKE ?1
             ORDER BY COALESCE(NULLIF(denominazione_azienda,''), nome)
             LIMIT 6"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([&like], |row| {
            let nome: String = row.get(1)?;
            let cognome: String = row.get(2)?;
            let azienda: String = row.get(3)?;
            let titolo = if !azienda.is_empty() { azienda } else { format!("{} {}", nome, cognome).trim().to_string() };
            let email: String = row.get(4)?;
            let tel: String = row.get(5)?;
            let citta: String = row.get(6)?;
            let sub_parts: Vec<&str> = vec![
                if !email.is_empty() { &email } else { "" },
                if !tel.is_empty() { &tel } else { "" },
                if !citta.is_empty() { &citta } else { "" },
            ].into_iter().filter(|s| !s.is_empty()).collect();
            Ok(SearchResult {
                categoria: "cliente".into(),
                id: row.get(0)?,
                titolo,
                sottotitolo: sub_parts.join(" · "),
                extra: String::new(),
                icona: "👤".into(),
                page_id: "clienti".into(),
                preventivo_id: None,
            })
        }).map_err(|e| e.to_string())?;
        for r in rows.filter_map(|r| r.ok()) { results.push(r); }
    }

    // ── Materiali ──
    {
        let mut stmt = db.prepare(
            "SELECT id, nome, profilo_slicer, prezzo_kg, magazzino_kg
             FROM materiali
             WHERE LOWER(nome) LIKE ?1 OR LOWER(profilo_slicer) LIKE ?1
             ORDER BY nome LIMIT 5"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([&like], |row| {
            Ok(SearchResult {
                categoria: "materiale".into(),
                id: row.get(0)?,
                titolo: row.get(1)?,
                sottotitolo: row.get::<_,String>(2).unwrap_or_default(),
                extra: format!("€ {:.2}/kg · {:.1} kg", row.get::<_,f64>(3)?, row.get::<_,f64>(4)?),
                icona: "🧱".into(),
                page_id: "materiali".into(),
                preventivo_id: None,
            })
        }).map_err(|e| e.to_string())?;
        for r in rows.filter_map(|r| r.ok()) { results.push(r); }
    }

    // ── Stampanti ──
    {
        let mut stmt = db.prepare(
            "SELECT id, nome, profilo_slicer, consumo_kwh, ammortamento_ora
             FROM stampanti
             WHERE LOWER(nome) LIKE ?1 OR LOWER(profilo_slicer) LIKE ?1
             ORDER BY nome LIMIT 5"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([&like], |row| {
            Ok(SearchResult {
                categoria: "stampante".into(),
                id: row.get(0)?,
                titolo: row.get(1)?,
                sottotitolo: row.get::<_,String>(2).unwrap_or_default(),
                extra: format!("{:.1} kWh · € {:.2}/h", row.get::<_,f64>(3)?, row.get::<_,f64>(4)?),
                icona: "🖨️".into(),
                page_id: "stampanti".into(),
                preventivo_id: None,
            })
        }).map_err(|e| e.to_string())?;
        for r in rows.filter_map(|r| r.ok()) { results.push(r); }
    }

    // ── Profili stampa ──
    {
        let mut stmt = db.prepare(
            "SELECT id, nome, profilo_slicer, layer_height_mm, infill_percentuale
             FROM profili_stampa
             WHERE LOWER(nome) LIKE ?1 OR LOWER(profilo_slicer) LIKE ?1
             ORDER BY nome LIMIT 5"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map([&like], |row| {
            Ok(SearchResult {
                categoria: "profilo".into(),
                id: row.get(0)?,
                titolo: row.get(1)?,
                sottotitolo: row.get::<_,String>(2).unwrap_or_default(),
                extra: format!("{:.2}mm · {:.0}% infill", row.get::<_,f64>(3)?, row.get::<_,f64>(4)?),
                icona: "⚙️".into(),
                page_id: "profili".into(),
                preventivo_id: None,
            })
        }).map_err(|e| e.to_string())?;
        for r in rows.filter_map(|r| r.ok()) { results.push(r); }
    }

    Ok(results)
}
