// src-tauri/src/db.rs
// Sparks3D Preventivi – Database con cifratura SQLCipher
// =========================================================

use rusqlite::{Connection, Result};
use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::{Path, PathBuf};

// ── Chiave di cifratura SQLCipher (livello applicazione) ──
//
// Protegge i dati da accesso diretto tramite qualsiasi SQLite viewer.
// Un attaccante con accesso al file system non può aprire il DB senza
// fare reverse engineering del binario. Per dati classificati usa
// una chiave machine-specific (DPAPI/keyring), che però rompe la
// portabilità dei backup tra PC diversi.
const DB_KEY: &str = "Sp4rks3D-Pr3v3ntivi-2024-S3cur3K3y-v1";

/// Cartella dati applicazione
fn app_data_dir() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("Sparks3DPreventivi")
}

pub fn get_db_path() -> PathBuf {
    let dir = app_data_dir();
    std::fs::create_dir_all(&dir).ok();
    dir.join("sparks3d.db")
}

/// Calcola SHA-256 di una sequenza di byte e lo restituisce come stringa hex.
pub fn compute_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().iter().map(|b| format!("{:02x}", b)).collect()
}

/// Verifica se il file DB è già cifrato con SQLCipher.
/// I DB SQLite in chiaro iniziano con il magic header "SQLite format 3\0".
/// I DB SQLCipher hanno i primi 16 byte cifrati (casuali in apparenza).
fn is_db_encrypted(path: &Path) -> bool {
    let Ok(mut f) = std::fs::File::open(path) else { return false };
    let mut header = [0u8; 16];
    let Ok(_) = f.read_exact(&mut header) else { return false };
    &header != b"SQLite format 3\0"
}

/// Migrazione one-shot: cifra un DB SQLite in chiaro con SQLCipher (AES-256-CBC).
/// Viene chiamata automaticamente quando si rileva un DB non cifrato
/// (upgrade da versione < 1.2.0 o ripristino di un backup vecchio).
fn migrate_to_encrypted(path: &Path) -> std::result::Result<(), String> {
    eprintln!("[Sparks3D] Avvio cifratura database (SQLCipher AES-256)...");
    let tmp = path.with_file_name("sparks3d_encrypting_tmp.db");

    // Apri il DB in chiaro (senza chiave — SQLCipher in modalità compatibilità)
    let conn = Connection::open(path)
        .map_err(|e| format!("Errore apertura DB per cifratura: {e}"))?;

    // ATTACH del DB cifrato di destinazione + esportazione tramite sqlcipher_export
    let enc_path = tmp.to_string_lossy().replace('\'', "''");
    conn.execute_batch(&format!(
        "ATTACH DATABASE '{enc_path}' AS encrypted KEY '{DB_KEY}'; \
         SELECT sqlcipher_export('encrypted'); \
         DETACH DATABASE encrypted;"
    )).map_err(|e| format!("Errore durante sqlcipher_export: {e}"))?;

    drop(conn); // chiudi la connessione al DB in chiaro

    // Rimuovi WAL/SHM del DB originale prima di sostituirlo
    let _ = std::fs::remove_file(path.with_extension("db-wal"));
    let _ = std::fs::remove_file(path.with_extension("db-shm"));

    // Sostituisci il DB in chiaro con quello cifrato
    std::fs::rename(&tmp, path)
        .map_err(|e| format!("Errore sostituzione DB: {e}"))?;

    eprintln!("[Sparks3D] Database cifrato con successo.");
    Ok(())
}

/// Apre il database con la chiave SQLCipher.
/// Se il DB esiste in chiaro (upgrade da versione precedente),
/// lo cifra automaticamente prima di aprirlo.
pub fn open_db(path: &Path) -> std::result::Result<Connection, String> {
    // Migrazione automatica per chi aggiorna da v1.1.x o precedente
    if path.exists() && !is_db_encrypted(path) {
        if let Err(e) = migrate_to_encrypted(path) {
            eprintln!("[Sparks3D] Avviso migrazione DB: {e}");
            // Continua: se la cifratura fallisce si apre il DB in chiaro
            // (meglio degradare che crashare all'avvio)
        }
    }

    let conn = Connection::open(path)
        .map_err(|e| format!("Impossibile aprire il database: {e}"))?;

    // PRAGMA key: deve essere il PRIMO comando dopo Connection::open con SQLCipher
    conn.execute_batch(&format!("PRAGMA key = '{DB_KEY}';"))
        .map_err(|e| format!("Errore impostazione chiave SQLCipher: {e}"))?;

    Ok(conn)
}

/// Controlla se c'è un ripristino DB in attesa e lo applica prima di aprire il DB.
///
/// Sicurezza:
/// - Verifica l'hash SHA-256 (scritto da create_backup in v1.2.0+) prima di applicare.
/// - Se il file pending è stato manomesso, il restore viene annullato.
/// - Se il DB ripristinato è in chiaro (backup da versione < 1.2.0), viene cifrato.
pub fn apply_pending_restore() {
    let dir = app_data_dir();
    let pending = dir.join("sparks3d_restore_pending.db");
    let target  = dir.join("sparks3d.db");
    let hash_file = dir.join("sparks3d_restore_pending.sha256");

    if !pending.exists() { return; }

    // ── 1. Verifica integrità SHA-256 ──
    // Il file .sha256 è presente nei backup creati da v1.2.0+.
    // Per i backup più vecchi (senza .sha256) si procede senza verifica
    // per garantire la retrocompatibilità.
    if hash_file.exists() {
        let expected = std::fs::read_to_string(&hash_file)
            .unwrap_or_default()
            .trim()
            .to_string();

        match std::fs::read(&pending) {
            Ok(bytes) => {
                let actual = compute_sha256(&bytes);
                if actual != expected {
                    eprintln!("[Sparks3D] SICUREZZA: hash SHA-256 del DB pending non valido. Ripristino annullato.");
                    eprintln!("  Atteso:  {}", expected);
                    eprintln!("  Trovato: {}", actual);
                    // Elimina tutti i file pending per evitare tentativi successivi
                    let _ = std::fs::remove_file(&pending);
                    let _ = std::fs::remove_file(&hash_file);
                    let _ = std::fs::remove_file(dir.join("sparks3d_restore_pending.db-wal"));
                    let _ = std::fs::remove_file(dir.join("sparks3d_restore_pending.db-shm"));
                    return;
                }
                eprintln!("[Sparks3D] Verifica SHA-256 backup: OK.");
            }
            Err(e) => {
                eprintln!("[Sparks3D] Errore lettura DB pending per verifica hash: {e}. Ripristino annullato.");
                return;
            }
        }
        // Hash verificato: rimuovi il file sidecar
        let _ = std::fs::remove_file(&hash_file);
    } else {
        eprintln!("[Sparks3D] Backup senza SHA-256 (versione precedente) — ripristino senza verifica integrità.");
    }

    // ── 2. Applica il ripristino ──

    // Rimuovi WAL/SHM del DB corrente
    let _ = std::fs::remove_file(dir.join("sparks3d.db-wal"));
    let _ = std::fs::remove_file(dir.join("sparks3d.db-shm"));

    match std::fs::rename(&pending, &target) {
        Ok(_) => {
            // Sposta anche WAL/SHM del backup se presenti
            let _ = std::fs::rename(
                dir.join("sparks3d_restore_pending.db-wal"),
                dir.join("sparks3d.db-wal"),
            );
            let _ = std::fs::rename(
                dir.join("sparks3d_restore_pending.db-shm"),
                dir.join("sparks3d.db-shm"),
            );
            eprintln!("[Sparks3D] Database ripristinato da backup.");

            // ── 3. Cifra il DB ripristinato se è in chiaro (backup da v < 1.2.0) ──
            if !is_db_encrypted(&target) {
                eprintln!("[Sparks3D] DB ripristinato in chiaro — avvio cifratura...");
                if let Err(e) = migrate_to_encrypted(&target) {
                    eprintln!("[Sparks3D] Avviso: impossibile cifrare il DB ripristinato: {e}");
                }
            }
        }
        Err(e) => {
            eprintln!("[Sparks3D] Errore applicazione ripristino DB: {e}");
            let _ = std::fs::remove_file(&pending);
            let _ = std::fs::remove_file(dir.join("sparks3d_restore_pending.db-wal"));
            let _ = std::fs::remove_file(dir.join("sparks3d_restore_pending.db-shm"));
        }
    }
}

pub fn init_schema(conn: &Connection) -> Result<()> {
    // ── PRAGMA performance (devono seguire PRAGMA key, già impostato in open_db) ──
    conn.execute_batch("
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -8000;
        PRAGMA temp_store = MEMORY;
    ")?;
    conn.execute_batch(r#"
        CREATE TABLE IF NOT EXISTS azienda (
            id INTEGER PRIMARY KEY DEFAULT 1,
            ragione_sociale TEXT NOT NULL DEFAULT '',
            indirizzo TEXT DEFAULT '', cap TEXT DEFAULT '',
            citta TEXT DEFAULT '', provincia TEXT DEFAULT '',
            paese TEXT NOT NULL DEFAULT 'IT',
            partita_iva TEXT DEFAULT '', codice_fiscale TEXT DEFAULT '',
            email TEXT DEFAULT '', telefono TEXT DEFAULT '',
            logo_path TEXT DEFAULT '',
            regime_fiscale TEXT DEFAULT 'ordinario',
            iva_percentuale REAL DEFAULT 22.0,
            nota_regime TEXT DEFAULT '',
            prefisso_preventivo TEXT DEFAULT 'S3D',
            prossimo_numero INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT OR IGNORE INTO azienda (id) VALUES (1);

        CREATE TABLE IF NOT EXISTS impostazioni (
            chiave TEXT PRIMARY KEY,
            valore TEXT NOT NULL,
            tipo TEXT DEFAULT 'text'
        );

        CREATE TABLE IF NOT EXISTS clienti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT DEFAULT '', cognome TEXT DEFAULT '',
            denominazione_azienda TEXT DEFAULT '',
            email TEXT DEFAULT '', telefono TEXT DEFAULT '',
            indirizzo TEXT DEFAULT '', cap TEXT DEFAULT '',
            citta TEXT DEFAULT '', provincia TEXT DEFAULT '',
            partita_iva TEXT DEFAULT '', codice_fiscale TEXT DEFAULT '',
            note TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS materiali (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            profilo_slicer TEXT DEFAULT '',
            slicer_origin TEXT DEFAULT 'bambu',
            peso_specifico_gcm3 REAL DEFAULT 0.0,
            prezzo_kg REAL NOT NULL DEFAULT 0.0,
            markup_percentuale REAL DEFAULT 0.0,
            fallimento_percentuale REAL DEFAULT 0.0,
            magazzino_kg REAL DEFAULT 0.0,
            link_acquisto TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS stampanti (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            profilo_slicer TEXT DEFAULT '',
            slicer_origin TEXT DEFAULT 'bambu',
            consumo_kwh REAL DEFAULT 0.12,
            ammortamento_ora REAL DEFAULT 1.50,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS profili_stampa (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL UNIQUE,
            profilo_slicer TEXT DEFAULT '',
            slicer_origin TEXT DEFAULT 'bambu',
            layer_height_mm REAL DEFAULT 0.20,
            numero_pareti INTEGER DEFAULT 2,
            infill_percentuale REAL DEFAULT 15.0,
            top_layers INTEGER DEFAULT 4,
            bottom_layers INTEGER DEFAULT 4,
            supporti_albero INTEGER DEFAULT 0,
            supporti_normali INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS servizi_extra (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            importo_predefinito REAL DEFAULT 0.0,
            addebita INTEGER DEFAULT 0,
            addebita_senza_costo INTEGER DEFAULT 0,
            markup_percentuale REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS corrieri (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            servizio TEXT DEFAULT '',
            costo_spedizione REAL DEFAULT 0.0,
            tempo_consegna TEXT DEFAULT '',
            packlink_service_id TEXT DEFAULT '',
            note TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS metodi_pagamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            descrizione_pdf TEXT DEFAULT '',
            commissione_percentuale REAL DEFAULT 0.0,
            commissione_fissa REAL DEFAULT 0.0,
            addebita_al_cliente INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS preventivi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT NOT NULL UNIQUE, cliente_id INTEGER,
            stato TEXT DEFAULT 'non_confermato',
            data_creazione DATE DEFAULT (date('now')),
            markup_globale REAL DEFAULT 0.0, sconto_globale REAL DEFAULT 0.0,
            avvio_macchina REAL DEFAULT 0.0,
            metodo_pagamento_id INTEGER, corriere_id INTEGER,
            acconto_tipo TEXT DEFAULT '', acconto_valore REAL DEFAULT 0.0,
            ritenuta_acconto INTEGER DEFAULT 0, note TEXT DEFAULT '',
            congelato INTEGER DEFAULT 0,
            totale_costo REAL DEFAULT 0.0, totale_cliente REAL DEFAULT 0.0,
            totale_profit REAL DEFAULT 0.0, totale_materiale_g REAL DEFAULT 0.0,
            totale_tempo_sec INTEGER DEFAULT 0, totale_servizi REAL DEFAULT 0.0,
            totale_spedizione REAL DEFAULT 0.0, totale_finale REAL DEFAULT 0.0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS righe_preventivo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preventivo_id INTEGER NOT NULL,
            nome_file TEXT DEFAULT '', titolo_visualizzato TEXT DEFAULT '',
            file_path TEXT DEFAULT '', thumbnail_path TEXT DEFAULT '',
            stampante_id INTEGER, profilo_stampa_id INTEGER,
            quantita INTEGER DEFAULT 1, is_multicolore INTEGER DEFAULT 0,
            tempo_stampa_sec INTEGER DEFAULT 0, peso_totale_grammi REAL DEFAULT 0.0,
            ingombro_x_mm REAL DEFAULT 0.0, ingombro_y_mm REAL DEFAULT 0.0,
            ingombro_z_mm REAL DEFAULT 0.0,
            markup_riga REAL, sconto_riga REAL, fallimento_riga REAL,
            post_processing REAL DEFAULT 0.0,
            supporti_albero_override INTEGER, supporti_normali_override INTEGER,
            costo_materiale_totale REAL DEFAULT 0.0, costo_energia REAL DEFAULT 0.0,
            costo_ammortamento REAL DEFAULT 0.0, costo_fallimento REAL DEFAULT 0.0,
            totale_costo REAL DEFAULT 0.0, totale_cliente REAL DEFAULT 0.0,
            profit REAL DEFAULT 0.0,
            orientamento_json TEXT DEFAULT '{"x":0,"y":0,"z":0}',
            tempo_manuale INTEGER DEFAULT 0, peso_manuale INTEGER DEFAULT 0,
            ordine INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (preventivo_id) REFERENCES preventivi(id) ON DELETE CASCADE,
            FOREIGN KEY (stampante_id) REFERENCES stampanti(id) ON DELETE SET NULL,
            FOREIGN KEY (profilo_stampa_id) REFERENCES profili_stampa(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_righe_preventivo ON righe_preventivo(preventivo_id);

        CREATE TABLE IF NOT EXISTS riga_materiali (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            riga_preventivo_id INTEGER NOT NULL, materiale_id INTEGER NOT NULL,
            slot_ams INTEGER DEFAULT 1, colore_hex TEXT DEFAULT '',
            peso_grammi REAL DEFAULT 0.0, percentuale_pezzo REAL DEFAULT 100.0,
            costo_materiale REAL DEFAULT 0.0, costo_fallimento REAL DEFAULT 0.0,
            FOREIGN KEY (riga_preventivo_id) REFERENCES righe_preventivo(id) ON DELETE CASCADE,
            FOREIGN KEY (materiale_id) REFERENCES materiali(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_riga_materiali ON riga_materiali(riga_preventivo_id);

        CREATE TABLE IF NOT EXISTS preventivo_servizi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preventivo_id INTEGER NOT NULL, servizio_extra_id INTEGER NOT NULL,
            importo_override REAL, addebita_override INTEGER, markup_override REAL,
            costo_effettivo REAL DEFAULT 0.0, addebito_cliente REAL DEFAULT 0.0,
            profit_servizio REAL DEFAULT 0.0,
            FOREIGN KEY (preventivo_id) REFERENCES preventivi(id) ON DELETE CASCADE,
            FOREIGN KEY (servizio_extra_id) REFERENCES servizi_extra(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS predefiniti_caricamento (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL, stampante_id INTEGER, profilo_stampa_id INTEGER,
            post_processing REAL DEFAULT 0.0, is_default INTEGER DEFAULT 0,
            FOREIGN KEY (stampante_id) REFERENCES stampanti(id) ON DELETE SET NULL,
            FOREIGN KEY (profilo_stampa_id) REFERENCES profili_stampa(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS predefiniti_materiali (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            predefinito_id INTEGER NOT NULL, materiale_id INTEGER NOT NULL,
            slot_ams INTEGER DEFAULT 1,
            FOREIGN KEY (predefinito_id) REFERENCES predefiniti_caricamento(id) ON DELETE CASCADE,
            FOREIGN KEY (materiale_id) REFERENCES materiali(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ritenute (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preventivo_id INTEGER,
            preventivo_numero TEXT DEFAULT '',
            numero_ritenuta TEXT NOT NULL,
            data DATE NOT NULL,
            cliente_id INTEGER,
            cliente_nome TEXT DEFAULT '',
            importo_lordo REAL DEFAULT 0.0,
            ritenuta_importo REAL DEFAULT 0.0,
            netto_pagare REAL DEFAULT 0.0,
            marca_bollo REAL DEFAULT 0.0,
            descrizione TEXT DEFAULT '',
            pdf_path TEXT DEFAULT '',
            note TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (preventivo_id) REFERENCES preventivi(id) ON DELETE SET NULL,
            FOREIGN KEY (cliente_id) REFERENCES clienti(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ritenute_data ON ritenute(data);
        CREATE INDEX IF NOT EXISTS idx_ritenute_cliente ON ritenute(cliente_id);

        CREATE INDEX IF NOT EXISTS idx_preventivi_stato ON preventivi(stato);
        CREATE INDEX IF NOT EXISTS idx_preventivi_cliente ON preventivi(cliente_id);
        CREATE INDEX IF NOT EXISTS idx_preventivi_data ON preventivi(data_creazione);
        CREATE INDEX IF NOT EXISTS idx_prev_servizi ON preventivo_servizi(preventivo_id);

        CREATE TABLE IF NOT EXISTS licenza (
            id INTEGER PRIMARY KEY DEFAULT 1,
            tipo TEXT DEFAULT 'free', hardware_id TEXT DEFAULT '',
            data_attivazione DATE, data_scadenza DATE, file_licenza_path TEXT DEFAULT ''
        );
        INSERT OR IGNORE INTO licenza (id) VALUES (1);
    "#)?;

    // ── Migrazioni sicure (ALTER TABLE non fallisce se la colonna esiste già) ──
    let _ = conn.execute("ALTER TABLE azienda ADD COLUMN paese TEXT NOT NULL DEFAULT 'IT'", []);
    let _ = conn.execute("ALTER TABLE corrieri ADD COLUMN tempo_consegna TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE corrieri ADD COLUMN packlink_service_id TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE corrieri ADD COLUMN note TEXT DEFAULT ''", []);
    let _ = conn.execute("ALTER TABLE metodi_pagamento ADD COLUMN commissione_percentuale REAL DEFAULT 0.0", []);
    let _ = conn.execute("ALTER TABLE metodi_pagamento ADD COLUMN commissione_fissa REAL DEFAULT 0.0", []);
    let _ = conn.execute("ALTER TABLE metodi_pagamento ADD COLUMN addebita_al_cliente INTEGER DEFAULT 0", []);

    // ── Impostazioni predefinite ──
    let defaults = vec![
        ("costo_energia_kwh", "0.30"), ("soglia_scorte_kg", "1.5"),
        ("slicer_attivo", "bambu"), ("slicer_bambu_beta", "false"),
        ("slicer_solo_profili_utente", "false"), ("slicer_max_workers", "4"),
        ("tema", "auto"), ("lingua", "it"),
    ];
    for (k, v) in defaults {
        conn.execute("INSERT OR IGNORE INTO impostazioni (chiave, valore) VALUES (?1, ?2)",
            rusqlite::params![k, v])?;
    }
    Ok(())
}
