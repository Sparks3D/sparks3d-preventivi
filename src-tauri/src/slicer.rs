use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

// ============================================================
// Strutture dati condivise
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SlicerProfileEntry {
    pub nome: String,
    pub path: String,
    pub tipo: String,       // "filament", "machine", "process"
    pub origin: String,     // "bambu", "orca", "anycubic", "prusa"
    pub is_user: bool,
    pub params: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SlicerInfoResult {
    pub installed: bool,
    pub path: String,
    pub is_beta: bool,
    pub user_profiles_path: String,
    pub builtin_profiles_path: String,
}

// ============================================================
// Enum slicer supportati
// ============================================================

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SlicerType {
    Bambu,
    Orca,
    Anycubic,
}

impl SlicerType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "bambu" => Some(Self::Bambu),
            "orca" => Some(Self::Orca),
            "anycubic" => Some(Self::Anycubic),
            _ => None,
        }
    }

    pub fn origin_tag(&self) -> &'static str {
        match self {
            Self::Bambu => "bambu",
            Self::Orca => "orca",
            Self::Anycubic => "anycubic",
        }
    }
}

// ============================================================
// Rilevamento installazione
// ============================================================

/// Rileva l'eseguibile di Bambu Studio
pub fn detect_bambu_studio(is_beta: bool) -> Option<PathBuf> {
    let candidates = vec![
        std::env::var("ProgramFiles").ok(),
        std::env::var("ProgramFiles(x86)").ok(),
        Some("C:\\Program Files".to_string()),
    ];
    let folder = if is_beta { "BambuStudioBeta" } else { "Bambu Studio" };
    for base in candidates.into_iter().flatten() {
        let path = PathBuf::from(&base).join(folder).join("bambu-studio.exe");
        if path.exists() { return Some(path); }
    }
    None
}

/// Rileva l'eseguibile di Orca Slicer
pub fn detect_orca_slicer() -> Option<PathBuf> {
    let candidates = vec![
        std::env::var("ProgramFiles").ok(),
        std::env::var("ProgramFiles(x86)").ok(),
        Some("C:\\Program Files".to_string()),
    ];
    // Orca Slicer si installa tipicamente in "OrcaSlicer" 
    let folders = ["OrcaSlicer", "Orca Slicer"];
    let exes = ["orca-slicer.exe", "OrcaSlicer.exe"];

    for base in candidates.into_iter().flatten() {
        for folder in &folders {
            for exe in &exes {
                let path = PathBuf::from(&base).join(folder).join(exe);
                if path.exists() { return Some(path); }
            }
        }
    }
    None
}

/// Rileva l'eseguibile di Anycubic Slicer Next
pub fn detect_anycubic_slicer() -> Option<PathBuf> {
    let candidates = vec![
        std::env::var("ProgramFiles").ok(),
        std::env::var("ProgramFiles(x86)").ok(),
        Some("C:\\Program Files".to_string()),
    ];
    let folders = ["AnycubicSlicerNext", "Anycubic Slicer Next"];
    let exes = ["AnycubicSlicerNext.exe", "anycubic-slicer-next.exe", "AnycubicSlicer.exe"];

    for base in candidates.into_iter().flatten() {
        for folder in &folders {
            for exe in &exes {
                let path = PathBuf::from(&base).join(folder).join(exe);
                if path.exists() { return Some(path); }
            }
        }
    }
    None
}

/// Rileva l'eseguibile per qualsiasi slicer supportato
pub fn detect_exe(slicer: SlicerType, is_beta: bool) -> Option<PathBuf> {
    match slicer {
        SlicerType::Bambu => detect_bambu_studio(is_beta),
        SlicerType::Orca => detect_orca_slicer(),
        SlicerType::Anycubic => detect_anycubic_slicer(),
    }
}

// ============================================================
// Directory profili AppData
// ============================================================

/// Percorso AppData per Bambu Studio
/// → %APPDATA%\BambuStudio  (C:\Users\X\AppData\Roaming\BambuStudio)
fn get_bambu_appdata_dir(is_beta: bool) -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    let folder = if is_beta { "BambuStudioBeta" } else { "BambuStudio" };
    let base = PathBuf::from(&appdata).join(folder);
    if base.exists() { return Some(base); }

    // Fallback con spazio
    let folder2 = if is_beta { "Bambu Studio Beta" } else { "Bambu Studio" };
    let base2 = PathBuf::from(&appdata).join(folder2);
    if base2.exists() { return Some(base2); }

    None
}

/// Percorso AppData per Orca Slicer
/// → %APPDATA%\OrcaSlicer  (C:\Users\X\AppData\Roaming\OrcaSlicer)
fn get_orca_appdata_dir() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    // Orca usa "OrcaSlicer" come nome cartella
    let candidates = ["OrcaSlicer", "Orca Slicer"];
    for name in &candidates {
        let base = PathBuf::from(&appdata).join(name);
        if base.exists() { return Some(base); }
    }
    None
}

/// Percorso AppData per Anycubic Slicer Next
/// → %APPDATA%\AnycubicSlicerNext  (C:\Users\X\AppData\Roaming\AnycubicSlicerNext)
fn get_anycubic_appdata_dir() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    let candidates = ["AnycubicSlicerNext", "Anycubic Slicer Next"];
    for name in &candidates {
        let base = PathBuf::from(&appdata).join(name);
        if base.exists() { return Some(base); }
    }
    None
}

/// Percorso AppData generico per slicer
fn get_appdata_dir(slicer: SlicerType, is_beta: bool) -> Option<PathBuf> {
    match slicer {
        SlicerType::Bambu => get_bambu_appdata_dir(is_beta),
        SlicerType::Orca => get_orca_appdata_dir(),
        SlicerType::Anycubic => get_anycubic_appdata_dir(),
    }
}

// ============================================================
// Scansione ricorsiva cartelle profili
// ============================================================

/// Trova tutte le directory che contengono filament/machine/process
/// Sia Bambu Studio che Orca Slicer possono avere strutture tipo:
///   <root>/user/<user_id>/filament/
///   <root>/user/<user_id>/base/filament/
///   <root>/system/BBL/filament/
///   <root>/filament/
fn find_profile_roots(base: &PathBuf, max_depth: u32) -> Vec<(PathBuf, bool)> {
    let mut roots = Vec::new();
    find_profile_roots_recursive(base, max_depth, 0, &mut roots);
    roots
}

fn find_profile_roots_recursive(
    dir: &PathBuf, max_depth: u32, current_depth: u32,
    roots: &mut Vec<(PathBuf, bool)>,
) {
    if current_depth > max_depth || !dir.is_dir() { return; }

    let has_filament = dir.join("filament").is_dir();
    let has_machine = dir.join("machine").is_dir();
    let has_process = dir.join("process").is_dir();

    if has_filament || has_machine || has_process {
        let path_str = dir.to_string_lossy().to_lowercase();
        let is_user = path_str.contains("user") || !path_str.contains("system");
        roots.push((dir.clone(), is_user));
    }

    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if !name.starts_with('.') && name != "cache" && name != "log" && name != "crash" {
                    find_profile_roots_recursive(&path, max_depth, current_depth + 1, roots);
                }
            }
        }
    }
}

// ============================================================
// Info slicer
// ============================================================

pub fn get_info(is_beta: bool) -> SlicerInfoResult {
    // Per retrocompatibilità questo restituisce solo info Bambu Studio
    get_info_for(SlicerType::Bambu, is_beta)
}

pub fn get_info_for(slicer: SlicerType, is_beta: bool) -> SlicerInfoResult {
    let exe = detect_exe(slicer, is_beta);
    let appdata = get_appdata_dir(slicer, is_beta);

    let user_path = appdata.as_ref()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    // Builtin profiles (nella cartella di installazione)
    let builtin = exe.as_ref()
        .and_then(|p| p.parent().map(|pp| pp.join("resources").join("profiles")))
        .filter(|p| p.exists());
    let builtin_path = builtin
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    SlicerInfoResult {
        installed: exe.is_some() || appdata.is_some(),
        path: exe.map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        is_beta,
        user_profiles_path: user_path,
        builtin_profiles_path: builtin_path,
    }
}

// ============================================================
// Scansione profili
// ============================================================

/// Scansiona i profili per un determinato slicer
pub fn scan_profiles(tipo: &str, is_beta: bool, solo_utente: bool) -> Vec<SlicerProfileEntry> {
    // Retrocompatibilità: scansiona solo Bambu
    scan_profiles_for(SlicerType::Bambu, tipo, is_beta, solo_utente)
}

/// Scansiona i profili per uno specifico slicer
pub fn scan_profiles_for(
    slicer: SlicerType, tipo: &str, is_beta: bool, solo_utente: bool,
) -> Vec<SlicerProfileEntry> {
    let mut results = Vec::new();
    let origin = slicer.origin_tag();

    // 1) Scansiona AppData\Roaming\<SlicerFolder>
    if let Some(appdata_dir) = get_appdata_dir(slicer, is_beta) {
        let roots = find_profile_roots(&appdata_dir, 4);
        for (root, is_user) in &roots {
            if solo_utente && !is_user { continue; }
            let type_dir = root.join(tipo);
            if type_dir.exists() {
                scan_directory(&type_dir, tipo, origin, *is_user, &mut results);
            }
        }

        // Se non ha trovato roots con sottocartelle, prova direttamente
        if roots.is_empty() {
            let direct = appdata_dir.join(tipo);
            if direct.exists() {
                scan_directory(&direct, tipo, origin, true, &mut results);
            }
        }
    }

    // 2) Scansiona profili builtin dall'installazione (se non solo_utente)
    if !solo_utente {
        if let Some(exe_path) = detect_exe(slicer, is_beta) {
            if let Some(install_dir) = exe_path.parent() {
                let profiles_dir = install_dir.join("resources").join("profiles");
                if profiles_dir.exists() {
                    let roots = find_profile_roots(&profiles_dir, 3);
                    for (root, _) in &roots {
                        let type_dir = root.join(tipo);
                        if type_dir.exists() {
                            scan_directory(&type_dir, tipo, origin, false, &mut results);
                        }
                    }
                }
            }
        }
    }

    // 3) Deduplica per nome (preferisci profili utente)
    let mut seen: HashMap<String, SlicerProfileEntry> = HashMap::new();
    for profile in &results {
        let entry = seen.entry(profile.nome.clone()).or_insert_with(|| profile.clone());
        if profile.is_user && !entry.is_user {
            *entry = profile.clone();
        }
    }
    let mut deduped: Vec<SlicerProfileEntry> = seen.into_values().collect();
    deduped.sort_by(|a, b| a.nome.to_lowercase().cmp(&b.nome.to_lowercase()));
    deduped
}

// ============================================================
// Scansione directory e parsing JSON
// ============================================================

fn scan_directory(
    dir: &PathBuf, tipo: &str, origin: &str, is_user: bool,
    results: &mut Vec<SlicerProfileEntry>,
) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();

        if path.extension().map_or(false, |ext| ext == "json") {
            if let Some(profile) = parse_profile_file(&path, tipo, origin, is_user) {
                results.push(profile);
            }
        }

        // Scansiona anche sottocartelle (Bambu/Orca/Anycubic organizza per brand)
        if path.is_dir() {
            scan_directory(&path, tipo, origin, is_user, results);
        }
    }
}

fn parse_profile_file(
    path: &PathBuf, tipo: &str, origin: &str, is_user: bool,
) -> Option<SlicerProfileEntry> {
    let content = std::fs::read_to_string(path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;

    let nome = json.get("name")
        .and_then(|v| v.as_str())
        .or_else(|| path.file_stem().and_then(|s| s.to_str()))
        .unwrap_or("Unknown")
        .to_string();

    if nome.is_empty() || nome == "Unknown" { return None; }

    let mut params = HashMap::new();

    if let serde_json::Value::Object(map) = &json {
        for (key, value) in map {
            let dominated = match tipo {
                "filament" => matches!(key.as_str(),
                    "name" | "filament_type" | "filament_density" | "filament_cost" |
                    "filament_colour" | "nozzle_temperature" | "bed_temperature" |
                    "filament_max_volumetric_speed" | "inherits" | "compatible_printers" |
                    // Orca Slicer / Anycubic Slicer Next usano anche questi campi
                    "nozzle_temperature_initial_layer" | "bed_temperature_initial_layer" |
                    "filament_retraction_length" | "filament_retraction_speed"
                ),
                "machine" => matches!(key.as_str(),
                    "name" | "printer_model" | "printer_variant" | "printable_area" |
                    "printable_height" | "nozzle_diameter" | "inherits" |
                    "machine_max_speed_x" | "machine_max_speed_y" |
                    // Orca / Anycubic aggiungono anche
                    "machine_max_speed_z" | "machine_max_speed_e" |
                    "extruder_count" | "default_filament_profile"
                ),
                "process" => matches!(key.as_str(),
                    "name" | "layer_height" | "wall_loops" | "sparse_infill_density" |
                    "top_shell_layers" | "bottom_shell_layers" | "enable_support" |
                    "support_type" | "inherits" | "initial_layer_height" |
                    "outer_wall_speed" | "inner_wall_speed" | "infill_density" |
                    // Orca / Anycubic aggiungono anche
                    "travel_speed" | "bridge_speed" | "gap_infill_speed" |
                    "sparse_infill_speed" | "internal_solid_infill_speed"
                ),
                _ => false,
            };
            if dominated {
                params.insert(key.clone(), value.clone());
            }
        }
    }

    Some(SlicerProfileEntry {
        nome,
        path: path.to_string_lossy().to_string(),
        tipo: tipo.to_string(),
        origin: origin.to_string(),
        is_user,
        params,
    })
}
