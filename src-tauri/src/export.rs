// src-tauri/src/export.rs
// Sparks3D Preventivi – Esportazione dati CSV / XLSX
// ====================================================

use rust_xlsxwriter::*;
use serde::Deserialize;
use tauri::State;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub tipo: String,       // "preventivi" | "clienti" | "materiali" | "stampanti" | "profili" | "statistiche" | "tutto"
    pub formato: String,    // "csv" | "xlsx"
    pub dest_path: String,
}

#[derive(Debug, serde::Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub path: String,
    pub righe: usize,
    pub messaggio: String,
}

// ── Comando Tauri ──

#[tauri::command]
pub fn export_data(state: State<AppState>, request: ExportRequest) -> Result<ExportResult, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    match request.formato.as_str() {
        "csv" => export_csv(&db, &request),
        "xlsx" => export_xlsx(&db, &request),
        _ => Err("Formato non supportato. Usa 'csv' o 'xlsx'.".into()),
    }
}

// ══════════════════════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════════════════════

fn export_csv(db: &rusqlite::Connection, req: &ExportRequest) -> Result<ExportResult, String> {
    let mut totale_righe = 0;

    if req.tipo == "tutto" {
        // Esporta ogni tipo in un file separato nella stessa cartella
        let base = std::path::Path::new(&req.dest_path);
        let dir = base.parent().unwrap_or(base);
        let tipi = ["preventivi", "clienti", "materiali", "stampanti", "profili", "statistiche"];
        for tipo in tipi {
            let path = dir.join(format!("Sparks3D_{}.csv", tipo));
            let n = write_csv_single(db, tipo, &path.to_string_lossy())?;
            totale_righe += n;
        }
        return Ok(ExportResult {
            success: true,
            path: dir.to_string_lossy().to_string(),
            righe: totale_righe,
            messaggio: format!("Esportati {} file CSV con {} righe totali nella cartella", tipi.len(), totale_righe),
        });
    }

    let righe = write_csv_single(db, &req.tipo, &req.dest_path)?;
    Ok(ExportResult {
        success: true,
        path: req.dest_path.clone(),
        righe,
        messaggio: format!("Esportate {} righe in CSV", righe),
    })
}

fn write_csv_single(db: &rusqlite::Connection, tipo: &str, path: &str) -> Result<usize, String> {
    let csv_content = match tipo {
        "preventivi" => build_csv_preventivi(db)?,
        "clienti" => build_csv_clienti(db)?,
        "materiali" => build_csv_materiali(db)?,
        "stampanti" => build_csv_stampanti(db)?,
        "profili" => build_csv_profili(db)?,
        "statistiche" => build_csv_statistiche(db)?,
        _ => return Err(format!("Tipo '{}' non supportato", tipo)),
    };
    let righe = csv_content.lines().count().saturating_sub(1); // escludi header
    std::fs::write(path, csv_content.as_bytes()).map_err(|e| format!("Errore scrittura file: {}", e))?;
    Ok(righe)
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}

fn build_csv_preventivi(db: &rusqlite::Connection) -> Result<String, String> {
    let mut out = String::from("Numero;Stato;Data;Cliente;Righe;Costo Totale;Totale Cliente;Profit;Materiale (g);Tempo (s);Totale Finale\n");
    let mut stmt = db.prepare(
        "SELECT p.numero, p.stato, p.data_creazione,
                COALESCE(c.denominazione_azienda, c.nome || ' ' || c.cognome, '') AS cliente,
                (SELECT COUNT(*) FROM righe_preventivo WHERE preventivo_id = p.id),
                p.totale_costo, p.totale_cliente, p.totale_profit,
                p.totale_materiale_g, p.totale_tempo_sec, p.totale_finale
         FROM preventivi p LEFT JOIN clienti c ON c.id = p.cliente_id
         ORDER BY p.data_creazione DESC"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("{};{};{};{};{};{:.2};{:.2};{:.2};{:.1};{};{:.2}",
            row.get::<_,String>(0)?, row.get::<_,String>(1)?, row.get::<_,String>(2)?,
            csv_escape(&row.get::<_,String>(3)?), row.get::<_,i64>(4)?,
            row.get::<_,f64>(5)?, row.get::<_,f64>(6)?, row.get::<_,f64>(7)?,
            row.get::<_,f64>(8)?, row.get::<_,i64>(9)?, row.get::<_,f64>(10)?
        ))
    }).map_err(|e| e.to_string())?;
    for r in rows.filter_map(|r| r.ok()) { out.push_str(&r); out.push('\n'); }
    Ok(out)
}

fn build_csv_clienti(db: &rusqlite::Connection) -> Result<String, String> {
    let mut out = String::from("Nome;Cognome;Azienda;Email;Telefono;Indirizzo;CAP;Città;Provincia;P.IVA;CF;Note\n");
    let mut stmt = db.prepare(
        "SELECT nome,cognome,denominazione_azienda,email,telefono,indirizzo,cap,citta,provincia,partita_iva,codice_fiscale,note FROM clienti ORDER BY COALESCE(NULLIF(denominazione_azienda,''),nome)"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("{};{};{};{};{};{};{};{};{};{};{};{}",
            csv_escape(&row.get::<_,String>(0)?), csv_escape(&row.get::<_,String>(1)?),
            csv_escape(&row.get::<_,String>(2)?), csv_escape(&row.get::<_,String>(3)?),
            csv_escape(&row.get::<_,String>(4)?), csv_escape(&row.get::<_,String>(5)?),
            csv_escape(&row.get::<_,String>(6)?), csv_escape(&row.get::<_,String>(7)?),
            csv_escape(&row.get::<_,String>(8)?), csv_escape(&row.get::<_,String>(9)?),
            csv_escape(&row.get::<_,String>(10)?), csv_escape(&row.get::<_,String>(11)?)
        ))
    }).map_err(|e| e.to_string())?;
    for r in rows.filter_map(|r| r.ok()) { out.push_str(&r); out.push('\n'); }
    Ok(out)
}

fn build_csv_materiali(db: &rusqlite::Connection) -> Result<String, String> {
    let mut out = String::from("Nome;Profilo Slicer;Origine;Peso Specifico (g/cm³);Prezzo/kg (€);Markup %;Fallimento %;Magazzino (kg);Link Acquisto\n");
    let mut stmt = db.prepare("SELECT nome,profilo_slicer,slicer_origin,peso_specifico_gcm3,prezzo_kg,markup_percentuale,fallimento_percentuale,magazzino_kg,link_acquisto FROM materiali ORDER BY nome").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("{};{};{};{:.3};{:.2};{:.1};{:.1};{:.2};{}",
            csv_escape(&row.get::<_,String>(0)?), csv_escape(&row.get::<_,String>(1)?),
            csv_escape(&row.get::<_,String>(2)?), row.get::<_,f64>(3)?,
            row.get::<_,f64>(4)?, row.get::<_,f64>(5)?,
            row.get::<_,f64>(6)?, row.get::<_,f64>(7)?,
            csv_escape(&row.get::<_,String>(8)?)
        ))
    }).map_err(|e| e.to_string())?;
    for r in rows.filter_map(|r| r.ok()) { out.push_str(&r); out.push('\n'); }
    Ok(out)
}

fn build_csv_stampanti(db: &rusqlite::Connection) -> Result<String, String> {
    let mut out = String::from("Nome;Profilo Slicer;Origine;Consumo (kWh);Ammortamento/ora (€)\n");
    let mut stmt = db.prepare("SELECT nome,profilo_slicer,slicer_origin,consumo_kwh,ammortamento_ora FROM stampanti ORDER BY nome").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("{};{};{};{:.3};{:.2}",
            csv_escape(&row.get::<_,String>(0)?), csv_escape(&row.get::<_,String>(1)?),
            csv_escape(&row.get::<_,String>(2)?), row.get::<_,f64>(3)?, row.get::<_,f64>(4)?
        ))
    }).map_err(|e| e.to_string())?;
    for r in rows.filter_map(|r| r.ok()) { out.push_str(&r); out.push('\n'); }
    Ok(out)
}

fn build_csv_profili(db: &rusqlite::Connection) -> Result<String, String> {
    let mut out = String::from("Nome;Profilo Slicer;Origine;Layer Height (mm);Pareti;Infill %;Top Layers;Bottom Layers;Supporti Albero;Supporti Normali\n");
    let mut stmt = db.prepare("SELECT nome,profilo_slicer,slicer_origin,layer_height_mm,numero_pareti,infill_percentuale,top_layers,bottom_layers,supporti_albero,supporti_normali FROM profili_stampa ORDER BY nome").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(format!("{};{};{};{:.2};{};{:.1};{};{};{};{}",
            csv_escape(&row.get::<_,String>(0)?), csv_escape(&row.get::<_,String>(1)?),
            csv_escape(&row.get::<_,String>(2)?), row.get::<_,f64>(3)?,
            row.get::<_,i64>(4)?, row.get::<_,f64>(5)?,
            row.get::<_,i64>(6)?, row.get::<_,i64>(7)?,
            if row.get::<_,bool>(8)? { "Sì" } else { "No" },
            if row.get::<_,bool>(9)? { "Sì" } else { "No" }
        ))
    }).map_err(|e| e.to_string())?;
    for r in rows.filter_map(|r| r.ok()) { out.push_str(&r); out.push('\n'); }
    Ok(out)
}

fn build_csv_statistiche(db: &rusqlite::Connection) -> Result<String, String> {
    let mut out = String::from("Indicatore;Valore\n");
    let (tot, conf, fatt, prof, mat_g, tempo_s): (i64, i64, f64, f64, f64, f64) = db.query_row(
        "SELECT COUNT(*), (SELECT COUNT(*) FROM preventivi WHERE stato='confermato'),
                COALESCE(SUM(totale_finale),0), COALESCE(SUM(totale_profit),0),
                COALESCE(SUM(totale_materiale_g),0), COALESCE(SUM(totale_tempo_sec),0) FROM preventivi",
        [], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?))).map_err(|e| e.to_string())?;
    let n_cli: i64 = db.query_row("SELECT COUNT(*) FROM clienti", [], |r| r.get(0)).unwrap_or(0);
    let n_mat: i64 = db.query_row("SELECT COUNT(*) FROM materiali", [], |r| r.get(0)).unwrap_or(0);
    let n_sta: i64 = db.query_row("SELECT COUNT(*) FROM stampanti", [], |r| r.get(0)).unwrap_or(0);

    out.push_str(&format!("Totale preventivi;{}\n", tot));
    out.push_str(&format!("Preventivi confermati;{}\n", conf));
    out.push_str(&format!("Fatturato totale (€);{:.2}\n", fatt));
    out.push_str(&format!("Profitto totale (€);{:.2}\n", prof));
    out.push_str(&format!("Materiale utilizzato (kg);{:.2}\n", mat_g / 1000.0));
    out.push_str(&format!("Tempo stampa totale (ore);{:.1}\n", tempo_s / 3600.0));
    out.push_str(&format!("Tasso conversione (%);{:.1}\n", if tot > 0 { conf as f64 / tot as f64 * 100.0 } else { 0.0 }));
    out.push_str(&format!("Valore medio preventivo (€);{:.2}\n", if tot > 0 { fatt / tot as f64 } else { 0.0 }));
    out.push_str(&format!("Clienti in anagrafica;{}\n", n_cli));
    out.push_str(&format!("Materiali configurati;{}\n", n_mat));
    out.push_str(&format!("Stampanti configurate;{}\n", n_sta));
    Ok(out)
}

// ══════════════════════════════════════════════════════════════
// XLSX EXPORT
// ══════════════════════════════════════════════════════════════

fn header_format() -> Format {
    Format::new()
        .set_bold()
        .set_font_size(11.0)
        .set_background_color(Color::RGB(0x1a2340))
        .set_font_color(Color::RGB(0x60a5fa))
        .set_border_bottom(FormatBorder::Thin)
        .set_border_color(Color::RGB(0x334155))
}

fn money_format() -> Format {
    Format::new().set_num_format("€ #,##0.00")
}

fn pct_format() -> Format {
    Format::new().set_num_format("0.0\"%\"")
}

fn export_xlsx(db: &rusqlite::Connection, req: &ExportRequest) -> Result<ExportResult, String> {
    let mut wb = Workbook::new();
    let mut totale_righe = 0;

    let tipi: Vec<&str> = if req.tipo == "tutto" {
        vec!["preventivi", "clienti", "materiali", "stampanti", "profili", "statistiche"]
    } else {
        vec![req.tipo.as_str()]
    };

    for tipo in &tipi {
        let n = match *tipo {
            "preventivi" => write_xlsx_preventivi(db, &mut wb)?,
            "clienti" => write_xlsx_clienti(db, &mut wb)?,
            "materiali" => write_xlsx_materiali(db, &mut wb)?,
            "stampanti" => write_xlsx_stampanti(db, &mut wb)?,
            "profili" => write_xlsx_profili(db, &mut wb)?,
            "statistiche" => write_xlsx_statistiche(db, &mut wb)?,
            _ => return Err(format!("Tipo '{}' non supportato", tipo)),
        };
        totale_righe += n;
    }

    wb.save(&req.dest_path).map_err(|e| format!("Errore salvataggio XLSX: {}", e))?;

    Ok(ExportResult {
        success: true,
        path: req.dest_path.clone(),
        righe: totale_righe,
        messaggio: format!("Esportate {} righe in {} fogli Excel", totale_righe, tipi.len()),
    })
}

fn write_xlsx_preventivi(db: &rusqlite::Connection, wb: &mut Workbook) -> Result<usize, String> {
    let ws = wb.add_worksheet().set_name("Preventivi").map_err(|e| e.to_string())?;
    let hf = header_format();
    let mf = money_format();
    let headers = ["Numero","Stato","Data","Cliente","Righe","Costo","Al Cliente","Profit","Materiale (g)","Tempo (s)","Totale Finale"];
    for (c, h) in headers.iter().enumerate() { let _ = ws.write_string_with_format(0, c as u16, *h, &hf); }
    let _ = ws.set_column_width(0, 16); let _ = ws.set_column_width(1, 14);
    let _ = ws.set_column_width(2, 12); let _ = ws.set_column_width(3, 25);

    let mut stmt = db.prepare(
        "SELECT p.numero, p.stato, p.data_creazione,
                COALESCE(c.denominazione_azienda, c.nome || ' ' || c.cognome, ''),
                (SELECT COUNT(*) FROM righe_preventivo WHERE preventivo_id = p.id),
                p.totale_costo, p.totale_cliente, p.totale_profit,
                p.totale_materiale_g, p.totale_tempo_sec, p.totale_finale
         FROM preventivi p LEFT JOIN clienti c ON c.id = p.cliente_id
         ORDER BY p.data_creazione DESC"
    ).map_err(|e| e.to_string())?;
    let mut row = 1u32;
    let rows_iter = stmt.query_map([], |r| {
        Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?,
            r.get::<_,String>(3)?, r.get::<_,i64>(4)?,
            r.get::<_,f64>(5)?, r.get::<_,f64>(6)?, r.get::<_,f64>(7)?,
            r.get::<_,f64>(8)?, r.get::<_,i64>(9)?, r.get::<_,f64>(10)?))
    }).map_err(|e| e.to_string())?;
    for r in rows_iter.filter_map(|r| r.ok()) {
        let _ = ws.write_string(row, 0, &r.0);
        let _ = ws.write_string(row, 1, &r.1);
        let _ = ws.write_string(row, 2, &r.2);
        let _ = ws.write_string(row, 3, &r.3);
        let _ = ws.write_number(row, 4, r.4 as f64);
        let _ = ws.write_number_with_format(row, 5, r.5, &mf);
        let _ = ws.write_number_with_format(row, 6, r.6, &mf);
        let _ = ws.write_number_with_format(row, 7, r.7, &mf);
        let _ = ws.write_number(row, 8, r.8);
        let _ = ws.write_number(row, 9, r.9 as f64);
        let _ = ws.write_number_with_format(row, 10, r.10, &mf);
        row += 1;
    }
    Ok((row - 1) as usize)
}

fn write_xlsx_clienti(db: &rusqlite::Connection, wb: &mut Workbook) -> Result<usize, String> {
    let ws = wb.add_worksheet().set_name("Clienti").map_err(|e| e.to_string())?;
    let hf = header_format();
    let headers = ["Nome","Cognome","Azienda","Email","Telefono","Indirizzo","CAP","Città","Provincia","P.IVA","CF","Note"];
    for (c, h) in headers.iter().enumerate() { let _ = ws.write_string_with_format(0, c as u16, *h, &hf); }
    let _ = ws.set_column_width(0, 15); let _ = ws.set_column_width(2, 25);
    let _ = ws.set_column_width(3, 25); let _ = ws.set_column_width(5, 30);

    let mut stmt = db.prepare("SELECT nome,cognome,denominazione_azienda,email,telefono,indirizzo,cap,citta,provincia,partita_iva,codice_fiscale,note FROM clienti ORDER BY COALESCE(NULLIF(denominazione_azienda,''),nome)").map_err(|e| e.to_string())?;
    let mut row = 1u32;
    let rows_iter = stmt.query_map([], |r| {
        Ok((0..12).map(|i| r.get::<_,String>(i).unwrap_or_default()).collect::<Vec<_>>())
    }).map_err(|e| e.to_string())?;
    for fields in rows_iter.filter_map(|r| r.ok()) {
        for (c, v) in fields.iter().enumerate() { let _ = ws.write_string(row, c as u16, v); }
        row += 1;
    }
    Ok((row - 1) as usize)
}

fn write_xlsx_materiali(db: &rusqlite::Connection, wb: &mut Workbook) -> Result<usize, String> {
    let ws = wb.add_worksheet().set_name("Materiali").map_err(|e| e.to_string())?;
    let hf = header_format(); let mf = money_format(); let pf = pct_format();
    let headers = ["Nome","Profilo Slicer","Origine","Peso Specifico","Prezzo/kg","Markup %","Fallimento %","Magazzino (kg)","Link Acquisto"];
    for (c, h) in headers.iter().enumerate() { let _ = ws.write_string_with_format(0, c as u16, *h, &hf); }
    let _ = ws.set_column_width(0, 20); let _ = ws.set_column_width(1, 20); let _ = ws.set_column_width(8, 30);

    let mut stmt = db.prepare("SELECT nome,profilo_slicer,slicer_origin,peso_specifico_gcm3,prezzo_kg,markup_percentuale,fallimento_percentuale,magazzino_kg,link_acquisto FROM materiali ORDER BY nome").map_err(|e| e.to_string())?;
    let mut row = 1u32;
    let rows_iter = stmt.query_map([], |r| {
        Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?,
            r.get::<_,f64>(3)?, r.get::<_,f64>(4)?, r.get::<_,f64>(5)?,
            r.get::<_,f64>(6)?, r.get::<_,f64>(7)?, r.get::<_,String>(8)?))
    }).map_err(|e| e.to_string())?;
    for r in rows_iter.filter_map(|r| r.ok()) {
        let _ = ws.write_string(row, 0, &r.0);
        let _ = ws.write_string(row, 1, &r.1);
        let _ = ws.write_string(row, 2, &r.2);
        let _ = ws.write_number(row, 3, r.3);
        let _ = ws.write_number_with_format(row, 4, r.4, &mf);
        let _ = ws.write_number_with_format(row, 5, r.5, &pf);
        let _ = ws.write_number_with_format(row, 6, r.6, &pf);
        let _ = ws.write_number(row, 7, r.7);
        let _ = ws.write_string(row, 8, &r.8);
        row += 1;
    }
    Ok((row - 1) as usize)
}

fn write_xlsx_stampanti(db: &rusqlite::Connection, wb: &mut Workbook) -> Result<usize, String> {
    let ws = wb.add_worksheet().set_name("Stampanti").map_err(|e| e.to_string())?;
    let hf = header_format(); let mf = money_format();
    let headers = ["Nome","Profilo Slicer","Origine","Consumo (kWh)","Ammortamento/ora"];
    for (c, h) in headers.iter().enumerate() { let _ = ws.write_string_with_format(0, c as u16, *h, &hf); }
    let _ = ws.set_column_width(0, 20); let _ = ws.set_column_width(1, 20);

    let mut stmt = db.prepare("SELECT nome,profilo_slicer,slicer_origin,consumo_kwh,ammortamento_ora FROM stampanti ORDER BY nome").map_err(|e| e.to_string())?;
    let mut row = 1u32;
    let rows_iter = stmt.query_map([], |r| {
        Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?, r.get::<_,f64>(3)?, r.get::<_,f64>(4)?))
    }).map_err(|e| e.to_string())?;
    for r in rows_iter.filter_map(|r| r.ok()) {
        let _ = ws.write_string(row, 0, &r.0);
        let _ = ws.write_string(row, 1, &r.1);
        let _ = ws.write_string(row, 2, &r.2);
        let _ = ws.write_number(row, 3, r.3);
        let _ = ws.write_number_with_format(row, 4, r.4, &mf);
        row += 1;
    }
    Ok((row - 1) as usize)
}

fn write_xlsx_profili(db: &rusqlite::Connection, wb: &mut Workbook) -> Result<usize, String> {
    let ws = wb.add_worksheet().set_name("Profili Stampa").map_err(|e| e.to_string())?;
    let hf = header_format(); let pf = pct_format();
    let headers = ["Nome","Profilo Slicer","Origine","Layer Height","Pareti","Infill %","Top Layers","Bottom Layers","Sup. Albero","Sup. Normali"];
    for (c, h) in headers.iter().enumerate() { let _ = ws.write_string_with_format(0, c as u16, *h, &hf); }
    let _ = ws.set_column_width(0, 20); let _ = ws.set_column_width(1, 20);

    let mut stmt = db.prepare("SELECT nome,profilo_slicer,slicer_origin,layer_height_mm,numero_pareti,infill_percentuale,top_layers,bottom_layers,supporti_albero,supporti_normali FROM profili_stampa ORDER BY nome").map_err(|e| e.to_string())?;
    let mut row = 1u32;
    let rows_iter = stmt.query_map([], |r| {
        Ok((r.get::<_,String>(0)?, r.get::<_,String>(1)?, r.get::<_,String>(2)?,
            r.get::<_,f64>(3)?, r.get::<_,i64>(4)?, r.get::<_,f64>(5)?,
            r.get::<_,i64>(6)?, r.get::<_,i64>(7)?, r.get::<_,bool>(8)?, r.get::<_,bool>(9)?))
    }).map_err(|e| e.to_string())?;
    for r in rows_iter.filter_map(|r| r.ok()) {
        let _ = ws.write_string(row, 0, &r.0);
        let _ = ws.write_string(row, 1, &r.1);
        let _ = ws.write_string(row, 2, &r.2);
        let _ = ws.write_number(row, 3, r.3);
        let _ = ws.write_number(row, 4, r.4 as f64);
        let _ = ws.write_number_with_format(row, 5, r.5, &pf);
        let _ = ws.write_number(row, 6, r.6 as f64);
        let _ = ws.write_number(row, 7, r.7 as f64);
        let _ = ws.write_string(row, 8, if r.8 { "Sì" } else { "No" });
        let _ = ws.write_string(row, 9, if r.9 { "Sì" } else { "No" });
        row += 1;
    }
    Ok((row - 1) as usize)
}

fn write_xlsx_statistiche(db: &rusqlite::Connection, wb: &mut Workbook) -> Result<usize, String> {
    let ws = wb.add_worksheet().set_name("Statistiche").map_err(|e| e.to_string())?;
    let hf = header_format(); let mf = money_format();
    let _ = ws.write_string_with_format(0, 0, "Indicatore", &hf);
    let _ = ws.write_string_with_format(0, 1, "Valore", &hf);
    let _ = ws.set_column_width(0, 30); let _ = ws.set_column_width(1, 20);

    let (tot, conf, fatt, prof, mat_g, tempo_s): (i64, i64, f64, f64, f64, f64) = db.query_row(
        "SELECT COUNT(*), (SELECT COUNT(*) FROM preventivi WHERE stato='confermato'),
                COALESCE(SUM(totale_finale),0), COALESCE(SUM(totale_profit),0),
                COALESCE(SUM(totale_materiale_g),0), COALESCE(SUM(totale_tempo_sec),0) FROM preventivi",
        [], |r| Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?,r.get(4)?,r.get(5)?))).map_err(|e| e.to_string())?;
    let n_cli: i64 = db.query_row("SELECT COUNT(*) FROM clienti", [], |r| r.get(0)).unwrap_or(0);
    let n_mat: i64 = db.query_row("SELECT COUNT(*) FROM materiali", [], |r| r.get(0)).unwrap_or(0);
    let n_sta: i64 = db.query_row("SELECT COUNT(*) FROM stampanti", [], |r| r.get(0)).unwrap_or(0);

    let stats: Vec<(&str, f64)> = vec![
        ("Totale preventivi", tot as f64),
        ("Preventivi confermati", conf as f64),
        ("Fatturato totale", fatt),
        ("Profitto totale", prof),
        ("Materiale utilizzato (kg)", mat_g / 1000.0),
        ("Tempo stampa totale (ore)", tempo_s / 3600.0),
        ("Tasso conversione (%)", if tot > 0 { conf as f64 / tot as f64 * 100.0 } else { 0.0 }),
        ("Valore medio preventivo", if tot > 0 { fatt / tot as f64 } else { 0.0 }),
        ("Clienti in anagrafica", n_cli as f64),
        ("Materiali configurati", n_mat as f64),
        ("Stampanti configurate", n_sta as f64),
    ];

    for (i, (label, val)) in stats.iter().enumerate() {
        let row = (i + 1) as u32;
        let _ = ws.write_string(row, 0, *label);
        if label.contains("Fatturato") || label.contains("Profitto") || label.contains("Valore medio") {
            let _ = ws.write_number_with_format(row, 1, *val, &mf);
        } else {
            let _ = ws.write_number(row, 1, *val);
        }
    }
    Ok(stats.len())
}
