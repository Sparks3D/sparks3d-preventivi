# Sparks3D Preventivi

Software desktop per la creazione e gestione di preventivi per servizi di stampa 3D FDM.

---

## Funzionalità

- Gestione completa preventivi con calcolo costi automatico
- Supporto multi-materiale AMS (Automatic Material System)
- Import automatico da file GCode e 3MF
- Import profili stampa da **Bambu Studio**, **Orca Slicer** e **Anycubic Slicer Next**
- Rilevamento automatico slicer installati nella sidebar
- Tariffe corrieri live tramite PackLink Pro
- Export PDF professionale con logo e dati azienda
- Dashboard statistiche con KPI, grafici e navigazione interattiva
- Gestione ritenuta d'acconto e ricevute con archivio integrato
- Aggiornamento automatico in-app (con verifica firma crittografica)
- Backup completo e ripristino con verifica integrità SHA-256
- Esportazione dati CSV / Excel
- Ricerca globale rapida (Ctrl+K)
- Personalizzazione interfaccia (font, colori accent)

---

## Sicurezza

- **Database cifrato** con SQLCipher AES-256 — i dati non sono leggibili da software esterni
- **API key PackLink** salvata nel Windows Credential Manager, non nel database
- **Verifica SHA-256** del database al ripristino backup
- **Aggiornamenti firmati** crittograficamente — impossibile installare versioni non autorizzate
- **Content Security Policy** restrittiva sull'interfaccia

---

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | React + TypeScript |
| Backend | Rust (Tauri 2.0) |
| Database | SQLite cifrato (SQLCipher AES-256) |
| PDF | jsPDF + jspdf-autotable |
| Export | rust_xlsxwriter |
| Build | Vite + NSIS installer |

---

## Installazione

Scarica l'ultima versione dalla sezione [**Releases**](https://github.com/Sparks3D/sparks3d-preventivi/releases) ed esegui l'installer.

---

## ⚠️ Antivirus e falsi positivi

Alcuni antivirus (es. Kaspersky, Windows Defender) potrebbero segnalare l'eseguibile come sospetto. Si tratta di un **falso positivo**.

Sparks3D Preventivi è un'applicazione open source sviluppata con **Tauri** + Rust. L'avviso appare perché l'eseguibile non è firmato con un certificato digitale (Code Signing).

Il codice sorgente è completamente pubblico e verificabile su questa pagina GitHub.

Se il tuo antivirus elimina il file, aggiungi un'eccezione manualmente oppure scarica nuovamente l'installer dalla pagina Release.

---

## Licenza

Questo software è distribuito con licenza [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)](LICENSE).

- ✅ Puoi utilizzarlo per uso personale e professionale
- ✅ Puoi condividerlo nella sua forma originale
- ❌ Non puoi utilizzarlo per scopi commerciali
- ❌ Non puoi modificarlo o creare opere derivate
- ❌ Non puoi rimuovere le informazioni di attribuzione

---

## Supporta il progetto

Se trovi utile questo software, puoi offrirmi un caffè:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/Sparks3D.it)

---

*Calcola. Quota. Stampa.* — [sparks3d.it](https://sparks3d.it)
