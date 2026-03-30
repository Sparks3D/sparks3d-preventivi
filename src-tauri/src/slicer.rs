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
    Prusa,
}

impl SlicerType {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "bambu" => Some(Self::Bambu),
            "orca" => Some(Self::Orca),
            "anycubic" => Some(Self::Anycubic),
            "prusa" => Some(Self::Prusa),
            _ => None,
        }
    }

    pub fn origin_tag(&self) -> &'static str {
        match self {
            Self::Bambu => "bambu",
            Self::Orca => "orca",
            Self::Anycubic => "anycubic",
            Self::Prusa => "prusa",
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

/// Rileva l'eseguibile di Prusa Slicer
pub fn detect_prusa_slicer() -> Option<PathBuf> {
    let candidates = vec![
        std::env::var("ProgramFiles").ok(),
        std::env::var("ProgramFiles(x86)").ok(),
        Some("C:\\Program Files".to_string()),
    ];
    // Prusa Slicer si installa in "Prusa3D\PrusaSlicer" oppure "PrusaSlicer"
    let folder_combos: Vec<(&str, &str)> = vec![
        ("Prusa3D", "PrusaSlicer"),
        ("PrusaSlicer", ""),
        ("Prusa3D", "PrusaSlicer 2"),
    ];
    let exes = ["prusa-slicer.exe", "PrusaSlicer.exe", "prusa-slicer-console.exe"];

    for base in candidates.into_iter().flatten() {
        for (parent, child) in &folder_combos {
            let folder = if child.is_empty() {
                PathBuf::from(&base).join(parent)
            } else {
                PathBuf::from(&base).join(parent).join(child)
            };
            for exe in &exes {
                let path = folder.join(exe);
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
        SlicerType::Prusa => detect_prusa_slicer(),
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

/// Percorso AppData per Prusa Slicer
/// → %APPDATA%\PrusaSlicer  (C:\Users\X\AppData\Roaming\PrusaSlicer)
fn get_prusa_appdata_dir() -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    let candidates = ["PrusaSlicer", "PrusaSlicer-alpha", "PrusaSlicer-beta"];
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
        SlicerType::Prusa => get_prusa_appdata_dir(),
    }
}

// ============================================================
// Mappatura nomi cartelle profili per slicer
// ============================================================

/// Prusa Slicer usa nomi cartella diversi da Bambu/Orca/Anycubic:
///   - "print"   invece di "process"
///   - "printer"  invece di "machine"
///   - "filament" è uguale
///
/// Questa funzione restituisce il nome cartella effettivo su disco
/// dato il tipo logico ("filament"/"machine"/"process") e lo slicer.
fn get_profile_folder_name(slicer: SlicerType, tipo: &str) -> &str {
    match slicer {
        SlicerType::Prusa => match tipo {
            "machine" => "printer",
            "process" => "print",
            _ => tipo, // "filament" resta uguale
        },
        _ => tipo, // Bambu/Orca/Anycubic usano i nomi standard
    }
}

// ============================================================
// Scansione ricorsiva cartelle profili
// ============================================================

/// Trova tutte le directory che contengono filament/machine/process (o print/printer per Prusa)
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
    // Prusa Slicer usa "printer" e "print" come nomi cartella
    let has_printer = dir.join("printer").is_dir();
    let has_print = dir.join("print").is_dir();

    if has_filament || has_machine || has_process || has_printer || has_print {
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
    let folder_name = get_profile_folder_name(slicer, tipo);

    // 1) Scansiona AppData\Roaming\<SlicerFolder>
    if let Some(appdata_dir) = get_appdata_dir(slicer, is_beta) {
        if slicer == SlicerType::Prusa {
            // Prusa Slicer: 
            // 1) Profili utente in <appdata>/print|filament|printer/ (file .ini singoli)
            let direct = appdata_dir.join(folder_name);
            if direct.exists() {
                scan_directory(&direct, tipo, origin, true, slicer, &mut results);
            }
            // 2) Vendor bundles in <appdata>/vendor/*.ini (file grandi con sezioni [tipo:nome])
            if !solo_utente {
                let vendor_dir = appdata_dir.join("vendor");
                if vendor_dir.exists() {
                    scan_prusa_vendor_bundles(&vendor_dir, tipo, origin, &mut results);
                }
            }
        } else {
            // Bambu/Orca/Anycubic: struttura nidificata con user/<id>/filament ecc.
            let roots = find_profile_roots(&appdata_dir, 4);
            for (root, is_user) in &roots {
                if solo_utente && !is_user { continue; }
                let type_dir = root.join(folder_name);
                if type_dir.exists() {
                    scan_directory(&type_dir, tipo, origin, *is_user, slicer, &mut results);
                }
            }

            // Se non ha trovato roots con sottocartelle, prova direttamente
            if roots.is_empty() {
                let direct = appdata_dir.join(folder_name);
                if direct.exists() {
                    scan_directory(&direct, tipo, origin, true, slicer, &mut results);
                }
            }
        }
    }

    // 2) Scansiona profili builtin dall'installazione (se non solo_utente)
    if !solo_utente {
        if let Some(exe_path) = detect_exe(slicer, is_beta) {
            if let Some(install_dir) = exe_path.parent() {
                let profiles_dir = install_dir.join("resources").join("profiles");
                if profiles_dir.exists() {
                    if slicer == SlicerType::Prusa {
                        // Prusa builtin: cerca direttamente nella cartella profiles
                        let type_dir = profiles_dir.join(folder_name);
                        if type_dir.exists() {
                            scan_directory(&type_dir, tipo, origin, false, slicer, &mut results);
                        }
                        // Anche dentro le sottocartelle vendor
                        scan_prusa_vendor_profiles(&profiles_dir, tipo, folder_name, origin, &mut results);
                    } else {
                        let roots = find_profile_roots(&profiles_dir, 3);
                        for (root, _) in &roots {
                            let type_dir = root.join(folder_name);
                            if type_dir.exists() {
                                scan_directory(&type_dir, tipo, origin, false, slicer, &mut results);
                            }
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

/// Scansiona le cartelle vendor di Prusa (es. resources/profiles/PrusaResearch/*.ini)
fn scan_prusa_vendor_profiles(
    profiles_dir: &PathBuf, tipo: &str, folder_name: &str,
    origin: &str, results: &mut Vec<SlicerProfileEntry>,
) {
    let Ok(entries) = std::fs::read_dir(profiles_dir) else { return };
    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_dir() {
            let type_dir = path.join(folder_name);
            if type_dir.exists() {
                scan_directory(&type_dir, tipo, origin, false, SlicerType::Prusa, results);
            }
        }
    }
}

/// Scansiona i file vendor bundle di Prusa Slicer.
/// 
/// Prusa Slicer salva tutti i profili preinstallati in file bundle unici
/// dentro `%APPDATA%\PrusaSlicer\vendor\` (es. PrusaResearch.ini).
///
/// Formato:
/// ```ini
/// [filament:Generic PLA]
/// filament_type = PLA
/// filament_density = 1.24
/// temperature = 215
///
/// [print:0.20mm QUALITY @MK4]
/// layer_height = 0.2
/// perimeters = 2
/// fill_density = 20%
///
/// [printer:Original Prusa MK4]
/// printer_model = MK4
/// nozzle_diameter = 0.4
/// ```
fn scan_prusa_vendor_bundles(
    vendor_dir: &PathBuf, tipo: &str, origin: &str,
    results: &mut Vec<SlicerProfileEntry>,
) {
    let Ok(entries) = std::fs::read_dir(vendor_dir) else { return };

    // Mappa il tipo logico al prefisso di sezione usato da Prusa nei bundle
    let section_prefix = match tipo {
        "filament" => "filament:",
        "machine" => "printer:",
        "process" => "print:",
        _ => return,
    };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.extension().map_or(false, |ext| ext == "ini") { continue; }

        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let bundle_path = path.to_string_lossy().to_string();

        // Parsa le sezioni del bundle
        let mut current_section_name: Option<String> = None;
        let mut current_params: HashMap<String, String> = HashMap::new();

        for line in content.lines() {
            let trimmed = line.trim();

            // Nuova sezione: [tipo:nome]
            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                // Salva la sezione precedente se era del tipo richiesto
                if let Some(ref name) = current_section_name {
                    if let Some(profile) = build_prusa_bundle_profile(
                        name, &current_params, tipo, origin, &bundle_path,
                    ) {
                        results.push(profile);
                    }
                }

                // Analizza la nuova sezione
                let inner = &trimmed[1..trimmed.len() - 1];
                if let Some(name) = inner.strip_prefix(section_prefix) {
                    let name = name.trim().to_string();
                    if !name.is_empty() {
                        current_section_name = Some(name);
                        current_params = HashMap::new();
                    } else {
                        current_section_name = None;
                    }
                } else {
                    current_section_name = None;
                }
                continue;
            }

            // Se siamo in una sezione valida, raccogli i parametri
            if current_section_name.is_some() {
                if trimmed.is_empty() || trimmed.starts_with('#') { continue; }
                if let Some(eq_pos) = trimmed.find('=') {
                    let key = trimmed[..eq_pos].trim().to_string();
                    let value = trimmed[eq_pos + 1..].trim().to_string();
                    if !key.is_empty() && !value.is_empty() {
                        current_params.insert(key, value);
                    }
                }
            }
        }

        // Non dimenticare l'ultima sezione del file
        if let Some(ref name) = current_section_name {
            if let Some(profile) = build_prusa_bundle_profile(
                name, &current_params, tipo, origin, &bundle_path,
            ) {
                results.push(profile);
            }
        }
    }
}

/// Costruisce un SlicerProfileEntry dai parametri di una sezione vendor bundle
fn build_prusa_bundle_profile(
    nome: &str, raw_params: &HashMap<String, String>,
    tipo: &str, origin: &str, bundle_path: &str,
) -> Option<SlicerProfileEntry> {
    if nome.is_empty() { return None; }

    let mut params: HashMap<String, serde_json::Value> = HashMap::new();

    match tipo {
        "filament" => {
            map_ini_param(raw_params, &mut params, "filament_type", "filament_type");
            map_ini_param(raw_params, &mut params, "filament_density", "filament_density");
            map_ini_param(raw_params, &mut params, "filament_cost", "filament_cost");
            map_ini_param(raw_params, &mut params, "filament_colour", "filament_colour");
            map_ini_param_first(raw_params, &mut params, "temperature", "nozzle_temperature");
            map_ini_param_first(raw_params, &mut params, "first_layer_temperature", "nozzle_temperature_initial_layer");
            map_ini_param_first(raw_params, &mut params, "bed_temperature", "bed_temperature");
            map_ini_param_first(raw_params, &mut params, "first_layer_bed_temperature", "bed_temperature_initial_layer");
            map_ini_param(raw_params, &mut params, "filament_max_volumetric_speed", "filament_max_volumetric_speed");
            map_ini_param(raw_params, &mut params, "filament_retract_length", "filament_retraction_length");
            map_ini_param(raw_params, &mut params, "filament_retract_speed", "filament_retraction_speed");
        },
        "machine" => {
            map_ini_param(raw_params, &mut params, "printer_model", "printer_model");
            map_ini_param(raw_params, &mut params, "printer_variant", "printer_variant");
            map_ini_param_first(raw_params, &mut params, "nozzle_diameter", "nozzle_diameter");
            map_ini_param(raw_params, &mut params, "max_print_height", "printable_height");
            map_ini_param(raw_params, &mut params, "machine_max_speed_x", "machine_max_speed_x");
            map_ini_param(raw_params, &mut params, "machine_max_speed_y", "machine_max_speed_y");
            if let Some(bed) = raw_params.get("bed_shape") {
                params.insert("printable_area".to_string(), serde_json::Value::String(bed.clone()));
            }
        },
        "process" => {
            map_ini_param(raw_params, &mut params, "layer_height", "layer_height");
            map_ini_param(raw_params, &mut params, "first_layer_height", "initial_layer_height");
            map_ini_param(raw_params, &mut params, "perimeters", "wall_loops");
            map_ini_param_strip_pct(raw_params, &mut params, "fill_density", "sparse_infill_density");
            map_ini_param(raw_params, &mut params, "top_solid_layers", "top_shell_layers");
            map_ini_param(raw_params, &mut params, "bottom_solid_layers", "bottom_shell_layers");
            map_ini_param(raw_params, &mut params, "support_material", "enable_support");
            if let Some(val) = raw_params.get("support_material_style") {
                let support_type = if val.contains("tree") || val.contains("organic") {
                    "tree"
                } else {
                    "normal"
                };
                params.insert("support_type".to_string(), serde_json::Value::String(support_type.to_string()));
            }
            map_ini_param(raw_params, &mut params, "perimeter_speed", "outer_wall_speed");
            map_ini_param(raw_params, &mut params, "infill_speed", "sparse_infill_speed");
            map_ini_param(raw_params, &mut params, "travel_speed", "travel_speed");
            map_ini_param(raw_params, &mut params, "bridge_speed", "bridge_speed");
        },
        _ => {},
    }

    Some(SlicerProfileEntry {
        nome: nome.to_string(),
        path: bundle_path.to_string(),
        tipo: tipo.to_string(),
        origin: origin.to_string(),
        is_user: false,
        params,
    })
}

// ============================================================
// Scansione directory e parsing JSON / INI
// ============================================================

fn scan_directory(
    dir: &PathBuf, tipo: &str, origin: &str, is_user: bool,
    slicer: SlicerType, results: &mut Vec<SlicerProfileEntry>,
) {
    let Ok(entries) = std::fs::read_dir(dir) else { return };

    for entry in entries.filter_map(|e| e.ok()) {
        let path = entry.path();

        // JSON profiles (Bambu/Orca/Anycubic)
        if path.extension().map_or(false, |ext| ext == "json") {
            if let Some(profile) = parse_profile_file(&path, tipo, origin, is_user) {
                results.push(profile);
            }
        }

        // INI profiles (Prusa Slicer)
        if path.extension().map_or(false, |ext| ext == "ini") {
            if let Some(profile) = parse_ini_profile_file(&path, tipo, origin, is_user) {
                results.push(profile);
            }
        }

        // Scansiona anche sottocartelle (Bambu/Orca/Anycubic organizza per brand)
        if path.is_dir() {
            scan_directory(&path, tipo, origin, is_user, slicer, results);
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

// ============================================================
// Parser INI per Prusa Slicer
// ============================================================

/// Parsa un file .ini di Prusa Slicer ed estrae i parametri rilevanti.
///
/// Formato tipico:
/// ```ini
/// # generated by PrusaSlicer 2.8.1 ...
/// layer_height = 0.2
/// perimeters = 2
/// fill_density = 20%
/// support_material = 0
/// ```
///
/// Le chiavi Prusa vengono mappate ai nomi usati da Bambu/Orca per uniformità:
///   - perimeters          → wall_loops
///   - fill_density        → sparse_infill_density (con strip di "%")
///   - top_solid_layers    → top_shell_layers
///   - bottom_solid_layers → bottom_shell_layers
///   - support_material    → enable_support
///   - temperature         → nozzle_temperature
///   - max_print_height    → printable_height
fn parse_ini_profile_file(
    path: &PathBuf, tipo: &str, origin: &str, is_user: bool,
) -> Option<SlicerProfileEntry> {
    let content = std::fs::read_to_string(path).ok()?;
    let mut raw_params: HashMap<String, String> = HashMap::new();

    for line in content.lines() {
        let trimmed = line.trim();
        // Ignora commenti e sezioni
        if trimmed.is_empty() || trimmed.starts_with('#') || trimmed.starts_with('[') {
            continue;
        }
        // Parsa "key = value"
        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim().to_string();
            let value = trimmed[eq_pos + 1..].trim().to_string();
            if !key.is_empty() && !value.is_empty() {
                raw_params.insert(key, value);
            }
        }
    }

    // Ricava il nome dal campo "name" del file INI oppure dal nome file
    let nome = raw_params.get("name")
        .map(|n| n.trim().to_string())
        // Prusa a volte non ha "name" nel .ini, usa il nome del file
        .or_else(|| path.file_stem().and_then(|s| s.to_str()).map(|s| s.to_string()))
        .unwrap_or_default();

    if nome.is_empty() { return None; }

    // Filtra e mappa i parametri rilevanti per tipo
    let mut params: HashMap<String, serde_json::Value> = HashMap::new();

    match tipo {
        "filament" => {
            map_ini_param(&raw_params, &mut params, "filament_type", "filament_type");
            map_ini_param(&raw_params, &mut params, "filament_density", "filament_density");
            map_ini_param(&raw_params, &mut params, "filament_cost", "filament_cost");
            map_ini_param(&raw_params, &mut params, "filament_colour", "filament_colour");
            // Prusa usa "temperature" per la temperatura nozzle del primo estrusore
            map_ini_param_first(&raw_params, &mut params, "temperature", "nozzle_temperature");
            map_ini_param_first(&raw_params, &mut params, "first_layer_temperature", "nozzle_temperature_initial_layer");
            map_ini_param_first(&raw_params, &mut params, "bed_temperature", "bed_temperature");
            map_ini_param_first(&raw_params, &mut params, "first_layer_bed_temperature", "bed_temperature_initial_layer");
            map_ini_param(&raw_params, &mut params, "filament_max_volumetric_speed", "filament_max_volumetric_speed");
            map_ini_param(&raw_params, &mut params, "filament_retract_length", "filament_retraction_length");
            map_ini_param(&raw_params, &mut params, "filament_retract_speed", "filament_retraction_speed");
        },
        "machine" | "process" if tipo == "machine" => {
            map_ini_param(&raw_params, &mut params, "printer_model", "printer_model");
            map_ini_param(&raw_params, &mut params, "printer_variant", "printer_variant");
            map_ini_param_first(&raw_params, &mut params, "nozzle_diameter", "nozzle_diameter");
            map_ini_param(&raw_params, &mut params, "max_print_height", "printable_height");
            map_ini_param(&raw_params, &mut params, "machine_max_speed_x", "machine_max_speed_x");
            map_ini_param(&raw_params, &mut params, "machine_max_speed_y", "machine_max_speed_y");
            // Prusa usa "bed_shape" per l'area di stampa (formato "0x0,250x0,250x210,0x210")
            if let Some(bed) = raw_params.get("bed_shape") {
                params.insert("printable_area".to_string(), serde_json::Value::String(bed.clone()));
            }
        },
        "process" => {
            map_ini_param(&raw_params, &mut params, "layer_height", "layer_height");
            map_ini_param(&raw_params, &mut params, "first_layer_height", "initial_layer_height");
            // Mappa chiavi Prusa → chiavi Bambu/Orca
            map_ini_param(&raw_params, &mut params, "perimeters", "wall_loops");
            map_ini_param_strip_pct(&raw_params, &mut params, "fill_density", "sparse_infill_density");
            map_ini_param(&raw_params, &mut params, "top_solid_layers", "top_shell_layers");
            map_ini_param(&raw_params, &mut params, "bottom_solid_layers", "bottom_shell_layers");
            map_ini_param(&raw_params, &mut params, "support_material", "enable_support");
            if let Some(val) = raw_params.get("support_material_style") {
                let support_type = if val.contains("tree") || val.contains("organic") {
                    "tree"
                } else {
                    "normal"
                };
                params.insert("support_type".to_string(), serde_json::Value::String(support_type.to_string()));
            }
            map_ini_param(&raw_params, &mut params, "perimeter_speed", "outer_wall_speed");
            map_ini_param(&raw_params, &mut params, "infill_speed", "sparse_infill_speed");
            map_ini_param(&raw_params, &mut params, "travel_speed", "travel_speed");
            map_ini_param(&raw_params, &mut params, "bridge_speed", "bridge_speed");
        },
        _ => {},
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

/// Mappa un parametro INI al nome destinazione, convertendo il valore in serde_json::Value
fn map_ini_param(
    raw: &HashMap<String, String>,
    params: &mut HashMap<String, serde_json::Value>,
    ini_key: &str,
    target_key: &str,
) {
    if let Some(val) = raw.get(ini_key) {
        params.insert(target_key.to_string(), ini_value_to_json(val));
    }
}

/// Come map_ini_param, ma prende solo il primo valore di una lista separata da virgola
/// (Prusa usa "temperature = 215,0" quando ci sono più estrusori)
fn map_ini_param_first(
    raw: &HashMap<String, String>,
    params: &mut HashMap<String, serde_json::Value>,
    ini_key: &str,
    target_key: &str,
) {
    if let Some(val) = raw.get(ini_key) {
        let first = val.split(',').next().unwrap_or(val).trim();
        params.insert(target_key.to_string(), ini_value_to_json(first));
    }
}

/// Come map_ini_param, ma rimuove il suffisso "%" e converte in numero
/// (Prusa usa "fill_density = 20%")
fn map_ini_param_strip_pct(
    raw: &HashMap<String, String>,
    params: &mut HashMap<String, serde_json::Value>,
    ini_key: &str,
    target_key: &str,
) {
    if let Some(val) = raw.get(ini_key) {
        let stripped = val.trim_end_matches('%').trim();
        params.insert(target_key.to_string(), ini_value_to_json(stripped));
    }
}

/// Converte un valore stringa INI nel tipo JSON più appropriato
fn ini_value_to_json(val: &str) -> serde_json::Value {
    // Prova come intero
    if let Ok(n) = val.parse::<i64>() {
        return serde_json::Value::Number(serde_json::Number::from(n));
    }
    // Prova come float
    if let Ok(f) = val.parse::<f64>() {
        if let Some(n) = serde_json::Number::from_f64(f) {
            return serde_json::Value::Number(n);
        }
    }
    // Altrimenti stringa
    serde_json::Value::String(val.to_string())
}
