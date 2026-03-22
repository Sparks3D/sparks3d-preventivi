// src/App.tsx
// Sparks3D Preventivi - Main Application
// ========================================

import { useState, useEffect, useCallback } from "react";
import "./styles/theme.css";
import { SettingsProvider } from "./context/SettingsContext";
import { ToastProvider } from "./components/layout/ToastProvider";
import { Sidebar } from "./components/layout/Sidebar";
import { GlobalSearch } from "./components/layout/GlobalSearch";
import { UpdateBanner } from "./components/layout/UpdateBanner";
import { Dashboard } from "./components/dashboard/Dashboard";
import { PreventiviArchivio } from "./components/preventivi/PreventiviArchivio";
import { NuovoPreventivo } from "./components/preventivi/NuovoPreventivo";
import { ClientiPage } from "./components/clienti/ClientiPage";
import { ClienteForm } from "./components/clienti/ClienteForm";
import { ImpostazioniPage } from "./components/impostazioni/ImpostazioniPage";
import { SlicerImportPage } from "./components/impostazioni/SlicerImportPage";
import { MaterialeForm } from "./components/impostazioni/MaterialeForm";
import { StampanteForm } from "./components/impostazioni/StampanteForm";
import { ProfiloStampaForm } from "./components/impostazioni/ProfiloStampaForm";
import { ServizioExtraForm } from "./components/impostazioni/ServizioExtraForm";
import { CorriereForm } from "./components/impostazioni/CorriereForm";
import { MetodoPagamentoForm } from "./components/impostazioni/MetodoPagamentoForm";
import { RitenutaAccontoPage } from "./components/ritenuta/RitenutaAccontoPage";
import { RitenuteArchivio } from "./components/ritenuta/RitenuteArchivio";
import { BackupRestore } from "./components/impostazioni/BackupRestore";
import { LicenzaPage } from "./components/info/LicenzaPage";
import { GuidaPage } from "./components/info/GuidaPage";
import type { PageId } from "./types";

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [preventivoAttivoId, setPreventivoAttivoId] = useState<number | null>(null);
  const [clienteAttivoId, setClienteAttivoId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtroStatoPreventivi, setFiltroStatoPreventivi] = useState<string | undefined>(undefined);

  // Form state generico per tutte le pagine form
  const [formConfig, setFormConfig] = useState<{
    type: string;
    editId?: number;
    prefill?: any;
    returnPage: PageId;
  } | null>(null);

  // Slicer import
  const [slicerImportConfig, setSlicerImportConfig] = useState<{
    tipo: "filament" | "machine" | "process";
    defaultSlicer: "bambu" | "orca" | "anycubic";
    returnTab: PageId;
  } | null>(null);

  const navigateTo = useCallback((page: PageId, preventivoId?: number) => {
    setCurrentPage(page);
    if (preventivoId !== undefined) {
      setPreventivoAttivoId(preventivoId);
    }
    if (page !== "preventivi") {
      setFiltroStatoPreventivi(undefined);
    }
  }, []);

  const navigateToPreventivi = useCallback((filtroStato?: string) => {
    setFiltroStatoPreventivi(filtroStato);
    setCurrentPage("preventivi");
  }, []);

  // ── Ctrl+K shortcut ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handler per aprire form da ImpostazioniPage
  const handleOpenForm = (formType: string, editId?: number, prefill?: any) => {
    // Determina la pagina di ritorno in base al tipo
    const returnPages: Record<string, PageId> = {
      materiale: "materiali" as PageId,
      stampante: "stampanti" as PageId,
      profilo: "profili" as PageId,
      servizio: "servizi" as PageId,
      corriere: "corrieri" as PageId,
      pagamento: "pagamenti" as PageId,
    };
    setFormConfig({ type: formType, editId, prefill, returnPage: returnPages[formType] || "impostazioni" });
    setCurrentPage("settings-form" as PageId);
  };

  // Handler slicer import con callback che apre il form
  const handleSlicerSelect = (profile: any) => {
    if (!slicerImportConfig) return;
    const typeMap: Record<string, string> = { filament: "materiale", machine: "stampante", process: "profilo" };
    const formType = typeMap[slicerImportConfig.tipo] || "materiale";
    setFormConfig({ type: formType, prefill: profile, returnPage: slicerImportConfig.returnTab });
    setCurrentPage("settings-form" as PageId);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard
          onOpenPreventivo={(id) => navigateTo("nuovo-preventivo", id)}
          onNavigateToPreventivi={navigateToPreventivi}
        />;
      case "preventivi":
        return (
          <PreventiviArchivio
            onOpenPreventivo={(id) => navigateTo("nuovo-preventivo", id)}
            onNuovoPreventivo={() => navigateTo("nuovo-preventivo")}
            initialFiltroStato={filtroStatoPreventivi}
          />
        );
      case "nuovo-preventivo":
        return (
          <NuovoPreventivo
            preventivoId={preventivoAttivoId}
            onBack={() => navigateTo("preventivi")}
          />
        );
      case "clienti":
        return <ClientiPage
          onOpenCliente={(id) => { setClienteAttivoId(id); setCurrentPage("cliente-form" as PageId); }}
          onNuovoCliente={() => { setClienteAttivoId(null); setCurrentPage("cliente-form" as PageId); }}
        />;
      case "cliente-form":
        return <ClienteForm clienteId={clienteAttivoId} onBack={() => navigateTo("clienti")} />;

      // ── Slicer Import Page ──
      case "slicer-import":
        return slicerImportConfig ? (
          <SlicerImportPage
            tipo={slicerImportConfig.tipo}
            defaultSlicer={slicerImportConfig.defaultSlicer}
            onSelect={handleSlicerSelect}
            onBack={() => setCurrentPage(slicerImportConfig.returnTab)}
          />
        ) : null;

      // ── Form pages per impostazioni ──
      case "settings-form":
        if (!formConfig) return null;
        switch (formConfig.type) {
          case "materiale":
            return <MaterialeForm editId={formConfig.editId} prefill={formConfig.prefill} onBack={() => setCurrentPage(formConfig.returnPage)} />;
          case "stampante":
            return <StampanteForm editId={formConfig.editId} prefill={formConfig.prefill} onBack={() => setCurrentPage(formConfig.returnPage)} />;
          case "profilo":
            return <ProfiloStampaForm editId={formConfig.editId} prefill={formConfig.prefill} onBack={() => setCurrentPage(formConfig.returnPage)} />;
          case "servizio":
            return <ServizioExtraForm editId={formConfig.editId} prefill={formConfig.prefill} onBack={() => setCurrentPage(formConfig.returnPage)} />;
          case "corriere":
            return <CorriereForm editId={formConfig.editId} prefill={formConfig.prefill} onBack={() => setCurrentPage(formConfig.returnPage)} />;
          case "pagamento":
            return <MetodoPagamentoForm editId={formConfig.editId} prefill={formConfig.prefill} onBack={() => setCurrentPage(formConfig.returnPage)} />;
          default: return null;
        }

      // ── Ritenute (merge archivio + nuova) ──
      case "ritenuta":
        return <RitenuteArchivio onNuovaRitenuta={() => setCurrentPage("nuova-ritenuta" as PageId)} />;
      case "nuova-ritenuta":
        return <RitenutaAccontoPage onBack={() => setCurrentPage("ritenuta")} />;

      case "backup":
        return <BackupRestore />;
      case "licenza":
        return <LicenzaPage />;
      case "guida":
        return <GuidaPage />;
      case "impostazioni":
      case "materiali":
      case "stampanti":
      case "profili":
      case "servizi":
      case "corrieri":
      case "pagamenti":
      case "interfaccia":
        return <ImpostazioniPage
          activeTab={currentPage}
          onChangeTab={setCurrentPage}
          onOpenForm={handleOpenForm}
          onImportSlicer={(tipo, defaultSlicer, returnTab) => {
            setSlicerImportConfig({ tipo, defaultSlicer, returnTab });
            setCurrentPage("slicer-import" as PageId);
          }}
        />;
      default:
        return <Dashboard
          onOpenPreventivo={(id) => navigateTo("nuovo-preventivo", id)}
          onNavigateToPreventivi={navigateToPreventivi}
        />;
    }
  };

  return (
    <SettingsProvider>
    <ToastProvider>
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#080b16",
      color: "#ffffff",
      overflow: "hidden",
    }}>
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigateTo}
        preventivoAttivo={preventivoAttivoId}
      />
      <main style={{
        flex: 1,
        overflow: "auto",
        background: "linear-gradient(160deg, #0d1224 0%, #0a0f1e 100%)",
        position: "relative",
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          padding: "12px 28px",
          display: "flex", justifyContent: "flex-end",
          background: "linear-gradient(180deg, rgba(13,18,36,0.95) 0%, rgba(13,18,36,0) 100%)",
          pointerEvents: "none",
        }}>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#556a89",
              fontSize: 13, fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)";
              e.currentTarget.style.background = "rgba(59,130,246,0.06)";
              e.currentTarget.style.color = "#8899b4";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = "#556a89";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Cerca...
            <span style={{
              padding: "1px 6px", borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 10, fontWeight: 600, color: "#475569",
              marginLeft: 8,
            }}>
              Ctrl+K
            </span>
          </button>
        </div>

        <div style={{ padding: "0 28px 28px" }}>
          <UpdateBanner />
          {renderPage()}
        </div>
      </main>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={navigateTo}
      />
    </div>
    </ToastProvider>
    </SettingsProvider>
  );
}
