// src-tauri/src/preventivi.rs
// ===========================
// Modulo preventivi: CRUD completo, righe, materiali multi-AMS,
// calcolo costi automatico, workflow stati.

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;

// ── Strutture input ──

#[derive(Debug, Deserialize)]
pub struct UpdatePreventivoInput {
    pub cliente_id: Option<i64>,
    pub markup_globale: f64,
    pub sconto_globale: f64,
    pub avvio_macchina: f64,
    pub metodo_pagamento_id: Option<i64>,
    pub corriere_id: Option<i64>,
    pub acconto_tipo: String,
    pub acconto_valore: f64,
    pub ritenuta_acconto: bool,
    pub note: String,
    // Spedizione da PackLink (salvata al momento della scelta)
    pub corriere_nome: Option<String>,
    pub corriere_servizio: Option<String>,
    pub costo_spedizione: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct RigaInput {
    pub nome_file: String,
    pub titolo_visualizzato: String,
    pub stampante_id: Option<i64>,
    pub profilo_stampa_id: Option<i64>,
    pub quantita: i64,
    pub is_multicolore: bool,
    pub tempo_stampa_sec: i64,
    pub peso_totale_grammi: f64,
    pub ingombro_x_mm: f64,
    pub ingombro_y_mm: f64,
    pub ingombro_z_mm: f64,
    pub markup_riga: Option<f64>,
    pub sconto_riga: Option<f64>,
    pub fallimento_riga: Option<f64>,
    pub post_processing: f64,
    pub tempo_manuale: bool,
    pub peso_manuale: bool,
    pub ordine: i64,
}

#[derive(Debug, Deserialize)]
pub struct MaterialeSlotInput {
    pub materiale_id: i64,
    pub slot_ams: i64,
    pub colore_hex: String,
    pub peso_grammi: f64,
    pub percentuale_pezzo: f64,
}

// ── Strutture output (con dati calcolati) ──

#[derive(Debug, Serialize, Clone)]
pub struct PreventivoCompleto {
    pub id: i64,
    pub numero: String,
    pub cliente_id: Option<i64>,
    pub cliente_nome: Option<String>,
    pub stato: String,
    pub data_creazione: String,
    pub markup_globale: f64,
    pub sconto_globale: f64,
    pub avvio_macchina: f64,
    pub metodo_pagamento_id: Option<i64>,
    pub corriere_id: Option<i64>,
    pub acconto_tipo: String,
    pub acconto_valore: f64,
    pub ritenuta_acconto: bool,
    pub note: String,
    pub congelato: bool,
    // Totali calcolati
    pub totale_costo: f64,
    pub totale_cliente: f64,
    pub totale_profit: f64,
    pub totale_materiale_g: f64,
    pub totale_tempo_sec: i64,
    pub totale_servizi: f64,
    pub totale_spedizione: f64,
    pub totale_finale: f64,
    // Righe
    pub righe: Vec<RigaCompleta>,
    // Servizi
    pub servizi: Vec<ServizioPreventivo>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RigaCompleta {
    pub id: i64,
    pub preventivo_id: i64,
    pub nome_file: String,
    pub titolo_visualizzato: String,
    pub stampante_id: Option<i64>,
    pub stampante_nome: Option<String>,
    pub profilo_stampa_id: Option<i64>,
    pub profilo_nome: Option<String>,
    pub quantita: i64,
    pub is_multicolore: bool,
    pub tempo_stampa_sec: i64,
    pub peso_totale_grammi: f64,
    pub ingombro_x_mm: f64,
    pub ingombro_y_mm: f64,
    pub ingombro_z_mm: f64,
    pub markup_riga: Option<f64>,
    pub sconto_riga: Option<f64>,
    pub fallimento_riga: Option<f64>,
    pub post_processing: f64,
    pub tempo_manuale: bool,
    pub peso_manuale: bool,
    pub ordine: i64,
    // Costi calcolati
    pub costo_materiale_totale: f64,
    pub costo_energia: f64,
    pub costo_ammortamento: f64,
    pub costo_fallimento: f64,
    pub totale_costo: f64,
    pub totale_cliente: f64,
    pub profit: f64,
    // Materiali AMS
    pub materiali: Vec<MaterialeSlotOutput>,
}

#[derive(Debug, Serialize, Clone)]
pub struct MaterialeSlotOutput {
    pub id: i64,
    pub riga_preventivo_id: i64,
    pub materiale_id: i64,
    pub materiale_nome: String,
    pub materiale_prezzo_kg: f64,
    pub materiale_fallimento: f64,
    pub slot_ams: i64,
    pub colore_hex: String,
    pub peso_grammi: f64,
    pub percentuale_pezzo: f64,
    pub costo_materiale: f64,
    pub costo_fallimento: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ServizioPreventivo {
    pub id: i64,
    pub preventivo_id: i64,
    pub servizio_extra_id: i64,
    pub nome: String,
    pub importo_override: Option<f64>,
    pub addebita_override: Option<bool>,
    pub markup_override: Option<f64>,
    pub costo_effettivo: f64,
    pub addebito_cliente: f64,
    pub profit_servizio: f64,
}

// ── Lista preventivi per archivio (con nome cliente) ──

#[derive(Debug, Serialize)]
pub struct PreventivoListItem {
    pub id: i64,
    pub numero: String,
    pub cliente_id: Option<i64>,
    pub cliente_nome: String,
    pub stato: String,
    pub data_creazione: String,
    pub num_righe: i64,
    pub totale_costo: f64,
    pub totale_cliente: f64,
    pub totale_profit: f64,
    pub totale_finale: f64,
}

#[tauri::command]
pub fn get_preventivi_list(state: State<AppState>) -> Result<Vec<PreventivoListItem>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT p.id, p.numero, p.cliente_id, p.stato, p.data_creazione,
                p.totale_costo, p.totale_cliente, p.totale_profit, p.totale_finale,
                COALESCE(NULLIF(c.denominazione_azienda, ''),
                    CASE WHEN COALESCE(c.nome,'') != '' OR COALESCE(c.cognome,'') != ''
                         THEN TRIM(COALESCE(c.nome,'') || ' ' || COALESCE(c.cognome,''))
                         ELSE '' END, '') as cliente_nome,
                (SELECT COUNT(*) FROM righe_preventivo WHERE preventivo_id = p.id) as num_righe
         FROM preventivi p
         LEFT JOIN clienti c ON c.id = p.cliente_id
         ORDER BY p.data_creazione DESC, p.id DESC"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| {
        Ok(PreventivoListItem {
            id: row.get(0)?,
            numero: row.get(1)?,
            cliente_id: row.get(2)?,
            stato: row.get(3)?,
            data_creazione: row.get(4)?,
            totale_costo: row.get(5)?,
            totale_cliente: row.get(6)?,
            totale_profit: row.get(7)?,
            totale_finale: row.get(8)?,
            cliente_nome: row.get(9)?,
            num_righe: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();
    Ok(items)
}

// ── Preventivo completo (header + righe + materiali + servizi) ──

#[tauri::command]
pub fn get_preventivo_completo(state: State<AppState>, id: i64) -> Result<PreventivoCompleto, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Header + cliente nome
    let prev = db.query_row(
        "SELECT p.id, p.numero, p.cliente_id, p.stato, p.data_creazione,
                p.markup_globale, p.sconto_globale, p.avvio_macchina,
                p.metodo_pagamento_id, p.corriere_id, p.acconto_tipo,
                p.acconto_valore, p.ritenuta_acconto, p.note, p.congelato,
                p.totale_costo, p.totale_cliente, p.totale_profit,
                p.totale_materiale_g, p.totale_tempo_sec,
                p.totale_servizi, p.totale_spedizione, p.totale_finale,
                COALESCE(NULLIF(c.denominazione_azienda, ''),
                    CASE WHEN COALESCE(c.nome,'') != '' OR COALESCE(c.cognome,'') != ''
                         THEN TRIM(COALESCE(c.nome,'') || ' ' || COALESCE(c.cognome,''))
                         ELSE '' END, '') as cliente_nome
         FROM preventivi p
         LEFT JOIN clienti c ON c.id = p.cliente_id
         WHERE p.id = ?1",
        params![id],
        |row| {
            Ok(PreventivoCompleto {
                id: row.get(0)?,
                numero: row.get(1)?,
                cliente_id: row.get(2)?,
                stato: row.get(3)?,
                data_creazione: row.get(4)?,
                markup_globale: row.get(5)?,
                sconto_globale: row.get(6)?,
                avvio_macchina: row.get(7)?,
                metodo_pagamento_id: row.get(8)?,
                corriere_id: row.get(9)?,
                acconto_tipo: row.get::<_, String>(10)?,
                acconto_valore: row.get(11)?,
                ritenuta_acconto: row.get(12)?,
                note: row.get(13)?,
                congelato: row.get(14)?,
                totale_costo: row.get(15)?,
                totale_cliente: row.get(16)?,
                totale_profit: row.get(17)?,
                totale_materiale_g: row.get(18)?,
                totale_tempo_sec: row.get(19)?,
                totale_servizi: row.get(20)?,
                totale_spedizione: row.get(21)?,
                totale_finale: row.get(22)?,
                cliente_nome: row.get(23)?,
                righe: Vec::new(),
                servizi: Vec::new(),
            })
        }
    ).map_err(|e| e.to_string())?;

    // Righe
    let mut righe: Vec<RigaCompleta> = Vec::new();
    {
        let mut stmt = db.prepare(
            "SELECT r.id, r.preventivo_id, r.nome_file, r.titolo_visualizzato,
                    r.stampante_id, r.profilo_stampa_id, r.quantita, r.is_multicolore,
                    r.tempo_stampa_sec, r.peso_totale_grammi,
                    r.ingombro_x_mm, r.ingombro_y_mm, r.ingombro_z_mm,
                    r.markup_riga, r.sconto_riga, r.fallimento_riga, r.post_processing,
                    r.tempo_manuale, r.peso_manuale, r.ordine,
                    r.costo_materiale_totale, r.costo_energia, r.costo_ammortamento,
                    r.costo_fallimento, r.totale_costo, r.totale_cliente, r.profit,
                    COALESCE(s.nome, '') as stampante_nome,
                    COALESCE(ps.nome, '') as profilo_nome
             FROM righe_preventivo r
             LEFT JOIN stampanti s ON s.id = r.stampante_id
             LEFT JOIN profili_stampa ps ON ps.id = r.profilo_stampa_id
             WHERE r.preventivo_id = ?1
             ORDER BY r.ordine, r.id"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![id], |row| {
            Ok(RigaCompleta {
                id: row.get(0)?,
                preventivo_id: row.get(1)?,
                nome_file: row.get(2)?,
                titolo_visualizzato: row.get(3)?,
                stampante_id: row.get(4)?,
                profilo_stampa_id: row.get(5)?,
                quantita: row.get(6)?,
                is_multicolore: row.get(7)?,
                tempo_stampa_sec: row.get(8)?,
                peso_totale_grammi: row.get(9)?,
                ingombro_x_mm: row.get(10)?,
                ingombro_y_mm: row.get(11)?,
                ingombro_z_mm: row.get(12)?,
                markup_riga: row.get(13)?,
                sconto_riga: row.get(14)?,
                fallimento_riga: row.get(15)?,
                post_processing: row.get(16)?,
                tempo_manuale: row.get(17)?,
                peso_manuale: row.get(18)?,
                ordine: row.get(19)?,
                costo_materiale_totale: row.get(20)?,
                costo_energia: row.get(21)?,
                costo_ammortamento: row.get(22)?,
                costo_fallimento: row.get(23)?,
                totale_costo: row.get(24)?,
                totale_cliente: row.get(25)?,
                profit: row.get(26)?,
                stampante_nome: row.get(27)?,
                profilo_nome: row.get(28)?,
                materiali: Vec::new(),
            })
        }).map_err(|e| e.to_string())?;

        for r in rows {
            righe.push(r.map_err(|e| e.to_string())?);
        }
    }

    // Materiali per ogni riga
    for riga in righe.iter_mut() {
        let mut stmt = db.prepare(
            "SELECT rm.id, rm.riga_preventivo_id, rm.materiale_id,
                    COALESCE(m.nome, '?') as mat_nome,
                    COALESCE(m.prezzo_kg, 0) as mat_prezzo,
                    COALESCE(m.fallimento_percentuale, 0) as mat_fall,
                    rm.slot_ams, rm.colore_hex, rm.peso_grammi,
                    rm.percentuale_pezzo, rm.costo_materiale, rm.costo_fallimento
             FROM riga_materiali rm
             LEFT JOIN materiali m ON m.id = rm.materiale_id
             WHERE rm.riga_preventivo_id = ?1
             ORDER BY rm.slot_ams"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![riga.id], |row| {
            Ok(MaterialeSlotOutput {
                id: row.get(0)?,
                riga_preventivo_id: row.get(1)?,
                materiale_id: row.get(2)?,
                materiale_nome: row.get(3)?,
                materiale_prezzo_kg: row.get(4)?,
                materiale_fallimento: row.get(5)?,
                slot_ams: row.get(6)?,
                colore_hex: row.get(7)?,
                peso_grammi: row.get(8)?,
                percentuale_pezzo: row.get(9)?,
                costo_materiale: row.get(10)?,
                costo_fallimento: row.get(11)?,
            })
        }).map_err(|e| e.to_string())?;
        riga.materiali = rows.filter_map(|r| r.ok()).collect();
    }

    // Servizi
    let servizi = {
        let mut stmt = db.prepare(
            "SELECT ps.id, ps.preventivo_id, ps.servizio_extra_id,
                    COALESCE(se.nome, '?'),
                    ps.importo_override, ps.addebita_override, ps.markup_override,
                    ps.costo_effettivo, ps.addebito_cliente, ps.profit_servizio
             FROM preventivo_servizi ps
             LEFT JOIN servizi_extra se ON se.id = ps.servizio_extra_id
             WHERE ps.preventivo_id = ?1"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![id], |row| {
            Ok(ServizioPreventivo {
                id: row.get(0)?,
                preventivo_id: row.get(1)?,
                servizio_extra_id: row.get(2)?,
                nome: row.get(3)?,
                importo_override: row.get(4)?,
                addebita_override: row.get(5)?,
                markup_override: row.get(6)?,
                costo_effettivo: row.get(7)?,
                addebito_cliente: row.get(8)?,
                profit_servizio: row.get(9)?,
            })
        }).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    Ok(PreventivoCompleto { righe, servizi, ..prev })
}

// ── Update header preventivo ──

#[tauri::command]
pub fn update_preventivo(state: State<AppState>, id: i64, data: UpdatePreventivoInput) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Se c'è un corriere PackLink, salva/aggiorna nella tabella corrieri
    let corriere_id = if let (Some(nome), Some(servizio), Some(costo)) =
        (&data.corriere_nome, &data.corriere_servizio, data.costo_spedizione)
    {
        // Cerca corriere esistente o creane uno nuovo
        let existing: Option<i64> = db.query_row(
            "SELECT id FROM corrieri WHERE nome = ?1 AND servizio = ?2",
            params![nome, servizio],
            |row| row.get(0)
        ).ok();

        let cid = match existing {
            Some(id) => {
                db.execute(
                    "UPDATE corrieri SET costo_spedizione = ?1 WHERE id = ?2",
                    params![costo, id]
                ).map_err(|e| e.to_string())?;
                id
            },
            None => {
                db.execute(
                    "INSERT INTO corrieri (nome, servizio, costo_spedizione) VALUES (?1, ?2, ?3)",
                    params![nome, servizio, costo]
                ).map_err(|e| e.to_string())?;
                db.last_insert_rowid()
            }
        };
        Some(cid)
    } else {
        data.corriere_id
    };

    let spedizione = data.costo_spedizione.unwrap_or(0.0);

    db.execute(
        "UPDATE preventivi SET
            cliente_id = ?1, markup_globale = ?2, sconto_globale = ?3,
            avvio_macchina = ?4, metodo_pagamento_id = ?5, corriere_id = ?6,
            acconto_tipo = ?7, acconto_valore = ?8, ritenuta_acconto = ?9,
            note = ?10, totale_spedizione = ?11,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?12",
        params![
            data.cliente_id, data.markup_globale, data.sconto_globale,
            data.avvio_macchina, data.metodo_pagamento_id, corriere_id,
            data.acconto_tipo, data.acconto_valore, data.ritenuta_acconto,
            data.note, spedizione, id
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ── Cambio stato con workflow ──

#[tauri::command]
pub fn update_stato_preventivo(state: State<AppState>, id: i64, nuovo_stato: String) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let stato_corrente: String = db.query_row(
        "SELECT stato FROM preventivi WHERE id = ?1",
        params![id], |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Validazione transizioni permesse
    let transizioni_valide: Vec<(&str, &str)> = vec![
        ("bozza", "inviato"),
        ("inviato", "accettato"),
        ("inviato", "rifiutato"),
        ("accettato", "in_produzione"),
        ("accettato", "rifiutato"),
        ("in_produzione", "completato"),
        // Transizioni "indietro" permesse
        ("inviato", "bozza"),
        ("rifiutato", "bozza"),
        // Legacy: non_confermato → bozza
        ("non_confermato", "bozza"),
        ("non_confermato", "inviato"),
    ];

    let permesso = transizioni_valide.iter().any(|(da, a)| {
        *da == stato_corrente.as_str() && *a == nuovo_stato.as_str()
    });

    if !permesso {
        return Err(format!(
            "Transizione non permessa: {} → {}",
            stato_corrente, nuovo_stato
        ));
    }

    // Se passa a "inviato" o oltre, congela i prezzi
    let congela = matches!(nuovo_stato.as_str(), "inviato" | "accettato" | "in_produzione" | "completato");

    db.execute(
        "UPDATE preventivi SET stato = ?1, congelato = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![nuovo_stato, congela as i32, id],
    ).map_err(|e| e.to_string())?;

    Ok(nuovo_stato)
}

// ── CRUD Righe ──

#[tauri::command]
pub fn add_riga_preventivo(state: State<AppState>, preventivo_id: i64, data: RigaInput) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute(
        "INSERT INTO righe_preventivo (
            preventivo_id, nome_file, titolo_visualizzato,
            stampante_id, profilo_stampa_id, quantita, is_multicolore,
            tempo_stampa_sec, peso_totale_grammi,
            ingombro_x_mm, ingombro_y_mm, ingombro_z_mm,
            markup_riga, sconto_riga, fallimento_riga, post_processing,
            tempo_manuale, peso_manuale, ordine
        ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19)",
        params![
            preventivo_id, data.nome_file, data.titolo_visualizzato,
            data.stampante_id, data.profilo_stampa_id, data.quantita, data.is_multicolore,
            data.tempo_stampa_sec, data.peso_totale_grammi,
            data.ingombro_x_mm, data.ingombro_y_mm, data.ingombro_z_mm,
            data.markup_riga, data.sconto_riga, data.fallimento_riga, data.post_processing,
            data.tempo_manuale, data.peso_manuale, data.ordine
        ],
    ).map_err(|e| e.to_string())?;

    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn update_riga_preventivo(state: State<AppState>, riga_id: i64, data: RigaInput) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute(
        "UPDATE righe_preventivo SET
            nome_file = ?1, titolo_visualizzato = ?2,
            stampante_id = ?3, profilo_stampa_id = ?4,
            quantita = ?5, is_multicolore = ?6,
            tempo_stampa_sec = ?7, peso_totale_grammi = ?8,
            ingombro_x_mm = ?9, ingombro_y_mm = ?10, ingombro_z_mm = ?11,
            markup_riga = ?12, sconto_riga = ?13, fallimento_riga = ?14,
            post_processing = ?15, tempo_manuale = ?16, peso_manuale = ?17, ordine = ?18
         WHERE id = ?19",
        params![
            data.nome_file, data.titolo_visualizzato,
            data.stampante_id, data.profilo_stampa_id,
            data.quantita, data.is_multicolore,
            data.tempo_stampa_sec, data.peso_totale_grammi,
            data.ingombro_x_mm, data.ingombro_y_mm, data.ingombro_z_mm,
            data.markup_riga, data.sconto_riga, data.fallimento_riga,
            data.post_processing, data.tempo_manuale, data.peso_manuale,
            data.ordine, riga_id
        ],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn delete_riga_preventivo(state: State<AppState>, riga_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    // CASCADE elimina anche riga_materiali
    db.execute("DELETE FROM righe_preventivo WHERE id = ?1", params![riga_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Set materiali per una riga (replace all) ──

#[tauri::command]
pub fn set_riga_materiali(
    state: State<AppState>,
    riga_id: i64,
    materiali: Vec<MaterialeSlotInput>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Cancella tutti i materiali esistenti per questa riga
    db.execute("DELETE FROM riga_materiali WHERE riga_preventivo_id = ?1", params![riga_id])
        .map_err(|e| e.to_string())?;

    // Inserisci i nuovi
    for mat in materiali {
        db.execute(
            "INSERT INTO riga_materiali (
                riga_preventivo_id, materiale_id, slot_ams,
                colore_hex, peso_grammi, percentuale_pezzo
            ) VALUES (?1,?2,?3,?4,?5,?6)",
            params![riga_id, mat.materiale_id, mat.slot_ams,
                    mat.colore_hex, mat.peso_grammi, mat.percentuale_pezzo],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ── Servizi Extra nel preventivo ──

#[tauri::command]
pub fn add_servizio_preventivo(state: State<AppState>, preventivo_id: i64, servizio_extra_id: i64) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let (importo, addebita, markup): (f64, bool, f64) = db.query_row(
        "SELECT importo_predefinito, addebita, markup_percentuale FROM servizi_extra WHERE id = ?1",
        params![servizio_extra_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| e.to_string())?;
    let costo = importo;
    let addebito = if addebita { importo * (1.0 + markup / 100.0) } else { 0.0 };
    let profit = addebito - costo;
    db.execute(
        "INSERT INTO preventivo_servizi (preventivo_id, servizio_extra_id, costo_effettivo, addebito_cliente, profit_servizio) VALUES (?1,?2,?3,?4,?5)",
        params![preventivo_id, servizio_extra_id, costo, addebito, profit]
    ).map_err(|e| e.to_string())?;
    Ok(db.last_insert_rowid())
}

#[tauri::command]
pub fn remove_servizio_preventivo(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM preventivo_servizi WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ══════════════════════════════════════════════════════
// RICALCOLA PREVENTIVO — il motore di calcolo costi
// ══════════════════════════════════════════════════════

#[tauri::command]
pub fn ricalcola_preventivo(state: State<AppState>, id: i64) -> Result<PreventivoCompleto, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Leggi costo energia dalle impostazioni
    let costo_energia_kwh: f64 = db.query_row(
        "SELECT CAST(valore AS REAL) FROM impostazioni WHERE chiave = 'costo_energia_kwh'",
        [], |row| row.get(0)
    ).unwrap_or(0.30);

    // Leggi dati preventivo header
    let (markup_globale, sconto_globale, avvio_macchina, totale_spedizione): (f64, f64, f64, f64) = db.query_row(
        "SELECT markup_globale, sconto_globale, avvio_macchina, totale_spedizione
         FROM preventivi WHERE id = ?1",
        params![id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    ).map_err(|e| e.to_string())?;

    // Prendi tutte le righe
    let riga_ids: Vec<i64> = {
        let mut stmt = db.prepare(
            "SELECT id FROM righe_preventivo WHERE preventivo_id = ?1 ORDER BY ordine, id"
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    let mut totale_costo_preventivo: f64 = 0.0;
    let mut totale_cliente_preventivo: f64 = 0.0;
    let mut totale_materiale_g: f64 = 0.0;
    let mut totale_tempo_sec: i64 = 0;

    for riga_id in &riga_ids {
        // Leggi dati riga
        let (stampante_id, tempo_sec, quantita, markup_riga, sconto_riga, fallimento_riga, post_proc):
            (Option<i64>, i64, i64, Option<f64>, Option<f64>, Option<f64>, f64) = db.query_row(
            "SELECT stampante_id, tempo_stampa_sec, quantita,
                    markup_riga, sconto_riga, fallimento_riga, post_processing
             FROM righe_preventivo WHERE id = ?1",
            params![riga_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?,
                       row.get(3)?, row.get(4)?, row.get(5)?, row.get(6)?))
        ).map_err(|e| e.to_string())?;

        // Dati stampante (consumo kWh + ammortamento/ora)
        let (consumo_kwh, ammortamento_ora) = match stampante_id {
            Some(sid) => db.query_row(
                "SELECT consumo_kwh, ammortamento_ora FROM stampanti WHERE id = ?1",
                params![sid], |row| Ok((row.get::<_, f64>(0)?, row.get::<_, f64>(1)?))
            ).unwrap_or((0.12, 1.50)),
            None => (0.12, 1.50),
        };

        // ── Calcola costi per ogni materiale nella riga ──
        let mut costo_mat_totale: f64 = 0.0;
        let mut costo_fall_totale: f64 = 0.0;
        let mut peso_riga_g: f64 = 0.0;

        {
            let mut stmt = db.prepare(
                "SELECT rm.id, rm.materiale_id, rm.peso_grammi,
                        COALESCE(m.prezzo_kg, 0), COALESCE(m.fallimento_percentuale, 0)
                 FROM riga_materiali rm
                 LEFT JOIN materiali m ON m.id = rm.materiale_id
                 WHERE rm.riga_preventivo_id = ?1"
            ).map_err(|e| e.to_string())?;

            let mats: Vec<(i64, f64, f64, f64)> = {
                let rows = stmt.query_map(params![riga_id], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, f64>(2)?,
                        row.get::<_, f64>(3)?, row.get::<_, f64>(4)?))
                }).map_err(|e| e.to_string())?;
                rows.filter_map(|r| r.ok()).collect()
            };

            for (rm_id, peso_g, prezzo_kg, fallimento_pct) in mats {
                let costo_mat = (peso_g / 1000.0) * prezzo_kg;
                let fall_pct = fallimento_riga.unwrap_or(fallimento_pct);
                let costo_fall = costo_mat * (fall_pct / 100.0);

                // Aggiorna riga_materiali con i costi calcolati
                db.execute(
                    "UPDATE riga_materiali SET costo_materiale = ?1, costo_fallimento = ?2 WHERE id = ?3",
                    params![costo_mat, costo_fall, rm_id]
                ).map_err(|e| e.to_string())?;

                costo_mat_totale += costo_mat;
                costo_fall_totale += costo_fall;
                peso_riga_g += peso_g;
            }
        }

        // ── Costi tempo (per 1 pezzo) ──
        let ore = tempo_sec as f64 / 3600.0;
        let costo_energia = ore * consumo_kwh * costo_energia_kwh;
        let costo_ammortamento = ore * ammortamento_ora;

        // ── Totale costo per 1 pezzo ──
        let totale_costo_pezzo = costo_mat_totale + costo_fall_totale
            + costo_energia + costo_ammortamento + post_proc;

        // ── Markup e sconto ──
        let mk = markup_riga.unwrap_or(markup_globale);
        let sc = sconto_riga.unwrap_or(sconto_globale);
        let prezzo_cliente_pezzo = totale_costo_pezzo * (1.0 + mk / 100.0) * (1.0 - sc / 100.0);

        let totale_cliente_riga = prezzo_cliente_pezzo * quantita as f64;
        let totale_costo_riga = totale_costo_pezzo * quantita as f64;
        let profit_riga = totale_cliente_riga - totale_costo_riga;

        // Aggiorna riga
        db.execute(
            "UPDATE righe_preventivo SET
                peso_totale_grammi = ?1,
                costo_materiale_totale = ?2, costo_energia = ?3,
                costo_ammortamento = ?4, costo_fallimento = ?5,
                totale_costo = ?6, totale_cliente = ?7, profit = ?8
             WHERE id = ?9",
            params![
                peso_riga_g, costo_mat_totale, costo_energia,
                costo_ammortamento, costo_fall_totale,
                totale_costo_pezzo, totale_cliente_riga, profit_riga,
                riga_id
            ],
        ).map_err(|e| e.to_string())?;

        totale_costo_preventivo += totale_costo_riga;
        totale_cliente_preventivo += totale_cliente_riga;
        totale_materiale_g += peso_riga_g * quantita as f64;
        totale_tempo_sec += tempo_sec * quantita as i64;
    }

    // ── Servizi extra ──
    let totale_servizi: f64 = db.query_row(
        "SELECT COALESCE(SUM(addebito_cliente), 0) FROM preventivo_servizi WHERE preventivo_id = ?1",
        params![id], |row| row.get(0)
    ).unwrap_or(0.0);

    // ── Totale finale ──
    let totale_finale = totale_cliente_preventivo + avvio_macchina + totale_servizi + totale_spedizione;
    let totale_profit = totale_finale - totale_costo_preventivo - totale_spedizione;

    db.execute(
        "UPDATE preventivi SET
            totale_costo = ?1, totale_cliente = ?2, totale_profit = ?3,
            totale_materiale_g = ?4, totale_tempo_sec = ?5,
            totale_servizi = ?6, totale_finale = ?7,
            updated_at = CURRENT_TIMESTAMP
         WHERE id = ?8",
        params![
            totale_costo_preventivo, totale_cliente_preventivo, totale_profit,
            totale_materiale_g, totale_tempo_sec, totale_servizi, totale_finale, id
        ],
    ).map_err(|e| e.to_string())?;

    drop(db);
    // Restituisci il preventivo completo aggiornato
    get_preventivo_completo(state, id)
}

// ── Duplica preventivo ──

#[tauri::command]
pub fn duplica_preventivo(state: State<AppState>, id: i64) -> Result<i64, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Genera nuovo numero
    let (prefix, next_num): (String, i64) = db.query_row(
        "SELECT prefisso_preventivo, prossimo_numero FROM azienda WHERE id=1",
        [], |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| e.to_string())?;

    let nuovo_numero = format!("{}-{}", prefix, next_num);

    // Copia header
    db.execute(
        "INSERT INTO preventivi (numero, cliente_id, stato, markup_globale, sconto_globale,
            avvio_macchina, metodo_pagamento_id, note)
         SELECT ?1, cliente_id, 'bozza', markup_globale, sconto_globale,
                avvio_macchina, metodo_pagamento_id, note
         FROM preventivi WHERE id = ?2",
        params![nuovo_numero, id],
    ).map_err(|e| e.to_string())?;
    let new_id = db.last_insert_rowid();

    db.execute("UPDATE azienda SET prossimo_numero = prossimo_numero + 1 WHERE id=1", [])
        .map_err(|e| e.to_string())?;

    // Copia righe
    let riga_ids: Vec<i64> = {
        let mut stmt = db.prepare("SELECT id FROM righe_preventivo WHERE preventivo_id = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![id], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for old_riga_id in riga_ids {
        db.execute(
            "INSERT INTO righe_preventivo (preventivo_id, nome_file, titolo_visualizzato,
                stampante_id, profilo_stampa_id, quantita, is_multicolore,
                tempo_stampa_sec, peso_totale_grammi, ingombro_x_mm, ingombro_y_mm, ingombro_z_mm,
                markup_riga, sconto_riga, fallimento_riga, post_processing,
                tempo_manuale, peso_manuale, ordine)
             SELECT ?1, nome_file, titolo_visualizzato,
                    stampante_id, profilo_stampa_id, quantita, is_multicolore,
                    tempo_stampa_sec, peso_totale_grammi, ingombro_x_mm, ingombro_y_mm, ingombro_z_mm,
                    markup_riga, sconto_riga, fallimento_riga, post_processing,
                    tempo_manuale, peso_manuale, ordine
             FROM righe_preventivo WHERE id = ?2",
            params![new_id, old_riga_id],
        ).map_err(|e| e.to_string())?;
        let new_riga_id = db.last_insert_rowid();

        // Copia materiali della riga
        db.execute(
            "INSERT INTO riga_materiali (riga_preventivo_id, materiale_id, slot_ams,
                colore_hex, peso_grammi, percentuale_pezzo)
             SELECT ?1, materiale_id, slot_ams, colore_hex, peso_grammi, percentuale_pezzo
             FROM riga_materiali WHERE riga_preventivo_id = ?2",
            params![new_riga_id, old_riga_id],
        ).map_err(|e| e.to_string())?;
    }

    Ok(new_id)
}
