// src/components/info/GuidaPage.tsx
// Sparks3D Preventivi – Guida utente completa (v1.3.0)
// =====================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";

interface Section {
  id: string;
  title: string;
  icon: string;
  content: JSX.Element;
}

export function GuidaPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("panoramica");

  const sections: Section[] = [
    {
      id: "panoramica", title: t("guida.panoramica"), icon: "📋",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.panoramica_desc")}</p>
          <h4 style={h4Style}>{t("guida.panoramica_features_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.panoramica_features_1")}</li>
            <li>{t("guida.panoramica_features_2")}</li>
            <li>{t("guida.panoramica_features_3")}</li>
            <li>{t("guida.panoramica_features_4_pre")}<strong>{t("guida.panoramica_features_4_bambu")}</strong>, <strong>{t("guida.panoramica_features_4_orca")}</strong>, <strong>{t("guida.panoramica_features_4_anycubic")}</strong>{t("guida.and")}<strong>{t("guida.panoramica_features_4_prusa")}</strong></li>
            <li>{t("guida.panoramica_features_5")}</li>
            <li>{t("guida.panoramica_features_6")}</li>
            <li>{t("guida.panoramica_features_7")}</li>
            <li>{t("guida.panoramica_features_8")}</li>
            <li>{t("guida.panoramica_features_9")}</li>
            <li>{t("guida.panoramica_features_10")}</li>
            <li>{t("guida.panoramica_features_11")}</li>
            <li>{t("guida.panoramica_features_12")}</li>
            <li>{t("guida.panoramica_features_13")}</li>
            <li>{t("guida.panoramica_features_14")}</li>
            <li>{t("guida.panoramica_features_15")}</li>
          </ul>
        </div>
      ),
    },
    {
      id: "dashboard", title: t("guida.dashboard"), icon: "📊",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.dashboard_desc")}</p>
          <h4 style={h4Style}>{t("guida.dashboard_kpi_title")}</h4>
          <ul style={ulStyle}>
            <li><strong>{t("guida.dashboard_kpi_1_label")}</strong> — {t("guida.dashboard_kpi_1_desc")}</li>
            <li><strong>{t("guida.dashboard_kpi_2_label")}</strong> — {t("guida.dashboard_kpi_2_desc")}<strong>{t("guida.dashboard_kpi_2_status")}</strong></li>
            <li><strong>{t("guida.dashboard_kpi_3_label")}</strong> — {t("guida.dashboard_kpi_3_desc")}<strong>{t("guida.dashboard_kpi_3_status")}</strong></li>
            <li><strong>{t("guida.dashboard_kpi_4_label")}</strong> — {t("guida.dashboard_kpi_4_desc")}</li>
            <li><strong>{t("guida.dashboard_kpi_5_label")}</strong> — {t("guida.dashboard_kpi_5_desc")}</li>
            <li><strong>{t("guida.dashboard_kpi_6_label")}</strong> — {t("guida.dashboard_kpi_6_desc")}</li>
            <li><strong>{t("guida.dashboard_kpi_7_label")}</strong> — {t("guida.dashboard_kpi_7_desc")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.dashboard_interactive_title")}</h4>
          <ul style={ulStyle}>
            <li><strong>{t("guida.dashboard_interactive_1_label")}</strong> — {t("guida.dashboard_interactive_1_desc")}</li>
            <li><strong>{t("guida.dashboard_interactive_2_label")}</strong> — {t("guida.dashboard_interactive_2_desc")}</li>
            <li><strong>{t("guida.dashboard_interactive_3_label")}</strong> — {t("guida.dashboard_interactive_3_desc")}</li>
            <li><strong>{t("guida.dashboard_interactive_4_label")}</strong> — {t("guida.dashboard_interactive_4_desc")}</li>
            <li><strong>{t("guida.dashboard_interactive_5_label")}</strong> — {t("guida.dashboard_interactive_5_desc")}</li>
          </ul>
        </div>
      ),
    },
    {
      id: "preventivi", title: t("guida.preventiviSection"), icon: "📄",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.preventivi_desc")}</p>
          <h4 style={h4Style}>{t("guida.preventivi_create_title")}</h4>
          <ol style={olStyle}>
            <li>{t("guida.preventivi_create_1_pre")}<strong>{t("guida.preventivi_create_1_page")}</strong>{t("guida.preventivi_create_1_post")}<strong>{t("guida.preventivi_create_1_btn")}</strong></li>
            <li>{t("guida.preventivi_create_2")}</li>
            <li>{t("guida.preventivi_create_3")}</li>
            <li>{t("guida.preventivi_create_4_pre")}<strong>{t("guida.preventivi_create_4_btn")}</strong></li>
            <li>{t("guida.preventivi_create_5")}</li>
            <li>{t("guida.preventivi_create_6")}</li>
            <li>{t("guida.preventivi_create_7_pre")}<strong>{t("guida.preventivi_create_7_btn")}</strong>{t("guida.preventivi_create_7_post")}</li>
          </ol>
          <h4 style={h4Style}>{t("guida.preventivi_gcode_title")}</h4>
          <p>{t("guida.preventivi_gcode_desc")}</p>
          <h4 style={h4Style}>{t("guida.preventivi_ams_title")}</h4>
          <p>{t("guida.preventivi_ams_desc_pre")}<strong>{t("guida.preventivi_ams_desc_btn")}</strong>{t("guida.preventivi_ams_desc_post")}</p>
          <h4 style={h4Style}>{t("guida.preventivi_workflow_title")}</h4>
          <ul style={ulStyle}>
            <li><strong>{t("guida.preventivi_workflow_1_from")}</strong> → <strong>{t("guida.preventivi_workflow_1_to")}</strong>{t("guida.preventivi_workflow_1_note")}</li>
            <li><strong>{t("guida.preventivi_workflow_2_from")}</strong> → <strong>{t("guida.preventivi_workflow_2_to_a")}</strong>{t("guida.or")}<strong>{t("guida.preventivi_workflow_2_to_b")}</strong></li>
            <li><strong>{t("guida.preventivi_workflow_3_from")}</strong> → <strong>{t("guida.preventivi_workflow_3_to")}</strong></li>
            <li><strong>{t("guida.preventivi_workflow_4_from")}</strong> → <strong>{t("guida.preventivi_workflow_4_to")}</strong></li>
          </ul>
          <h4 style={h4Style}>{t("guida.preventivi_delete_title")}</h4>
          <p>{t("guida.preventivi_delete_desc")}</p>
          <h4 style={h4Style}>{t("guida.preventivi_pdf_title")}</h4>
          <p>{t("guida.preventivi_pdf_desc_pre")}<strong>{t("guida.preventivi_pdf_desc_btn")}</strong>{t("guida.preventivi_pdf_desc_post")}</p>
        </div>
      ),
    },
    {
      id: "clienti", title: t("guida.clientiSection"), icon: "👥",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.clienti_desc")}</p>
          <h4 style={h4Style}>{t("guida.clienti_create_title")}</h4>
          <ol style={olStyle}>
            <li>{t("guida.clienti_create_1_pre")}<strong>{t("guida.clienti_create_1_page")}</strong>{t("guida.clienti_create_1_post")}<strong>{t("guida.clienti_create_1_btn")}</strong></li>
            <li>{t("guida.clienti_create_2")}</li>
            <li>{t("guida.clienti_create_3")}</li>
            <li>{t("guida.clienti_create_4_pre")}<strong>{t("guida.clienti_create_4_btn")}</strong>{t("guida.clienti_create_4_post")}</li>
          </ol>
          <h4 style={h4Style}>{t("guida.clienti_edit_title")}</h4>
          <p>{t("guida.clienti_edit_desc")}</p>
          <h4 style={h4Style}>{t("guida.clienti_fields_title")}</h4>
          <ul style={ulStyle}>
            <li><strong>{t("guida.clienti_fields_1_label")}</strong> — {t("guida.clienti_fields_1_desc")}</li>
            <li><strong>{t("guida.clienti_fields_2_label")}</strong> — {t("guida.clienti_fields_2_desc")}</li>
            <li><strong>{t("guida.clienti_fields_3_label")}</strong> — {t("guida.clienti_fields_3_desc")}</li>
            <li><strong>{t("guida.clienti_fields_4_label")}</strong> — {t("guida.clienti_fields_4_desc")}</li>
            <li><strong>{t("guida.clienti_fields_5_label")}</strong> — {t("guida.clienti_fields_5_desc")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.clienti_delete_title")}</h4>
          <p>{t("guida.clienti_delete_desc")}</p>
        </div>
      ),
    },
    {
      id: "impostazioni", title: t("guida.impostazioniSection"), icon: "⚙️",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.impostazioni_desc_pre")}<strong>{t("guida.impostazioni_desc_bold")}</strong>{t("guida.impostazioni_desc_post")}</p>
          <h4 style={h4Style}>{t("guida.impostazioni_intestazione_title")}</h4>
          <p>{t("guida.impostazioni_intestazione_desc")}</p>
          <h4 style={h4Style}>{t("guida.impostazioni_materiali_title")}</h4>
          <p dangerouslySetInnerHTML={{ __html: t("guida.impostazioni_materiali_desc") }} />
          <h4 style={h4Style}>{t("guida.impostazioni_stampanti_title")}</h4>
          <p dangerouslySetInnerHTML={{ __html: t("guida.impostazioni_stampanti_desc") }} />
          <h4 style={h4Style}>{t("guida.impostazioni_profili_title")}</h4>
          <p dangerouslySetInnerHTML={{ __html: t("guida.impostazioni_profili_desc") }} />
          <h4 style={h4Style}>{t("guida.impostazioni_servizi_title")}</h4>
          <p>{t("guida.impostazioni_servizi_desc")}</p>
          <h4 style={h4Style}>{t("guida.impostazioni_corrieri_title")}</h4>
          <p>{t("guida.impostazioni_corrieri_desc")}</p>
          <h4 style={h4Style}>{t("guida.impostazioni_pagamento_title")}</h4>
          <p>{t("guida.impostazioni_pagamento_desc")}</p>
          <h4 style={h4Style}>{t("guida.impostazioni_interfaccia_title")}</h4>
          <p>{t("guida.impostazioni_interfaccia_desc")}</p>
          <ul style={ulStyle}>
            <li><strong>{t("guida.impostazioni_interfaccia_1_label")}</strong> — {t("guida.impostazioni_interfaccia_1_desc")}</li>
            <li><strong>{t("guida.impostazioni_interfaccia_2_label")}</strong> — {t("guida.impostazioni_interfaccia_2_desc")}</li>
          </ul>
          <p>{t("guida.impostazioni_interfaccia_post")}</p>
          <h4 style={h4Style}>{t("guida.impostazioni_sicurezza_title")}</h4>
          <p>{t("guida.impostazioni_sicurezza_desc_pre")}<strong>{t("guida.impostazioni_sicurezza_desc_bold")}</strong>{t("guida.impostazioni_sicurezza_desc_post")}<strong>{t("guida.impostazioni_sicurezza_desc_link")}</strong>{t("guida.impostazioni_sicurezza_desc_end")}</p>
        </div>
      ),
    },
    {
      id: "ritenute", title: t("guida.ritenuteSection"), icon: "📝",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.ritenute_desc")}</p>
          <h4 style={h4Style}>{t("guida.ritenute_archivio_title")}</h4>
          <p>{t("guida.ritenute_archivio_desc_pre")}<strong>{t("guida.ritenute_archivio_desc_bold")}</strong>{t("guida.ritenute_archivio_desc_post")}</p>
          <h4 style={h4Style}>{t("guida.ritenute_create_title")}</h4>
          <ol style={olStyle}>
            <li>{t("guida.ritenute_create_1_pre")}<strong>{t("guida.ritenute_create_1_btn")}</strong></li>
            <li>{t("guida.ritenute_create_2")}</li>
            <li>{t("guida.ritenute_create_3")}</li>
            <li>{t("guida.ritenute_create_4")}</li>
            <li>{t("guida.ritenute_create_5_pre")}<strong>{t("guida.ritenute_create_5_btn")}</strong>{t("guida.ritenute_create_5_post")}</li>
          </ol>
          <h4 style={h4Style}>{t("guida.ritenute_actions_title")}</h4>
          <ul style={ulStyle}>
            <li><strong>{t("guida.ritenute_actions_1_label")}</strong> — {t("guida.ritenute_actions_1_desc")}</li>
            <li><strong>{t("guida.ritenute_actions_2_label")}</strong> — {t("guida.ritenute_actions_2_desc")}</li>
            <li><strong>{t("guida.ritenute_actions_3_label")}</strong> — {t("guida.ritenute_actions_3_desc")}</li>
          </ul>
        </div>
      ),
    },
    {
      id: "slicer", title: t("guida.slicerSection"), icon: "🧊",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.slicer_desc_pre")}<strong>Bambu Studio</strong>, <strong>Orca Slicer</strong>, <strong>Anycubic Slicer Next</strong>{t("guida.and")}<strong>Prusa Slicer</strong>{t("guida.slicer_desc_post")}</p>
          <h4 style={h4Style}>{t("guida.slicer_supported_title")}</h4>
          <ul style={ulStyle}>
            <li><strong>{t("guida.slicer_supported_1_label")}</strong> — {t("guida.slicer_supported_1_desc")}<code style={codeStyle}>%APPDATA%\BambuStudio</code></li>
            <li><strong>{t("guida.slicer_supported_2_label")}</strong> — {t("guida.slicer_supported_2_desc")}<code style={codeStyle}>%APPDATA%\OrcaSlicer</code></li>
            <li><strong>{t("guida.slicer_supported_3_label")}</strong> — {t("guida.slicer_supported_3_desc")}<code style={codeStyle}>%APPDATA%\AnycubicSlicerNext</code></li>
            <li><strong>{t("guida.slicer_supported_4_label")}</strong> — {t("guida.slicer_supported_4_desc")}<code style={codeStyle}>%APPDATA%\PrusaSlicer</code></li>
          </ul>
          <h4 style={h4Style}>{t("guida.slicer_detection_title")}</h4>
          <p>{t("guida.slicer_detection_desc")}</p>
          <h4 style={h4Style}>{t("guida.slicer_open_title")}</h4>
          <p>{t("guida.slicer_open_desc")}</p>
          <h4 style={h4Style}>{t("guida.slicer_import_title")}</h4>
          <p>{t("guida.slicer_import_desc_pre")}<strong>{t("guida.slicer_import_desc_btn")}</strong>{t("guida.slicer_import_desc_post")}</p>
          <p>{t("guida.slicer_import_details")}</p>
          <h4 style={h4Style}>{t("guida.slicer_prusa_title")}</h4>
          <p dangerouslySetInnerHTML={{ __html: t("guida.slicer_prusa_desc") }} />
          <ul style={ulStyle}>
            <li><code style={codeStyle}>{t("guida.slicer_prusa_map_1_code")}</code> → {t("guida.slicer_prusa_map_1_desc")}</li>
            <li><code style={codeStyle}>{t("guida.slicer_prusa_map_2_code")}</code> → {t("guida.slicer_prusa_map_2_desc")}</li>
            <li><code style={codeStyle}>{t("guida.slicer_prusa_map_3a_code")}</code> / <code style={codeStyle}>{t("guida.slicer_prusa_map_3b_code")}</code> → {t("guida.slicer_prusa_map_3_desc")}</li>
            <li><code style={codeStyle}>{t("guida.slicer_prusa_map_4_code")}</code> → {t("guida.slicer_prusa_map_4_desc")}</li>
            <li><code style={codeStyle}>{t("guida.slicer_prusa_map_5_code")}</code> → {t("guida.slicer_prusa_map_5_desc")}</li>
          </ul>
          <p dangerouslySetInnerHTML={{ __html: t("guida.slicer_prusa_folders") }} />
          <h4 style={h4Style}>{t("guida.slicer_anycubic_title")}</h4>
          <p>{t("guida.slicer_anycubic_desc")}</p>
          <h4 style={h4Style}>{t("guida.slicer_parser_title")}</h4>
          <p>{t("guida.slicer_parser_desc")}</p>
          <ul style={ulStyle}>
            <li>{t("guida.slicer_parser_1")}</li>
            <li>{t("guida.slicer_parser_2")}</li>
            <li>{t("guida.slicer_parser_3")}</li>
            <li>{t("guida.slicer_parser_4")}</li>
          </ul>
          <p>{t("guida.slicer_parser_compat")}</p>
        </div>
      ),
    },
    {
      id: "backup", title: t("guida.backupSection"), icon: "💾",
      content: (
        <div style={proseStyle}>
          <h4 style={h4Style}>{t("guida.backup_title_backup")}</h4>
          <p>{t("guida.backup_desc")}</p>
          <h4 style={h4Style}>{t("guida.backup_title_restore")}</h4>
          <p>{t("guida.backup_restore_desc")}</p>
          <p>{t("guida.backup_restore_restart")}</p>
          <h4 style={h4Style}>{t("guida.backup_title_export")}</h4>
          <p>{t("guida.backup_export_desc")}</p>
          <h4 style={h4Style}>{t("guida.backup_title_reset")}</h4>
          <p>{t("guida.backup_reset_desc")}</p>
        </div>
      ),
    },
    {
      id: "scorciatoie", title: t("guida.shortcutsSection"), icon: "⌨️",
      content: (
        <div style={proseStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { keys: "Ctrl + K", desc: t("guida.shortcuts_1") },
              { keys: "Esc", desc: t("guida.shortcuts_2") },
              { keys: "↑ ↓", desc: t("guida.shortcuts_3") },
              { keys: "Enter", desc: t("guida.shortcuts_4") },
              { keys: "F11", desc: t("guida.shortcuts_5") },
              { keys: "F12", desc: t("guida.shortcuts_6") },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0" }}>
                <kbd style={kbdStyle}>{s.keys}</kbd>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "sicurezza", title: t("guida.sicurezzaSection"), icon: "🔐",
      content: (
        <div style={proseStyle}>
          <p>{t("guida.sicurezza_desc")}</p>

          <h4 style={h4Style}>{t("guida.sicurezza_pin_title")}</h4>
          <p>{t("guida.sicurezza_pin_desc_pre")}<strong>{t("guida.sicurezza_pin_desc_bold")}</strong>{t("guida.sicurezza_pin_desc_post")}</p>
          <ul style={ulStyle}>
            <li><strong>{t("guida.sicurezza_pin_1_label")}</strong>{t("guida.sicurezza_pin_1_desc_pre")}<strong>{t("guida.sicurezza_pin_1_desc_bold")}</strong>{t("guida.sicurezza_pin_1_desc_post")}</li>
            <li><strong>{t("guida.sicurezza_pin_2_label")}</strong>{t("guida.sicurezza_pin_2_desc")}</li>
            <li><strong>{t("guida.sicurezza_pin_3_label")}</strong>{t("guida.sicurezza_pin_3_desc")}</li>
            <li><strong>{t("guida.sicurezza_pin_4_label")}</strong>{t("guida.sicurezza_pin_4_desc")}</li>
            <li><strong>{t("guida.sicurezza_pin_5_label")}</strong>{t("guida.sicurezza_pin_5_desc")}</li>
          </ul>
          <p style={{ marginTop: 8, color: "#f97316" }}>
            {t("guida.sicurezza_pin_warning_pre")}<strong>{t("guida.sicurezza_pin_warning_label")}</strong>{t("guida.sicurezza_pin_warning_desc")}
          </p>

          <h4 style={h4Style}>{t("guida.sicurezza_db_title")}</h4>
          <p>{t("guida.sicurezza_db_desc_pre")}<strong>{t("guida.sicurezza_db_desc_bold")}</strong>{t("guida.sicurezza_db_desc_post")}</p>

          <h4 style={h4Style}>{t("guida.sicurezza_api_title")}</h4>
          <p>{t("guida.sicurezza_api_desc_pre")}<strong>{t("guida.sicurezza_api_desc_bold")}</strong>{t("guida.sicurezza_api_desc_post")}<strong>{t("guida.sicurezza_api_desc_path")}</strong>{t("guida.sicurezza_api_desc_end")}</p>
          <p style={{ marginTop: 8, color: "#f97316" }}>
            {t("guida.sicurezza_api_warning_pre")}<strong>{t("guida.sicurezza_api_warning_label")}</strong>{t("guida.sicurezza_api_warning_desc")}<em>{t("guida.sicurezza_api_warning_path")}</em>{t("guida.sicurezza_api_warning_end")}
          </p>

          <h4 style={h4Style}>{t("guida.sicurezza_integrity_title")}</h4>
          <p>{t("guida.sicurezza_integrity_desc_pre")}<strong>{t("guida.sicurezza_integrity_desc_bold")}</strong>{t("guida.sicurezza_integrity_desc_post")}</p>

          <h4 style={h4Style}>{t("guida.sicurezza_updates_title")}</h4>
          <p>{t("guida.sicurezza_updates_desc_pre")}<strong>{t("guida.sicurezza_updates_desc_bold")}</strong>{t("guida.sicurezza_updates_desc_post")}</p>

          <h4 style={h4Style}>{t("guida.sicurezza_csp_title")}</h4>
          <p>{t("guida.sicurezza_csp_desc_pre")}<strong>{t("guida.sicurezza_csp_desc_bold")}</strong>{t("guida.sicurezza_csp_desc_post")}</p>

          <h4 style={h4Style}>{t("guida.sicurezza_roadmap_title")}</h4>
          <p>{t("guida.sicurezza_roadmap_desc")}</p>
          <ul style={ulStyle}>
            <li><strong>{t("guida.sicurezza_roadmap_1_label")}</strong> — {t("guida.sicurezza_roadmap_1_desc")}</li>
            <li><strong>{t("guida.sicurezza_roadmap_2_label")}</strong> — {t("guida.sicurezza_roadmap_2_desc")}</li>
          </ul>
        </div>
      ),
    },
    {
      id: "novita", title: t("guida.novitaSection"), icon: "🆕",
      content: (
        <div style={proseStyle}>
          {/* ── Novità v1.4.0 ── */}
          <h4 style={h4Style}>{t("guida.novita_v140_i18n_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v140_i18n_1")}</li>
            <li>{t("guida.novita_v140_i18n_2")}</li>
            <li>{t("guida.novita_v140_i18n_3")}</li>
            <li>{t("guida.novita_v140_i18n_4")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.novita_v140_thumb_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v140_thumb_1")}</li>
            <li>{t("guida.novita_v140_thumb_2")}</li>
            <li>{t("guida.novita_v140_thumb_3")}</li>
            <li>{t("guida.novita_v140_thumb_4")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.novita_v140_auto_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v140_auto_1")}</li>
            <li>{t("guida.novita_v140_auto_2")}</li>
            <li>{t("guida.novita_v140_auto_3")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.novita_v140_theme_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v140_theme_1")}</li>
            <li>{t("guida.novita_v140_theme_2")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.novita_v140_pdf_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v140_pdf_1")}</li>
            <li>{t("guida.novita_v140_pdf_2")}</li>
            <li>{t("guida.novita_v140_pdf_3")}</li>
          </ul>
          <h4 style={h4Style}>{t("guida.novita_v140_fix_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v140_fix_1")}</li>
            <li>{t("guida.novita_v140_fix_2")}</li>
            <li>{t("guida.novita_v140_fix_3")}</li>
          </ul>

          {/* ── Novità precedenti v1.3.0 ── */}
          <h4 style={h4Style}>{t("guida.novita_v130_title")}</h4>
          <h4 style={h4Style}>{t("guida.novita_prusa_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_prusa_1_pre")}<strong>{t("guida.novita_prusa_1_bold")}</strong>{t("guida.novita_prusa_1_post")}</li>
            <li>{t("guida.novita_prusa_2_pre")}<strong>{t("guida.novita_prusa_2_bold")}</strong>{t("guida.novita_prusa_2_post")}</li>
            <li>{t("guida.novita_prusa_3")}</li>
            <li>{t("guida.novita_prusa_4")}</li>
            <li>{t("guida.novita_prusa_5_pre")}<strong>{t("guida.novita_prusa_5_bold")}</strong>{t("guida.novita_prusa_5_post")}</li>
            <li>{t("guida.novita_prusa_6")}</li>
            <li>{t("guida.novita_prusa_7")}</li>
            <li><span dangerouslySetInnerHTML={{ __html: t("guida.novita_prusa_8") }} /></li>
            <li>{t("guida.novita_prusa_9")}</li>
          </ul>

          <h4 style={h4Style}>{t("guida.novita_pin_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_pin_1_pre")}<strong>{t("guida.novita_pin_1_bold")}</strong>{t("guida.novita_pin_1_post")}</li>
            <li>{t("guida.novita_pin_2")}</li>
            <li>{t("guida.novita_pin_3_pre")}<strong>{t("guida.novita_pin_3_bold")}</strong>{t("guida.novita_pin_3_mid")}<strong>{t("guida.novita_pin_3_bold2")}</strong>{t("guida.novita_pin_3_post")}</li>
            <li>{t("guida.novita_pin_4")}</li>
            <li>{t("guida.novita_pin_5_pre")}<strong>{t("guida.novita_pin_5_bold")}</strong>{t("guida.novita_pin_5_post")}</li>
            <li>{t("guida.novita_pin_6")}</li>
          </ul>

          <h4 style={h4Style}>{t("guida.novita_backup_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_backup_1_pre")}<strong>{t("guida.novita_backup_1_bold")}</strong>{t("guida.novita_backup_1_post")}</li>
            <li>{t("guida.novita_backup_2_pre")}<strong>{t("guida.novita_backup_2_bold")}</strong>{t("guida.novita_backup_2_post")}</li>
            <li>{t("guida.novita_backup_3")}</li>
          </ul>

          <h4 style={h4Style}>{t("guida.novita_v120_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v120_1_pre")}<strong>{t("guida.novita_v120_1_bold")}</strong></li>
            <li>{t("guida.novita_v120_2_pre")}<strong>{t("guida.novita_v120_2_bold")}</strong></li>
            <li>{t("guida.novita_v120_3_pre")}<strong>{t("guida.novita_v120_3_bold")}</strong>{t("guida.novita_v120_3_post")}</li>
            <li>{t("guida.novita_v120_4_pre")}<strong>{t("guida.novita_v120_4_bold")}</strong>{t("guida.novita_v120_4_post")}</li>
            <li>{t("guida.novita_v120_5_pre")}<strong>{t("guida.novita_v120_5_bold")}</strong>{t("guida.novita_v120_5_post")}</li>
          </ul>

          <h4 style={h4Style}>{t("guida.novita_v110_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v110_1_pre")}<strong>{t("guida.novita_v110_1_bold")}</strong></li>
            <li>{t("guida.novita_v110_2_pre")}<strong>{t("guida.novita_v110_2_bold")}</strong>{t("guida.novita_v110_2_post")}</li>
            <li>{t("guida.novita_v110_3")}</li>
          </ul>

          <h4 style={h4Style}>{t("guida.novita_v103_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v103_1_pre")}<strong>{t("guida.novita_v103_1_bold")}</strong></li>
            <li>{t("guida.novita_v103_2")}</li>
            <li>{t("guida.novita_v103_3")}</li>
          </ul>

          <h4 style={h4Style}>{t("guida.novita_v102_title")}</h4>
          <ul style={ulStyle}>
            <li>{t("guida.novita_v102_1")}</li>
            <li>{t("guida.novita_v102_2")}</li>
            <li>{t("guida.novita_v102_3")}</li>
          </ul>
        </div>
      ),
    },
  ];

  const activeContent = sections.find(s => s.id === activeSection);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>

      {/* Banner avviso antivirus */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 18px",
        background: "rgba(234,179,8,0.08)",
        border: "1px solid rgba(234,179,8,0.3)",
        borderRadius: 12,
        fontSize: 13, color: "#fbbf24", lineHeight: 1.6,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
        <span>
          <strong>{t("guida.antivirus_label")}</strong>{t("guida.antivirus_desc_1")}
          <strong>{t("guida.antivirus_bold")}</strong>{t("guida.antivirus_desc_2")}
          <a href="https://github.com/Sparks3D/sparks3d-preventivi" target="_blank" rel="noreferrer"
            style={{ color: "var(--accent)", textDecoration: "underline" }}>
            {t("guida.antivirus_github")}
          </a>.
        </span>
      </div>

    <div style={{ display: "flex", gap: 24 }}>
      {/* Indice laterale */}
      <div style={{
        width: 200, flexShrink: 0,
        position: "sticky", top: 0, alignSelf: "flex-start",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--text-muted)", marginBottom: 12 }}>
          {t("guida.sommario")}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                border: "none", cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
                background: activeSection === s.id ? "rgba(59,130,246,0.1)" : "transparent",
                color: activeSection === s.id ? "var(--accent)" : "var(--text-muted)",
                fontSize: 13, fontWeight: activeSection === s.id ? 600 : 500,
              }}
            >
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto */}
      <div style={{
        flex: 1,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16, padding: 28,
      }}>
        {activeContent && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>{activeContent.icon}</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e8edf5", margin: 0 }}>
                {activeContent.title}
              </h2>
            </div>
            {activeContent.content}
          </>
        )}
      </div>
    </div>
    </div>
  );
}

const proseStyle: React.CSSProperties = {
  fontSize: 14, color: "#b8c5db", lineHeight: 1.7,
};

const h4Style: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginTop: 20, marginBottom: 8,
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4,
};

const olStyle: React.CSSProperties = {
  paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6,
};

const codeStyle: React.CSSProperties = {
  background: "rgba(59,130,246,0.1)", padding: "2px 6px", borderRadius: 4,
  fontFamily: "monospace", fontSize: 12, color: "var(--accent)",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block", padding: "4px 10px", borderRadius: 6, minWidth: 80, textAlign: "center",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 12, fontWeight: 600, color: "#8899b4", fontFamily: "monospace",
};
