// src-tauri/src/dashboard.rs
// Sparks3D Preventivi – Dashboard statistics backend
// ====================================================

use serde::Serialize;
use tauri::State;
use crate::AppState;

// ── Strutture di risposta ──

#[derive(Debug, Serialize, Clone)]
pub struct DashboardStats {
    /// KPI principali
    pub totale_preventivi: i64,
    pub preventivi_confermati: i64,
    pub fatturato_totale: f64,
    pub profit_totale: f64,
    pub materiale_totale_kg: f64,
    pub tempo_stampa_totale_ore: f64,

    /// Breakdown per stato
    pub per_stato: Vec<StatoCount>,

    /// Trend ultimi 6 mesi (fatturato + profit)
    pub trend_mensile: Vec<TrendMese>,

    /// Top 5 clienti per fatturato
    pub top_clienti: Vec<TopCliente>,

    /// Ultimi 10 preventivi
    pub ultimi_preventivi: Vec<PreventivoRecente>,

    /// Materiali più utilizzati (top 8)
    pub top_materiali: Vec<TopMateriale>,

    /// Tasso conversione (confermati / totali * 100)
    pub tasso_conversione: f64,

    /// Valore medio preventivo
    pub valore_medio: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct StatoCount {
    pub stato: String,
    pub count: i64,
    pub totale: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct TrendMese {
    pub mese: String,          // "2025-03"
    pub label: String,         // "Mar 2025"
    pub fatturato: f64,
    pub profit: f64,
    pub num_preventivi: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct TopCliente {
    pub cliente_id: i64,
    pub nome_display: String,
    pub fatturato: f64,
    pub num_preventivi: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct PreventivoRecente {
    pub id: i64,
    pub numero: String,
    pub stato: String,
    pub data_creazione: String,
    pub cliente_nome: String,
    pub totale_finale: f64,
    pub profit: f64,
    pub num_righe: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct TopMateriale {
    pub materiale_id: i64,
    pub nome: String,
    pub peso_totale_kg: f64,
    pub num_utilizzi: i64,
}

// ── Comando Tauri ──

#[tauri::command]
pub fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // 1) KPI aggregati — totali generici
    let totale_preventivi: i64 = db.query_row(
        "SELECT COUNT(*) FROM preventivi",
        [], |row| row.get(0),
    ).unwrap_or(0);

    // Fatturato e profit solo da preventivi completati
    let (fatturato_totale, profit_totale): (f64, f64) = db.query_row(
        "SELECT COALESCE(SUM(totale_finale), 0),
                COALESCE(SUM(totale_profit), 0)
         FROM preventivi WHERE stato = 'completato'",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    let (materiale_g, tempo_sec): (f64, f64) = db.query_row(
        "SELECT COALESCE(SUM(totale_materiale_g), 0),
                COALESCE(SUM(totale_tempo_sec), 0)
         FROM preventivi",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).map_err(|e| e.to_string())?;

    // Confermati = accettato + in_produzione + completato
    let preventivi_confermati: i64 = db.query_row(
        "SELECT COUNT(*) FROM preventivi WHERE stato IN ('accettato', 'in_produzione', 'completato')",
        [], |row| row.get(0),
    ).unwrap_or(0);

    let materiale_totale_kg = materiale_g / 1000.0;
    let tempo_stampa_totale_ore = tempo_sec / 3600.0;
    let tasso_conversione = if totale_preventivi > 0 {
        (preventivi_confermati as f64 / totale_preventivi as f64) * 100.0
    } else { 0.0 };

    // Conta completati per valore medio
    let completati: i64 = db.query_row(
        "SELECT COUNT(*) FROM preventivi WHERE stato = 'completato'",
        [], |row| row.get(0),
    ).unwrap_or(0);
    let valore_medio = if completati > 0 {
        fatturato_totale / completati as f64
    } else { 0.0 };

    // 2) Breakdown per stato
    let mut stmt = db.prepare(
        "SELECT stato, COUNT(*), COALESCE(SUM(totale_finale), 0)
         FROM preventivi GROUP BY stato ORDER BY COUNT(*) DESC"
    ).map_err(|e| e.to_string())?;
    let per_stato: Vec<StatoCount> = stmt.query_map([], |row| {
        Ok(StatoCount {
            stato: row.get(0)?,
            count: row.get(1)?,
            totale: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    // 3) Trend ultimi 6 mesi
    let mut stmt = db.prepare(
        "SELECT strftime('%Y-%m', data_creazione) AS mese,
                COUNT(*),
                COALESCE(SUM(totale_finale), 0),
                COALESCE(SUM(totale_profit), 0)
         FROM preventivi
         WHERE data_creazione >= date('now', '-6 months')
         GROUP BY mese
         ORDER BY mese ASC"
    ).map_err(|e| e.to_string())?;
    let trend_mensile: Vec<TrendMese> = stmt.query_map([], |row| {
        let mese: String = row.get(0)?;
        let label = format_mese_label(&mese);
        Ok(TrendMese {
            mese,
            label,
            num_preventivi: row.get(1)?,
            fatturato: row.get(2)?,
            profit: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    // 4) Top 5 clienti per fatturato
    let mut stmt = db.prepare(
        "SELECT p.cliente_id,
                CASE
                    WHEN c.denominazione_azienda IS NOT NULL AND c.denominazione_azienda != ''
                        THEN c.denominazione_azienda
                    WHEN (c.nome IS NOT NULL AND c.nome != '') OR (c.cognome IS NOT NULL AND c.cognome != '')
                        THEN TRIM(COALESCE(c.nome, '') || ' ' || COALESCE(c.cognome, ''))
                    ELSE 'Cliente #' || p.cliente_id
                END AS nome_display,
                COALESCE(SUM(p.totale_finale), 0) AS fatt,
                COUNT(*) AS cnt
         FROM preventivi p
         LEFT JOIN clienti c ON c.id = p.cliente_id
         WHERE p.cliente_id IS NOT NULL
         GROUP BY p.cliente_id
         ORDER BY fatt DESC
         LIMIT 5"
    ).map_err(|e| e.to_string())?;
    let top_clienti: Vec<TopCliente> = stmt.query_map([], |row| {
        Ok(TopCliente {
            cliente_id: row.get(0)?,
            nome_display: row.get(1)?,
            fatturato: row.get(2)?,
            num_preventivi: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    // 5) Ultimi 10 preventivi
    let mut stmt = db.prepare(
        "SELECT p.id, p.numero, p.stato, p.data_creazione,
                COALESCE(c.denominazione_azienda,
                    CASE WHEN c.nome != '' OR c.cognome != ''
                         THEN c.nome || ' ' || c.cognome
                         ELSE '' END, '') AS cliente_nome,
                p.totale_finale,
                p.totale_profit,
                (SELECT COUNT(*) FROM righe_preventivo WHERE preventivo_id = p.id) AS num_righe
         FROM preventivi p
         LEFT JOIN clienti c ON c.id = p.cliente_id
         ORDER BY p.data_creazione DESC, p.id DESC
         LIMIT 10"
    ).map_err(|e| e.to_string())?;
    let ultimi_preventivi: Vec<PreventivoRecente> = stmt.query_map([], |row| {
        Ok(PreventivoRecente {
            id: row.get(0)?,
            numero: row.get(1)?,
            stato: row.get(2)?,
            data_creazione: row.get(3)?,
            cliente_nome: row.get(4)?,
            totale_finale: row.get(5)?,
            profit: row.get(6)?,
            num_righe: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    // 6) Materiali più utilizzati
    let mut stmt = db.prepare(
        "SELECT rm.materiale_id,
                m.nome,
                COALESCE(SUM(rm.peso_grammi), 0) / 1000.0 AS peso_kg,
                COUNT(*) AS utilizzi
         FROM riga_materiali rm
         JOIN materiali m ON m.id = rm.materiale_id
         GROUP BY rm.materiale_id
         ORDER BY peso_kg DESC
         LIMIT 8"
    ).map_err(|e| e.to_string())?;
    let top_materiali: Vec<TopMateriale> = stmt.query_map([], |row| {
        Ok(TopMateriale {
            materiale_id: row.get(0)?,
            nome: row.get(1)?,
            peso_totale_kg: row.get(2)?,
            num_utilizzi: row.get(3)?,
        })
    }).map_err(|e| e.to_string())?.filter_map(|r| r.ok()).collect();

    Ok(DashboardStats {
        totale_preventivi,
        preventivi_confermati,
        fatturato_totale,
        profit_totale,
        materiale_totale_kg,
        tempo_stampa_totale_ore,
        per_stato,
        trend_mensile,
        top_clienti,
        ultimi_preventivi,
        top_materiali,
        tasso_conversione,
        valore_medio,
    })
}

/// Converte "2025-03" → "Mar 2025"
fn format_mese_label(mese_str: &str) -> String {
    let parts: Vec<&str> = mese_str.split('-').collect();
    if parts.len() != 2 { return mese_str.to_string(); }
    let month_name = match parts[1] {
        "01" => "Gen", "02" => "Feb", "03" => "Mar",
        "04" => "Apr", "05" => "Mag", "06" => "Giu",
        "07" => "Lug", "08" => "Ago", "09" => "Set",
        "10" => "Ott", "11" => "Nov", "12" => "Dic",
        _ => parts[1],
    };
    format!("{} {}", month_name, parts[0])
}
