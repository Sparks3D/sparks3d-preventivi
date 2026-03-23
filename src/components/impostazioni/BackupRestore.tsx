// src/components/impostazioni/BackupRestore.tsx
// Sparks3D Preventivi – Backup e Ripristino Dati
// =================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";

interface BackupInfo {
  db_path: string;
  db_size_mb: number;
  logos_path: string;
  logos_count: number;
  logos_size_mb: number;
  documenti_path: string;
  documenti_preventivi_count: number;
  documenti_ritenute_count: number;
  documenti_size_mb: number;
  totale_size_mb: number;
}

interface BackupResult {
  success: boolean;
  path: string;
  size_mb: number;
  files_count: number;
  message: string;
}

interface RestoreResult {
  success: boolean;
  db_restored: boolean;
  logos_restored: number;
  pdf_preventivi_restored: number;
  pdf_ritenute_restored: number;
  message: string;
}

interface ExportResult {
  success: boolean;
  path: string;
  righe: number;
  messaggio: string;
}

interface ResetResult {
  success: boolean;
  messaggio: string;
  preventivi_rimossi: number;
  clienti_rimossi: number;
  materiali_rimossi: number;
  stampanti_rimosse: number;
  profili_rimossi: number;
}

const fmtMb = (mb: number) =>
  mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;

export function BackupRestore() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Opzioni backup
  const [inclDb, setInclDb] = useState(true);
  const [inclLogos, setInclLogos] = useState(true);
  const [inclDocs, setInclDocs] = useState(true);

  // Opzioni ripristino
  const [restDb, setRestDb] = useState(true);
  const [restLogos, setRestLogos] = useState(true);
  const [restDocs, setRestDocs] = useState(true);

  // Stato operazioni
  const [operazione, setOperazione] = useState<"idle" | "backup" | "restore">("idle");
  const [risultato, setRisultato] = useState<{ tipo: "ok" | "err"; testo: string } | null>(null);
  const [confermaRestore, setConfermaRestore] = useState(false);
  const [restorePath, setRestorePath] = useState<string | null>(null);

  // Esportazione
  const [exportTipo, setExportTipo] = useState<string>("tutto");
  const [exportFormato, setExportFormato] = useState<string>("xlsx");
  const [exporting, setExporting] = useState(false);

  // Reset dati
  const [resetPreventivi, setResetPreventivi] = useState(true);
  const [resetClienti, setResetClienti] = useState(true);
  const [resetCatalogo, setResetCatalogo] = useState(true);
  const [resetImpostazioni, setResetImpostazioni] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confermaReset, setConfermaReset] = useState<0 | 1 | 2>(0);

  const caricaInfo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<BackupInfo>("get_backup_info");
      setInfo(data);
    } catch (err) {
      console.error("Errore caricamento info backup:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { caricaInfo(); }, [caricaInfo]);

  // ── Backup ──

  const avviaBackup = async () => {
    const data = new Date().toISOString().slice(0, 10);
    const defaultName = `Sparks3D_Backup_${data}.zip`;

    const destPath = await save({
      defaultPath: defaultName,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });

    if (!destPath) return;

    setOperazione("backup");
    setRisultato(null);

    try {
      const result = await invoke<BackupResult>("create_backup", {
        destPath,
        includeDb: inclDb,
        includeLogos: inclLogos,
        includeDocumenti: inclDocs,
      });

      if (result.success) {
        setRisultato({
          tipo: "ok",
          testo: `✅ ${result.message}`,
        });
      } else {
        setRisultato({ tipo: "err", testo: "Errore durante il backup." });
      }
    } catch (err) {
      setRisultato({ tipo: "err", testo: `❌ Errore: ${err}` });
    } finally {
      setOperazione("idle");
    }
  };

  // ── Ripristino ──

  const selezionaFileRestore = async () => {
    const filePath = await open({
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
      multiple: false,
    });

    if (!filePath) return;
    const path = typeof filePath === "string" ? filePath : filePath;
    setRestorePath(path);
    setConfermaRestore(true);
  };

  const avviaRestore = async () => {
    if (!restorePath) return;
    setConfermaRestore(false);
    setOperazione("restore");
    setRisultato(null);

    try {
      const result = await invoke<RestoreResult>("restore_backup", {
        sourcePath: restorePath,
        restoreDb: restDb,
        restoreLogos: restLogos,
        restoreDocumenti: restDocs,
      });

      if (result.success) {
        setRisultato({
          tipo: "ok",
          testo: `✅ ${result.message}${result.db_restored ? "\n⚠️ Riavvia l'applicazione per caricare il database ripristinato." : ""}`,
        });
      }
    } catch (err) {
      setRisultato({ tipo: "err", testo: `❌ Errore ripristino: ${err}` });
    } finally {
      setOperazione("idle");
      setRestorePath(null);
      caricaInfo();
    }
  };

  // ── Esportazione dati ──

  const EXPORT_TIPI = [
    { value: "tutto", label: "Tutto (tutti i fogli)", icon: "📦" },
    { value: "preventivi", label: "Preventivi", icon: "📄" },
    { value: "clienti", label: "Clienti", icon: "👥" },
    { value: "materiali", label: "Materiali", icon: "🧱" },
    { value: "stampanti", label: "Stampanti", icon: "🖨️" },
    { value: "profili", label: "Profili stampa", icon: "⚙️" },
    { value: "statistiche", label: "Statistiche / KPI", icon: "📊" },
  ];

  const avviaExport = async () => {
    const data = new Date().toISOString().slice(0, 10);
    const ext = exportFormato === "xlsx" ? "xlsx" : "csv";
    const defaultName = exportTipo === "tutto"
      ? `Sparks3D_Export_${data}.${ext}`
      : `Sparks3D_${exportTipo}_${data}.${ext}`;

    const destPath = await save({
      defaultPath: defaultName,
      filters: exportFormato === "xlsx"
        ? [{ name: "Excel", extensions: ["xlsx"] }]
        : [{ name: "CSV", extensions: ["csv"] }],
    });

    if (!destPath) return;

    setExporting(true);
    setRisultato(null);

    try {
      const result = await invoke<ExportResult>("export_data", {
        request: {
          tipo: exportTipo,
          formato: exportFormato,
          dest_path: destPath,
        },
      });

      if (result.success) {
        setRisultato({ tipo: "ok", testo: `✅ ${result.messaggio}` });
      } else {
        setRisultato({ tipo: "err", testo: "Errore durante l'esportazione." });
      }
    } catch (err) {
      setRisultato({ tipo: "err", testo: `❌ Errore: ${err}` });
    } finally {
      setExporting(false);
    }
  };

  // ── Reset dati ──

  const avviaReset = async () => {
    setConfermaReset(0);
    setResetting(true);
    setRisultato(null);

    try {
      const result = await invoke<ResetResult>("reset_database", {
        resetPreventivi,
        resetClienti,
        resetCatalogo,
        resetImpostazioni,
      });

      if (result.success) {
        const dettagli: string[] = [];
        if (result.preventivi_rimossi > 0) dettagli.push(`${result.preventivi_rimossi} preventivi`);
        if (result.clienti_rimossi > 0) dettagli.push(`${result.clienti_rimossi} clienti`);
        if (result.materiali_rimossi > 0) dettagli.push(`${result.materiali_rimossi} materiali`);
        if (result.stampanti_rimosse > 0) dettagli.push(`${result.stampanti_rimosse} stampanti`);
        if (result.profili_rimossi > 0) dettagli.push(`${result.profili_rimossi} profili`);
        const det = dettagli.length > 0 ? `\nRimossi: ${dettagli.join(", ")}` : "";
        setRisultato({ tipo: "ok", testo: `✅ ${result.messaggio}${det}\n\nRicaricamento in corso...` });
        // Ricarica l'app dopo 2 secondi per svuotare tutti i dati in memoria
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch (err) {
      setRisultato({ tipo: "err", testo: `❌ Errore reset: ${err}` });
    } finally {
      setResetting(false);
      caricaInfo();
    }
  };

  // ── Stili ──

  const S = {
    container: {
      maxWidth: 800,
      display: "flex",
      flexDirection: "column" as const,
      gap: 24,
    },

    card: {
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: 24,
    },

    cardTitle: {
      fontSize: 17,
      fontWeight: 700,
      color: "#e2e8f0",
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      gap: 10,
    },

    cardDesc: {
      fontSize: 13,
      color: "#64748b",
      marginBottom: 20,
    },

    infoGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: 12,
      marginBottom: 20,
    },

    infoItem: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 12,
      padding: "14px 16px",
    },

    infoLabel: {
      fontSize: 11,
      color: "#64748b",
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
      marginBottom: 4,
    },

    infoValue: {
      fontSize: 18,
      fontWeight: 700,
      color: "#e2e8f0",
    },

    infoSub: {
      fontSize: 12,
      color: "#475569",
      marginTop: 2,
    },

    checkRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
      cursor: "pointer",
      transition: "all 0.2s",
      marginBottom: 8,
    },

    checkbox: (checked: boolean) => ({
      width: 20,
      height: 20,
      borderRadius: 6,
      border: `2px solid ${checked ? "#3b82f6" : "rgba(255,255,255,0.15)"}`,
      background: checked ? "#3b82f6" : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "all 0.2s",
      fontSize: 12,
      color: "#fff",
    }),

    checkLabel: {
      fontSize: 14,
      color: "#cbd5e1",
      fontWeight: 500,
    },

    checkSub: {
      fontSize: 12,
      color: "#475569",
    },

    btnPrimary: {
      background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
      border: "none",
      borderRadius: 12,
      padding: "14px 28px",
      color: "#fff",
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },

    btnWarning: {
      background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
      border: "none",
      borderRadius: 12,
      padding: "14px 28px",
      color: "#fff",
      fontSize: 15,
      fontWeight: 700,
      cursor: "pointer",
      transition: "all 0.2s",
      boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    },

    btnDisabled: {
      opacity: 0.5,
      cursor: "not-allowed" as const,
    },

    risultato: (tipo: "ok" | "err") => ({
      padding: "16px 20px",
      borderRadius: 12,
      background: tipo === "ok" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${tipo === "ok" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
      color: tipo === "ok" ? "#4ade80" : "#f87171",
      fontSize: 14,
      fontWeight: 500,
      whiteSpace: "pre-line" as const,
    }),

    modal: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    },

    modalBox: {
      background: "#0f1629",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 18,
      padding: 28,
      maxWidth: 500,
      width: "90%",
    },

    btnCancel: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "10px 20px",
      color: "#94a3b8",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    },

    btnDanger: {
      background: "rgba(245,158,11,0.15)",
      border: "1px solid rgba(245,158,11,0.3)",
      borderRadius: 10,
      padding: "10px 20px",
      color: "#fbbf24",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
    },
  };

  // ── Componente Checkbox ──
  const Check = ({
    checked, onChange, label, sub,
  }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
  }) => (
    <div
      style={S.checkRow}
      onClick={() => onChange(!checked)}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
    >
      <div style={S.checkbox(checked)}>
        {checked && "✓"}
      </div>
      <div>
        <div style={S.checkLabel}>{label}</div>
        {sub && <div style={S.checkSub}>{sub}</div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>
        ⏳ Analisi dati in corso...
      </div>
    );
  }

  return (
    <div style={S.container}>

      {/* ═══ INFO DATI ═══ */}
      <div style={S.card}>
        <div style={S.cardTitle}>📊 Stato dati</div>
        <div style={S.cardDesc}>Riepilogo di tutti i dati salvati dall'applicazione.</div>

        <div style={S.infoGrid}>
          <div style={S.infoItem}>
            <div style={S.infoLabel}>Database</div>
            <div style={S.infoValue}>{info ? fmtMb(info.db_size_mb) : "—"}</div>
            <div style={S.infoSub}>Preventivi, clienti, impostazioni</div>
          </div>
          <div style={S.infoItem}>
            <div style={S.infoLabel}>Loghi</div>
            <div style={S.infoValue}>{info?.logos_count ?? 0}</div>
            <div style={S.infoSub}>{info ? fmtMb(info.logos_size_mb) : "—"}</div>
          </div>
          <div style={S.infoItem}>
            <div style={S.infoLabel}>PDF Preventivi</div>
            <div style={S.infoValue}>{info?.documenti_preventivi_count ?? 0}</div>
            <div style={S.infoSub}>In Documenti/Sparks3D/</div>
          </div>
          <div style={S.infoItem}>
            <div style={S.infoLabel}>PDF Ritenute</div>
            <div style={S.infoValue}>{info?.documenti_ritenute_count ?? 0}</div>
            <div style={S.infoSub}>In Documenti/Sparks3D/</div>
          </div>
          <div style={S.infoItem}>
            <div style={S.infoLabel}>Dimensione totale</div>
            <div style={{ ...S.infoValue, color: "#38bdf8" }}>{info ? fmtMb(info.totale_size_mb) : "—"}</div>
          </div>
        </div>
      </div>

      {/* ═══ BACKUP ═══ */}
      <div style={S.card}>
        <div style={S.cardTitle}>💾 Crea Backup</div>
        <div style={S.cardDesc}>
          Esporta tutti i dati in un file .zip. Utile prima di reinstallare il sistema o il programma.
        </div>

        <Check
          checked={inclDb}
          onChange={setInclDb}
          label="Database (preventivi, clienti, materiali, stampanti, impostazioni...)"
          sub={info ? fmtMb(info.db_size_mb) : ""}
        />
        <Check
          checked={inclLogos}
          onChange={setInclLogos}
          label={`Logo azienda (${info?.logos_count ?? 0} file)`}
          sub={info ? fmtMb(info.logos_size_mb) : ""}
        />
        <Check
          checked={inclDocs}
          onChange={setInclDocs}
          label={`Documenti PDF (${(info?.documenti_preventivi_count ?? 0) + (info?.documenti_ritenute_count ?? 0)} file)`}
          sub={info ? fmtMb(info.documenti_size_mb) : ""}
        />

        <div style={{ marginTop: 16 }}>
          <button
            style={{
              ...S.btnPrimary,
              ...(!inclDb && !inclLogos && !inclDocs ? S.btnDisabled : {}),
            }}
            disabled={!inclDb && !inclLogos && !inclDocs || operazione !== "idle"}
            onClick={avviaBackup}
          >
            {operazione === "backup" ? "⏳ Backup in corso..." : "💾 Crea Backup .zip"}
          </button>
        </div>
      </div>

      {/* ═══ RIPRISTINO ═══ */}
      <div style={S.card}>
        <div style={S.cardTitle}>📥 Ripristina da Backup</div>
        <div style={S.cardDesc}>
          Seleziona un file .zip di backup per ripristinare i dati. I file esistenti verranno sovrascritti.
        </div>

        <Check
          checked={restDb}
          onChange={setRestDb}
          label="Database (sovrascrive il database attuale)"
          sub="⚠️ Riavvio necessario dopo il ripristino"
        />
        <Check
          checked={restLogos}
          onChange={setRestLogos}
          label="Logo azienda"
        />
        <Check
          checked={restDocs}
          onChange={setRestDocs}
          label="Documenti PDF (preventivi + ritenute)"
        />

        {/* Avviso API key PackLink */}
        <div style={{
          fontSize: 13, color: "#f97316", marginTop: 16, marginBottom: 4,
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(249,115,22,0.07)",
          border: "1px solid rgba(249,115,22,0.2)",
          lineHeight: 1.6,
        }}>
          🔑 <strong>Nota:</strong> la API key di PackLink Pro <strong>non è inclusa nel backup</strong>, perché è salvata nel Windows Credential Manager per sicurezza.
          Dopo il ripristino dovrai reinserirla nella sezione <em>Corrieri → PackLink Pro</em>.
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            style={{
              ...S.btnWarning,
              ...(!restDb && !restLogos && !restDocs ? S.btnDisabled : {}),
            }}
            disabled={!restDb && !restLogos && !restDocs || operazione !== "idle"}
            onClick={selezionaFileRestore}
          >
            {operazione === "restore" ? "⏳ Ripristino in corso..." : "📥 Seleziona file backup..."}
          </button>
        </div>
      </div>

      {/* ═══ ESPORTA DATI ═══ */}
      <div style={S.card}>
        <div style={S.cardTitle}>📤 Esporta Dati</div>
        <div style={S.cardDesc}>
          Esporta i dati in formato CSV (universale) o Excel (.xlsx con formattazione).
        </div>

        {/* Selezione tipo dati */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8 }}>
            Dati da esportare
          </div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
            {EXPORT_TIPI.map((t) => (
              <button
                key={t.value}
                onClick={() => setExportTipo(t.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${exportTipo === t.value ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: exportTipo === t.value ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                  color: exportTipo === t.value ? "#60a5fa" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: exportTipo === t.value ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 14 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selezione formato */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8 }}>
            Formato
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: "xlsx", label: "Excel (.xlsx)", desc: "Con formattazione e fogli multipli", icon: "📊" },
              { value: "csv", label: "CSV (.csv)", desc: "Universale, leggero", icon: "📝" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setExportFormato(f.value)}
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `1px solid ${exportFormato === f.value ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                  background: exportFormato === f.value ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                  color: exportFormato === f.value ? "#e2e8f0" : "#94a3b8",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textAlign: "left" as const,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{f.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{f.label}</span>
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info export "tutto" */}
        {exportTipo === "tutto" && exportFormato === "xlsx" && (
          <div style={{
            fontSize: 12, color: "#60a5fa", marginBottom: 16,
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.12)",
          }}>
            Il file Excel conterrà un foglio per ogni tipo di dato: Preventivi, Clienti, Materiali, Stampanti, Profili e Statistiche.
          </div>
        )}
        {exportTipo === "tutto" && exportFormato === "csv" && (
          <div style={{
            fontSize: 12, color: "#f59e0b", marginBottom: 16,
            padding: "10px 14px", borderRadius: 8,
            background: "rgba(245,158,11,0.06)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}>
            Verranno creati 6 file CSV separati nella stessa cartella del file selezionato.
          </div>
        )}

        <button
          style={{
            ...S.btnPrimary,
            background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
            boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
            ...(exporting ? S.btnDisabled : {}),
          }}
          disabled={exporting}
          onClick={avviaExport}
        >
          {exporting ? "⏳ Esportazione in corso..." : `📤 Esporta ${exportFormato.toUpperCase()}`}
        </button>
      </div>

      {/* ═══ RESET DATI ═══ */}
      <div style={{ ...S.card, borderColor: "rgba(244,63,94,0.15)" }}>
        <div style={S.cardTitle}>
          <span style={{ color: "#f87171" }}>🗑️ Reset dati</span>
        </div>
        <div style={S.cardDesc}>
          Cancella i dati selezionati dal database. Utile per ripulire i dati di test prima della distribuzione.
          Si consiglia di creare un backup prima di procedere.
        </div>

        <Check
          checked={resetPreventivi}
          onChange={setResetPreventivi}
          label="Preventivi e ritenute"
          sub="Elimina tutti i preventivi, le righe, i servizi associati e le ritenute"
        />
        <Check
          checked={resetClienti}
          onChange={setResetClienti}
          label="Clienti"
          sub="Elimina tutta l'anagrafica clienti"
        />
        <Check
          checked={resetCatalogo}
          onChange={setResetCatalogo}
          label="Catalogo (materiali, stampanti, profili, servizi, corrieri, pagamenti)"
          sub="Elimina tutte le configurazioni tecniche"
        />
        <Check
          checked={resetImpostazioni}
          onChange={setResetImpostazioni}
          label="Dati azienda e impostazioni"
          sub="Riporta l'intestazione e le impostazioni ai valori iniziali, elimina il logo"
        />

        <div style={{ marginTop: 16 }}>
          <button
            style={{
              background: "rgba(244,63,94,0.12)",
              border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: 12,
              padding: "14px 28px",
              color: "#f87171",
              fontSize: 15,
              fontWeight: 700,
              cursor: (!resetPreventivi && !resetClienti && !resetCatalogo && !resetImpostazioni) || resetting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 10,
              opacity: (!resetPreventivi && !resetClienti && !resetCatalogo && !resetImpostazioni) || resetting ? 0.5 : 1,
            }}
            disabled={(!resetPreventivi && !resetClienti && !resetCatalogo && !resetImpostazioni) || resetting}
            onClick={() => setConfermaReset(1)}
          >
            {resetting ? "⏳ Reset in corso..." : "🗑️ Cancella dati selezionati"}
          </button>
        </div>
      </div>

      {/* ═══ RISULTATO ═══ */}
      {risultato && (
        <div style={S.risultato(risultato.tipo)}>
          {risultato.testo}
        </div>
      )}

      {/* ═══ MODALE CONFERMA RIPRISTINO ═══ */}
      {confermaRestore && (
        <div style={S.modal} onClick={() => setConfermaRestore(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fbbf24", marginBottom: 12 }}>
              ⚠️ Conferma ripristino
            </div>
            <div style={{ fontSize: 14, color: "#94a3b8", marginBottom: 8 }}>
              Stai per ripristinare i dati dal file:
            </div>
            <div style={{
              fontSize: 13, color: "#38bdf8", fontFamily: "monospace",
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(59,130,246,0.08)",
              marginBottom: 16, wordBreak: "break-all",
            }}>
              {restorePath}
            </div>
            <div style={{ fontSize: 13, color: "#f97316", marginBottom: 8 }}>
              Elementi che verranno ripristinati:
            </div>
            <ul style={{ fontSize: 13, color: "#94a3b8", paddingLeft: 20, marginBottom: 16 }}>
              {restDb && <li>Database — <span style={{ color: "#f97316" }}>sovrascrive i dati attuali!</span></li>}
              {restLogos && <li>Logo azienda</li>}
              {restDocs && <li>Documenti PDF (preventivi + ritenute)</li>}
            </ul>
            {restDb && (
              <div style={{
                fontSize: 12, color: "#f87171", marginBottom: 20,
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
              }}>
                ⚠️ Il database attuale verrà sovrascritto. Questa operazione non è reversibile.
                Dopo il ripristino sarà necessario riavviare l'applicazione.
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={S.btnCancel} onClick={() => setConfermaRestore(false)}>
                Annulla
              </button>
              <button style={S.btnDanger} onClick={avviaRestore}>
                📥 Ripristina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODALE CONFERMA RESET — STEP 1 ═══ */}
      {confermaReset === 1 && (
        <div style={S.modal} onClick={() => setConfermaReset(0)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{
              textAlign: "center", padding: "8px 0 16px",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171", marginBottom: 8 }}>
                ATTENZIONE
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fbbf24", marginBottom: 16 }}>
                Stai per eliminare tutti i dati del programma, sei sicuro?
              </div>
            </div>
            <ul style={{ fontSize: 13, color: "#94a3b8", paddingLeft: 20, marginBottom: 16 }}>
              {resetPreventivi && <li>Tutti i <span style={{ color: "#f87171" }}>preventivi, righe e ritenute</span></li>}
              {resetClienti && <li>Tutta l'<span style={{ color: "#f87171" }}>anagrafica clienti</span></li>}
              {resetCatalogo && <li>Tutto il <span style={{ color: "#f87171" }}>catalogo</span> (materiali, stampanti, profili, servizi, corrieri, pagamenti)</li>}
              {resetImpostazioni && <li><span style={{ color: "#f87171" }}>Dati azienda e impostazioni</span> (riportati ai valori iniziali)</li>}
            </ul>
            <div style={{
              fontSize: 13, color: "#f87171", marginBottom: 20,
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              lineHeight: 1.5,
            }}>
              ⚠️ Questa operazione non è reversibile. Assicurati di aver creato un backup prima di procedere.
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={S.btnCancel} onClick={() => setConfermaReset(0)}>
                Annulla
              </button>
              <button
                style={{
                  background: "rgba(244,63,94,0.15)",
                  border: "1px solid rgba(244,63,94,0.3)",
                  borderRadius: 10,
                  padding: "10px 20px",
                  color: "#f87171",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                onClick={() => setConfermaReset(2)}
              >
                Sì, prosegui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODALE CONFERMA RESET — STEP 2 (CONFERMA FINALE) ═══ */}
      {confermaReset === 2 && (
        <div style={S.modal} onClick={() => setConfermaReset(0)}>
          <div style={{ ...S.modalBox, border: "1px solid rgba(244,63,94,0.25)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              textAlign: "center", padding: "8px 0 16px",
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f87171", marginBottom: 12 }}>
                CONFERMA DEFINITIVA
              </div>
              <div style={{
                fontSize: 14, color: "#94a3b8", lineHeight: 1.6,
                maxWidth: 380, margin: "0 auto",
              }}>
                Tutti i preventivi, le ricevute, le fatture, i dati importati e quelli personali verranno eliminati.
                <br /><br />
                <span style={{ color: "#fbbf24", fontWeight: 700 }}>
                  Senza un backup precedente non sarai in grado di ripristinarli!
                </span>
              </div>
            </div>
            <div style={{
              fontSize: 13, color: "#f87171", marginBottom: 20, marginTop: 16,
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              textAlign: "center",
              fontWeight: 600,
            }}>
              Conferma per proseguire con la cancellazione
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button style={S.btnCancel} onClick={() => setConfermaReset(0)}>
                Annulla
              </button>
              <button
                style={{
                  background: "linear-gradient(135deg, rgba(244,63,94,0.3), rgba(244,63,94,0.15))",
                  border: "1px solid rgba(244,63,94,0.5)",
                  borderRadius: 10,
                  padding: "10px 24px",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(244,63,94,0.2)",
                }}
                onClick={avviaReset}
              >
                🗑️ Elimina tutto definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
