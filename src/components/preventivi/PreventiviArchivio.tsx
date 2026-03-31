// src/components/preventivi/PreventiviArchivio.tsx
// ================================================
// Archivio preventivi — Dark Navy Premium Theme

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface PreventivoListItem {
  id: number; numero: string; cliente_id: number | null;
  cliente_nome: string; stato: string; data_creazione: string;
  num_righe: number; totale_costo: number; totale_cliente: number;
  totale_profit: number; totale_finale: number;
}

interface Props {
  onOpenPreventivo: (id: number) => void;
  onNuovoPreventivo: () => void;
  initialFiltroStato?: string;
}

const STATI_STYLES: Record<string, { key: string; color: string; bg: string }> = {
  bozza:          { key: "bozza",          color: "#8899b4", bg: "rgba(136,153,180,0.1)" },
  non_confermato: { key: "bozza",          color: "#8899b4", bg: "rgba(136,153,180,0.1)" },
  inviato:        { key: "inviato",        color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  accettato:      { key: "accettato",      color: "#34d399", bg: "rgba(52,211,153,0.1)" },
  in_produzione:  { key: "in_produzione",  color: "#fb923c", bg: "rgba(251,146,60,0.1)" },
  completato:     { key: "completato",     color: "#6ee7b7", bg: "rgba(110,231,183,0.1)" },
  rifiutato:      { key: "rifiutato",      color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

function StatoBadge({ stato }: { stato: string }) {
  const { t } = useTranslation();
  const s = STATI_STYLES[stato] || STATI_STYLES.bozza;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 12px", borderRadius: 100,
      fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
      {t(`stati.${s.key}`)}
    </span>
  );
}

function formatDate(d: string) { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; }
function formatEuro(v: number) { return "€ " + v.toFixed(2).replace(".", ","); }

export function PreventiviArchivio({ onOpenPreventivo, initialFiltroStato }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<PreventivoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroStato, setFiltroStato] = useState(initialFiltroStato || "tutti");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; numero: string } | null>(null);

  const load = useCallback(async () => {
    try { setItems(await invoke<PreventivoListItem[]>("get_preventivi_list")); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleNuovo = async () => {
    try { const p = await invoke<{ id: number }>("create_preventivo"); onOpenPreventivo(p.id); }
    catch (e) { console.error(e); }
  };
  const handleDelete = (id: number, numero: string) => {
    setDeleteTarget({ id, numero });
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await invoke("delete_preventivo", { id: deleteTarget.id }); load(); } catch (e) { console.error(e); }
    setDeleteTarget(null);
  };
  const handleDuplica = async (id: number) => {
    try { onOpenPreventivo(await invoke<number>("duplica_preventivo", { id })); }
    catch (e) { console.error(e); }
  };

  const filtered = items.filter(item => {
    if (filtroStato !== "tutti") {
      const s = item.stato === "non_confermato" ? "bozza" : item.stato;
      if (s !== filtroStato) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return item.numero.toLowerCase().includes(q) || item.cliente_nome.toLowerCase().includes(q);
    }
    return true;
  });

  const conteggi = items.reduce<Record<string, number>>((acc, i) => {
    const s = i.stato === "non_confermato" ? "bozza" : i.stato;
    acc[s] = (acc[s] || 0) + 1; return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e8edf5", letterSpacing: -0.5, margin: 0 }}>{t("preventivi.title")}</h1>
          <p style={{ fontSize: 13, color: "#556a89", marginTop: 4 }}>{t("preventivi.countTotali", { count: items.length })}</p>
        </div>
        <button className="s3d-btn s3d-btn-primary" onClick={handleNuovo} style={{ padding: "10px 20px", fontSize: 14 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t("preventivi.nuovo")}
        </button>
      </div>

      {/* Filtri */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {[{ key: "tutti", label: `${t("preventivi.tutti")} (${items.length})`, color: "#e8edf5" },
          ...Object.entries(STATI_STYLES).filter(([k]) => k !== "non_confermato").map(([key, s]) => ({
            key, label: `${t(`stati.${s.key}`)} (${conteggi[key] || 0})`, color: s.color,
          }))
        ].map(f => (
          <button key={f.key} onClick={() => setFiltroStato(f.key)} style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: filtroStato === f.key ? `1px solid ${f.color}40` : "1px solid transparent",
            background: filtroStato === f.key ? `${f.color}15` : "transparent",
            color: filtroStato === f.key ? f.color : "#556a89", transition: "all 0.2s",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Ricerca */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#556a89" strokeWidth="2" strokeLinecap="round"
             style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input type="text" placeholder={t("preventivi.searchPlaceholder")} value={search}
               onChange={e => setSearch(e.target.value)} className="s3d-input" style={{ paddingLeft: 42 }} />
      </div>

      {/* Contenuto */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#556a89" }}>{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📋</div>
          <p style={{ color: "#556a89" }}>{items.length === 0 ? t("preventivi.noPreventivi") : t("common.noResults")}</p>
          {items.length === 0 && <button onClick={handleNuovo} style={{ marginTop: 12, color: "#60a5fa", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>{t("preventivi.primoPreventivo")}</button>}
        </div>
      ) : (
        <div className="s3d-card" style={{ overflow: "hidden" }}>
          <table className="s3d-table">
            <thead><tr>
              <th>{t("preventivi.thNumero")}</th><th>{t("preventivi.thData")}</th><th>{t("preventivi.thCliente")}</th><th>{t("preventivi.thStato")}</th>
              <th style={{ textAlign: "right" }}>{t("preventivi.thRighe")}</th><th style={{ textAlign: "right" }}>{t("preventivi.thTotale")}</th>
              <th style={{ textAlign: "right" }}>{t("preventivi.thProfit")}</th><th style={{ textAlign: "center", width: 90 }}>{t("preventivi.thAzioni")}</th>
            </tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} onClick={() => onOpenPreventivo(item.id)} style={{ cursor: "pointer" }}>
                  <td style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 13, color: "#60a5fa" }}>{item.numero}</td>
                  <td style={{ color: "#8899b4" }}>{formatDate(item.data_creazione)}</td>
                  <td>{item.cliente_nome || <span style={{ color: "#3d5170", fontStyle: "italic" }}>—</span>}</td>
                  <td><StatoBadge stato={item.stato} /></td>
                  <td style={{ textAlign: "right", color: "#8899b4" }}>{item.num_righe}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, fontFamily: "monospace" }}>{formatEuro(item.totale_finale)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace", color: item.totale_profit >= 0 ? "#34d399" : "#f87171" }}>
                    {formatEuro(item.totale_profit)}
                  </td>
                  <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                      <button onClick={() => handleDuplica(item.id)} title={t("common.duplicate")}
                              style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent", color: "#8899b4", cursor: "pointer" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(item.id, item.numero)} title={t("common.delete")}
                              style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent", color: "#f87171", cursor: "pointer" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal conferma eliminazione */}
      {deleteTarget && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#141c2e", border: "1px solid rgba(96,165,250,0.12)",
            borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(248,113,113,0.1)", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e8edf5" }}>{t("preventivi.deleteTitle")}</h3>
            </div>
            <p style={{ color: "#8899b4", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
              {t("preventivi.deleteConfirm")} <strong style={{ color: "#e8edf5" }}>{deleteTarget.numero}</strong>?
              <br />{t("preventivi.deleteIrreversible")}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "1px solid rgba(136,153,180,0.2)", background: "transparent",
                color: "#8899b4", cursor: "pointer",
              }}>{t("common.cancel")}</button>
              <button onClick={confirmDelete} style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", background: "#dc2626", color: "#fff", cursor: "pointer",
              }}>{t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
