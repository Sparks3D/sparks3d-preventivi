// src/components/layout/ThemeToggle.tsx
// Sparks3D Preventivi — Toggle tema chiaro/scuro (asola con pallino scorrevole)
// ==============================================================================

import { useTheme } from "../../context/ThemeContext";

export function ThemeToggle() {
  const { isDark, setTheme } = useTheme();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 14px",
    }}>
      <div
        style={{
          position: "relative",
          width: 56,
          height: 28,
          borderRadius: 14,
          background: isDark
            ? "rgba(59, 130, 246, 0.12)"
            : "rgba(250, 204, 21, 0.18)",
          border: `1px solid ${isDark
            ? "rgba(59, 130, 246, 0.2)"
            : "rgba(250, 204, 21, 0.3)"}`,
          cursor: "pointer",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          padding: "0 3px",
        }}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      >
        {/* Icona sole (sinistra) */}
        <div style={{
          position: "absolute",
          left: 7,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.3s, color 0.3s",
          opacity: isDark ? 0.35 : 1,
          color: isDark ? "#6b7fa0" : "#f59e0b",
          pointerEvents: "none",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </div>

        {/* Icona luna (destra) */}
        <div style={{
          position: "absolute",
          right: 7,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "opacity 0.3s, color 0.3s",
          opacity: isDark ? 1 : 0.35,
          color: isDark ? "#60a5fa" : "#8895a7",
          pointerEvents: "none",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </div>

        {/* Pallino scorrevole */}
        <div style={{
          position: "absolute",
          top: 3,
          left: isDark ? 29 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg, #3b82f6, #60a5fa)"
            : "linear-gradient(135deg, #f59e0b, #fbbf24)",
          boxShadow: isDark
            ? "0 2px 8px rgba(59, 130, 246, 0.4)"
            : "0 2px 8px rgba(245, 158, 11, 0.4)",
          transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s, box-shadow 0.3s",
          zIndex: 2,
        }} />
      </div>
    </div>
  );
}
