// src/components/impostazioni/SicurezzaPage.tsx
// Sparks3D Preventivi — Impostazioni Sicurezza (PIN di avvio)
// =============================================================

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export function SicurezzaPage() {
  const [pinAttivo, setPinAttivo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Stati per impostazione/modifica PIN
  const [showSetPin, setShowSetPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showRemovePin, setShowRemovePin] = useState(false);

  // Campi PIN
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkPin();
  }, []);

  const checkPin = async () => {
    try {
      const hasPin = await invoke<boolean>("has_pin");
      setPinAttivo(hasPin);
    } catch {
      setPinAttivo(false);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    setSuccess("");
    setShowSetPin(false);
    setShowChangePin(false);
    setShowRemovePin(false);
  };

  const validatePin = (pin: string): string | null => {
    if (pin.length !== 6) return "Il PIN deve essere di 6 cifre.";
    if (!/^\d{6}$/.test(pin)) return "Il PIN deve contenere solo numeri.";
    if (/^(\d)\1{5}$/.test(pin)) return "Il PIN non può essere composto da cifre uguali (es. 000000).";
    return null;
  };

  // ── Imposta nuovo PIN ──
  const handleSetPin = async () => {
    const err = validatePin(newPin);
    if (err) { setError(err); return; }
    if (newPin !== confirmPin) { setError("I due PIN non corrispondono."); return; }

    setSaving(true);
    setError("");
    try {
      await invoke("set_pin", { pin: newPin });
      setPinAttivo(true);
      setSuccess("PIN impostato con successo! Da ora in poi verrà richiesto all'avvio dell'app.");
      setTimeout(() => resetForm(), 3000);
    } catch (e: any) {
      setError(String(e));
    }
    setSaving(false);
  };

  // ── Modifica PIN ──
  const handleChangePin = async () => {
    if (!currentPin) { setError("Inserisci il PIN attuale."); return; }

    try {
      const valid = await invoke<boolean>("verify_pin", { pin: currentPin });
      if (!valid) { setError("Il PIN attuale non è corretto."); return; }
    } catch {
      setError("Errore verifica PIN attuale."); return;
    }

    const err = validatePin(newPin);
    if (err) { setError(err); return; }
    if (newPin === currentPin) { setError("Il nuovo PIN deve essere diverso da quello attuale."); return; }
    if (newPin !== confirmPin) { setError("I due PIN non corrispondono."); return; }

    setSaving(true);
    setError("");
    try {
      await invoke("set_pin", { pin: newPin });
      setSuccess("PIN modificato con successo!");
      setTimeout(() => resetForm(), 3000);
    } catch (e: any) {
      setError(String(e));
    }
    setSaving(false);
  };

  // ── Rimuovi PIN ──
  const handleRemovePin = async () => {
    if (!currentPin) { setError("Inserisci il PIN attuale per confermare."); return; }

    try {
      const valid = await invoke<boolean>("verify_pin", { pin: currentPin });
      if (!valid) { setError("PIN non corretto."); return; }
    } catch {
      setError("Errore verifica PIN."); return;
    }

    setSaving(true);
    setError("");
    try {
      await invoke("delete_pin");
      setPinAttivo(false);
      setSuccess("PIN rimosso. L'app si aprirà senza richiesta PIN.");
      setTimeout(() => resetForm(), 3000);
    } catch (e: any) {
      setError(String(e));
    }
    setSaving(false);
  };

  const pinInputStyle: React.CSSProperties = {
    width: 200, textAlign: "center", fontSize: 20, letterSpacing: 12,
    fontFamily: "monospace",
  };

  const handlePinChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setter(val);
    if (error) setError("");
  };

  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-muted)" }}>
        Caricamento...
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
        Sicurezza
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        Proteggi l'accesso all'app con un PIN numerico di 6 cifre.
      </p>

      {/* ═══ STATO PIN ═══ */}
      <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: pinAttivo ? "var(--green-soft)" : "rgba(255,255,255,0.04)",
              fontSize: 20,
            }}>
              {pinAttivo ? "🔒" : "🔓"}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                PIN di avvio
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {pinAttivo
                  ? "Attivo — il PIN viene richiesto all'avvio dell'applicazione"
                  : "Disattivato — l'app si apre senza protezione"
                }
              </div>
            </div>
          </div>

          <div style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: pinAttivo ? "var(--green-soft)" : "rgba(248,113,113,0.1)",
            color: pinAttivo ? "var(--green)" : "#f87171",
          }}>
            {pinAttivo ? "ATTIVO" : "DISATTIVATO"}
          </div>
        </div>
      </div>

      {/* ═══ AZIONI ═══ */}
      {!showSetPin && !showChangePin && !showRemovePin && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {!pinAttivo ? (
            <button
              className="s3d-btn s3d-btn-primary"
              onClick={() => { resetForm(); setShowSetPin(true); }}
            >
              🔐 Imposta PIN
            </button>
          ) : (
            <>
              <button
                className="s3d-btn s3d-btn-primary"
                onClick={() => { resetForm(); setShowChangePin(true); }}
              >
                ✏️ Modifica PIN
              </button>
              <button
                className="s3d-btn s3d-btn-danger"
                onClick={() => { resetForm(); setShowRemovePin(true); }}
              >
                🗑️ Rimuovi PIN
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ FORM: IMPOSTA PIN ═══ */}
      {showSetPin && (
        <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
            Imposta un nuovo PIN
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Nuovo PIN (6 cifre)
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={handlePinChange(setNewPin)} placeholder="••••••" autoFocus className="s3d-input" style={pinInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Conferma PIN
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={handlePinChange(setConfirmPin)} placeholder="••••••" className="s3d-input" style={pinInputStyle} />
            </div>

            {error && <div style={{ fontSize: 13, color: "#f87171", fontWeight: 500 }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>{success}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className="s3d-btn s3d-btn-primary" onClick={handleSetPin} disabled={saving || newPin.length !== 6 || confirmPin.length !== 6}>
                {saving ? "Salvataggio..." : "Salva PIN"}
              </button>
              <button className="s3d-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM: MODIFICA PIN ═══ */}
      {showChangePin && (
        <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
            Modifica PIN
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                PIN attuale
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={handlePinChange(setCurrentPin)} placeholder="••••••" autoFocus className="s3d-input" style={pinInputStyle} />
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Nuovo PIN (6 cifre)
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={handlePinChange(setNewPin)} placeholder="••••••" className="s3d-input" style={pinInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                Conferma nuovo PIN
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={handlePinChange(setConfirmPin)} placeholder="••••••" className="s3d-input" style={pinInputStyle} />
            </div>

            {error && <div style={{ fontSize: 13, color: "#f87171", fontWeight: 500 }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>{success}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className="s3d-btn s3d-btn-primary" onClick={handleChangePin} disabled={saving || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}>
                {saving ? "Salvataggio..." : "Salva nuovo PIN"}
              </button>
              <button className="s3d-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM: RIMUOVI PIN ═══ */}
      {showRemovePin && (
        <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>
            Rimuovi PIN
          </h4>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Inserisci il PIN attuale per confermare la rimozione. L'app si aprirà senza protezione.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                PIN attuale
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={handlePinChange(setCurrentPin)} placeholder="••••••" autoFocus className="s3d-input" style={pinInputStyle} />
            </div>

            {error && <div style={{ fontSize: 13, color: "#f87171", fontWeight: 500 }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>{success}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className="s3d-btn s3d-btn-danger" onClick={handleRemovePin} disabled={saving || currentPin.length !== 6}>
                {saving ? "Rimozione..." : "Conferma rimozione"}
              </button>
              <button className="s3d-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ INFO ═══ */}
      <div style={{
        padding: "14px 18px", borderRadius: 10,
        background: "rgba(59,130,246,0.06)",
        border: "1px solid rgba(59,130,246,0.12)",
        fontSize: 12, color: "#556a89", lineHeight: 1.6,
      }}>
        <strong style={{ color: "#8899b4" }}>ℹ️ Come funziona:</strong><br />
        Il PIN viene richiesto ogni volta che avvii Sparks3D Preventivi.
        È salvato come hash crittografico (SHA-256) nel database — anche leggendo il file
        non è possibile risalire al PIN originale.
        Dopo 3 tentativi errati l'accesso viene bloccato per 60 secondi.
      </div>
    </div>
  );
}
