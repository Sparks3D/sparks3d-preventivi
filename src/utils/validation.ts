// src/utils/validation.ts
// Sparks3D Preventivi — Funzioni di validazione input
// =====================================================

// ── Tipi ──

export interface FieldError {
  field: string;
  message: string;
}

// ── CAP italiano (5 cifre) ──

export function validateCAP(value: string): string | null {
  if (!value.trim()) return null; // campo facoltativo
  if (!/^\d{5}$/.test(value.trim())) {
    return "Il CAP deve essere di 5 cifre numeriche";
  }
  return null;
}

// ── Email ──

export function validateEmail(value: string): string | null {
  if (!value.trim()) return null; // campo facoltativo
  // Regex RFC 5322 semplificata ma robusta
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  if (!re.test(value.trim())) {
    return "Formato email non valido";
  }
  return null;
}

// ── Partita IVA italiana (11 cifre + check digit Luhn modificato) ──

export function validatePartitaIVA(value: string): string | null {
  if (!value.trim()) return null; // campo facoltativo

  // Rimuovi eventuale prefisso "IT" (case-insensitive)
  let piva = value.trim().toUpperCase();
  if (piva.startsWith("IT")) {
    piva = piva.substring(2);
  }

  // Deve essere esattamente 11 cifre
  if (!/^\d{11}$/.test(piva)) {
    return "La Partita IVA deve essere di 11 cifre (con prefisso IT opzionale)";
  }

  // Non può essere tutto zeri
  if (piva === "00000000000") {
    return "Partita IVA non valida";
  }

  // Algoritmo di Luhn modificato per P.IVA italiana
  // Posizioni dispari (1-indexed): somma diretta
  // Posizioni pari (1-indexed): raddoppio, se >= 10 sottrai 9
  const digits = piva.split("").map(Number);
  let sumOdd = 0;
  let sumEven = 0;

  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      // Posizioni dispari (0, 2, 4, 6, 8 → 1ª, 3ª, 5ª, 7ª, 9ª cifra)
      sumOdd += digits[i];
    } else {
      // Posizioni pari (1, 3, 5, 7, 9 → 2ª, 4ª, 6ª, 8ª, 10ª cifra)
      let doubled = digits[i] * 2;
      if (doubled > 9) doubled -= 9;
      sumEven += doubled;
    }
  }

  const checkDigit = (10 - ((sumOdd + sumEven) % 10)) % 10;

  if (checkDigit !== digits[10]) {
    return "Partita IVA non valida (cifra di controllo errata)";
  }

  return null;
}

// ── Codice Fiscale italiano (formato base: 16 caratteri alfanumerici) ──

export function validateCodiceFiscale(value: string): string | null {
  if (!value.trim()) return null; // campo facoltativo

  const cf = value.trim().toUpperCase();

  // Formato standard persone fisiche: 16 caratteri
  // Formato persone giuridiche: 11 cifre (come P.IVA)
  if (cf.length === 11) {
    // Codice fiscale numerico (persona giuridica) → stesse regole P.IVA
    if (!/^\d{11}$/.test(cf)) {
      return "Il Codice Fiscale numerico deve essere di 11 cifre";
    }
    return null;
  }

  if (cf.length !== 16) {
    return "Il Codice Fiscale deve essere di 16 caratteri (o 11 cifre per persona giuridica)";
  }

  // Pattern: 6 lettere + 2 numeri + 1 lettera + 2 numeri + 1 lettera + 3 numeri + 1 lettera
  // Semplificato: verifica che sia alfanumerico e nel formato corretto
  const re = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
  if (!re.test(cf)) {
    return "Formato Codice Fiscale non valido";
  }

  return null;
}

// ── Telefono (formato libero ma ragionevole) ──

export function validateTelefono(value: string): string | null {
  if (!value.trim()) return null; // campo facoltativo

  // Accetta: +39 333 1234567, 0301234567, +39-333-1234567, ecc.
  // Almeno 6 cifre, solo cifre/spazi/trattini/punti/parentesi/+
  const cleaned = value.replace(/[\s\-().+]/g, "");
  if (!/^\d{6,15}$/.test(cleaned)) {
    return "Il numero di telefono deve contenere tra 6 e 15 cifre";
  }
  return null;
}

// ── Provincia (2 lettere maiuscole) ──

export function validateProvincia(value: string): string | null {
  if (!value.trim()) return null; // campo facoltativo
  if (!/^[A-Z]{2}$/.test(value.trim().toUpperCase())) {
    return "La provincia deve essere di 2 lettere (es. BS, MI)";
  }
  return null;
}

// ── Helper: validazione in blocco per form cliente ──

export function validateClienteForm(form: {
  email: string;
  cap: string;
  partita_iva: string;
  codice_fiscale: string;
  telefono: string;
  provincia: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  const emailErr = validateEmail(form.email);
  if (emailErr) errors.email = emailErr;

  const capErr = validateCAP(form.cap);
  if (capErr) errors.cap = capErr;

  const pivaErr = validatePartitaIVA(form.partita_iva);
  if (pivaErr) errors.partita_iva = pivaErr;

  const cfErr = validateCodiceFiscale(form.codice_fiscale);
  if (cfErr) errors.codice_fiscale = cfErr;

  const telErr = validateTelefono(form.telefono);
  if (telErr) errors.telefono = telErr;

  const provErr = validateProvincia(form.provincia);
  if (provErr) errors.provincia = provErr;

  return errors;
}

// ── Helper: validazione in blocco per form azienda ──

export function validateAziendaForm(form: {
  email: string;
  cap: string;
  partita_iva: string;
  codice_fiscale: string;
  telefono: string;
  provincia: string;
}): Record<string, string> {
  // Stessa logica del cliente
  return validateClienteForm(form);
}
