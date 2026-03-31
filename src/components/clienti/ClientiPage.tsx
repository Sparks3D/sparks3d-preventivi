// src/components/clienti/ClientiPage.tsx
// Sparks3D Preventivi – Anagrafica Clienti (lista)
// ==================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTranslation } from "react-i18next";

interface Cliente {
  id: number; nome: string; cognome: string; denominazione_azienda: string;
  email: string; telefono: string; indirizzo: string; cap: string;
  citta: string; provincia: string; partita_iva: string;
  codice_fiscale: string; note: string;
}

interface Props {
  onOpenCliente: (id: number) => void;
  onNuovoCliente: () => void;
}

export function ClientiPage({ onOpenCliente, onNuovoCliente }: Props) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ mode: "single"; id: number } | { mode: "multi"; ids: Set<number> } | null>(null);

  const load = useCallback(async () => {
    try { setItems(await invoke<Cliente[]>("get_clienti")); } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return c.nome.toLowerCase().includes(q) || c.cognome.toLowerCase().includes(q) ||
      c.denominazione_azienda.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) ||
      c.citta.toLowerCase().includes(q);
  });

  const displayName = (c: Cliente) => {
    if (c.denominazione_azienda) return c.denominazione_azienda;
    return [c.nome, c.cognome].filter(Boolean).join(" ") || "—";
  };

  const handleDelete = (id: number) => { setDeleteTarget({ mode: "single", id }); };
  const handleDeleteSelected = () => { if (selectedIds.size === 0) return; setDeleteTarget({ mode: "multi", ids: new Set(selectedIds) }); };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.mode === "single") {
      await invoke("delete_cliente", { id: deleteTarget.id }).catch(() => {});
      setSelectedIds((p) => { const n = new Set(p); n.delete(deleteTarget.id); return n; });
    } else {
      for (const id of deleteTarget.ids) { await invoke("delete_cliente", { id }).catch(() => {}); }
      setSelectedIds(new Set());
    }
    setDeleteTarget(null); await load();
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5, margin: 0 }}>{t("clienti.title")}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{t("clienti.subtitle")}</p>
        </div>
        <button className="s3d-btn s3d-btn-primary" onClick={onNuovoCliente} style={{ padding: "10px 20px", fontSize: 14 }}>
          {t("clienti.nuovo")}
        </button>
      </div>

      {/* Barra ricerca + selezione */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <input type="checkbox"
          checked={selectedIds.size === filtered.length && filtered.length > 0}
          onChange={toggleSelectAll}
          style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
        {selectedIds.size > 0 && (
          <button className="s3d-btn s3d-btn-danger" onClick={handleDeleteSelected} style={{ padding: "6px 14px", fontSize: 12 }}>
            {t("common.deleteSelected")} ({selectedIds.size})
          </button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("clienti.searchPlaceholder")}
          className="s3d-input" style={{ flex: 1 }} />
      </div>

      {/* Tabella */}
      <div className="s3d-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
            {items.length === 0 ? t("clienti.noClienti") : t("common.noResults")}
          </div>
        ) : (
          <table className="s3d-table">
            <thead><tr>
              <th style={{ width: 40 }}></th>
              <th>{t("clienti.thNomeAzienda")}</th><th>{t("clienti.thEmail")}</th><th>{t("clienti.thTelefono")}</th>
              <th>{t("clienti.thCitta")}</th><th>{t("clienti.thPiva")}</th>
              <th style={{ textAlign: "right" }}>{t("common.actions")}</th>
            </tr></thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} onClick={() => onOpenCliente(c.id)} style={{ cursor: "pointer" }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      style={{ width: 16, height: 16, borderRadius: 4, accentColor: "var(--accent)" }} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{displayName(c)}</div>
                    {c.denominazione_azienda && (c.nome || c.cognome) && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {[c.nome, c.cognome].filter(Boolean).join(" ")}
                      </div>
                    )}
                  </td>
                  <td>{c.email || "—"}</td>
                  <td>{c.telefono || "—"}</td>
                  <td>{[c.citta, c.provincia].filter(Boolean).join(" ") || "—"}</td>
                  <td>{c.partita_iva ? <span style={{ fontFamily: "monospace", fontSize: 12 }}>{c.partita_iva}</span> : "—"}</td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => onOpenCliente(c.id)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, fontWeight: 600, cursor: "pointer", marginRight: 12 }}>{t("common.edit")}</button>
                    <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", color: "var(--red)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t("common.delete")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Conteggio */}
      {items.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-muted)" }}>
          {t("clienti.countLabel", { count: filtered.length, total: items.length })}
        </div>
      )}

      {/* Modal conferma eliminazione */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setDeleteTarget(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#141c2e", border: "1px solid rgba(96,165,250,0.12)", borderRadius: 16, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(248,113,113,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e8edf5" }}>
                {deleteTarget.mode === "single" ? t("clienti.deleteTitle") : t("clienti.deleteMultiTitle", { count: deleteTarget.ids.size })}
              </h3>
            </div>
            <p style={{ color: "#8899b4", fontSize: 14, lineHeight: 1.5, margin: "0 0 24px" }}>
              {deleteTarget.mode === "single" ? t("clienti.deleteConfirm") : t("clienti.deleteMultiConfirm", { count: deleteTarget.ids.size })}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "1px solid rgba(136,153,180,0.2)", background: "transparent", color: "#8899b4", cursor: "pointer" }}>{t("common.cancel")}</button>
              <button onClick={confirmDelete} style={{ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer" }}>{t("common.delete")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
