import type { PageId } from "../../types";
import { AziendaPage } from "./AziendaPage";
import { MaterialiPage } from "./MaterialiPage";
import { StampantiPage } from "./StampantiPage";
import { ProfiliStampaPage } from "./ProfiliStampaPage";
import { ServiziExtraPage } from "./ServiziExtraPage";
import { CorrieriPage } from "./CorrieriPage";
import { PagamentiPage } from "./PagamentiPage";
import { InterfacciaPage } from "./InterfacciaPage";

interface Props {
  activeTab: PageId;
  onChangeTab: (tab: PageId) => void;
}

const tabs: { id: PageId; label: string }[] = [
  { id: "impostazioni", label: "Intestazione" },
  { id: "materiali", label: "Materiali" },
  { id: "stampanti", label: "Stampanti" },
  { id: "profili", label: "Profili stampa" },
  { id: "servizi", label: "Servizi extra" },
  { id: "corrieri", label: "Corrieri" },
  { id: "pagamenti", label: "Pagamenti" },
  { id: "interfaccia" as PageId, label: "Interfaccia" },
];

export function ImpostazioniPage({ activeTab, onChangeTab }: Props) {
  const renderContent = () => {
    switch (activeTab) {
      case "impostazioni": return <AziendaPage />;
      case "materiali": return <MaterialiPage />;
      case "stampanti": return <StampantiPage />;
      case "profili": return <ProfiliStampaPage />;
      case "servizi": return <ServiziExtraPage />;
      case "corrieri": return <CorrieriPage />;
      case "pagamenti": return <PagamentiPage />;
      case "interfaccia": return <InterfacciaPage />;
      default: return null;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Impostazioni</h2>
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChangeTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? "border-blue-600 text-blue-700 dark:text-blue-300"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}
