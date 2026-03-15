// src-tauri/src/backup.rs
// Sparks3D Preventivi – Backup e Ripristino Dati
// =================================================

use serde::Serialize;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;

// ── Strutture ──

#[derive(Debug, Serialize, Clone)]
pub struct BackupInfo {
    pub db_path: String,
    pub db_size_mb: f64,
    pub logos_path: String,
    pub logos_count: usize,
    pub logos_size_mb: f64,
    pub documenti_path: String,
    pub documenti_preventivi_count: usize,
    pub documenti_ritenute_count: usize,
    pub documenti_size_mb: f64,
    pub totale_size_mb: f64,
}

#[derive(Debug, Serialize, Clone)]
pub struct BackupResult {
    pub success: bool,
    pub path: String,
    pub size_mb: f64,
    pub files_count: usize,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct RestoreResult {
    pub success: bool,
    pub db_restored: bool,
    pub logos_restored: usize,
    pub pdf_preventivi_restored: usize,
    pub pdf_ritenute_restored: usize,
    pub message: String,
}

// ── Helper: percorsi standard ──

fn get_app_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Sparks3DPreventivi")
}

fn get_documents_dir() -> PathBuf {
    dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Sparks3D")
}

fn dir_size(path: &Path) -> u64 {
    if !path.exists() { return 0; }
    fs::read_dir(path)
        .map(|entries| {
            entries.filter_map(|e| e.ok())
                .map(|e| {
                    let p = e.path();
                    if p.is_dir() { dir_size(&p) } else { e.metadata().map(|m| m.len()).unwrap_or(0) }
                })
                .sum()
        })
        .unwrap_or(0)
}

fn count_files(path: &Path, ext: Option<&str>) -> usize {
    if !path.exists() { return 0; }
    fs::read_dir(path)
        .map(|entries| {
            entries.filter_map(|e| e.ok())
                .filter(|e| {
                    let p = e.path();
                    if p.is_dir() { return false; }
                    match ext {
                        Some(ex) => p.extension().and_then(|x| x.to_str()).map(|x| x.eq_ignore_ascii_case(ex)).unwrap_or(false),
                        None => true,
                    }
                })
                .count()
        })
        .unwrap_or(0)
}

/// Aggiunge ricorsivamente tutti i file di una cartella allo zip
fn add_dir_to_zip<W: Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    source: &Path,
    prefix: &str,
    options: SimpleFileOptions,
    count: &mut usize,
) -> Result<(), String> {
    if !source.exists() { return Ok(()); }

    let entries = fs::read_dir(source).map_err(|e| format!("Errore lettura {}: {e}", source.display()))?;

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = entry.file_name();
        let zip_path = if prefix.is_empty() {
            name.to_string_lossy().to_string()
        } else {
            format!("{}/{}", prefix, name.to_string_lossy())
        };

        if path.is_dir() {
            add_dir_to_zip(zip, &path, &zip_path, options, count)?;
        } else {
            let mut file = fs::File::open(&path)
                .map_err(|e| format!("Errore apertura {}: {e}", path.display()))?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)
                .map_err(|e| format!("Errore lettura {}: {e}", path.display()))?;

            zip.start_file(&zip_path, options)
                .map_err(|e| format!("Errore zip {}: {e}", zip_path))?;
            zip.write_all(&buffer)
                .map_err(|e| format!("Errore scrittura zip: {e}"))?;
            *count += 1;
        }
    }

    Ok(())
}

// ── Comandi Tauri ──

/// Informazioni sui dati da backuppare
#[tauri::command]
pub fn get_backup_info() -> Result<BackupInfo, String> {
    let app_data = get_app_data_dir();
    let docs = get_documents_dir();

    let db_path = app_data.join("sparks3d.db");
    let logos_path = app_data.join("logos");
    let prev_path = docs.join("Preventivi");
    let rit_path = docs.join("Ritenute");

    let db_size = if db_path.exists() {
        fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0)
    } else { 0 };

    let logos_size = dir_size(&logos_path);
    let docs_size = dir_size(&prev_path) + dir_size(&rit_path);

    let totale = db_size + logos_size + docs_size;

    Ok(BackupInfo {
        db_path: db_path.to_string_lossy().to_string(),
        db_size_mb: db_size as f64 / 1_048_576.0,
        logos_path: logos_path.to_string_lossy().to_string(),
        logos_count: count_files(&logos_path, None),
        logos_size_mb: logos_size as f64 / 1_048_576.0,
        documenti_path: docs.to_string_lossy().to_string(),
        documenti_preventivi_count: count_files(&prev_path, Some("pdf")),
        documenti_ritenute_count: count_files(&rit_path, Some("pdf")),
        documenti_size_mb: docs_size as f64 / 1_048_576.0,
        totale_size_mb: totale as f64 / 1_048_576.0,
    })
}

/// Crea il backup .zip nella destinazione specificata
#[tauri::command]
pub fn create_backup(
    dest_path: String,
    include_db: bool,
    include_logos: bool,
    include_documenti: bool,
) -> Result<BackupResult, String> {
    let app_data = get_app_data_dir();
    let docs = get_documents_dir();

    let file = fs::File::create(&dest_path)
        .map_err(|e| format!("Errore creazione file backup: {e}"))?;

    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .compression_level(Some(6));

    let mut files_count: usize = 0;

    // 1) Database SQLite
    if include_db {
        let db_path = app_data.join("sparks3d.db");
        if db_path.exists() {
            // Copia il DB prima (per evitare lock WAL)
            let tmp_db = app_data.join("sparks3d_backup_tmp.db");
            fs::copy(&db_path, &tmp_db)
                .map_err(|e| format!("Errore copia DB: {e}"))?;

            let mut db_file = fs::File::open(&tmp_db)
                .map_err(|e| format!("Errore apertura DB: {e}"))?;
            let mut db_buf = Vec::new();
            db_file.read_to_end(&mut db_buf)
                .map_err(|e| format!("Errore lettura DB: {e}"))?;

            zip.start_file("sparks3d.db", options)
                .map_err(|e| format!("Errore zip DB: {e}"))?;
            zip.write_all(&db_buf)
                .map_err(|e| format!("Errore scrittura zip DB: {e}"))?;

            files_count += 1;
            let _ = fs::remove_file(&tmp_db);
        }

        // Anche i file WAL/SHM se esistono
        for wal_ext in &["sparks3d.db-wal", "sparks3d.db-shm"] {
            let wal_path = app_data.join(wal_ext);
            if wal_path.exists() {
                let mut f = fs::File::open(&wal_path).map_err(|e| e.to_string())?;
                let mut buf = Vec::new();
                f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
                zip.start_file(*wal_ext, options).map_err(|e| e.to_string())?;
                zip.write_all(&buf).map_err(|e| e.to_string())?;
                files_count += 1;
            }
        }
    }

    // 2) Logos
    if include_logos {
        let logos_path = app_data.join("logos");
        add_dir_to_zip(&mut zip, &logos_path, "logos", options, &mut files_count)?;
    }

    // 3) Documenti PDF
    if include_documenti {
        let prev_path = docs.join("Preventivi");
        let rit_path = docs.join("Ritenute");
        add_dir_to_zip(&mut zip, &prev_path, "Documenti/Preventivi", options, &mut files_count)?;
        add_dir_to_zip(&mut zip, &rit_path, "Documenti/Ritenute", options, &mut files_count)?;
    }

    // Scrivi manifest
    let manifest = format!(
        "Sparks3D Backup\nData: {}\nVersione: 1.0.0\nFile inclusi: {}\nDB: {}\nLogos: {}\nDocumenti: {}",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        files_count,
        include_db, include_logos, include_documenti,
    );
    zip.start_file("_manifest.txt", options).map_err(|e| e.to_string())?;
    zip.write_all(manifest.as_bytes()).map_err(|e| e.to_string())?;
    files_count += 1;

    zip.finish().map_err(|e| format!("Errore finalizzazione zip: {e}"))?;

    let size = fs::metadata(&dest_path).map(|m| m.len()).unwrap_or(0);

    Ok(BackupResult {
        success: true,
        path: dest_path,
        size_mb: size as f64 / 1_048_576.0,
        files_count,
        message: format!("Backup completato: {} file, {:.2} MB", files_count, size as f64 / 1_048_576.0),
    })
}

/// Ripristina da un file .zip
#[tauri::command]
pub fn restore_backup(
    source_path: String,
    restore_db: bool,
    restore_logos: bool,
    restore_documenti: bool,
) -> Result<RestoreResult, String> {
    let app_data = get_app_data_dir();
    let docs = get_documents_dir();

    let file = fs::File::open(&source_path)
        .map_err(|e| format!("Errore apertura backup: {e}"))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Errore lettura zip: {e}"))?;

    let mut db_restored = false;
    let mut logos_restored: usize = 0;
    let mut pdf_prev_restored: usize = 0;
    let mut pdf_rit_restored: usize = 0;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("Errore lettura entry zip: {e}"))?;

        let name = entry.name().to_string();

        // Skip directory entries e manifest
        if entry.is_dir() || name == "_manifest.txt" { continue; }

        let mut buffer = Vec::new();
        entry.read_to_end(&mut buffer)
            .map_err(|e| format!("Errore lettura {}: {e}", name))?;

        // Database → salva in file "pending" (verrà applicato al riavvio)
        if restore_db && (name == "sparks3d.db" || name == "sparks3d.db-wal" || name == "sparks3d.db-shm") {
            let staged_name = name.replace("sparks3d.", "sparks3d_restore_pending.");
            let dest = app_data.join(&staged_name);
            fs::create_dir_all(&app_data).ok();
            fs::write(&dest, &buffer)
                .map_err(|e| format!("Errore ripristino DB: {e}"))?;
            if name == "sparks3d.db" { db_restored = true; }
        }

        // Logos
        if restore_logos && name.starts_with("logos/") {
            let rel = name.strip_prefix("logos/").unwrap_or(&name);
            if rel.is_empty() { continue; }
            let dest = app_data.join("logos").join(rel);
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).ok();
            }
            fs::write(&dest, &buffer)
                .map_err(|e| format!("Errore ripristino logo: {e}"))?;
            logos_restored += 1;
        }

        // Documenti Preventivi
        if restore_documenti && name.starts_with("Documenti/Preventivi/") {
            let rel = name.strip_prefix("Documenti/Preventivi/").unwrap_or(&name);
            if rel.is_empty() { continue; }
            let dest = docs.join("Preventivi").join(rel);
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).ok();
            }
            fs::write(&dest, &buffer)
                .map_err(|e| format!("Errore ripristino preventivo PDF: {e}"))?;
            pdf_prev_restored += 1;
        }

        // Documenti Ritenute
        if restore_documenti && name.starts_with("Documenti/Ritenute/") {
            let rel = name.strip_prefix("Documenti/Ritenute/").unwrap_or(&name);
            if rel.is_empty() { continue; }
            let dest = docs.join("Ritenute").join(rel);
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).ok();
            }
            fs::write(&dest, &buffer)
                .map_err(|e| format!("Errore ripristino ritenuta PDF: {e}"))?;
            pdf_rit_restored += 1;
        }
    }

    let totale = (if db_restored { 1 } else { 0 }) + logos_restored + pdf_prev_restored + pdf_rit_restored;

    Ok(RestoreResult {
        success: true,
        db_restored,
        logos_restored,
        pdf_preventivi_restored: pdf_prev_restored,
        pdf_ritenute_restored: pdf_rit_restored,
        message: {
            let mut msg = format!("Ripristino completato: {} elementi.", totale);
            if db_restored { msg.push_str(" Database pronto — verrà applicato al prossimo riavvio dell'app."); }
            if logos_restored > 0 { msg.push_str(&format!(" {} logo.", logos_restored)); }
            if pdf_prev_restored + pdf_rit_restored > 0 {
                msg.push_str(&format!(" {} PDF ripristinati.", pdf_prev_restored + pdf_rit_restored));
            }
            msg
        },
    })
}
