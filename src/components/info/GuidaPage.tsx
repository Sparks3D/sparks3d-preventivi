// src/components/info/GuidaPage.tsx
// Sparks3D Preventivi – Guida utente completa (v1.0.3)
// =====================================================

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
            <li>Import profili stampa da <strong>Bambu Studio</strong> e <strong>Orca Slicer</strong></li>
            <li>Rilevamento automatico slicer installati nella sidebar</li>
            <li>Tariffe corrieri live tramite PackLink Pro</li>
            <li>Export PDF professionale con logo e dati azienda</li>
            <li>Dashboard statistiche con KPI, grafici e navigazione interattiva</li>
            <li>Gestione ritenute d'acconto e ricevute con archivio integrato</li>
            <li>Backup completo e ripristino dati con riavvio guidato</li>
            <li>Esportazione dati in CSV e Excel</li>
            <li>Ricerca globale rapida (Ctrl+K)</li>
            <li>Tema personalizzabile: dimensione font e colore accent</li>
            <li>Tutte le operazioni di creazione e modifica su pagine dedicate a schermo intero</li>
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
            <li><strong>Fatturato totale</strong> — somma dei totali dei preventivi <strong>completati</strong></li>
            <li><strong>Profitto totale</strong> — guadagno netto dei preventivi <strong>completati</strong></li>
            <li><strong>Materiale utilizzato</strong> — peso totale in kg di filamento consumato</li>
            <li><strong>Tempo stampa totale</strong> — ore complessive di stampa</li>
            <li><strong>Confermati</strong> — preventivi accettati, in produzione o completati</li>
            <li><strong>Tasso di conversione</strong> — percentuale di preventivi confermati sul totale</li>
          </ul>
          <h4 style={h4Style}>Sezioni interattive</h4>
          <ul style={ulStyle}>
            <li><strong>Trend mensile</strong> — grafico fatturato e profitto degli ultimi 6 mesi</li>
            <li><strong>Stato preventivi</strong> — breakdown per stato con barra progresso. Cliccando su uno stato si naviga alla lista preventivi filtrata</li>
            <li><strong>Ultimi preventivi</strong> — gli ultimi 10 preventivi creati. Il numero preventivo è cliccabile per aprirlo direttamente, il badge stato è cliccabile per filtrare</li>
            <li><strong>Top clienti</strong> — i 5 clienti con più fatturato, con nome e totale</li>
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
            <li>Si apre una pagina dedicata con tutti i campi del preventivo</li>
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
          <h4 style={h4Style}>Eliminazione con conferma</h4>
          <p>L'eliminazione di un preventivo o di una riga di stampa richiede sempre una conferma esplicita tramite un dialogo modale. Premendo "Annulla" il dato viene preservato.</p>
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
          <h4 style={h4Style}>Creare un cliente</h4>
          <ol style={olStyle}>
            <li>Dalla pagina <strong>Clienti</strong>, clicca <strong>"Nuovo cliente"</strong></li>
            <li>Si apre una pagina dedicata con sezioni organizzate</li>
            <li>Compila i dati anagrafici, contatti, indirizzo e dati fiscali</li>
            <li>Clicca <strong>"Crea cliente"</strong> per salvare</li>
          </ol>
          <h4 style={h4Style}>Modificare un cliente</h4>
          <p>Clicca su una riga della tabella clienti oppure sul pulsante "Modifica" per aprire la pagina di modifica con tutti i campi precompilati.</p>
          <h4 style={h4Style}>Campi disponibili</h4>
          <ul style={ulStyle}>
            <li><strong>Dati anagrafici</strong> — Nome, Cognome, Denominazione azienda</li>
            <li><strong>Contatti</strong> — Email, Telefono</li>
            <li><strong>Indirizzo</strong> — Via, CAP, Città, Provincia</li>
            <li><strong>Dati fiscali</strong> — Partita IVA, Codice Fiscale</li>
            <li><strong>Note</strong> — Note libere sul cliente</li>
          </ul>
          <h4 style={h4Style}>Eliminazione</h4>
          <p>L'eliminazione singola o multipla (tramite checkbox) richiede sempre una conferma esplicita. I clienti possono essere associati ai preventivi tramite il menu a tendina nel form preventivo. Il CAP del cliente viene usato automaticamente per il calcolo delle tariffe di spedizione PackLink.</p>
        </div>
      ),
    },
    {
      id: "impostazioni", title: "Impostazioni", icon: "⚙️",
      content: (
        <div style={proseStyle}>
          <p>Le impostazioni sono organizzate in tab. Ogni sezione di creazione e modifica apre una <strong>pagina dedicata a schermo intero</strong> con pulsante "← Torna indietro" e feedback visivo al salvataggio.</p>
          <h4 style={h4Style}>Intestazione (Dati Azienda)</h4>
          <p>Configura ragione sociale, indirizzo, P.IVA, CF, email, telefono, logo e regime fiscale. Questi dati appaiono nell'intestazione dei PDF esportati.</p>
          <h4 style={h4Style}>Materiali</h4>
          <p>Gestisci il catalogo materiali con nome, peso specifico, prezzo al kg, percentuale di markup, percentuale di fallimento stimata e giacenza in magazzino. Puoi importare i profili direttamente da <strong>Bambu Studio</strong> o <strong>Orca Slicer</strong> tramite i pulsanti dedicati. Cliccando su un materiale nella lista si apre la pagina di modifica.</p>
          <h4 style={h4Style}>Stampanti</h4>
          <p>Configura le stampanti con nome, consumo energetico (kWh) e costo ammortamento orario. Importabili da <strong>Bambu Studio</strong> e <strong>Orca Slicer</strong>. Questi valori vengono usati per calcolare il costo energia e ammortamento di ogni riga preventivo.</p>
          <h4 style={h4Style}>Profili stampa</h4>
          <p>Gestisci i profili con layer height, numero pareti, infill, top/bottom layers e tipo di supporti. Importabili da <strong>Bambu Studio</strong> e <strong>Orca Slicer</strong>.</p>
          <h4 style={h4Style}>Servizi extra</h4>
          <p>Definisci servizi aggiuntivi (post-processing, verniciatura, assemblaggio, ecc.) con importo predefinito e markup. Sono disponibili preset rapidi per i servizi più comuni. Per ogni servizio puoi scegliere se addebitare al cliente, mostrare nel PDF senza costo, o tenerlo come costo interno.</p>
          <h4 style={h4Style}>Corrieri / PackLink Pro</h4>
          <p>Configura la tua API key PackLink Pro per ottenere tariffe di spedizione live. Inserisci le dimensioni del pacco e il CAP di destinazione per confrontare i prezzi dei corrieri disponibili. Puoi salvare i corrieri trovati direttamente nel tuo catalogo.</p>
          <h4 style={h4Style}>Metodi di pagamento</h4>
          <p>Configura i metodi accettati (bonifico, PayPal, contanti, Satispay, ecc.) con commissioni percentuali e fisse e testo da mostrare nel PDF. Sono disponibili preset rapidi con le commissioni reali (es. PayPal 3,40% + €0,35). Una simulazione commissione mostra l'impatto su preventivi di diverse fasce.</p>
          <h4 style={h4Style}>Interfaccia</h4>
          <p>Personalizza l'aspetto dell'intera applicazione:</p>
          <ul style={ulStyle}>
            <li><strong>Dimensione font</strong> — Piccolo (12px), Medio (16px), Grande (20px)</li>
            <li><strong>Colore accent</strong> — 10 temi cromatici (Cyan, Blue, Indigo, Purple, Pink, Rose, Orange, Amber, Green, Teal)</li>
          </ul>
          <p>Le modifiche vengono salvate automaticamente e applicate in tempo reale a tutti i bottoni, input, badge, tabelle e tab dell'applicazione.</p>
        </div>
      ),
    },
    {
      id: "ritenute", title: "Ritenute / Ricevute", icon: "📝",
      content: (
        <div style={proseStyle}>
          <p>Il modulo Ritenute / Ricevute gestisce la generazione di ricevute per prestazioni occasionali con calcolo automatico della ritenuta d'acconto.</p>
          <h4 style={h4Style}>Archivio</h4>
          <p>La pagina principale <strong>Ritenute / Ricevute</strong> nella sidebar mostra l'archivio completo di tutte le ritenute generate, con filtri per anno e ricerca testuale. In alto sono visibili i KPI riassuntivi: totale lordo, ritenute versate, netto incassato e numero documenti.</p>
          <h4 style={h4Style}>Creare una nuova ritenuta</h4>
          <ol style={olStyle}>
            <li>Dalla pagina archivio, clicca <strong>"+ Nuova Ritenuta / Ricevuta"</strong></li>
            <li>Si apre una pagina dedicata con il pulsante "← Torna a Ritenute / Ricevute"</li>
            <li>Seleziona il cliente e opzionalmente il preventivo collegato</li>
            <li>Inserisci l'importo lordo — la ritenuta (20%) viene calcolata automaticamente per i clienti con P.IVA</li>
            <li>Clicca <strong>"Genera PDF"</strong> per creare e salvare il documento</li>
          </ol>
          <h4 style={h4Style}>Azioni dall'archivio</h4>
          <ul style={ulStyle}>
            <li><strong>Apri PDF</strong> — apre il documento generato</li>
            <li><strong>Mostra in cartella</strong> — apre la cartella Documenti/Sparks3D/Ritenute/ in Esplora file</li>
            <li><strong>Elimina</strong> — rimuove la ritenuta dall'archivio e il file PDF associato</li>
          </ul>
        </div>
      ),
    },
    {
      id: "slicer", title: "Slicer integrati", icon: "🧊",
      content: (
        <div style={proseStyle}>
          <p>Sparks3D Preventivi si integra con <strong>Bambu Studio</strong> e <strong>Orca Slicer</strong> per importare automaticamente profili di stampa e materiali.</p>
          <h4 style={h4Style}>Slicer supportati</h4>
          <ul style={ulStyle}>
            <li><strong>🟢 Bambu Studio</strong> — Profili letti da <code style={codeStyle}>%APPDATA%\BambuStudio</code></li>
            <li><strong>🐋 Orca Slicer</strong> — Profili letti da <code style={codeStyle}>%APPDATA%\OrcaSlicer</code></li>
          </ul>
          <h4 style={h4Style}>Rilevamento automatico</h4>
          <p>All'avvio, l'applicazione verifica quali slicer sono installati. La sidebar mostra un indicatore per ciascuno: punto verde = installato, punto rosso = non trovato.</p>
          <h4 style={h4Style}>Apertura rapida</h4>
          <p>Cliccando su un indicatore slicer nella sidebar, il programma si apre direttamente. Se l'eseguibile non viene trovato, appare un avviso.</p>
          <h4 style={h4Style}>Import profili</h4>
          <p>Nelle sezioni Impostazioni → Materiali, Stampanti e Profili stampa trovi due pulsanti dedicati:</p>
          <ul style={ulStyle}>
            <li><strong>"🟢 Importa da Bambu Studio"</strong> — apre la pagina di importazione già posizionata sui profili Bambu</li>
            <li><strong>"🐋 Importa da Orca Slicer"</strong> — apre la pagina di importazione già posizionata sui profili Orca</li>
          </ul>
          <p>La pagina di importazione mostra tutti i profili trovati in formato tabella con dettagli tecnici (tipo, densità, costo per i filamenti; layer height, pareti, infill per i processi; modello e nozzle per le macchine). Puoi filtrare per "Solo profili utente" per escludere quelli preinstallati. Cliccando "Importa →" si apre il form di creazione precompilato con i dati letti dal profilo slicer.</p>
          <h4 style={h4Style}>Tab di commutazione</h4>
          <p>Nella pagina di importazione puoi passare da Bambu Studio a Orca Slicer con le tab in alto. Se uno slicer non è installato, la sua tab appare disattivata.</p>
          <h4 style={h4Style}>Parser GCode / 3MF</h4>
          <p>Quando aggiungi una riga al preventivo, puoi importare un file .gcode o .3mf. Il parser estrae automaticamente:</p>
          <ul style={ulStyle}>
            <li>Tempo di stampa stimato</li>
            <li>Peso del filamento per ogni materiale/colore</li>
            <li>Tipo di filamento utilizzato</li>
            <li>Configurazione multi-materiale AMS (da file 3MF)</li>
          </ul>
          <p>Funziona con file generati da Bambu Studio, Orca Slicer e altri slicer compatibili.</p>
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
          <p>Seleziona un file .zip di backup per ripristinare i dati. Puoi scegliere se ripristinare database, loghi e/o documenti PDF separatamente.</p>
          <p>Quando il ripristino include il database, l'applicazione mostra un avviso che richiede la chiusura e la riapertura del programma per caricare i dati ripristinati. Un pulsante dedicato permette di chiudere l'applicazione direttamente.</p>
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
      id: "novita", title: "Novità v1.0.3", icon: "🆕",
      content: (
        <div style={proseStyle}>
          <h4 style={h4Style}>Orca Slicer</h4>
          <ul style={ulStyle}>
            <li>Integrazione completa con Orca Slicer: rilevamento installazione, import profili, apertura rapida dalla sidebar</li>
            <li>Pulsanti dedicati "🟢 Importa da Bambu Studio" e "🐋 Importa da Orca Slicer" in Materiali, Stampanti e Profili</li>
            <li>Pagina di importazione profili a schermo intero con tab di commutazione Bambu/Orca, tabella dettagliata e filtro "Solo utente"</li>
            <li>Sidebar con doppio indicatore slicer (Bambu Studio + Orca Slicer), ciascuno cliccabile per aprire il programma</li>
            <li>Splash screen aggiornato: mostra lo stato di entrambi gli slicer all'avvio</li>
          </ul>
          <h4 style={h4Style}>Refactoring interfaccia — pagine dedicate</h4>
          <ul style={ulStyle}>
            <li>Tutte le operazioni di creazione e modifica ora si aprono come <strong>pagine a schermo intero</strong> invece di modali popup</li>
            <li>Ogni pagina form ha il pulsante "← Torna indietro" in alto, campi precompilati in modifica, e feedback visivo "✅ Salvato!" con ritorno automatico</li>
            <li>Convertiti a pagine dedicate: Materiali, Stampanti, Profili stampa, Servizi extra, Corrieri, Metodi di pagamento</li>
          </ul>
          <h4 style={h4Style}>Ritenute / Ricevute</h4>
          <ul style={ulStyle}>
            <li>Unificate le voci di menu "Ritenuta / Ricevute" e "Archivio Ritenute" in un'unica voce <strong>"Ritenute / Ricevute"</strong></li>
            <li>La pagina principale mostra l'archivio con il pulsante "+ Nuova Ritenuta / Ricevuta" che apre la pagina di creazione</li>
            <li>Pulsante "← Torna a Ritenute / Ricevute" per tornare all'archivio</li>
          </ul>
          <h4 style={h4Style}>Altre migliorie</h4>
          <ul style={ulStyle}>
            <li>Autore aggiornato nella pagina Licenza: Fabio Mazzarella</li>
            <li>Sito web corretto: www.sparks3d.it</li>
            <li>Rimossa la versione slicer dalla sidebar (era inaffidabile), mantenuto solo l'indicatore installato/non trovato</li>
            <li>Codice backend Rust ottimizzato e ripulito (rimossi metodi inutilizzati)</li>
          </ul>

          <h4 style={h4Style}>Novità precedenti (v1.0.2)</h4>
          <ul style={ulStyle}>
            <li>Conferma esplicita per eliminazione preventivi, righe e clienti</li>
            <li>Dashboard: fatturato e profitto solo da preventivi completati</li>
            <li>Tema dinamico: colore accent e dimensione font applicati globalmente</li>
            <li>Pagina clienti con form dedicato a schermo intero</li>
            <li>Dashboard interattiva: etichette e numeri cliccabili</li>
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
