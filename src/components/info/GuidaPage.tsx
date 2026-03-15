// src/components/info/GuidaPage.tsx
// Sparks3D Preventivi – Guida utente completa
// ==============================================

import { useState } from "react";

interface Section {
  id: string;
  title: string;
  icon: string;
  content: JSX.Element;
}

export function GuidaPage() {
  const [activeSection, setActiveSection] = useState("panoramica");

  const sections: Section[] = [
    {
      id: "panoramica", title: "Panoramica", icon: "📋",
      content: (
        <div style={proseStyle}>
          <p>Sparks3D Preventivi è un software desktop per la creazione e gestione di preventivi per servizi di stampa 3D FDM. Permette di calcolare automaticamente i costi di stampa basandosi su materiali, tempo macchina, energia e margini personalizzabili.</p>
          <h4 style={h4Style}>Funzionalità principali</h4>
          <ul style={ulStyle}>
            <li>Gestione completa preventivi con calcolo costi automatico</li>
            <li>Supporto multi-materiale AMS (Automatic Material System)</li>
            <li>Import automatico di file GCode e 3MF per tempi e pesi</li>
            <li>Import profili stampa da Bambu Studio</li>
            <li>Tariffe corrieri live tramite PackLink Pro</li>
            <li>Export PDF professionale con logo e dati azienda</li>
            <li>Dashboard statistiche con KPI e grafici</li>
            <li>Gestione ritenuta d'acconto e ricevute</li>
            <li>Backup completo e ripristino dati</li>
            <li>Esportazione dati in CSV e Excel</li>
            <li>Ricerca globale rapida (Ctrl+K)</li>
          </ul>
        </div>
      ),
    },
    {
      id: "dashboard", title: "Dashboard", icon: "📊",
      content: (
        <div style={proseStyle}>
          <p>La Dashboard è la pagina principale dell'applicazione. Mostra una panoramica completa dell'attività con indicatori chiave di performance (KPI).</p>
          <h4 style={h4Style}>KPI visualizzati</h4>
          <ul style={ulStyle}>
            <li><strong>Totale preventivi</strong> — numero totale di preventivi creati</li>
            <li><strong>Fatturato totale</strong> — somma dei totali di tutti i preventivi</li>
            <li><strong>Profitto totale</strong> — guadagno netto dopo i costi</li>
            <li><strong>Materiale utilizzato</strong> — peso totale in kg di filamento consumato</li>
            <li><strong>Tempo stampa totale</strong> — ore complessive di stampa</li>
            <li><strong>Tasso di conversione</strong> — percentuale di preventivi confermati</li>
          </ul>
          <h4 style={h4Style}>Sezioni</h4>
          <ul style={ulStyle}>
            <li><strong>Trend mensile</strong> — grafico fatturato e profitto degli ultimi 6 mesi</li>
            <li><strong>Top clienti</strong> — i 5 clienti con più fatturato</li>
            <li><strong>Ultimi preventivi</strong> — gli ultimi 10 preventivi creati</li>
            <li><strong>Materiali più usati</strong> — classifica materiali per peso utilizzato</li>
          </ul>
        </div>
      ),
    },
    {
      id: "preventivi", title: "Preventivi", icon: "📄",
      content: (
        <div style={proseStyle}>
          <p>Il modulo preventivi è il cuore del software. Permette di creare, modificare ed esportare preventivi professionali per servizi di stampa 3D.</p>
          <h4 style={h4Style}>Creare un preventivo</h4>
          <ol style={olStyle}>
            <li>Dalla pagina <strong>Preventivi</strong>, clicca <strong>"Nuovo preventivo"</strong></li>
            <li>Seleziona il cliente dal menu a tendina (opzionale)</li>
            <li>Aggiungi le righe di stampa cliccando <strong>"Aggiungi riga"</strong></li>
            <li>Per ogni riga, specifica materiale, stampante, profilo, tempo e peso</li>
            <li>Il sistema calcola automaticamente costi, prezzo e margine</li>
            <li>Clicca <strong>"Salva"</strong> per salvare il preventivo</li>
          </ol>
          <h4 style={h4Style}>Import da GCode / 3MF</h4>
          <p>Nella modale di aggiunta riga, puoi importare direttamente un file GCode o 3MF. Il parser estrae automaticamente tempo di stampa, peso del filamento, e tipo di materiale. Per file 3MF multi-colore, vengono importati automaticamente tutti gli slot AMS.</p>
          <h4 style={h4Style}>Multi-materiale AMS</h4>
          <p>Ogni riga del preventivo supporta più materiali tramite gli slot AMS. Puoi aggiungere slot con il pulsante <strong>"+ Slot AMS"</strong> nella modale riga, assegnando materiale, peso e colore a ciascuno.</p>
          <h4 style={h4Style}>Workflow stati</h4>
          <ul style={ulStyle}>
            <li><strong>Bozza</strong> → <strong>Inviato</strong> (genera PDF e salva in Documenti)</li>
            <li><strong>Inviato</strong> → <strong>Accettato</strong> o <strong>Rifiutato</strong></li>
            <li><strong>Accettato</strong> → <strong>In produzione</strong></li>
            <li><strong>In produzione</strong> → <strong>Completato</strong></li>
          </ul>
          <h4 style={h4Style}>Export PDF</h4>
          <p>Clicca <strong>"Esporta PDF"</strong> per generare un documento professionale con logo azienda, dati cliente, tabella righe con breakdown costi, totali, IVA, acconto e condizioni.</p>
        </div>
      ),
    },
    {
      id: "clienti", title: "Clienti", icon: "👥",
      content: (
        <div style={proseStyle}>
          <p>La sezione Clienti gestisce l'anagrafica completa dei tuoi clienti.</p>
          <h4 style={h4Style}>Campi disponibili</h4>
          <ul style={ulStyle}>
            <li>Nome, Cognome, Denominazione azienda</li>
            <li>Email, Telefono</li>
            <li>Indirizzo completo (via, CAP, città, provincia)</li>
            <li>Partita IVA, Codice Fiscale</li>
            <li>Note libere</li>
          </ul>
          <p>I clienti possono essere associati ai preventivi tramite il menu a tendina nel form preventivo. Il CAP del cliente viene usato automaticamente per il calcolo delle tariffe di spedizione PackLink.</p>
        </div>
      ),
    },
    {
      id: "impostazioni", title: "Impostazioni", icon: "⚙️",
      content: (
        <div style={proseStyle}>
          <p>Le impostazioni sono organizzate in tab:</p>
          <h4 style={h4Style}>Intestazione (Dati Azienda)</h4>
          <p>Configura ragione sociale, indirizzo, P.IVA, CF, email, telefono, logo e regime fiscale. Questi dati appaiono nell'intestazione dei PDF esportati.</p>
          <h4 style={h4Style}>Materiali</h4>
          <p>Gestisci il catalogo materiali con nome, peso specifico, prezzo al kg, percentuale di markup, percentuale di fallimento stimata e giacenza in magazzino. Puoi importare i profili direttamente da Bambu Studio.</p>
          <h4 style={h4Style}>Stampanti</h4>
          <p>Configura le stampanti con nome, consumo energetico (kWh) e costo ammortamento orario. Questi valori vengono usati per calcolare il costo energia e ammortamento di ogni riga preventivo.</p>
          <h4 style={h4Style}>Profili stampa</h4>
          <p>Gestisci i profili con layer height, numero pareti, infill, top/bottom layers e tipo di supporti. Importabili da Bambu Studio.</p>
          <h4 style={h4Style}>Servizi extra</h4>
          <p>Definisci servizi aggiuntivi (post-processing, verniciatura, assemblaggio, ecc.) con importo predefinito e markup.</p>
          <h4 style={h4Style}>Corrieri / PackLink Pro</h4>
          <p>Configura la tua API key PackLink Pro per ottenere tariffe di spedizione live. Inserisci le dimensioni del pacco e il CAP di destinazione per confrontare i prezzi dei corrieri disponibili.</p>
          <h4 style={h4Style}>Metodi di pagamento</h4>
          <p>Configura i metodi accettati (bonifico, PayPal, contanti, ecc.) con commissioni e testo da mostrare nel PDF.</p>
          <h4 style={h4Style}>Interfaccia</h4>
          <p>Personalizza la dimensione del font (piccolo, medio, grande) e il colore accent dell'interfaccia scegliendo tra 10 temi cromatici.</p>
        </div>
      ),
    },
    {
      id: "ritenute", title: "Ritenute e Ricevute", icon: "📝",
      content: (
        <div style={proseStyle}>
          <p>Il modulo Ritenuta d'acconto permette di generare ricevute per prestazioni occasionali con calcolo automatico della ritenuta.</p>
          <h4 style={h4Style}>Come funziona</h4>
          <ol style={olStyle}>
            <li>Vai alla sezione <strong>Ritenuta / Ricevute</strong></li>
            <li>Inserisci l'importo lordo della prestazione</li>
            <li>Il sistema calcola automaticamente la ritenuta d'acconto (20%)</li>
            <li>Genera il PDF della ricevuta con tutti i dati fiscali</li>
          </ol>
          <p>L'archivio ritenute conserva tutte le ricevute generate con data, numero, importo e stato.</p>
        </div>
      ),
    },
    {
      id: "backup", title: "Backup e Dati", icon: "💾",
      content: (
        <div style={proseStyle}>
          <h4 style={h4Style}>Backup</h4>
          <p>Crea un backup completo in formato .zip che include database, loghi e documenti PDF. Puoi scegliere quali elementi includere. Si consiglia di fare un backup regolarmente.</p>
          <h4 style={h4Style}>Ripristino</h4>
          <p>Seleziona un file .zip di backup per ripristinare i dati. Puoi scegliere se ripristinare database, loghi e/o documenti PDF separatamente. Il ripristino del database richiede il riavvio dell'applicazione.</p>
          <h4 style={h4Style}>Esportazione dati</h4>
          <p>Esporta i dati in formato CSV o Excel (.xlsx). Puoi esportare preventivi, clienti, materiali, stampanti, profili e statistiche singolarmente o tutti insieme. Il file Excel include fogli multipli con formattazione.</p>
          <h4 style={h4Style}>Reset dati</h4>
          <p>Cancella selettivamente i dati dal database. Utile per ripulire i dati di test. Richiede doppia conferma per prevenire cancellazioni accidentali. Si consiglia di creare un backup prima di procedere.</p>
        </div>
      ),
    },
    {
      id: "scorciatoie", title: "Scorciatoie tastiera", icon: "⌨️",
      content: (
        <div style={proseStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { keys: "Ctrl + K", desc: "Apri la ricerca globale" },
              { keys: "Esc", desc: "Chiudi modale / ricerca" },
              { keys: "↑ ↓", desc: "Naviga tra i risultati di ricerca" },
              { keys: "Enter", desc: "Apri il risultato selezionato" },
              { keys: "F11", desc: "Schermo intero" },
              { keys: "F12", desc: "Apri strumenti sviluppatore" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0" }}>
                <kbd style={kbdStyle}>{s.keys}</kbd>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>{s.desc}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "bambu", title: "Bambu Studio", icon: "🖨️",
      content: (
        <div style={proseStyle}>
          <p>Sparks3D Preventivi si integra con Bambu Studio per importare automaticamente profili di stampa e materiali.</p>
          <h4 style={h4Style}>Rilevamento automatico</h4>
          <p>All'avvio, l'applicazione verifica se Bambu Studio è installato controllando la cartella <code style={codeStyle}>%APPDATA%\BambuStudio</code>. L'indicatore nella sidebar mostra lo stato con un punto verde (rilevato) o rosso (non trovato).</p>
          <h4 style={h4Style}>Apertura rapida</h4>
          <p>Cliccando sull'indicatore Bambu Studio nella sidebar, lo slicer si apre direttamente.</p>
          <h4 style={h4Style}>Import profili</h4>
          <p>Nella sezione Impostazioni → Materiali / Stampanti / Profili stampa, puoi importare i profili configurati in Bambu Studio. Il software legge i file di configurazione dalla cartella AppData di Bambu Studio.</p>
          <h4 style={h4Style}>Parser GCode / 3MF</h4>
          <p>Quando aggiungi una riga al preventivo, puoi importare un file .gcode o .3mf. Il parser estrae automaticamente:</p>
          <ul style={ulStyle}>
            <li>Tempo di stampa stimato</li>
            <li>Peso del filamento per ogni materiale/colore</li>
            <li>Tipo di filamento utilizzato</li>
            <li>Configurazione multi-materiale AMS (da file 3MF)</li>
          </ul>
        </div>
      ),
    },
  ];

  const activeContent = sections.find(s => s.id === activeSection);

  return (
    <div style={{ display: "flex", gap: 24, maxWidth: 900 }}>
      {/* Indice laterale */}
      <div style={{
        width: 200, flexShrink: 0,
        position: "sticky", top: 0, alignSelf: "flex-start",
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#3d5170", marginBottom: 12 }}>
          Sommario
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", borderRadius: 8,
                border: "none", cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
                background: activeSection === s.id ? "rgba(59,130,246,0.1)" : "transparent",
                color: activeSection === s.id ? "#60a5fa" : "#6b7fa0",
                fontSize: 13, fontWeight: activeSection === s.id ? 600 : 500,
              }}
            >
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto */}
      <div style={{
        flex: 1,
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16, padding: 28,
      }}>
        {activeContent && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 24 }}>{activeContent.icon}</span>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#e8edf5", margin: 0 }}>
                {activeContent.title}
              </h2>
            </div>
            {activeContent.content}
          </>
        )}
      </div>
    </div>
  );
}

const proseStyle: React.CSSProperties = {
  fontSize: 14, color: "#b8c5db", lineHeight: 1.7,
};

const h4Style: React.CSSProperties = {
  fontSize: 15, fontWeight: 700, color: "#e2e8f0", marginTop: 20, marginBottom: 8,
};

const ulStyle: React.CSSProperties = {
  paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4,
};

const olStyle: React.CSSProperties = {
  paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6,
};

const codeStyle: React.CSSProperties = {
  background: "rgba(59,130,246,0.1)", padding: "2px 6px", borderRadius: 4,
  fontFamily: "monospace", fontSize: 12, color: "#60a5fa",
};

const kbdStyle: React.CSSProperties = {
  display: "inline-block", padding: "4px 10px", borderRadius: 6, minWidth: 80, textAlign: "center",
  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
  fontSize: 12, fontWeight: 600, color: "#8899b4", fontFamily: "monospace",
};
