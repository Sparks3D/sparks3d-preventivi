// src-tauri/src/updater.rs
// Sparks3D Preventivi — Auto-updater (tauri-plugin-updater)

use serde::Serialize;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub date: Option<String>,
}

/// Controlla se esiste un aggiornamento disponibile.
/// Restituisce Some(UpdateInfo) se c'è una versione più recente, None altrimenti.
#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    Ok(update.map(|u| UpdateInfo {
        version: u.version.clone(),
        body: u.body.clone(),
        date: u.date.map(|d| d.to_string()),
    }))
}

/// Scarica e installa l'aggiornamento disponibile.
/// Dopo l'installazione l'app si riavvia automaticamente.
#[tauri::command]
pub async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        update
            .download_and_install(|_chunk, _total| {}, || {})
            .await
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
