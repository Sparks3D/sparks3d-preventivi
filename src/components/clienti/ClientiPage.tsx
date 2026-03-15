// src/components/clienti/ClientiPage.tsx
// Sparks3D Preventivi – Anagrafica Clienti (CRUD completo)
// =========================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Cliente {
  id: number;
  nome: string;
  cognome: string;
  denominazione_azienda: string;
  email: string;
  telefono: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  partita_iva: string;
  codice_fiscale: string;
  note: string;
}

const EMPTY: Omit<Cliente, "id"> = {
  nome: "", cognome: "", denominazione_azienda: "",
  email: "", telefono: "",
  indirizzo: "", cap: "", citta: "", provincia: "",
  partita_iva: "", codice_fiscale: "", note: "",
};

export function ClientiPage() {
  const [items, setItems] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      setItems(await invoke<Cliente[]>("get_clienti"));
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nome.toLowerCase().includes(q) ||
      c.cognome.toLowerCase().includes(q) ||
      c.denominazione_azienda.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.citta.toLowerCase().includes(q)
    );
  });

  const displayName = (c: Cliente) => {
    if (c.denominazione_azienda) return c.denominazione_azienda;
    return [c.nome, c.cognome].filter(Boolean).join(" ") || "—";
  };

  const openNew = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const openEdit = (c: Cliente) => {
    setForm({
      nome: c.nome, cognome: c.cognome,
      denominazione_azienda: c.denominazione_azienda,
      email: c.email, telefono: c.telefono,
      indirizzo: c.indirizzo, cap: c.cap,
      citta: c.citta, provincia: c.provincia,
      partita_iva: c.partita_iva, codice_fiscale: c.codice_fiscale,
      note: c.note,
    });
    setEditingId(c.id);
    setError("");
    setShowForm(true);
  };

  const handleSave = async () => {
    // Almeno nome/cognome o denominazione azienda
    if (!form.nome.trim() && !form.cognome.trim() && !form.denominazione_azienda.trim()) {
      setError("Inserisci almeno il nome o la denominazione azienda");
      return;
    }
    try {
      if (editingId) {
        await invoke("update_cliente", { id: editingId, data: { id: editingId, ...form } });
      } else {
        await invoke("create_cliente", { data: { id: 0, ...form } });
      }
      setShowForm(false);
      setEditingId(null);
      setError("");
      await load();
    } catch (e: any) {
      setError(String(e));
    }
  };

  const handleDelete = async (id: number) => {
    await invoke("delete_cliente", { id }).catch(() => {});
    setSelectedIds((p) => { const n = new Set(p); n.delete(id); return n; });
    await load();
  };

  const handleDeleteSelected = async () => {
    for (const id of selectedIds) {
      await invoke("delete_cliente", { id }).catch(() => {});
    }
    setSelectedIds(new Set());
    await load();
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  const updateField = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clienti</h2>
          <p className="text-sm text-gray-500 mt-1">Anagrafica clienti per i preventivi</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Nuovo cliente
        </button>
      </div>

      {/* Barra ricerca + selezione */}
      <div className="flex items-center gap-3 mb-4">
        <input type="checkbox"
          checked={selectedIds.size === filtered.length && filtered.length > 0}
          onChange={toggleSelectAll} className="w-4 h-4 rounded" />
        {selectedIds.size > 0 && (
          <button onClick={handleDeleteSelected}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50">
            Elimina selezionati ({selectedIds.size})
          </button>
        )}
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, azienda, email, città…"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      </div>

      {/* Tabella */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {items.length === 0
              ? 'Nessun cliente inserito. Clicca "Nuovo cliente" per iniziare.'
              : "Nessun risultato per la ricerca."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nome / Azienda</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Telefono</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Città</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">P.IVA</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEdit(c)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(c.id)}
                      onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{displayName(c)}</div>
                    {c.denominazione_azienda && (c.nome || c.cognome) && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {[c.nome, c.cognome].filter(Boolean).join(" ")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.telefono || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {[c.citta, c.provincia].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.partita_iva ? (
                      <span className="font-mono text-xs">{c.partita_iva}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} className="text-blue-600 text-xs mr-3">Modifica</button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 text-xs">Elimina</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Conteggio */}
      {items.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {filtered.length} di {items.length} clienti
        </div>
      )}

      {/* ── Modal Crea/Modifica ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold">
                {editingId ? "Modifica cliente" : "Nuovo cliente"}
              </h3>
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Dati anagrafici */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Dati anagrafici
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input type="text" value={form.nome}
                      onChange={(e) => updateField("nome", e.target.value)}
                      placeholder="Mario"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cognome</label>
                    <input type="text" value={form.cognome}
                      onChange={(e) => updateField("cognome", e.target.value)}
                      placeholder="Rossi"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Denominazione azienda</label>
                  <input type="text" value={form.denominazione_azienda}
                    onChange={(e) => updateField("denominazione_azienda", e.target.value)}
                    placeholder="Acme S.r.l."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {/* Contatti */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Contatti
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="mario@esempio.it"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input type="tel" value={form.telefono}
                      onChange={(e) => updateField("telefono", e.target.value)}
                      placeholder="+39 333 1234567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Indirizzo */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Indirizzo
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                    <input type="text" value={form.indirizzo}
                      onChange={(e) => updateField("indirizzo", e.target.value)}
                      placeholder="Via Roma 1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                      <input type="text" value={form.cap}
                        onChange={(e) => updateField("cap", e.target.value)}
                        placeholder="25031"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                      <input type="text" value={form.citta}
                        onChange={(e) => updateField("citta", e.target.value)}
                        placeholder="Capriolo"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                      <input type="text" value={form.provincia}
                        onChange={(e) => updateField("provincia", e.target.value)}
                        placeholder="BS" maxLength={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dati fiscali */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Dati fiscali
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                    <input type="text" value={form.partita_iva}
                      onChange={(e) => updateField("partita_iva", e.target.value)}
                      placeholder="IT01234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice fiscale</label>
                    <input type="text" value={form.codice_fiscale}
                      onChange={(e) => updateField("codice_fiscale", e.target.value.toUpperCase())}
                      placeholder="RSSMRA80A01B157H"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase" />
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  placeholder="Note libere sul cliente…"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                Annulla
              </button>
              <button onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {editingId ? "Salva modifiche" : "Crea cliente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
