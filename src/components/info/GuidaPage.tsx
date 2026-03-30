// src/components/info/GuidaPage.tsx
// Sparks3D Preventivi – Guida utente completa (v1.3.0)
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
            <li>Import profili stampa da <strong>Bambu Studio</strong>, <strong>Orca Slicer</strong>, <strong>Anycubic Slicer Next</strong> e <strong>Prusa Slicer</strong></li>
            <li>Rilevamento automatico slicer installati nella sidebar</li>
            <li>PIN di avvio opzionale per protezione accesso</li>
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
          <p>Gestisci il catalogo materiali con nome, peso specifico, prezzo al kg, percentuale di markup, percentuale di fallimento stimata e giacenza in magazzino. Puoi importare i profili direttamente da <strong>Bambu Studio</strong>, <strong>Orca Slicer</strong>, <strong>Anycubic Slicer Next</strong> o <strong>Prusa Slicer</strong> tramite il pulsante "Importa dallo Slicer". Cliccando su un materiale nella lista si apre la pagina di modifica.</p>
          <h4 style={h4Style}>Stampanti</h4>
          <p>Configura le stampanti con nome, consumo energetico (kWh) e costo ammortamento orario. Importabili da <strong>Bambu Studio</strong>, <strong>Orca Slicer</strong>, <strong>Anycubic Slicer Next</strong> e <strong>Prusa Slicer</strong>. Questi valori vengono usati per calcolare il costo energia e ammortamento di ogni riga preventivo.</p>
          <h4 style={h4Style}>Profili stampa</h4>
          <p>Gestisci i profili con layer height, numero pareti, infill, top/bottom layers e tipo di supporti. Importabili da <strong>Bambu Studio</strong>, <strong>Orca Slicer</strong>, <strong>Anycubic Slicer Next</strong> e <strong>Prusa Slicer</strong>.</p>
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
          <h4 style={h4Style}>Sicurezza</h4>
          <p>Configura il <strong>PIN di avvio</strong> opzionale a 6 cifre per proteggere l'accesso all'applicazione. Da questa tab puoi impostare, modificare o rimuovere il PIN. Per maggiori dettagli vedi la sezione <strong>Sicurezza</strong> di questa guida.</p>
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
          <p>Sparks3D Preventivi si integra con <strong>Bambu Studio</strong>, <strong>Orca Slicer</strong>, <strong>Anycubic Slicer Next</strong> e <strong>Prusa Slicer</strong> per importare automaticamente profili di stampa e materiali.</p>
          <h4 style={h4Style}>Slicer supportati</h4>
          <ul style={ulStyle}>
            <li><strong>🟢 Bambu Studio</strong> — Profili JSON letti da <code style={codeStyle}>%APPDATA%\BambuStudio</code></li>
            <li><strong>🐋 Orca Slicer</strong> — Profili JSON letti da <code style={codeStyle}>%APPDATA%\OrcaSlicer</code></li>
            <li><strong>🔷 Anycubic Slicer Next</strong> — Profili JSON letti da <code style={codeStyle}>%APPDATA%\AnycubicSlicerNext</code></li>
            <li><strong>🟠 Prusa Slicer</strong> — Profili INI letti da <code style={codeStyle}>%APPDATA%\PrusaSlicer</code></li>
          </ul>
          <h4 style={h4Style}>Rilevamento automatico</h4>
          <p>All'avvio, l'applicazione verifica quali slicer sono installati. La sidebar mostra un indicatore per ciascuno: punto colorato = installato, punto rosso = non trovato.</p>
          <h4 style={h4Style}>Apertura rapida</h4>
          <p>Cliccando su un indicatore slicer nella sidebar, il programma si apre direttamente. Se l'eseguibile non viene trovato, appare un avviso.</p>
          <h4 style={h4Style}>Import profili</h4>
          <p>Nelle sezioni Impostazioni → Materiali, Stampanti e Profili stampa trovi il pulsante <strong>"Importa dallo Slicer"</strong> che apre la pagina di importazione. Da lì puoi scegliere lo slicer sorgente tramite le tab in alto (Bambu Studio, Orca Slicer, Anycubic Slicer Next, Prusa Slicer).</p>
          <p>La pagina di importazione mostra tutti i profili trovati in formato tabella con dettagli tecnici (tipo, densità, costo per i filamenti; layer height, pareti, infill per i processi; modello e nozzle per le macchine). Puoi filtrare per "Solo profili utente" per escludere quelli preinstallati. Cliccando "Importa →" si apre il form di creazione precompilato con i dati letti dal profilo slicer.</p>
          <h4 style={h4Style}>Prusa Slicer — formato INI</h4>
          <p>A differenza degli altri slicer che usano profili JSON, Prusa Slicer salva i profili in formato <strong>.ini</strong> (testo con coppie chiave=valore). Sparks3D Preventivi converte automaticamente i campi Prusa nel formato interno dell'applicazione:</p>
          <ul style={ulStyle}>
            <li><code style={codeStyle}>perimeters</code> → Numero pareti</li>
            <li><code style={codeStyle}>fill_density</code> → Infill (con rimozione del suffisso %)</li>
            <li><code style={codeStyle}>top_solid_layers</code> / <code style={codeStyle}>bottom_solid_layers</code> → Top/Bottom layers</li>
            <li><code style={codeStyle}>support_material</code> → Supporti abilitati</li>
            <li><code style={codeStyle}>temperature</code> → Temperatura nozzle</li>
          </ul>
          <p>Le cartelle dei profili Prusa hanno nomi diversi: <code style={codeStyle}>print/</code> invece di <code style={codeStyle}>process/</code> e <code style={codeStyle}>printer/</code> invece di <code style={codeStyle}>machine/</code>. La mappatura è gestita automaticamente.</p>
          <h4 style={h4Style}>Compatibilità Anycubic Slicer Next</h4>
          <p>Anycubic Slicer Next è sviluppato sulla base di Orca Slicer, quindi utilizza lo stesso formato di profili JSON. Tutti i profili filamento, macchina e processo creati in Anycubic Slicer Next sono pienamente compatibili con l'importazione automatica.</p>
          <h4 style={h4Style}>Parser GCode / 3MF</h4>
          <p>Quando aggiungi una riga al preventivo, puoi importare un file .gcode o .3mf. Il parser estrae automaticamente:</p>
          <ul style={ulStyle}>
            <li>Tempo di stampa stimato</li>
            <li>Peso del filamento per ogni materiale/colore</li>
            <li>Tipo di filamento utilizzato</li>
            <li>Configurazione multi-materiale AMS (da file 3MF)</li>
          </ul>
          <p>Funziona con file generati da Bambu Studio, Orca Slicer, Anycubic Slicer Next, Prusa Slicer e altri slicer compatibili.</p>
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
      id: "sicurezza", title: "Sicurezza", icon: "🔐",
      content: (
        <div style={proseStyle}>
          <p>Sparks3D Preventivi adotta misure di sicurezza progettate per proteggere i tuoi dati aziendali e dei clienti su PC singoli e condivisi.</p>

          <h4 style={h4Style}>🔑 PIN di avvio</h4>
          <p>A partire dalla v1.3.0 puoi impostare un <strong>PIN numerico di 6 cifre</strong> per proteggere l'accesso all'applicazione. Il PIN viene richiesto ogni volta che avvii Sparks3D Preventivi, prima di mostrare l'interfaccia principale.</p>
          <ul style={ulStyle}>
            <li><strong>Impostazione:</strong> Vai in <strong>Impostazioni → Sicurezza</strong> e clicca "Imposta PIN". Inserisci il PIN desiderato e confermalo</li>
            <li><strong>Modifica:</strong> Dalla stessa pagina, clicca "Modifica PIN". Verrà richiesto il PIN attuale prima di impostare quello nuovo</li>
            <li><strong>Rimozione:</strong> Clicca "Rimuovi PIN" e conferma con il PIN attuale. L'app tornerà ad aprirsi senza protezione</li>
            <li><strong>Protezione brute-force:</strong> dopo 3 tentativi errati consecutivi, l'accesso viene bloccato per 60 secondi</li>
            <li><strong>Archiviazione sicura:</strong> il PIN non viene mai salvato in chiaro. Viene memorizzato come hash crittografico SHA-256 — anche leggendo il database non è possibile risalire al PIN originale</li>
          </ul>
          <p style={{ marginTop: 8, color: "#f97316" }}>
            ⚠️ <strong>Attenzione:</strong> se dimentichi il PIN non esiste una procedura di recupero automatica. In caso di emergenza puoi ripristinare un backup precedente.
          </p>

          <h4 style={h4Style}>🔒 Database cifrato (SQLCipher AES-256)</h4>
          <p>A partire dalla v1.2.0, il database SQLite è cifrato con <strong>SQLCipher AES-256</strong>. Tutti i dati sensibili — clienti, preventivi, prezzi, partite IVA — sono protetti e non leggibili da nessun software esterno senza la chiave dell'applicazione. Se hai una versione precedente installata, la migrazione avviene automaticamente e silenziosamente al primo avvio.</p>

          <h4 style={h4Style}>🔑 API key PackLink nel Windows Credential Manager</h4>
          <p>La chiave API di PackLink Pro non viene salvata nel database ma nel <strong>Windows Credential Manager</strong>, lo stesso sistema protetto che Windows usa per le password di rete e dei browser. Puoi verificarla in: <strong>Pannello di controllo → Gestione credenziali → Credenziali Windows → sparks3d-preventivi</strong>.</p>
          <p style={{ marginTop: 8, color: "#f97316" }}>
            ⚠️ <strong>Nota backup:</strong> la API key non è inclusa nel file di backup perché è salvata nel Credential Manager per sicurezza. Dopo un ripristino su un PC diverso dovrai reinserirla in <em>Corrieri → PackLink Pro</em>.
          </p>

          <h4 style={h4Style}>✅ Verifica integrità del backup</h4>
          <p>Ogni backup creato dalla v1.2.0 include un hash <strong>SHA-256</strong> del database. Al ripristino, l'app verifica che il file non sia stato manomesso o corrotto prima di applicarlo. Se l'hash non corrisponde, il ripristino viene annullato automaticamente e tutti i file temporanei vengono eliminati.</p>

          <h4 style={h4Style}>🛡️ Aggiornamenti firmati</h4>
          <p>Il sistema di aggiornamento automatico verifica la <strong>firma crittografica</strong> di ogni pacchetto prima dell'installazione. Questo garantisce che gli aggiornamenti provengano esclusivamente da Sparks3D e non siano stati modificati durante il download. La verifica è obbligatoria e non può essere disabilitata.</p>

          <h4 style={h4Style}>🌐 Content Security Policy</h4>
          <p>L'interfaccia è protetta da una <strong>Content Security Policy</strong> restrittiva che impedisce l'esecuzione di script non autorizzati, anche in caso di contenuti malevoli iniettati tramite file GCode o 3MF.</p>

          <h4 style={h4Style}>📋 Roadmap sicurezza</h4>
          <p>Le seguenti funzionalità di sicurezza sono pianificate per le prossime release:</p>
          <ul style={ulStyle}>
            <li><strong>Validazione dati</strong> — controllo formato CAP, email e Partita IVA</li>
            <li><strong>Permessi filesystem granulari</strong> — accesso limitato ai soli percorsi necessari degli slicer</li>
          </ul>
        </div>
      ),
    },
    {
      id: "novita", title: "Novità v1.3.0", icon: "🆕",
      content: (
        <div style={proseStyle}>
          <h4 style={h4Style}>🟠 Prusa Slicer</h4>
          <ul style={ulStyle}>
            <li>Integrazione completa con <strong>Prusa Slicer</strong>: rilevamento installazione, import profili, apertura rapida dalla sidebar</li>
            <li>Parser nativo per profili <strong>.ini</strong> — formato diverso dai JSON di Bambu/Orca/Anycubic, gestito automaticamente</li>
            <li>Mappatura automatica cartelle Prusa (<code style={codeStyle}>print/</code>, <code style={codeStyle}>printer/</code>, <code style={codeStyle}>filament/</code>) al formato interno</li>
            <li>Conversione chiavi Prusa → chiavi standard (es. <code style={codeStyle}>perimeters</code> → pareti, <code style={codeStyle}>fill_density</code> → infill)</li>
            <li>Nuova tab <strong>Prusa Slicer</strong> (arancione 🟠) nella pagina di importazione profili</li>
            <li>Sidebar con indicatore Prusa Slicer (arancione) — cliccabile per aprire il programma</li>
            <li>Badge "Prusa" arancione nelle tabelle Materiali, Stampanti e Profili per i dati importati</li>
            <li>Profili letti da <code style={codeStyle}>%APPDATA%\PrusaSlicer</code> — supporto anche per versioni alpha/beta</li>
            <li>Splash screen aggiornato: mostra lo stato di tutti e quattro gli slicer</li>
          </ul>

          <h4 style={h4Style}>🔑 PIN di avvio</h4>
          <ul style={ulStyle}>
            <li>Nuovo <strong>PIN numerico di 6 cifre</strong> opzionale per proteggere l'avvio dell'applicazione</li>
            <li>Schermata di sblocco dedicata con caselle animate, effetto 3D e sfondo con particelle in movimento</li>
            <li>Protezione brute-force: <strong>3 tentativi</strong> poi blocco <strong>60 secondi</strong> con progress bar</li>
            <li>PIN salvato come hash SHA-256 nel database — non recuperabile in chiaro</li>
            <li>Nuova tab <strong>Sicurezza</strong> nelle Impostazioni per gestire il PIN (imposta / modifica / rimuovi)</li>
            <li>Il PIN viene rimosso automaticamente in caso di reset completo delle impostazioni</li>
          </ul>

          <h4 style={h4Style}>💾 Ripristino backup migliorato</h4>
          <ul style={ulStyle}>
            <li>Nuova <strong>modale di conferma ripristino</strong> con riepilogo degli elementi selezionati e avviso di sovrascrittura</li>
            <li>Al termine del ripristino del database, appare una <strong>modale di riavvio obbligatorio</strong> che impedisce di continuare a usare l'app con dati inconsistenti</li>
            <li>Pulsante dedicato per chiudere e riavviare l'applicazione direttamente dalla modale</li>
          </ul>

          <h4 style={h4Style}>Novità precedenti (v1.2.0)</h4>
          <ul style={ulStyle}>
            <li>Database cifrato con <strong>SQLCipher AES-256</strong></li>
            <li>API key PackLink spostata nel <strong>Windows Credential Manager</strong></li>
            <li>Verifica <strong>SHA-256</strong> del database al ripristino backup</li>
            <li><strong>Content Security Policy</strong> restrittiva abilitata sull'interfaccia</li>
            <li>Sistema di <strong>aggiornamento automatico</strong> con firma crittografica e banner in-app</li>
          </ul>

          <h4 style={h4Style}>Novità precedenti (v1.1.0)</h4>
          <ul style={ulStyle}>
            <li>Integrazione completa con <strong>Anycubic Slicer Next</strong></li>
            <li>Pulsante unificato <strong>"Importa dallo Slicer"</strong> con tab di commutazione</li>
            <li>Sidebar con triplo indicatore slicer</li>
          </ul>

          <h4 style={h4Style}>Novità precedenti (v1.0.3)</h4>
          <ul style={ulStyle}>
            <li>Integrazione completa con <strong>Orca Slicer</strong></li>
            <li>Refactoring completo interfaccia: pagine dedicate invece di modali popup</li>
            <li>Unificazione voci menu Ritenute / Ricevute</li>
          </ul>

          <h4 style={h4Style}>Novità precedenti (v1.0.2)</h4>
          <ul style={ulStyle}>
            <li>Conferma esplicita per eliminazione preventivi, righe e clienti</li>
            <li>Dashboard interattiva con etichette e numeri cliccabili</li>
            <li>Tema dinamico: colore accent e dimensione font</li>
          </ul>
        </div>
      ),
    },
  ];

  const activeContent = sections.find(s => s.id === activeSection);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>

      {/* Banner avviso antivirus */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 18px",
        background: "rgba(234,179,8,0.08)",
        border: "1px solid rgba(234,179,8,0.3)",
        borderRadius: 12,
        fontSize: 13, color: "#fbbf24", lineHeight: 1.6,
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
        <span>
          <strong>Falsi positivi antivirus:</strong> alcuni antivirus (es. Kaspersky, Windows Defender) potrebbero segnalare l'installer come sospetto.
          Si tratta di un <strong>falso positivo</strong> dovuto all'assenza di firma digitale (Code Signing).
          Il codice sorgente è completamente open source e verificabile su{" "}
          <a href="https://github.com/Sparks3D/sparks3d-preventivi" target="_blank" rel="noreferrer"
            style={{ color: "#60a5fa", textDecoration: "underline" }}>
            GitHub
          </a>.
        </span>
      </div>

    <div style={{ display: "flex", gap: 24 }}>
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
