// src-tauri/src/gcode_parser.rs
// Sparks3D Preventivi – Parser GCode / 3MF (Bambu Studio, OrcaSlicer)
// =====================================================================
//
// Formati GCode reali da Bambu Studio:
//   ; model printing time: 2h 59m 6s; total estimated time: 3h 5m 25s
//   ; total filament length [mm] : 24084.22
//   ; total filament weight [g] : 74.15
//   ; filament_type = PETG;TPU        (separatore ;)
//   ; filament_colour = #424032;#FFFF0A
//   ; filament_density: 1.28,1.22     (separatore ,)
//
// 3MF slice_info.config:
//   <metadata key="prediction" value="11125"/>
//   <metadata key="weight" value="74.15"/>
//   <filament id="1" type="PETG" color="#424032" used_g="74.15" used_m="24.08"/>

use base64::Engine;
use serde::Serialize;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;

#[derive(Debug, Serialize, Clone, Default)]
pub struct PlateInfo {
    pub plate_number: i64,
    pub thumbnail_base64: Option<String>,
    pub gcode_file: String,
}

#[derive(Debug, Serialize, Clone, Default)]
pub struct SliceData {
    pub tempo_stampa_sec: i64,
    pub tempo_stampa_display: String,
    pub peso_totale_grammi: f64,
    pub filamento_mm: f64,
    pub filamento_cm3: f64,
    pub filamento_tipo: String,
    pub filamento_densita: f64,
    pub filamento_costo: f64,
    pub nome_file: String,
    pub slicer: String,
    pub materiali: Vec<SliceFilamentInfo>,
    pub thumbnail_base64: Option<String>,
    // Stampante e profilo estratti dal file
    pub printer_model: String,
    pub nozzle_diameter: f64,
    pub layer_height: f64,
    pub wall_loops: i64,
    pub infill_percent: f64,
    pub top_layers: i64,
    pub bottom_layers: i64,
    pub support_enabled: bool,
    pub print_profile_name: String,
    pub piatto: i64,
    pub plates: Vec<PlateInfo>,
    // Dimensioni modello (mm)
    pub dim_x: f64,
    pub dim_y: f64,
    pub dim_z: f64,
}

#[derive(Debug, Serialize, Clone, Default)]
pub struct SliceFilamentInfo {
    pub slot: i32,
    pub tipo: String,
    pub colore: String,
    pub peso_grammi: f64,
    pub lunghezza_mm: f64,
    pub densita: f64,
}

#[tauri::command]
pub fn parse_slice_file(file_path: String) -> Result<SliceData, String> {
    let path = Path::new(&file_path);
    if !path.exists() { return Err(format!("File non trovato: {}", file_path)); }
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
    match ext.as_str() {
        "gcode" | "gco" | "g" => parse_gcode_file(path),
        "3mf" => parse_3mf_file(path),
        _ => Err(format!("Formato non supportato: .{ext}. Usa .gcode o .3mf")),
    }
}

fn is_template(val: &str) -> bool { val.contains('{') && val.contains('}') }

/// Splitta per ; o , (Bambu usa ; per tipi/colori, , per densità)
fn split_multi(val: &str) -> Vec<String> {
    if val.contains(';') {
        val.split(';').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
    } else {
        val.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect()
    }
}

// ══════════════════════════════════════════════════
//  PARSER GCODE
// ══════════════════════════════════════════════════

fn parse_gcode_file(path: &Path) -> Result<SliceData, String> {
    let file = std::fs::File::open(path).map_err(|e| format!("Errore apertura: {e}"))?;
    let reader = BufReader::new(file);
    let nome = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
    let mut data = SliceData { nome_file: nome, ..Default::default() };
    parse_gcode_lines(reader, &mut data);
    finalize_data(&mut data);
    Ok(data)
}

fn parse_gcode_lines<R: Read>(reader: BufReader<R>, data: &mut SliceData) {
    let mut fil_types: Vec<String> = Vec::new();
    let mut fil_colors: Vec<String> = Vec::new();
    let mut fil_densities: Vec<f64> = Vec::new();
    let mut thumb_collecting = false;
    let mut thumb_lines: Vec<String> = Vec::new();

    for line_result in reader.lines() {
        let line = match line_result { Ok(l) => l, Err(_) => continue };
        let trimmed = line.trim();
        if !trimmed.starts_with(';') { if thumb_collecting { thumb_collecting = false; } continue; }
        let comment = trimmed[1..].trim();
        let comment_lower = comment.to_lowercase();

        // ── Thumbnail embedded (Bambu Studio, PrusaSlicer) ──
        if comment_lower.starts_with("thumbnail begin") {
            thumb_collecting = true;
            thumb_lines.clear();
            continue;
        }
        if comment_lower.starts_with("thumbnail end") {
            thumb_collecting = false;
            if !thumb_lines.is_empty() {
                let b64 = thumb_lines.join("");
                // Verifica che sia base64 valido
                if base64::engine::general_purpose::STANDARD.decode(&b64).is_ok() {
                    data.thumbnail_base64 = Some(format!("data:image/png;base64,{}", b64));
                }
            }
            continue;
        }
        if thumb_collecting {
            thumb_lines.push(comment.to_string());
            continue;
        }

        // ── Tempo: "model printing time: 2h 59m 6s; total estimated time: 3h 5m 25s" ──
        if comment_lower.contains("total estimated time") {
            if let Some(pos) = comment_lower.find("total estimated time") {
                let after = &comment[pos + "total estimated time".len()..];
                let time_str = after.trim().trim_start_matches(':').trim_start_matches('=').trim();
                if !is_template(time_str) && data.tempo_stampa_sec == 0 {
                    data.tempo_stampa_sec = parse_time_string(time_str);
                    data.tempo_stampa_display = time_str.to_string();
                }
            }
        } else if comment_lower.contains("estimated printing time") {
            if let Some(val) = extract_after(comment, "estimated printing time") {
                if !is_template(&val) && data.tempo_stampa_sec == 0 {
                    data.tempo_stampa_sec = parse_time_string(&val);
                    data.tempo_stampa_display = val;
                }
            }
        } else if comment_lower.contains("model printing time") && data.tempo_stampa_sec == 0 {
            // Fallback: usa model printing time se non abbiamo total estimated
            if let Some(val) = extract_after(comment, "model printing time") {
                // Può contenere "; total estimated time: ..." alla fine, tronca
                let clean = val.split(';').next().unwrap_or(&val).trim().to_string();
                if !is_template(&clean) {
                    data.tempo_stampa_sec = parse_time_string(&clean);
                    data.tempo_stampa_display = clean;
                }
            }
        }

        // ── Peso: "total filament weight [g] : 74.15" oppure "total filament used [g] = 74.15" ──
        if comment_lower.contains("total filament weight") || comment_lower.contains("total filament used [g]") {
            if let Some(val) = extract_numeric_after(comment) {
                if data.peso_totale_grammi == 0.0 { data.peso_totale_grammi = val; }
            }
        }

        // ── Lunghezza: "total filament length [mm] : 24084.22" oppure "filament used [mm] = ..." ──
        if comment_lower.contains("total filament length") || comment_lower.contains("filament used [mm]") {
            if let Some(val) = extract_numeric_after(comment) {
                if data.filamento_mm == 0.0 { data.filamento_mm = val; }
            }
            // Multi-valore (per "filament used [mm] = 14664.38, 0.00")
            if let Some(raw) = extract_after(comment, "filament used [mm]") {
                let parts: Vec<f64> = split_multi(&raw).iter()
                    .filter_map(|s| s.parse().ok()).collect();
                if parts.len() > 1 && data.filamento_mm == 0.0 {
                    data.filamento_mm = parts.iter().sum();
                }
            }
        }

        // ── Volume: "total filament volume [cm^3] : 57.93" ──
        if comment_lower.contains("filament volume") || comment_lower.contains("filament used [cm3]") {
            if let Some(val) = extract_numeric_after(comment) {
                if data.filamento_cm3 == 0.0 { data.filamento_cm3 = val; }
            }
        }

        // ── Tipo filamento: "filament_type = PETG;TPU" ──
        if comment_lower.starts_with("filament_type") {
            if let Some(val) = extract_after(comment, "filament_type") {
                if !is_template(&val) {
                    fil_types = split_multi(&val);
                    if let Some(first) = fil_types.first() { data.filamento_tipo = first.clone(); }
                }
            }
        }

        // ── Colore: "filament_colour = #424032;#FFFF0A" ──
        if comment_lower.starts_with("filament_colour") || comment_lower.starts_with("filament_color") {
            if let Some(val) = extract_after(comment, "filament_colo") { // matches both colour and color
                if !is_template(&val) {
                    fil_colors = split_multi(&val);
                }
            }
        }

        // ── Densità: "filament_density: 1.28,1.22" ──
        if comment_lower.starts_with("filament_density") {
            if let Some(val) = extract_after(comment, "filament_density") {
                if !is_template(&val) {
                    fil_densities = split_multi(&val).iter()
                        .filter_map(|s| s.parse().ok()).collect();
                    if let Some(&first) = fil_densities.first() { data.filamento_densita = first; }
                }
            }
        }

        // ── Costo ──
        if comment_lower.contains("total filament cost") {
            if let Some(val) = extract_numeric_after(comment) {
                if data.filamento_costo == 0.0 { data.filamento_costo = val; }
            }
        }

        // ── Slicer ──
        if comment_lower.starts_with("generated by") || comment_lower.starts_with("bambustudio") {
            if let Some(val) = extract_after(comment, "generated by") {
                if !is_template(&val) { data.slicer = val; }
            } else if data.slicer.is_empty() {
                data.slicer = comment.to_string();
            }
        }

        // ── Stampante: "printer_model = Bambu Lab X1 Carbon" ──
        if comment_lower.starts_with("printer_model") {
            if let Some(val) = extract_after(comment, "printer_model") {
                if !is_template(&val) && data.printer_model.is_empty() { data.printer_model = val; }
            }
        }
        // ── Nozzle: "nozzle_diameter = 0.4" ──
        if comment_lower.starts_with("nozzle_diameter") {
            if let Some(val) = extract_after(comment, "nozzle_diameter") {
                if let Ok(v) = val.parse::<f64>() { if data.nozzle_diameter == 0.0 { data.nozzle_diameter = v; } }
            }
        }
        // ── Layer height: "layer_height = 0.2" ──
        if comment_lower.starts_with("layer_height") && !comment_lower.contains("initial") && !comment_lower.contains("first") {
            if let Some(val) = extract_after(comment, "layer_height") {
                if let Ok(v) = val.parse::<f64>() { if data.layer_height == 0.0 { data.layer_height = v; } }
            }
        }
        // ── Pareti: "wall_loops = 2" (Bambu/Orca) o "perimeters = 2" (Prusa) ──
        if comment_lower.starts_with("wall_loops") || comment_lower.starts_with("perimeters") {
            let key = if comment_lower.starts_with("wall_loops") { "wall_loops" } else { "perimeters" };
            if let Some(val) = extract_after(comment, key) {
                if let Ok(v) = val.parse::<i64>() { if data.wall_loops == 0 { data.wall_loops = v; } }
            }
        }
        // ── Infill: "sparse_infill_density = 15%" (Bambu/Orca) o "fill_density = 15%" (Prusa) ──
        if comment_lower.starts_with("sparse_infill_density") || comment_lower.starts_with("fill_density") {
            let key = if comment_lower.starts_with("sparse_infill") { "sparse_infill_density" } else { "fill_density" };
            if let Some(val) = extract_after(comment, key) {
                let clean = val.trim_end_matches('%').trim();
                if let Ok(v) = clean.parse::<f64>() { if data.infill_percent == 0.0 { data.infill_percent = v; } }
            }
        }
        // ── Top/Bottom layers ──
        if comment_lower.starts_with("top_shell_layers") || comment_lower.starts_with("top_solid_layers") {
            let key = if comment_lower.starts_with("top_shell") { "top_shell_layers" } else { "top_solid_layers" };
            if let Some(val) = extract_after(comment, key) {
                if let Ok(v) = val.parse::<i64>() { if data.top_layers == 0 { data.top_layers = v; } }
            }
        }
        if comment_lower.starts_with("bottom_shell_layers") || comment_lower.starts_with("bottom_solid_layers") {
            let key = if comment_lower.starts_with("bottom_shell") { "bottom_shell_layers" } else { "bottom_solid_layers" };
            if let Some(val) = extract_after(comment, key) {
                if let Ok(v) = val.parse::<i64>() { if data.bottom_layers == 0 { data.bottom_layers = v; } }
            }
        }
        // ── Supporti: "enable_support = 1" (Bambu/Orca) o "support_material = 1" (Prusa) ──
        if comment_lower.starts_with("enable_support") || comment_lower.starts_with("support_material") {
            let key = if comment_lower.starts_with("enable_support") { "enable_support" } else { "support_material" };
            if let Some(val) = extract_after(comment, key) {
                if val.trim() == "1" || val.trim().to_lowercase() == "true" { data.support_enabled = true; }
            }
        }
        // ── Nome profilo: "print_settings_id = 0.20mm Standard @BBL X1C" ──
        if comment_lower.starts_with("print_settings_id") {
            if let Some(val) = extract_after(comment, "print_settings_id") {
                if !is_template(&val) && data.print_profile_name.is_empty() { data.print_profile_name = val; }
            }
        }

        // ── Dimensioni modello (bounding box) ──
        // Bambu/Orca: "; model bounding box: min={0,0,0} max={50.3,40.2,30.1}"
        if comment_lower.contains("model bounding box") || comment_lower.contains("bounding_box") {
            if let Some(max_part) = comment.split("max").nth(1) {
                let nums: Vec<f64> = max_part
                    .replace(['{', '}', '(', ')', '[', ']', '='], " ")
                    .split(',')
                    .filter_map(|s| s.trim().parse().ok())
                    .collect();
                if let Some(min_part) = comment.split("min").nth(1) {
                    let mins: Vec<f64> = min_part
                        .split("max").next().unwrap_or("")
                        .replace(['{', '}', '(', ')', '[', ']', '='], " ")
                        .split(',')
                        .filter_map(|s| s.trim().parse().ok())
                        .collect();
                    if nums.len() >= 3 && mins.len() >= 3 {
                        let dx = (nums[0] - mins[0]).abs();
                        let dy = (nums[1] - mins[1]).abs();
                        let dz = (nums[2] - mins[2]).abs();
                        if dx > 0.0 && data.dim_x == 0.0 { data.dim_x = dx; }
                        if dy > 0.0 && data.dim_y == 0.0 { data.dim_y = dy; }
                        if dz > 0.0 && data.dim_z == 0.0 { data.dim_z = dz; }
                    }
                }
            }
        }
        // Fallback: "max_print_height = 30.5" per almeno l'altezza
        if comment_lower.starts_with("max_print_height") || comment_lower.starts_with("object_height") {
            if let Some(val) = extract_after(comment, if comment_lower.starts_with("max_print") { "max_print_height" } else { "object_height" }) {
                if let Ok(v) = val.parse::<f64>() { if data.dim_z == 0.0 { data.dim_z = v; } }
            }
        }
    }

    // ── Costruisci info materiali dal GCode ──
    let count = fil_types.len().max(fil_colors.len()).max(fil_densities.len());
    if count > 0 {
        for i in 0..count {
            let tipo = fil_types.get(i).cloned().unwrap_or_default();
            let colore = fil_colors.get(i).cloned().unwrap_or_default();
            let densita = fil_densities.get(i).copied()
                .unwrap_or(fil_densities.first().copied().unwrap_or(1.24));

            // Peso per slot: se abbiamo mm e densità, calcoliamo
            // Altrimenti verrà eventualmente popolato dal slice_info.config
            data.materiali.push(SliceFilamentInfo {
                slot: (i + 1) as i32,
                tipo, colore,
                peso_grammi: 0.0, // calcolato dopo
                lunghezza_mm: 0.0,
                densita,
            });
        }
    }
}

// ══════════════════════════════════════════════════
//  PARSER 3MF
// ══════════════════════════════════════════════════

fn parse_3mf_file(path: &Path) -> Result<SliceData, String> {
    let file = std::fs::File::open(path).map_err(|e| format!("Errore apertura 3MF: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Errore 3MF: {e}"))?;
    let nome = path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown").to_string();
    let mut data = SliceData { nome_file: nome, ..Default::default() };

    let file_names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .collect();

    // 0) Estrai immagini da ZIP — thumbnail e immagini piatto
    // Bambu Studio: Thumbnail/thumbnail.png, Metadata/plate_1.png, Metadata/plate_2.png
    // OrcaSlicer: Thumbnail/thumbnail_*.png
    // PrusaSlicer: Metadata/thumbnail.png
    {
        // Helper: leggi PNG dallo zip e converti in base64 data URI
        let read_png = |archive: &mut zip::ZipArchive<std::fs::File>, name: &str| -> Option<String> {
            let mut entry = archive.by_name(name).ok()?;
            let mut buf = Vec::new();
            entry.read_to_end(&mut buf).ok()?;
            if buf.is_empty() { return None; }
            Some(format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(&buf)))
        };

        // Raccogli la migliore immagine per ogni piatto (una sola per piatto, la più grande)
        let mut best_per_plate: std::collections::HashMap<i64, (usize, String)> = std::collections::HashMap::new(); // num → (size, name)
        for name in &file_names {
            let lower = name.to_lowercase();
            if lower.ends_with(".png") && (lower.contains("plate_") || lower.contains("plate ")) {
                let num = lower.split("plate_").nth(1)
                    .or_else(|| lower.split("plate ").nth(1))
                    .and_then(|s| s.split(|c: char| !c.is_ascii_digit()).next())
                    .and_then(|s| s.parse::<i64>().ok())
                    .unwrap_or(1);
                let size = archive.by_name(name).map(|e| e.size() as usize).unwrap_or(0);
                if best_per_plate.get(&num).map_or(true, |(s, _)| size > *s) {
                    best_per_plate.insert(num, (size, name.clone()));
                }
            }
        }
        let mut plate_nums: Vec<i64> = best_per_plate.keys().cloned().collect();
        plate_nums.sort();

        if !plate_nums.is_empty() {
            for &num in &plate_nums {
                if let Some((_, ref fname)) = best_per_plate.get(&num) {
                    let b64 = read_png(&mut archive, fname);
                    let gcode = file_names.iter()
                        .find(|f| {
                            let fl = f.to_lowercase();
                            (fl.ends_with(".gcode") || fl.ends_with(".gco")) && fl.contains(&format!("plate_{}", num))
                        })
                        .cloned()
                        .unwrap_or_default();
                    data.plates.push(PlateInfo { plate_number: num, thumbnail_base64: b64, gcode_file: gcode });
                }
            }
        }

        // Costruisci thumbnail principale dal primo piatto
        if !data.plates.is_empty() {
            // Usa l'immagine del primo piatto come thumbnail principale
            data.thumbnail_base64 = data.plates.first().and_then(|p| p.thumbnail_base64.clone());
            data.piatto = data.plates.first().map(|p| p.plate_number).unwrap_or(1);
        }

        // Se non ci sono immagini piatto, cerca thumbnail dedicato
        if data.thumbnail_base64.is_none() {
            // Cerca thumbnail classici (Thumbnail/*.png)
            let mut best: Option<(usize, String)> = None;
            for name in &file_names {
                let lower = name.to_lowercase();
                if lower.ends_with(".png") && lower.contains("thumbnail") {
                    if let Ok(entry) = archive.by_name(name) {
                        let size = entry.size() as usize;
                        if best.as_ref().map_or(true, |(s, _)| size > *s) {
                            best = Some((size, name.clone()));
                        }
                    }
                }
            }
            if let Some((_, ref name)) = best {
                data.thumbnail_base64 = read_png(&mut archive, name);
            }
        }
    }

    // 1) Prima: slice_info.config (ha i dati più affidabili con XML strutturato)
    for name in &file_names {
        if name.to_lowercase().contains("slice_info") {
            if let Ok(mut entry) = archive.by_name(name) {
                let mut content = String::new();
                if entry.read_to_string(&mut content).is_ok() {
                    parse_slice_info_xml(&content, &mut data);
                }
            }
        }
    }

    // 2) Poi: GCode header per dati aggiuntivi (slicer, formati alternativi)
    let gcode_names: Vec<String> = file_names.iter()
        .filter(|n| n.to_lowercase().ends_with(".gcode") || n.to_lowercase().ends_with(".gco"))
        .cloned().collect();

    if !gcode_names.is_empty() {
        let target = gcode_names.iter()
            .find(|n| n.to_lowercase().contains("plate_1"))
            .or_else(|| gcode_names.first())
            .cloned().unwrap();

        // Estrai numero piatto dal nome file (es. "plate_2.gcode" → 2)
        let target_lower = target.to_lowercase();
        if let Some(pos) = target_lower.find("plate_") {
            let after = &target_lower[pos + 6..];
            if let Some(num_str) = after.split(|c: char| !c.is_ascii_digit()).next() {
                data.piatto = num_str.parse().unwrap_or(1);
            }
        }

        if let Ok(entry) = archive.by_name(&target) {
            let reader = BufReader::new(entry);
            // Parsa solo i commenti del GCode per dati mancanti
            let mut gcode_data = SliceData::default();
            parse_gcode_lines(reader, &mut gcode_data);

            // Integra solo i dati che mancano
            if data.tempo_stampa_sec == 0 && gcode_data.tempo_stampa_sec > 0 {
                data.tempo_stampa_sec = gcode_data.tempo_stampa_sec;
                data.tempo_stampa_display = gcode_data.tempo_stampa_display;
            }
            if data.peso_totale_grammi == 0.0 { data.peso_totale_grammi = gcode_data.peso_totale_grammi; }
            if data.filamento_mm == 0.0 { data.filamento_mm = gcode_data.filamento_mm; }
            if data.filamento_tipo.is_empty() { data.filamento_tipo = gcode_data.filamento_tipo; }
            if data.filamento_densita == 0.0 { data.filamento_densita = gcode_data.filamento_densita; }
            if data.slicer.is_empty() { data.slicer = gcode_data.slicer; }
            // Fallback dal GCode embedded per dati mancanti
            if data.thumbnail_base64.is_none() { data.thumbnail_base64 = gcode_data.thumbnail_base64; }
            if data.printer_model.is_empty() { data.printer_model = gcode_data.printer_model; }
            if data.nozzle_diameter == 0.0 { data.nozzle_diameter = gcode_data.nozzle_diameter; }
            if data.layer_height == 0.0 { data.layer_height = gcode_data.layer_height; }
            if data.wall_loops == 0 { data.wall_loops = gcode_data.wall_loops; }
            if data.infill_percent == 0.0 { data.infill_percent = gcode_data.infill_percent; }
            if data.top_layers == 0 { data.top_layers = gcode_data.top_layers; }
            if data.bottom_layers == 0 { data.bottom_layers = gcode_data.bottom_layers; }
            if !data.support_enabled { data.support_enabled = gcode_data.support_enabled; }
            if data.print_profile_name.is_empty() { data.print_profile_name = gcode_data.print_profile_name; }
            if data.dim_x == 0.0 { data.dim_x = gcode_data.dim_x; }
            if data.dim_y == 0.0 { data.dim_y = gcode_data.dim_y; }
            if data.dim_z == 0.0 { data.dim_z = gcode_data.dim_z; }
            // Aggiorna colori nei materiali dal GCode (slice_info non ha sempre il colore)
            if !gcode_data.materiali.is_empty() {
                for gm in &gcode_data.materiali {
                    if let Some(dm) = data.materiali.iter_mut().find(|m| m.slot == gm.slot) {
                        if dm.colore.is_empty() && !gm.colore.is_empty() { dm.colore = gm.colore.clone(); }
                        if dm.tipo.is_empty() && !gm.tipo.is_empty() { dm.tipo = gm.tipo.clone(); }
                        if dm.densita == 0.0 && gm.densita > 0.0 { dm.densita = gm.densita; }
                    }
                }
            }
        }
    }

    finalize_data(&mut data);

    if data.tempo_stampa_sec == 0 && data.peso_totale_grammi == 0.0 && data.filamento_tipo.is_empty() {
        return Err("Il file 3MF non contiene dati di slicing. Esporta da Bambu Studio dopo aver sliceato.".to_string());
    }

    Ok(data)
}

/// Parsa il file slice_info.config (formato XML di Bambu Studio)
/// Esempio:
///   <metadata key="prediction" value="11125"/>
///   <metadata key="weight" value="74.15"/>
///   <filament id="1" type="PETG" color="#424032" used_g="74.15" used_m="24.08"/>
fn parse_slice_info_xml(content: &str, data: &mut SliceData) {
    for line in content.lines() {
        let trimmed = line.trim();

        // <metadata key="prediction" value="11125"/>
        if trimmed.contains("key=\"prediction\"") {
            if let Some(val) = extract_xml_attr(trimmed, "value") {
                if let Ok(secs) = val.parse::<i64>() {
                    data.tempo_stampa_sec = secs;
                    let h = secs / 3600;
                    let m = (secs % 3600) / 60;
                    let s = secs % 60;
                    data.tempo_stampa_display = if h > 0 {
                        format!("{}h {}m {}s", h, m, s)
                    } else {
                        format!("{}m {}s", m, s)
                    };
                }
            }
        }

        // <metadata key="weight" value="74.15"/>
        if trimmed.contains("key=\"weight\"") {
            if let Some(val) = extract_xml_attr(trimmed, "value") {
                data.peso_totale_grammi = val.parse().unwrap_or(0.0);
            }
        }

        // <filament id="1" type="PETG" color="#424032" used_g="74.15" used_m="24.08"/>
        if trimmed.contains("<filament ") {
            let slot: i32 = extract_xml_attr(trimmed, "id")
                .and_then(|v| v.parse().ok()).unwrap_or(0);
            let tipo = extract_xml_attr(trimmed, "type").unwrap_or_default();
            let colore = extract_xml_attr(trimmed, "color").unwrap_or_default();
            let peso: f64 = extract_xml_attr(trimmed, "used_g")
                .and_then(|v| v.parse().ok()).unwrap_or(0.0);
            let lunghezza_m: f64 = extract_xml_attr(trimmed, "used_m")
                .and_then(|v| v.parse().ok()).unwrap_or(0.0);

            if slot > 0 && (!tipo.is_empty() || peso > 0.0) {
                // Cerca se lo slot esiste già (dal gcode)
                if let Some(existing) = data.materiali.iter_mut().find(|m| m.slot == slot) {
                    if existing.tipo.is_empty() { existing.tipo = tipo; }
                    if existing.colore.is_empty() { existing.colore = colore; }
                    existing.peso_grammi = peso;
                    existing.lunghezza_mm = lunghezza_m * 1000.0;
                } else {
                    data.materiali.push(SliceFilamentInfo {
                        slot, tipo, colore,
                        peso_grammi: peso,
                        lunghezza_mm: lunghezza_m * 1000.0,
                        densita: 0.0,
                    });
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════
//  FINALIZZAZIONE
// ══════════════════════════════════════════════════

fn finalize_data(data: &mut SliceData) {
    // Se peso totale = 0, sommalo dai materiali
    if data.peso_totale_grammi == 0.0 && !data.materiali.is_empty() {
        let sum: f64 = data.materiali.iter().map(|m| m.peso_grammi).sum();
        if sum > 0.0 { data.peso_totale_grammi = sum; }
    }

    // Se tipo filamento mancante, prendilo dal primo materiale
    if data.filamento_tipo.is_empty() {
        if let Some(first) = data.materiali.first() {
            if !first.tipo.is_empty() { data.filamento_tipo = first.tipo.clone(); }
        }
    }

    // Se lunghezza mm mancante, sommala dai materiali
    if data.filamento_mm == 0.0 && !data.materiali.is_empty() {
        let sum: f64 = data.materiali.iter().map(|m| m.lunghezza_mm).sum();
        if sum > 0.0 { data.filamento_mm = sum; }
    }

    // Calcoli fallback peso da mm+densità
    let raggio_cm = 0.175 / 2.0;
    let area = std::f64::consts::PI * raggio_cm * raggio_cm;

    if data.peso_totale_grammi == 0.0 && data.filamento_mm > 0.0 && data.filamento_densita > 0.0 {
        data.filamento_cm3 = (data.filamento_mm / 10.0) * area;
        data.peso_totale_grammi = data.filamento_cm3 * data.filamento_densita;
    }

    // Arrotonda
    data.peso_totale_grammi = (data.peso_totale_grammi * 100.0).round() / 100.0;
    data.filamento_mm = (data.filamento_mm * 100.0).round() / 100.0;
    data.filamento_cm3 = (data.filamento_cm3 * 100.0).round() / 100.0;
}

// ══════════════════════════════════════════════════
//  UTILITÀ
// ══════════════════════════════════════════════════

/// Estrae il valore dopo "key:" o "key=" (es. "filament_type = PETG" → "PETG")
fn extract_after(line: &str, key: &str) -> Option<String> {
    let lower = line.to_lowercase();
    let key_lower = key.to_lowercase();
    if let Some(pos) = lower.find(&key_lower) {
        let after = &line[pos + key.len()..];
        let trimmed = after.trim();
        // Salta il separatore = o :
        let val = if trimmed.starts_with('=') || trimmed.starts_with(':') {
            trimmed[1..].trim()
        } else {
            return None;
        };
        if !val.is_empty() { return Some(val.to_string()); }
    }
    None
}

/// Estrae il primo numero dopo : o = nella riga
fn extract_numeric_after(line: &str) -> Option<f64> {
    // Trova : o = poi parsa il primo numero
    let sep_pos = line.rfind(':').or_else(|| line.rfind('='));
    if let Some(pos) = sep_pos {
        let after = line[pos + 1..].trim();
        // Prendi la prima parte (prima di , o ; o spazio)
        let num_str: String = after.chars()
            .take_while(|c| c.is_ascii_digit() || *c == '.' || *c == '-')
            .collect();
        return num_str.parse().ok();
    }
    None
}

/// Estrae attributo XML: attr="value" → value
fn extract_xml_attr(line: &str, attr: &str) -> Option<String> {
    let pattern = format!("{}=\"", attr);
    if let Some(pos) = line.find(&pattern) {
        let start = pos + pattern.len();
        if let Some(end) = line[start..].find('"') {
            return Some(line[start..start + end].to_string());
        }
    }
    None
}

fn parse_time_string(s: &str) -> i64 {
    let mut total: i64 = 0;
    let mut num = String::new();
    for ch in s.chars() {
        if ch.is_ascii_digit() { num.push(ch); }
        else {
            if !num.is_empty() {
                let n: i64 = num.parse().unwrap_or(0);
                match ch {
                    'h' | 'H' => total += n * 3600,
                    'm' | 'M' => total += n * 60,
                    's' | 'S' => total += n,
                    'd' | 'D' => total += n * 86400,
                    _ => {}
                }
                num.clear();
            }
        }
    }
    total
}
