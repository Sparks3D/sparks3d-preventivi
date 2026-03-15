// src/components/corrieri/CorrieriModal.tsx
// Sparks3D Preventivi — Modale "Calcola Spedizione" con PackLink Pro

import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ServizioCorrere {
  id: string;
  nome_corriere: string;
  nome_servizio: string;
  prezzo_totale: number;
  prezzo_base: number;
  prezzo_iva: number;
  valuta: string;
  tempo_transito: string;
  ore_transito: number | null;
  categoria: string;
  data_consegna_stimata: string;
  logo_url: string | null;
  drop_off: boolean;
  consegna_punto_ritiro: boolean;
  dimensioni_max: string;
}

interface RispostaSpedizione {
  servizi: ServizioCorrere[];
  errore: string | null;
}

export interface CorriereSelezionato extends ServizioCorrere {
  pacco_peso_kg: number;
  pacco_lunghezza_cm: number;
  pacco_larghezza_cm: number;
  pacco_altezza_cm: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSeleziona: (corriere: CorriereSelezionato) => void;
  capCliente?: string;
  paeseCliente?: string;
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
      setErrore("Compila tutte le dimensioni del pacco.");
      return;
    }
    setLoading(true);
    setErrore(null);
    setServizi([]);
    setSelezionato(null);
    try {
      const risposta = await invoke<RispostaSpedizione>("get_tariffe_corrieri", {
        richiesta: {
          pacco: {
            peso_kg: parseFloat(peso_kg),
            lunghezza_cm: parseFloat(lunghezza_cm),
            larghezza_cm: parseFloat(larghezza_cm),
            altezza_cm: parseFloat(altezza_cm),
          },
          cap_destinatario: capCliente || "",
          paese_destinatario: paeseCliente || "IT",
        },
      });
      if (risposta.errore) {
        setErrore(risposta.errore);
      } else if (risposta.servizi.length === 0) {
        setErrore("Nessun servizio disponibile per questa tratta/dimensione.");
      } else {
        setServizi(risposta.servizi);
      }
    } catch (err: any) {
      setErrore(`Errore: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [pacco, capCliente, paeseCliente]);

  const serviziOrdinati = [...servizi].sort((a, b) => {
    if (ordinamento === "prezzo") return a.prezzo_totale - b.prezzo_totale;
    return (a.ore_transito ?? 9999) - (b.ore_transito ?? 9999);
  });

  const conferma = () => {
    if (selezionato) {
      onSeleziona({
        ...selezionato,
        pacco_peso_kg: parseFloat(pacco.peso_kg),
        pacco_lunghezza_cm: parseFloat(pacco.lunghezza_cm),
        pacco_larghezza_cm: parseFloat(pacco.larghezza_cm),
        pacco_altezza_cm: parseFloat(pacco.altezza_cm),
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">📦 Calcola Spedizione</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-3 mb-3">
            {campi.map(({ campo, label, ph }) => (
              <div key={campo}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</label>
                <input type="text" inputMode="decimal"
                  value={pacco[campo as keyof typeof pacco]}
                  onChange={(e) => handlePaccoChange(campo, e.target.value)}
                  placeholder={ph}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
            <span>🏠 Dest: <strong className="text-gray-700 dark:text-gray-300">{capCliente || "—"}</strong> ({paeseCliente || "IT"})</span>
            <span>📍 Mitt: {mittente ? `${mittente.cap} ${mittente.citta} (${mittente.paese})` : "..."}</span>
          </div>
          <button onClick={cercaTariffe} disabled={loading}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "⟳ Ricerca in corso..." : "🔍 Cerca tariffe"}
          </button>
        </div>

        {errore && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-red-700 dark:text-red-300">⚠️ {errore}</p>
          </div>
        )}

        {servizi.length > 0 && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500">{servizi.length} servizi trovati</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Ordina:</span>
                <button onClick={() => setOrdinamento("prezzo")}
                  className={`px-2.5 py-1 text-xs rounded-md ${ordinamento === "prezzo" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  💰 Prezzo
                </button>
                <button onClick={() => setOrdinamento("tempo")}
                  className={`px-2.5 py-1 text-xs rounded-md ${ordinamento === "tempo" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                  ⏱️ Velocità
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {serviziOrdinati.map((s) => (
                <div key={s.id} onClick={() => setSelezionato(s)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                    selezionato?.id === s.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-transparent bg-gray-50 dark:bg-gray-750 hover:border-gray-200 dark:hover:border-gray-600"
                  }`}>
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.nome_corriere} className="w-10 h-10 object-contain rounded"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-200 dark:bg-gray-700 rounded">🚚</div>
                    )}
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{s.nome_corriere}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{s.nome_servizio}</div>
                      <div className="flex gap-1.5 mt-1">
                        {s.drop_off && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">📍 Drop-off</span>}
                        {s.consegna_punto_ritiro && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">🏪 Punto ritiro</span>}
                        {s.categoria && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">{s.categoria}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">€{s.prezzo_totale.toFixed(2)}</div>
                    {s.tempo_transito && (
                      <div className="text-xs text-gray-500">{s.tempo_transito}</div>
                    )}
                    {s.data_consegna_stimata && (
                      <div className="text-[10px] text-gray-400">arrivo: {s.data_consegna_stimata}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {servizi.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 truncate flex-1 mr-3">
              {selezionato
                ? <span className="text-gray-900 dark:text-white font-medium">✅ {selezionato.nome_corriere} — {selezionato.nome_servizio} — €{selezionato.prezzo_totale.toFixed(2)}</span>
                : "👆 Seleziona un corriere dalla lista"}
            </div>
            <button onClick={conferma} disabled={!selezionato}
              className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              Usa questo corriere
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
