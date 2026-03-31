// src/components/impostazioni/InterfacciaPage.tsx
// Sparks3D Preventivi – Impostazioni interfaccia
// ================================================

import { useSettings } from "../../context/SettingsContext";
import { useToast } from "../layout/ToastProvider";
import { useTranslation } from "react-i18next";

const ACCENT_COLORS = [
  { name: "Cyan",    hex: "#0ea5e9" },
  { name: "Blue",    hex: "#3b82f6" },
  { name: "Indigo",  hex: "#6366f1" },
  { name: "Purple",  hex: "#a855f7" },
  { name: "Pink",    hex: "#ec4899" },
  { name: "Rose",    hex: "#f43f5e" },
  { name: "Orange",  hex: "#f97316" },
  { name: "Amber",   hex: "#f59e0b" },
  { name: "Green",   hex: "#22c55e" },
  { name: "Teal",    hex: "#14b8a6" },
];

const LANGUAGES = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English", flag: "🇬🇧 EN" },
];

export function InterfacciaPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const toast = useToast();
  const { t, i18n } = useTranslation();

  const FONT_SIZES = [
    { value: "small" as const,  label: t("interfaccia.fontSmall") },
    { value: "medium" as const, label: t("interfaccia.fontMedium") },
    { value: "large" as const,  label: t("interfaccia.fontLarge") },
  ];

  const handleUpdate = (partial: Parameters<typeof updateSettings>[0]) => {
    updateSettings(partial);
    toast.success(t("common.settingSaved"));
  };

  return (
    <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Info auto-save */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 16px", borderRadius: 10,
        background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {t("interfaccia.autoSave")}
        </span>
      </div>

      {/* ═══ LINGUA / LANGUAGE ═══ */}
      <div style={cardStyle}>
        <div style={titleStyle}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          Lingua / Language
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); toast.success(t("common.settingSaved")); }}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 10,
                border: `1.5px solid ${i18n.language.startsWith(lang.code) ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                background: i18n.language.startsWith(lang.code) ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{lang.flag}</div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: i18n.language.startsWith(lang.code) ? "#e2e8f0" : "#94a3b8",
              }}>
                {lang.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ DIMENSIONE FONT ═══ */}
      <div style={cardStyle}>
        <div style={titleStyle}>{t("interfaccia.fontSize")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.value}
              onClick={() => handleUpdate({ fontSize: fs.value })}
              style={{
                flex: 1,
                padding: "12px 14px",
                borderRadius: 10,
                border: `1.5px solid ${settings.fontSize === fs.value ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                background: settings.fontSize === fs.value ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "center",
              }}
            >
              <div style={{
                fontSize: fs.value === "small" ? 12 : fs.value === "large" ? 20 : 16,
                fontWeight: 600,
                color: settings.fontSize === fs.value ? "var(--text-primary)" : "var(--text-muted)",
                marginBottom: 4,
              }}>
                Aa
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {fs.label}
              </div>
            </button>
          ))}
        </div>

        {/* Preview */}
        <div style={{
          marginTop: 14, padding: "12px 16px", borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            {t("interfaccia.preview")}
          </div>
          <div style={{
            fontSize: settings.fontSize === "small" ? 12 : settings.fontSize === "large" ? 20 : 16,
            color: "var(--text-secondary)", lineHeight: 1.5,
          }}>
            {t("interfaccia.previewText")}
          </div>
        </div>
      </div>

      {/* ═══ COLORE ACCENT ═══ */}
      <div style={cardStyle}>
        <div style={titleStyle}>{t("interfaccia.accentColor")}</div>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10,
        }}>
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => handleUpdate({ accentColor: c.hex, accentName: c.name })}
              style={{
                padding: "10px 8px",
                borderRadius: 10,
                border: `2px solid ${settings.accentColor === c.hex ? c.hex : "rgba(255,255,255,0.06)"}`,
                background: settings.accentColor === c.hex ? `${c.hex}15` : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: c.hex,
                boxShadow: settings.accentColor === c.hex ? `0 0 12px ${c.hex}60` : "none",
                transition: "box-shadow 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {settings.accentColor === c.hex && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: settings.accentColor === c.hex ? c.hex : "#64748b",
              }}>
                {c.name}
              </span>
            </button>
          ))}
        </div>

        {/* Preview accent */}
        <div style={{
          marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
        }}>
          <button style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${settings.accentColor}, ${settings.accentColor}cc)`,
            color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: `0 2px 12px ${settings.accentColor}50`,
          }}>
            {t("interfaccia.previewButton")}
          </button>
          <div style={{
            padding: "4px 12px", borderRadius: 100,
            background: `${settings.accentColor}18`,
            border: `1px solid ${settings.accentColor}40`,
            fontSize: 12, fontWeight: 600, color: settings.accentColor,
          }}>
            {t("interfaccia.badge")}
          </div>
          <div style={{
            width: 120, padding: "6px 10px", borderRadius: 8,
            border: `1.5px solid ${settings.accentColor}`,
            background: "rgba(0,0,0,0.2)", fontSize: 13, color: "var(--text-primary)",
            boxShadow: `0 0 0 3px ${settings.accentColor}30`,
          }}>
            {t("interfaccia.input")}
          </div>
        </div>
      </div>

      {/* ═══ RESET ═══ */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => {
            resetSettings();
            toast.info(t("common.settingSaved"));
          }}
          style={{
            padding: "8px 18px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--text-muted)", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "all 0.2s",
          }}
        >
          {t("interfaccia.resetDefaults")}
        </button>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 16,
  padding: 24,
};

const titleStyle: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16,
  display: "flex", alignItems: "center", gap: 8,
};
