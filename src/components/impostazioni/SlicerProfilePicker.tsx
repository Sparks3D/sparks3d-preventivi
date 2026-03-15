import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SlicerProfile {
  nome: string;
  path: string;
  tipo: string;
  origin: string;
  is_user: boolean;
  params: Record<string, any>;
}

interface Props {
  tipo: "filament" | "machine" | "process";
  onSelect: (profile: SlicerProfile) => void;
  onClose: () => void;
}

export function SlicerProfilePicker({ tipo, onSelect, onClose }: Props) {
  const [profiles, setProfiles] = useState<SlicerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [soloUtente, setSoloUtente] = useState(false);
  const [isBeta, setIsBeta] = useState(false);

  const tipoLabel = tipo === "filament" ? "Profili filamento" : tipo === "machine" ? "Profili stampante" : "Profili di stampa";

  useEffect(() => {
    loadProfiles();
  }, [soloUtente, isBeta]);

  const loadProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<SlicerProfile[]>("scan_slicer_profiles", {
        tipo, isBeta, soloUtente,
      });
      setProfiles(data);
      if (data.length === 0) {
        setError("Nessun profilo trovato. Verifica che Bambu Studio sia installato e abbia profili salvati.");
      }
    } catch (e: any) {
      setError(String(e));
    }
    setLoading(false);
  };

  const filtered = profiles.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Importa da Bambu Studio
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{tipoLabel}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">x</button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca profilo per nome..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={soloUtente} onChange={(e) => setSoloUtente(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Solo profili utente (no integrati BBL)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBeta} onChange={(e) => setIsBeta(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Bambu Studio Beta</span>
            </label>
            <button onClick={loadProfiles} className="text-xs text-blue-600 hover:text-blue-800 ml-auto">
              Ricarica
            </button>
          </div>
        </div>

        {/* Lista profili */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Scansione profili in corso...</div>
          ) : error && filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-amber-600 dark:text-amber-400 text-sm">{error}</p>
              <p className="text-xs text-gray-400 mt-2">
                Percorsi cercati: %APPDATA%/BambuStudio/ e %ProgramFiles%/Bambu Studio/
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((profile, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelect(profile)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        profile.is_user
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      }`}>
                        {profile.is_user ? "Utente" : "BBL"}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {profile.nome}
                      </span>
                    </div>
                    <span className="text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Importa
                    </span>
                  </div>
                  {/* Extra info based on type */}
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    {tipo === "filament" && (
                      <>
                        {profile.params.filament_type && <span>Tipo: {String(profile.params.filament_type)}</span>}
                        {profile.params.filament_density && <span>Densita: {String(profile.params.filament_density)} g/cm3</span>}
                        {profile.params.filament_cost && Number(profile.params.filament_cost) > 0 && (
                          <span>Costo: {String(profile.params.filament_cost)} EUR/kg</span>
                        )}
                      </>
                    )}
                    {tipo === "process" && (
                      <>
                        {profile.params.layer_height && <span>Layer: {String(profile.params.layer_height)}mm</span>}
                        {profile.params.wall_loops && <span>Pareti: {String(profile.params.wall_loops)}</span>}
                        {profile.params.sparse_infill_density && <span>Infill: {String(profile.params.sparse_infill_density)}</span>}
                      </>
                    )}
                    {tipo === "machine" && (
                      <>
                        {profile.params.printer_model && <span>Modello: {String(profile.params.printer_model)}</span>}
                        {profile.params.nozzle_diameter && <span>Nozzle: {String(profile.params.nozzle_diameter)}mm</span>}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {filtered.length} profili trovati
          </span>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
