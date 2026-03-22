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
  onOpenForm: (formType: string, editId?: number, prefill?: any) => void;
  onImportSlicer?: (tipo: "filament" | "machine" | "process", defaultSlicer: "bambu" | "orca" | "anycubic", returnTab: PageId) => void;
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

export function ImpostazioniPage({ activeTab, onChangeTab, onOpenForm, onImportSlicer }: Props) {
  const renderContent = () => {
    switch (activeTab) {
      case "impostazioni": return <AziendaPage />;
      case "materiali": return <MaterialiPage
        onOpenForm={(id, prefill) => onOpenForm("materiale", id, prefill)}
        onImportSlicer={(slicer) => onImportSlicer?.("filament", slicer, "materiali" as PageId)}
      />;
      case "stampanti": return <StampantiPage
        onOpenForm={(id, prefill) => onOpenForm("stampante", id, prefill)}
        onImportSlicer={(slicer) => onImportSlicer?.("machine", slicer, "stampanti" as PageId)}
      />;
      case "profili": return <ProfiliStampaPage
        onOpenForm={(id, prefill) => onOpenForm("profilo", id, prefill)}
        onImportSlicer={(slicer) => onImportSlicer?.("process", slicer, "profili" as PageId)}
      />;
      case "servizi": return <ServiziExtraPage
        onOpenForm={(id, prefill) => onOpenForm("servizio", id, prefill)}
      />;
      case "corrieri": return <CorrieriPage
        onOpenForm={(id, prefill) => onOpenForm("corriere", id, prefill)}
      />;
      case "pagamenti": return <PagamentiPage
        onOpenForm={(id, prefill) => onOpenForm("pagamento", id, prefill)}
      />;
      case "interfaccia": return <InterfacciaPage />;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24 }}>Impostazioni</h2>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", marginBottom: 24 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => onChangeTab(t.id)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none",
              borderBottom: activeTab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === t.id ? "var(--accent)" : "var(--text-muted)",
              transition: "all 0.2s",
            }}>
            {t.label}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}
