import { useTranslation } from "react-i18next";
import type { PageId } from "../../types";
import { AziendaPage } from "./AziendaPage";
import { MaterialiPage } from "./MaterialiPage";
import { StampantiPage } from "./StampantiPage";
import { ProfiliStampaPage } from "./ProfiliStampaPage";
import { ServiziExtraPage } from "./ServiziExtraPage";
import { CorrieriPage } from "./CorrieriPage";
import { PagamentiPage } from "./PagamentiPage";
import { InterfacciaPage } from "./InterfacciaPage";
import { SicurezzaPage } from "./SicurezzaPage";

interface Props {
  activeTab: PageId;
  onChangeTab: (tab: PageId) => void;
  onOpenForm: (formType: string, editId?: number, prefill?: any) => void;
  onImportSlicer?: (tipo: "filament" | "machine" | "process", defaultSlicer: "bambu" | "orca" | "anycubic" | "prusa", returnTab: PageId) => void;
}

export function ImpostazioniPage({ activeTab, onChangeTab, onOpenForm, onImportSlicer }: Props) {
  const { t } = useTranslation();

  const tabs: { id: PageId; label: string }[] = [
    { id: "impostazioni", label: t("impostazioni.tabIntestazione") },
    { id: "materiali", label: t("impostazioni.tabMateriali") },
    { id: "stampanti", label: t("impostazioni.tabStampanti") },
    { id: "profili", label: t("impostazioni.tabProfili") },
    { id: "servizi", label: t("impostazioni.tabServizi") },
    { id: "corrieri", label: t("impostazioni.tabCorrieri") },
    { id: "pagamenti", label: t("impostazioni.tabPagamenti") },
    { id: "interfaccia" as PageId, label: t("impostazioni.tabInterfaccia") },
    { id: "sicurezza" as PageId, label: t("impostazioni.tabSicurezza") },
  ];
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
      case "sicurezza": return <SicurezzaPage />;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24 }}>{t("impostazioni.title")}</h2>
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border-subtle)", marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => onChangeTab(tab.id)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              color: activeTab === tab.id ? "var(--accent)" : "var(--text-muted)",
              transition: "all 0.2s",
            }}>
            {tab.label}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}
