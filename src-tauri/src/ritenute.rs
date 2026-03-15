// src-tauri/src/ritenute.rs
// Sparks3D Preventivi – Archivio Ritenute + Gestione Documenti
// ==============================================================

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;
use crate::AppState;

// ── Strutture ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ritenuta {
    pub id: i64,
    pub preventivo_id: Option<i64>,
    pub preventivo_numero: String,
    pub numero_ritenuta: String,
    pub data: String,
    pub cliente_id: Option<i64>,
    pub cliente_nome: String,
    pub importo_lordo: f64,
    pub ritenuta_importo: f64,
    pub netto_pagare: f64,
    pub marca_bollo: f64,
    pub descrizione: String,
    pub pdf_path: String,
    pub note: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CreateRitenutaInput {
    pub preventivo_id: Option<i64>,
    pub preventivo_numero: String,
    pub numero_ritenuta: String,
    pub data: String,
    pub cliente_id: Option<i64>,
    pub cliente_nome: String,
    pub importo_lordo: f64,
    pub ritenuta_importo: f64,
    pub netto_pagare: f64,
    pub marca_bollo: f64,
    pub descrizione: String,
    pub pdf_path: String,
    pub note: String,
}

#[derive(Debug, Serialize)]
pub struct DocumentsFolders {
    pub base: String,
    pub preventivi: String,
    pub ritenute: String,
}

// ── Comandi Tauri ──

/// Restituisce (e crea se necessario) le cartelle Documenti/Sparks3D/...
#[tauri::command]
pub fn get_documents_folder() -> Result<DocumentsFolders, String> {
    let docs = dirs::document_dir()
        .ok_or("Impossibile trovare la cartella Documenti")?;

    let base = docs.join("Sparks3D");
    let preventivi = base.join("Preventivi");
    let ritenute = base.join("Ritenute");

    std::fs::create_dir_all(&preventivi)
        .map_err(|e| format!("Errore creazione cartella Preventivi: {e}"))?;
    std::fs::create_dir_all(&ritenute)
        .map_err(|e| format!("Errore creazione cartella Ritenute: {e}"))?;

    Ok(DocumentsFolders {
        base: base.to_string_lossy().to_string(),
        preventivi: preventivi.to_string_lossy().to_string(),
        ritenute: ritenute.to_string_lossy().to_string(),
    })
}

/// Salva un file PDF (dati base64) nella cartella specificata.
/// Restituisce il path completo del file salvato.
#[tauri::command]
pub fn save_pdf_to_documents(
    folder: String,
    filename: String,
    base64_data: String,
) -> Result<String, String> {
    use base64::Engine;

    let folder_path = std::path::Path::new(&folder);
    std::fs::create_dir_all(folder_path)
        .map_err(|e| format!("Errore creazione cartella: {e}"))?;

    let dest = folder_path.join(&filename);

    // Rimuovi eventuale prefisso data:application/pdf;base64,
    let clean_b64 = if let Some(pos) = base64_data.find(",") {
        &base64_data[pos + 1..]
    } else {
        &base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(clean_b64)
        .map_err(|e| format!("Errore decodifica base64: {e}"))?;

    std::fs::write(&dest, &bytes)
        .map_err(|e| format!("Errore scrittura PDF: {e}"))?;

    Ok(dest.to_string_lossy().to_string())
}

/// Apre la cartella contenente il file nell'explorer di sistema
#[tauri::command]
pub fn open_file_in_explorer(path: String) -> Result<(), String> {
    let file_path = std::path::Path::new(&path);

    if !file_path.exists() {
        return Err(format!("File non trovato: {}", path));
    }

    // Su Windows: explorer /select,"path"
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg("/select,")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Errore apertura explorer: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Errore apertura finder: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(file_path.parent().unwrap_or(file_path))
            .spawn()
            .map_err(|e| format!("Errore apertura file manager: {e}"))?;
    }

    Ok(())
}

/// Apre direttamente il file PDF con il viewer predefinito del sistema
#[tauri::command]
pub fn open_pdf_file(path: String) -> Result<(), String> {
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err(format!("File non trovato: {}", path));
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Errore apertura PDF: {e}"))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Errore apertura PDF: {e}"))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Errore apertura PDF: {e}"))?;
    }

    Ok(())
}

// ── CRUD Ritenute ──

#[tauri::command]
pub fn get_ritenute(state: State<AppState>) -> Result<Vec<Ritenuta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = db.prepare(
        "SELECT id, preventivo_id, preventivo_numero, numero_ritenuta, data,
                cliente_id, cliente_nome, importo_lordo, ritenuta_importo,
                netto_pagare, marca_bollo, descrizione, pdf_path, note, created_at
         FROM ritenute ORDER BY data DESC, id DESC"
    ).map_err(|e| e.to_string())?;

    let items = stmt.query_map([], |row| Ok(Ritenuta {
        id: row.get(0)?,
        preventivo_id: row.get(1)?,
        preventivo_numero: row.get(2)?,
        numero_ritenuta: row.get(3)?,
        data: row.get(4)?,
        cliente_id: row.get(5)?,
        cliente_nome: row.get(6)?,
        importo_lordo: row.get(7)?,
        ritenuta_importo: row.get(8)?,
        netto_pagare: row.get(9)?,
        marca_bollo: row.get(10)?,
        descrizione: row.get(11)?,
        pdf_path: row.get(12)?,
        note: row.get(13)?,
        created_at: row.get(14)?,
    })).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(items)
}

#[tauri::command]
pub fn create_ritenuta(
    state: State<AppState>,
    data: CreateRitenutaInput,
) -> Result<Ritenuta, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT INTO ritenute (preventivo_id, preventivo_numero, numero_ritenuta, data,
         cliente_id, cliente_nome, importo_lordo, ritenuta_importo, netto_pagare,
         marca_bollo, descrizione, pdf_path, note)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        params![
            data.preventivo_id, data.preventivo_numero, data.numero_ritenuta,
            data.data, data.cliente_id, data.cliente_nome,
            data.importo_lordo, data.ritenuta_importo, data.netto_pagare,
            data.marca_bollo, data.descrizione, data.pdf_path, data.note,
        ],
    ).map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();
    let created_at: String = db.query_row(
        "SELECT created_at FROM ritenute WHERE id=?1", params![id],
        |row| row.get(0)
    ).unwrap_or_default();

    Ok(Ritenuta {
        id,
        preventivo_id: data.preventivo_id,
        preventivo_numero: data.preventivo_numero,
        numero_ritenuta: data.numero_ritenuta,
        data: data.data,
        cliente_id: data.cliente_id,
        cliente_nome: data.cliente_nome,
        importo_lordo: data.importo_lordo,
        ritenuta_importo: data.ritenuta_importo,
        netto_pagare: data.netto_pagare,
        marca_bollo: data.marca_bollo,
        descrizione: data.descrizione,
        pdf_path: data.pdf_path,
        note: data.note,
        created_at,
    })
}

#[tauri::command]
pub fn delete_ritenuta(state: State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // Recupera path PDF per eliminare anche il file
    let pdf_path: Option<String> = db.query_row(
        "SELECT pdf_path FROM ritenute WHERE id=?1", params![id],
        |row| row.get(0)
    ).ok();

    db.execute("DELETE FROM ritenute WHERE id=?1", params![id])
        .map_err(|e| e.to_string())?;

    // Prova ad eliminare il file PDF (se esiste)
    if let Some(path) = pdf_path {
        if !path.is_empty() {
            let _ = std::fs::remove_file(&path);
        }
    }

    Ok(())
}

/// Restituisce il prossimo numero ritenuta (RIT-ANNO-NNN)
#[tauri::command]
pub fn get_prossimo_numero_ritenuta(state: State<AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let anno = chrono::Local::now().format("%Y").to_string();
    let prefix = format!("RIT-{}-", anno);

    let count: i64 = db.query_row(
        "SELECT COUNT(*) FROM ritenute WHERE numero_ritenuta LIKE ?1",
        params![format!("{}%", prefix)],
        |row| row.get(0),
    ).unwrap_or(0);

    Ok(format!("{}{:03}", prefix, count + 1))
}
