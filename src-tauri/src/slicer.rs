use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SlicerProfileEntry {
    pub nome: String,
    pub path: String,
    pub tipo: String,
    pub origin: String,
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

/// Detect Bambu Studio executable
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

/// Get the Bambu Studio base directory in AppData\Roaming
/// Correct path: %APPDATA%\BambuStudio (which is C:\Users\X\AppData\Roaming\BambuStudio)
fn get_bambu_appdata_dir(is_beta: bool) -> Option<PathBuf> {
    let appdata = std::env::var("APPDATA").ok()?;
    let folder = if is_beta { "BambuStudioBeta" } else { "BambuStudio" };
    let base = PathBuf::from(&appdata).join(folder);

    if base.exists() {
        return Some(base);
    }

    // Fallback: try with space
    let folder2 = if is_beta { "Bambu Studio Beta" } else { "Bambu Studio" };
    let base2 = PathBuf::from(&appdata).join(folder2);
    if base2.exists() {
        return Some(base2);
    }

    None
}

/// Find all directories that contain filament/machine/process subfolders
/// Bambu Studio can store profiles in various structures:
/// - BambuStudio/user/<user_id>/filament/
/// - BambuStudio/user/<user_id>/base/filament/
/// - BambuStudio/system/BBL/filament/
/// - Or directly BambuStudio/filament/ etc.
fn find_profile_roots(base: &PathBuf, max_depth: u32) -> Vec<(PathBuf, bool)> {
    let mut roots = Vec::new();
    find_profile_roots_recursive(base, max_depth, 0, &mut roots);
    roots
}

fn find_profile_roots_recursive(dir: &PathBuf, max_depth: u32, current_depth: u32, roots: &mut Vec<(PathBuf, bool)>) {
    if current_depth > max_depth { return; }
    if !dir.is_dir() { return; }

    // Check if this directory contains filament/ or machine/ or process/ subfolders
    let has_filament = dir.join("filament").is_dir();
    let has_machine = dir.join("machine").is_dir();
    let has_process = dir.join("process").is_dir();

    if has_filament || has_machine || has_process {
        // Determine if this is a user profile dir
        let path_str = dir.to_string_lossy().to_lowercase();
        let is_user = path_str.contains("user") || !path_str.contains("system");
        roots.push((dir.clone(), is_user));
    }

    // Recurse into subdirectories
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                // Skip hidden dirs and known non-profile dirs
                if !name.starts_with('.') && name != "cache" && name != "log" && name != "crash" {
                    find_profile_roots_recursive(&path, max_depth, current_depth + 1, roots);
                }
            }
        }
    }
}

/// Get full slicer info
pub fn get_info(is_beta: bool) -> SlicerInfoResult {
    let exe = detect_bambu_studio(is_beta);
    let appdata = get_bambu_appdata_dir(is_beta);

    let user_path = appdata.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or_default();

    // Also check builtin profiles
    let builtin = detect_bambu_studio(is_beta)
        .and_then(|p| p.parent().map(|pp| pp.join("resources").join("profiles")))
        .filter(|p| p.exists());
    let builtin_path = builtin.map(|p| p.to_string_lossy().to_string()).unwrap_or_default();

    SlicerInfoResult {
        installed: exe.is_some(),
        path: exe.map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        is_beta,
        user_profiles_path: user_path,
        builtin_profiles_path: builtin_path,
    }
}

/// Scan all profile directories and return found profiles
pub fn scan_profiles(tipo: &str, is_beta: bool, solo_utente: bool) -> Vec<SlicerProfileEntry> {
    let mut results = Vec::new();

    // Scan AppData\Roaming\BambuStudio
    if let Some(appdata_dir) = get_bambu_appdata_dir(is_beta) {
        let roots = find_profile_roots(&appdata_dir, 4);
        for (root, is_user) in &roots {
            if solo_utente && !is_user { continue; }
            let type_dir = root.join(tipo);
            if type_dir.exists() {
                scan_directory(&type_dir, tipo, "bambu", *is_user, &mut results);
            }
        }

        // If no roots found with subfolders, try scanning common structures directly
        if roots.is_empty() {
            // Try direct: BambuStudio/filament, BambuStudio/machine, BambuStudio/process
            let direct = appdata_dir.join(tipo);
            if direct.exists() {
                scan_directory(&direct, tipo, "bambu", true, &mut results);
            }
        }
    }

    // Scan builtin profiles from installation directory (unless solo_utente)
    if !solo_utente {
        if let Some(exe_path) = detect_bambu_studio(is_beta) {
            if let Some(install_dir) = exe_path.parent() {
                let profiles_dir = install_dir.join("resources").join("profiles");
                if profiles_dir.exists() {
                    let roots = find_profile_roots(&profiles_dir, 3);
                    for (root, _) in &roots {
                        let type_dir = root.join(tipo);
                        if type_dir.exists() {
                            scan_directory(&type_dir, tipo, "bambu", false, &mut results);
                        }
                    }
                }
            }
        }
    }

    // Deduplicate by name (keep user profiles over builtin)
    let mut seen = HashMap::new();
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

        // Also scan subdirectories (Bambu stores some profiles in brand subfolders)
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

    // Get profile name
    let nome = json.get("name")
        .and_then(|v| v.as_str())
        .or_else(|| path.file_stem().and_then(|s| s.to_str()))
        .unwrap_or("Unknown")
        .to_string();

    // Skip if name is empty
    if nome.is_empty() || nome == "Unknown" { return None; }

    let mut params = HashMap::new();

    if let serde_json::Value::Object(map) = &json {
        for (key, value) in map {
            let dominated = match tipo {
                "filament" => matches!(key.as_str(),
                    "name" | "filament_type" | "filament_density" | "filament_cost" |
                    "filament_colour" | "nozzle_temperature" | "bed_temperature" |
                    "filament_max_volumetric_speed" | "inherits" | "compatible_printers"
                ),
                "machine" => matches!(key.as_str(),
                    "name" | "printer_model" | "printer_variant" | "printable_area" |
                    "printable_height" | "nozzle_diameter" | "inherits" |
                    "machine_max_speed_x" | "machine_max_speed_y"
                ),
                "process" => matches!(key.as_str(),
                    "name" | "layer_height" | "wall_loops" | "sparse_infill_density" |
                    "top_shell_layers" | "bottom_shell_layers" | "enable_support" |
                    "support_type" | "inherits" | "initial_layer_height" |
                    "outer_wall_speed" | "inner_wall_speed" | "infill_density"
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
