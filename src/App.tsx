// src/App.tsx
// Sparks3D Preventivi - Main Application
// ========================================

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";
import "./styles/theme.css";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./components/layout/ToastProvider";
import { Sidebar } from "./components/layout/Sidebar";
import { GlobalSearch } from "./components/layout/GlobalSearch";
import { UpdateBanner } from "./components/layout/UpdateBanner";
import { PinLockScreen } from "./components/layout/PinLockScreen";
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
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<PageId>("dashboard");
  const [preventivoAttivoId, setPreventivoAttivoId] = useState<number | null>(null);
  const [clienteAttivoId, setClienteAttivoId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtroStatoPreventivi, setFiltroStatoPreventivi] = useState<string | undefined>(undefined);
  const [pinLocked, setPinLocked] = useState<boolean | null>(null); // null = checking, true = locked, false = unlocked

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
    defaultSlicer: "bambu" | "orca" | "anycubic" | "prusa";
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

  // ── PIN check all'avvio ──
  useEffect(() => {
    const checkPin = async () => {
      try {
        const hasPin = await invoke<boolean>("has_pin");
        setPinLocked(hasPin);
      } catch {
        setPinLocked(false);
      }
    };
    checkPin();
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
      case "sicurezza":
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
    <ThemeProvider>
    <SettingsProvider>
    <ToastProvider>
    {/* PIN Lock Screen */}
    {pinLocked === true && (
      <PinLockScreen onUnlock={() => setPinLocked(false)} />
    )}
    {/* Loading while checking PIN */}
    {pinLocked === null && (
      <div style={{ width: "100vw", height: "100vh", background: "var(--bg-deep)" }} />
    )}
    {/* Main App (visible only when unlocked) */}
    {pinLocked === false && (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "var(--bg-deep)",
      color: "var(--text-primary)",
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
        background: "var(--bg-base)",
        position: "relative",
      }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 100,
          padding: "12px 28px",
          display: "flex", justifyContent: "flex-end",
          background: "linear-gradient(180deg, var(--bg-base) 0%, transparent 100%)",
          pointerEvents: "none",
        }}>
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 14px",
              borderRadius: 10,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-muted)",
              fontSize: 13, fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-active)";
              e.currentTarget.style.background = "var(--accent-soft)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {t("common.search")}
            <span style={{
              padding: "1px 6px", borderRadius: 4,
              background: "var(--accent-soft)",
              border: "1px solid var(--border-subtle)",
              fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
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
    )}
    </ToastProvider>
    </SettingsProvider>
    </ThemeProvider>
  );
}
