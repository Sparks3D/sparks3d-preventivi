// src/context/SettingsContext.tsx
// Sparks3D Preventivi – Contesto impostazioni interfaccia
// ========================================================

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface UISettings {
  fontSize: "small" | "medium" | "large";
  accentColor: string;
  accentName: string;
}

const DEFAULTS: UISettings = {
  fontSize: "medium",
  accentColor: "#0ea5e9",
  accentName: "Cyan",
};

const FONT_SIZES: Record<string, { base: number; label: number; input: number }> = {
  small:  { base: 12, label: 10, input: 12 },
  medium: { base: 14, label: 11, input: 14 },
  large:  { base: 16, label: 12, input: 16 },
};

interface SettingsContextValue {
  settings: UISettings;
  updateSettings: (partial: Partial<UISettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be inside SettingsProvider");
  return ctx;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UISettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const json = await invoke<string>("get_impostazione", { chiave: "ui_settings" });
        if (json) {
          const parsed = JSON.parse(json);
          setSettings({ ...DEFAULTS, ...parsed });
        }
      } catch {
        // Nessuna impostazione salvata
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;

    const fs = FONT_SIZES[settings.fontSize] || FONT_SIZES.medium;
    root.style.setProperty("--font-size-base", `${fs.base}px`);
    root.style.setProperty("--font-size-label", `${fs.label}px`);
    root.style.setProperty("--font-size-input", `${fs.input}px`);

    const hex = settings.accentColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    root.style.setProperty("--accent", hex);
    root.style.setProperty("--accent-hover", darken(hex, 15));
    root.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.style.setProperty("--accent-soft", `rgba(${r}, ${g}, ${b}, 0.1)`);
    root.style.setProperty("--text-accent", lighten(hex, 30));
    root.style.setProperty("--text-label", lighten(hex, 45));
    root.style.setProperty("--border-active", `rgba(${r}, ${g}, ${b}, 0.6)`);
    root.style.setProperty("--border-glow", `rgba(${r}, ${g}, ${b}, 0.35)`);
    root.style.setProperty("--shadow-glow", `0 0 20px rgba(${r}, ${g}, ${b}, 0.12)`);
  }, [settings, loaded]);

  const persist = useCallback(async (s: UISettings) => {
    try {
      await invoke("set_impostazione", { chiave: "ui_settings", valore: JSON.stringify(s) });
    } catch (err) {
      console.warn("Errore salvataggio impostazioni UI:", err);
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<UISettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULTS);
    persist(DEFAULTS);
  }, [persist]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

function darken(hex: string, pct: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - Math.round(255 * pct / 100));
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - Math.round(255 * pct / 100));
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - Math.round(255 * pct / 100));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function lighten(hex: string, pct: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + Math.round(255 * pct / 100));
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + Math.round(255 * pct / 100));
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + Math.round(255 * pct / 100));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
