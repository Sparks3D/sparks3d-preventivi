// src/components/impostazioni/SicurezzaPage.tsx
// Sparks3D Preventivi — Impostazioni Sicurezza (PIN di avvio)
// =============================================================

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

export function SicurezzaPage() {
  const { t } = useTranslation();
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
    if (pin.length !== 6) return t("sicurezza.err6cifre");
    if (!/^\d{6}$/.test(pin)) return t("sicurezza.errSoloNumeri");
    if (/^(\d)\1{5}$/.test(pin)) return t("sicurezza.errCifreUguali");
    return null;
  };

  // ── Imposta nuovo PIN ──
  const handleSetPin = async () => {
    const err = validatePin(newPin);
    if (err) { setError(err); return; }
    if (newPin !== confirmPin) { setError(t("sicurezza.errNonCorrispondono")); return; }

    setSaving(true);
    setError("");
    try {
      await invoke("set_pin", { pin: newPin });
      setPinAttivo(true);
      setSuccess(t("sicurezza.successImpostato"));
      setTimeout(() => resetForm(), 3000);
    } catch (e: any) {
      setError(String(e));
    }
    setSaving(false);
  };

  // ── Modifica PIN ──
  const handleChangePin = async () => {
    if (!currentPin) { setError(t("sicurezza.errInserisciAttuale")); return; }

    try {
      const valid = await invoke<boolean>("verify_pin", { pin: currentPin });
      if (!valid) { setError(t("sicurezza.errAttualeNonCorretto")); return; }
    } catch {
      setError(t("sicurezza.errVerificaAttuale")); return;
    }

    const err = validatePin(newPin);
    if (err) { setError(err); return; }
    if (newPin === currentPin) { setError(t("sicurezza.errNuovoDiverso")); return; }
    if (newPin !== confirmPin) { setError(t("sicurezza.errNonCorrispondono")); return; }

    setSaving(true);
    setError("");
    try {
      await invoke("set_pin", { pin: newPin });
      setSuccess(t("sicurezza.successModificato"));
      setTimeout(() => resetForm(), 3000);
    } catch (e: any) {
      setError(String(e));
    }
    setSaving(false);
  };

  // ── Rimuovi PIN ──
  const handleRemovePin = async () => {
    if (!currentPin) { setError(t("sicurezza.errInserisciAttuale")); return; }

    try {
      const valid = await invoke<boolean>("verify_pin", { pin: currentPin });
      if (!valid) { setError(t("sicurezza.errPinNonCorretto")); return; }
    } catch {
      setError(t("sicurezza.errVerificaPin")); return;
    }

    setSaving(true);
    setError("");
    try {
      await invoke("delete_pin");
      setPinAttivo(false);
      setSuccess(t("sicurezza.successRimosso"));
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
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
        {t("sicurezza.title")}
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        {t("sicurezza.subtitle")}
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
                {t("sicurezza.pinLabel")}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                {pinAttivo
                  ? t("sicurezza.attivo")
                  : t("sicurezza.disattivato")
                }
              </div>
            </div>
          </div>

          <div style={{
            padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: pinAttivo ? "var(--green-soft)" : "rgba(248,113,113,0.1)",
            color: pinAttivo ? "var(--green)" : "#f87171",
          }}>
            {pinAttivo ? t("sicurezza.badgeAttivo") : t("sicurezza.badgeDisattivato")}
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
              {t("sicurezza.impostaPin")}
            </button>
          ) : (
            <>
              <button
                className="s3d-btn s3d-btn-primary"
                onClick={() => { resetForm(); setShowChangePin(true); }}
              >
                {t("sicurezza.modificaPin")}
              </button>
              <button
                className="s3d-btn s3d-btn-danger"
                onClick={() => { resetForm(); setShowRemovePin(true); }}
              >
                {t("sicurezza.rimuoviPin")}
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ FORM: IMPOSTA PIN ═══ */}
      {showSetPin && (
        <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
            {t("sicurezza.formImpostaTitle")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                {t("sicurezza.nuovoPin")}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={handlePinChange(setNewPin)} placeholder="••••••" autoFocus className="s3d-input" style={pinInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                {t("sicurezza.confermaPin")}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={handlePinChange(setConfirmPin)} placeholder="••••••" className="s3d-input" style={pinInputStyle} />
            </div>

            {error && <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 500 }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>{success}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className="s3d-btn s3d-btn-primary" onClick={handleSetPin} disabled={saving || newPin.length !== 6 || confirmPin.length !== 6}>
                {saving ? t("common.saving") : t("sicurezza.salvaPin")}
              </button>
              <button className="s3d-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM: MODIFICA PIN ═══ */}
      {showChangePin && (
        <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
            {t("sicurezza.formModificaTitle")}
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                {t("sicurezza.pinAttuale")}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={handlePinChange(setCurrentPin)} placeholder="••••••" autoFocus className="s3d-input" style={pinInputStyle} />
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                {t("sicurezza.nuovoPinLabel")}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={handlePinChange(setNewPin)} placeholder="••••••" className="s3d-input" style={pinInputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                {t("sicurezza.confermaNuovoPin")}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={handlePinChange(setConfirmPin)} placeholder="••••••" className="s3d-input" style={pinInputStyle} />
            </div>

            {error && <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 500 }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>{success}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className="s3d-btn s3d-btn-primary" onClick={handleChangePin} disabled={saving || currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6}>
                {saving ? t("common.saving") : t("sicurezza.salvaNuovoPin")}
              </button>
              <button className="s3d-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ FORM: RIMUOVI PIN ═══ */}
      {showRemovePin && (
        <div className="s3d-card" style={{ padding: 24, marginBottom: 20 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", marginBottom: 8 }}>
            {t("sicurezza.formRimuoviTitle")}
          </h4>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            {t("sicurezza.rimuoviDesc")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 320 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                {t("sicurezza.pinAttuale")}
              </label>
              <input type="password" inputMode="numeric" maxLength={6} value={currentPin} onChange={handlePinChange(setCurrentPin)} placeholder="••••••" autoFocus className="s3d-input" style={pinInputStyle} />
            </div>

            {error && <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 500 }}>{error}</div>}
            {success && <div style={{ fontSize: 13, color: "var(--green)", fontWeight: 500 }}>{success}</div>}

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <button className="s3d-btn s3d-btn-danger" onClick={handleRemovePin} disabled={saving || currentPin.length !== 6}>
                {saving ? t("common.saving") : t("sicurezza.confermaRimozione")}
              </button>
              <button className="s3d-btn" onClick={resetForm} style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                {t("common.cancel")}
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
        fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6,
      }}>
        <strong style={{ color: "var(--text-secondary)" }}>{t("sicurezza.infoTitle")}</strong><br />
        {t("sicurezza.info1")} {t("sicurezza.info2")} {t("sicurezza.info3")}
      </div>
    </div>
  );
}
