// src/components/layout/GlobalSearch.tsx
// Sparks3D Preventivi – Ricerca globale (Ctrl+K)
// ================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import type { PageId } from "../../types";

interface SearchResult {
  categoria: string;
  id: number;
  titolo: string;
  sottotitolo: string;
  extra: string;
  icona: string;
  page_id: string;
  preventivo_id: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageId, preventivoId?: number) => void;
}

const CATEGORIA_LABEL_KEYS: Record<string, string> = {
  preventivo: "search.categoriaPreventivo",
  cliente: "search.categoriaCliente",
  materiale: "search.categoriaMateriale",
  stampante: "search.categoriaStampante",
  profilo: "search.categoriaProfilo",
};

const CATEGORIA_ORDER = ["preventivo", "cliente", "materiale", "stampante", "profilo"];

export function GlobalSearch({ open, onClose, onNavigate }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Focus input quando si apre
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Ricerca con debounce
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await invoke<SearchResult[]>("global_search", { query: q });
      setResults(res);
      setSelectedIdx(0);
    } catch (err) {
      console.warn("Search error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 200);
  };

  // Navigazione con frecce e Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      e.preventDefault();
      selectResult(results[selectedIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const selectResult = (r: SearchResult) => {
    onClose();
    if (r.preventivo_id) {
      onNavigate(r.page_id as PageId, r.preventivo_id);
    } else {
      onNavigate(r.page_id as PageId);
    }
  };

  // Raggruppa risultati per categoria
  const grouped = CATEGORIA_ORDER.map((cat) => ({
    categoria: cat,
    label: CATEGORIA_LABEL_KEYS[cat] ? t(CATEGORIA_LABEL_KEYS[cat]) : cat,
    items: results.filter((r) => r.categoria === cat),
  })).filter((g) => g.items.length > 0);

  // Indice flat per evidenziazione
  let flatIdx = 0;
  const getFlatIdx = () => flatIdx++;

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560, maxHeight: "70vh",
          background: "#0f1629",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.1)",
          overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Input ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("search.placeholder")}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: 15, fontWeight: 500,
              fontFamily: "inherit",
            }}
          />
          {loading && (
            <div style={{
              width: 16, height: 16, border: "2px solid rgba(59,130,246,0.3)",
              borderTop: "2px solid #3b82f6", borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }} />
          )}
          <div style={{
            padding: "3px 8px", borderRadius: 6,
            background: "rgba(255,255,255,0.06)",
            fontSize: 11, color: "#64748b", fontWeight: 600,
          }}>
            ESC
          </div>
        </div>

        {/* ── Risultati ── */}
        <div style={{ overflow: "auto", flex: 1 }}>
          {query.length >= 2 && results.length === 0 && !loading && (
            <div style={{
              padding: "32px 20px", textAlign: "center",
              color: "#475569", fontSize: 14,
            }}>
              {t("search.noResults", { query })}
            </div>
          )}

          {query.length < 2 && !loading && (
            <div style={{
              padding: "28px 20px", textAlign: "center",
              color: "#475569", fontSize: 13,
            }}>
              <div style={{ marginBottom: 12, fontSize: 24, opacity: 0.4 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              {t("search.minChars")}
              <div style={{ marginTop: 12, display: "flex", gap: 16, justifyContent: "center", fontSize: 11, color: "#3d5170" }}>
                <span>
                  <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> {t("search.navigate")}
                </span>
                <span>
                  <kbd style={kbdStyle}>↵</kbd> {t("search.open")}
                </span>
                <span>
                  <kbd style={kbdStyle}>Esc</kbd> {t("search.close")}
                </span>
              </div>
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.categoria}>
              {/* Label categoria */}
              <div style={{
                padding: "10px 20px 4px",
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 1.2, color: "#3d5170",
              }}>
                {group.label}
              </div>
              {/* Items */}
              {group.items.map((item) => {
                const idx = getFlatIdx();
                const isSelected = idx === selectedIdx;
                return (
                  <div
                    key={`${item.categoria}-${item.id}`}
                    onClick={() => selectResult(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 20px",
                      cursor: "pointer",
                      transition: "background 0.1s",
                      background: isSelected ? "rgba(59,130,246,0.1)" : "transparent",
                      borderLeft: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
                    }}
                  >
                    <span style={{ fontSize: 18, width: 28, textAlign: "center", flexShrink: 0 }}>
                      {item.icona}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: 600,
                        color: isSelected ? "#e2e8f0" : "#cbd5e1",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {item.titolo}
                      </div>
                      {item.sottotitolo && (
                        <div style={{
                          fontSize: 12, color: "#556a89", marginTop: 1,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.sottotitolo}
                        </div>
                      )}
                    </div>
                    {item.extra && (
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: "#60a5fa",
                        whiteSpace: "nowrap", flexShrink: 0,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {item.extra}
                      </div>
                    )}
                    {isSelected && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        {results.length > 0 && (
          <div style={{
            padding: "10px 20px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: 11, color: "#3d5170",
          }}>
            <span>{t("search.resultCount", { count: results.length })}</span>
            <div style={{ display: "flex", gap: 12 }}>
              <span><kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> {t("search.navigate")}</span>
              <span><kbd style={kbdStyle}>↵</kbd> {t("search.open")}</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 5px",
  borderRadius: 4,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 10,
  fontFamily: "inherit",
  color: "#556a89",
};
