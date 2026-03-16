// src/components/corrieri/CorrieriModal.tsx
// Sparks3D Preventivi — Modale "Calcola Spedizione" con PackLink Pro

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ServizioCorrere {
  id: string; nome_corriere: string; nome_servizio: string;
  prezzo_totale: number; prezzo_base: number; prezzo_iva: number;
  valuta: string; tempo_transito: string; ore_transito: number | null;
  categoria: string; data_consegna_stimata: string; logo_url: string | null;
  drop_off: boolean; consegna_punto_ritiro: boolean; dimensioni_max: string;
}

interface RispostaSpedizione { servizi: ServizioCorrere[]; errore: string | null; }

export interface CorriereSelezionato extends ServizioCorrere {
  pacco_peso_kg: number; pacco_lunghezza_cm: number;
  pacco_larghezza_cm: number; pacco_altezza_cm: number;
}

interface Props {
  isOpen: boolean; onClose: () => void;
  onSeleziona: (corriere: CorriereSelezionato) => void;
  capCliente?: string; paeseCliente?: string;
}

export function CorrieriModal({ isOpen, onClose, onSeleziona, capCliente, paeseCliente }: Props) {
  const [pacco, setPacco] = useState({ peso_kg: "", lunghezza_cm: "", larghezza_cm: "", altezza_cm: "" });
  const [servizi, setServizi] = useState<ServizioCorrere[]>([]);
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [ordinamento, setOrdinamento] = useState<"prezzo" | "tempo">("prezzo");
  const [selezionato, setSelezionato] = useState<ServizioCorrere | null>(null);
  const [mittente, setMittente] = useState<{ cap: string; citta: string; paese: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      invoke<any>("get_azienda")
        .then((az) => setMittente({ cap: az.cap, citta: az.citta, paese: az.paese }))
        .catch(() => setMittente(null));
    }
  }, [isOpen]);

  const handlePaccoChange = (campo: string, valore: string) => {
    if (valore !== "" && !/^\d*\.?\d*$/.test(valore)) return;
    setPacco((prev) => ({ ...prev, [campo]: valore }));
  };

  const cercaTariffe = useCallback(async () => {
    const { peso_kg, lunghezza_cm, larghezza_cm, altezza_cm } = pacco;
    if (!peso_kg || !lunghezza_cm || !larghezza_cm || !altezza_cm) {
      setErrore("Compila tutte le dimensioni del pacco."); return;
    }
    setLoading(true); setErrore(null); setServizi([]); setSelezionato(null);
    try {
      const risposta = await invoke<RispostaSpedizione>("get_tariffe_corrieri", {
        richiesta: {
          pacco: { peso_kg: parseFloat(peso_kg), lunghezza_cm: parseFloat(lunghezza_cm), larghezza_cm: parseFloat(larghezza_cm), altezza_cm: parseFloat(altezza_cm) },
          cap_destinatario: capCliente || "", paese_destinatario: paeseCliente || "IT",
        },
      });
      if (risposta.errore) setErrore(risposta.errore);
      else if (risposta.servizi.length === 0) setErrore("Nessun servizio disponibile per questa tratta/dimensione.");
      else setServizi(risposta.servizi);
    } catch (err: any) { setErrore(`Errore: ${err}`); }
    finally { setLoading(false); }
  }, [pacco, capCliente, paeseCliente]);

  const serviziOrdinati = [...servizi].sort((a, b) => {
    if (ordinamento === "prezzo") return a.prezzo_totale - b.prezzo_totale;
    return (a.ore_transito ?? 9999) - (b.ore_transito ?? 9999);
  });

  const conferma = () => {
    if (selezionato) {
      onSeleziona({
        ...selezionato,
        pacco_peso_kg: parseFloat(pacco.peso_kg), pacco_lunghezza_cm: parseFloat(pacco.lunghezza_cm),
        pacco_larghezza_cm: parseFloat(pacco.larghezza_cm), pacco_altezza_cm: parseFloat(pacco.altezza_cm),
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const campi = [
    { campo: "peso_kg", label: "Peso (kg)", ph: "0.5" },
    { campo: "lunghezza_cm", label: "Lunghezza (cm)", ph: "30" },
    { campo: "larghezza_cm", label: "Larghezza (cm)", ph: "20" },
    { campo: "altezza_cm", label: "Altezza (cm)", ph: "15" },
  ];

  const sortBtn = (key: "prezzo" | "tempo", icon: string, label: string) => (
    <button onClick={() => setOrdinamento(key)} style={{
      padding: "4px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer", fontWeight: 600, border: "none",
      background: ordinamento === key ? "var(--accent)" : "var(--bg-surface)",
      color: ordinamento === key ? "#fff" : "var(--text-muted)",
      transition: "all 0.2s",
    }}>{icon} {label}</button>
  );

  const badge = (emoji: string, text: string, color: string, bg: string) => (
    <span style={{ fontSize: 10, padding: "2px 6px", background: bg, color, borderRadius: 4, fontWeight: 600 }}>
      {emoji} {text}
    </span>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", width: "100%", maxWidth: 640, margin: "0 16px",
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)" }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>📦 Calcola Spedizione</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>

        {/* Dimensioni pacco */}
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {campi.map(({ campo, label, ph }) => (
              <div key={campo}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</label>
                <input type="text" inputMode="decimal"
                  value={pacco[campo as keyof typeof pacco]}
                  onChange={(e) => handlePaccoChange(campo, e.target.value)}
                  placeholder={ph} className="s3d-input" />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
            <span>🏠 Dest: <strong style={{ color: "var(--text-secondary)" }}>{capCliente || "—"}</strong> ({paeseCliente || "IT"})</span>
            <span>📍 Mitt: {mittente ? `${mittente.cap} ${mittente.citta} (${mittente.paese})` : "..."}</span>
          </div>
          <button onClick={cercaTariffe} disabled={loading} className="s3d-btn s3d-btn-primary"
            style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.6 : 1 }}>
            {loading ? "⟳ Ricerca in corso..." : "🔍 Cerca tariffe"}
          </button>
        </div>

        {/* Errore */}
        {errore && (
          <div style={{ padding: "12px 20px", background: "var(--red-soft)", borderBottom: "1px solid var(--border-subtle)" }}>
            <p style={{ fontSize: 13, color: "var(--red)", margin: 0 }}>⚠️ {errore}</p>
          </div>
        )}

        {/* Lista servizi */}
        {servizi.length > 0 && (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{servizi.length} servizi trovati</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Ordina:</span>
                {sortBtn("prezzo", "💰", "Prezzo")}
                {sortBtn("tempo", "⏱️", "Velocità")}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {serviziOrdinati.map((s) => (
                <div key={s.id} onClick={() => setSelezionato(s)} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: 12, borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
                  border: selezionato?.id === s.id ? "2px solid var(--accent)" : "2px solid transparent",
                  background: selezionato?.id === s.id ? "var(--accent-soft)" : "var(--bg-surface)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.nome_corriere} style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 6 }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: "var(--bg-elevated)", borderRadius: 6 }}>🚚</div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{s.nome_corriere}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.nome_servizio}</div>
                      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                        {s.drop_off && badge("📍", "Drop-off", "var(--orange)", "var(--orange-soft)")}
                        {s.consegna_punto_ritiro && badge("🏪", "Punto ritiro", "var(--green)", "var(--green-soft)")}
                        {s.categoria && badge("", s.categoria, "var(--accent)", "var(--accent-soft)")}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>€{s.prezzo_totale.toFixed(2)}</div>
                    {s.tempo_transito && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.tempo_transito}</div>}
                    {s.data_consegna_stimata && <div style={{ fontSize: 10, color: "var(--text-muted)" }}>arrivo: {s.data_consegna_stimata}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer conferma */}
        {servizi.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: 13, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 12 }}>
              {selezionato
                ? <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>✅ {selezionato.nome_corriere} — {selezionato.nome_servizio} — €{selezionato.prezzo_totale.toFixed(2)}</span>
                : "👆 Seleziona un corriere dalla lista"}
            </div>
            <button onClick={conferma} disabled={!selezionato} className="s3d-btn s3d-btn-primary"
              style={{ background: "var(--green)", boxShadow: "0 2px 12px rgba(34,197,94,0.3)", opacity: selezionato ? 1 : 0.4, whiteSpace: "nowrap" }}>
              Usa questo corriere
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
