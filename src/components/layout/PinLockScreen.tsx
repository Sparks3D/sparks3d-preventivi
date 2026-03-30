// src/components/layout/PinLockScreen.tsx
// Sparks3D Preventivi — Schermata PIN di avvio (effetto premium)
// ===============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  onUnlock: () => void;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 60;

export function PinLockScreen({ onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLockedOut = lockoutEnd !== null && Date.now() < lockoutEnd;

  // Genera particelle una sola volta
  const particles = useMemo(() =>
    Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * -25,
      opacity: 0.15 + Math.random() * 0.45,
      drift: -30 + Math.random() * 60,
    }))
  , []);

  // Stelle lente di sfondo
  const stars = useMemo(() =>
    Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 1.5,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * -5,
    }))
  , []);

  useEffect(() => {
    invoke<string>("get_app_version").then(v => setAppVersion(v)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!lockoutEnd) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockoutEnd - Date.now()) / 1000));
      setLockoutRemaining(remaining);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setAttempts(0);
        setError("");
        setPin("");
        inputRef.current?.focus();
      }
    }, 200);
    return () => clearInterval(interval);
  }, [lockoutEnd]);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  const handleVerify = useCallback(async (fullPin: string) => {
    if (verifying || isLockedOut) return;
    setVerifying(true);
    setError("");

    try {
      const valid = await invoke<boolean>("verify_pin", { pin: fullPin });
      if (valid) {
        setSuccess(true);
        setTimeout(() => onUnlock(), 600);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        triggerShake();

        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutEnd(Date.now() + LOCKOUT_SECONDS * 1000);
          setLockoutRemaining(LOCKOUT_SECONDS);
          setError(`Troppi tentativi. Attendi ${LOCKOUT_SECONDS} secondi.`);
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(`PIN errato. ${remaining} tentativ${remaining === 1 ? "o" : "i"} rimanent${remaining === 1 ? "e" : "i"}.`);
        }
        setPin("");
      }
    } catch (e) {
      setError("Errore verifica PIN.");
      setPin("");
    }
    setVerifying(false);
  }, [verifying, isLockedOut, attempts, triggerShake, onUnlock]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLockedOut || verifying || success) return;
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPin(val);
    if (error && val.length < 6) setError("");
    if (val.length === 6) handleVerify(val);
  }, [isLockedOut, verifying, error, success, handleVerify]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
      if (error) setError("");
    }
  }, [pin, error]);

  const isError = !!error && !isLockedOut;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100000,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#06080f",
        fontFamily: "inherit",
        overflow: "hidden",
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ═══════════════════════════════════════════
           LAYER 1: Aurora / Nebula background
          ═══════════════════════════════════════════ */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Aurora 1 — arancione caldo */}
        <div style={{
          position: "absolute",
          width: "120%", height: "60%",
          top: "-20%", left: "-10%",
          background: "radial-gradient(ellipse at 30% 50%, rgba(234,125,0,0.2) 0%, rgba(234,125,0,0.05) 40%, transparent 70%)",
          filter: "blur(60px)",
          animation: "aurora1 16s ease-in-out infinite",
          transformOrigin: "center center",
        }} />
        {/* Aurora 2 — blu profondo */}
        <div style={{
          position: "absolute",
          width: "100%", height: "70%",
          bottom: "-15%", right: "-10%",
          background: "radial-gradient(ellipse at 70% 50%, rgba(30,64,175,0.18) 0%, rgba(59,130,246,0.06) 40%, transparent 70%)",
          filter: "blur(60px)",
          animation: "aurora2 20s ease-in-out infinite",
          transformOrigin: "center center",
        }} />
        {/* Aurora 3 — viola/magenta */}
        <div style={{
          position: "absolute",
          width: "80%", height: "50%",
          top: "20%", left: "20%",
          background: "radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.12) 0%, rgba(168,85,247,0.04) 40%, transparent 65%)",
          filter: "blur(80px)",
          animation: "aurora3 24s ease-in-out infinite",
          transformOrigin: "center center",
        }} />
        {/* Aurora 4 — ciano tenue */}
        <div style={{
          position: "absolute",
          width: "60%", height: "40%",
          bottom: "10%", left: "5%",
          background: "radial-gradient(ellipse at 40% 50%, rgba(6,182,212,0.1) 0%, transparent 60%)",
          filter: "blur(50px)",
          animation: "aurora4 18s ease-in-out infinite",
          transformOrigin: "center center",
        }} />

        {/* ═══ LAYER 2: Griglia prospettica ═══ */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            linear-gradient(rgba(234,125,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(234,125,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          animation: "gridPulse 8s ease-in-out infinite",
        }} />

        {/* ═══ LAYER 3: Light rays dal centro ═══ */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 600, height: 600,
          transform: "translate(-50%, -50%)",
          background: "conic-gradient(from 0deg, transparent, rgba(234,125,0,0.04) 10%, transparent 20%, transparent 30%, rgba(59,130,246,0.03) 40%, transparent 50%, transparent 60%, rgba(139,92,246,0.03) 70%, transparent 80%, transparent 90%, rgba(234,125,0,0.04) 100%)",
          borderRadius: "50%",
          filter: "blur(30px)",
          animation: "raysRotate 30s linear infinite",
        }} />

        {/* ═══ LAYER 4: Stelle pulsanti ═══ */}
        {stars.map(s => (
          <div key={`star-${s.id}`} style={{
            position: "absolute",
            width: s.size, height: s.size,
            borderRadius: "50%",
            background: "#ffffff",
            left: `${s.x}%`, top: `${s.y}%`,
            animation: `starTwinkle ${s.duration}s ease-in-out infinite`,
            animationDelay: `${s.delay}s`,
          }} />
        ))}

        {/* ═══ LAYER 5: Particelle fluttuanti verso l'alto ═══ */}
        {particles.map(p => (
          <div key={`p-${p.id}`} style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: p.id % 3 === 0
              ? `rgba(234,125,0,${p.opacity})`
              : p.id % 3 === 1
              ? `rgba(59,130,246,${p.opacity * 0.7})`
              : `rgba(139,92,246,${p.opacity * 0.6})`,
            boxShadow: p.id % 3 === 0
              ? `0 0 ${p.size * 3}px rgba(234,125,0,${p.opacity * 0.5})`
              : p.id % 3 === 1
              ? `0 0 ${p.size * 3}px rgba(59,130,246,${p.opacity * 0.4})`
              : `0 0 ${p.size * 3}px rgba(139,92,246,${p.opacity * 0.3})`,
            left: `${p.x}%`,
            bottom: "-5%",
            animation: `particleRise ${p.duration}s ease-out infinite`,
            animationDelay: `${p.delay}s`,
            // @ts-ignore
            "--drift": `${p.drift}px`,
          } as any} />
        ))}

        {/* ═══ LAYER 6: Anello orbitale ═══ */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 420, height: 420,
          transform: "translate(-50%, -50%)",
          border: "1px solid rgba(234,125,0,0.06)",
          borderRadius: "50%",
          animation: "ringPulse 6s ease-in-out infinite",
        }}>
          {/* Dot orbitante */}
          <div style={{
            position: "absolute",
            width: 6, height: 6,
            borderRadius: "50%",
            background: "#ea7d00",
            boxShadow: "0 0 12px rgba(234,125,0,0.6), 0 0 30px rgba(234,125,0,0.2)",
            top: -3, left: "50%",
            marginLeft: -3,
            animation: "orbitDot 12s linear infinite",
            transformOrigin: "3px 213px",
          }} />
        </div>
        {/* Secondo anello più grande */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 550, height: 550,
          transform: "translate(-50%, -50%)",
          border: "1px solid rgba(59,130,246,0.04)",
          borderRadius: "50%",
          animation: "ringPulse 8s ease-in-out infinite reverse",
        }} />
      </div>

      {/* ═══════════════════════════════════════════
           CONTENUTO PRINCIPALE
          ═══════════════════════════════════════════ */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        animation: success ? "unlockZoom 0.6s ease-in forwards" : undefined,
      }}>

        {/* Icona lucchetto animata */}
        <div style={{
          width: 56, height: 56,
          borderRadius: 16,
          background: "rgba(234,125,0,0.1)",
          border: "1px solid rgba(234,125,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24,
          animation: "iconFloat 4s ease-in-out infinite",
          boxShadow: "0 0 30px rgba(234,125,0,0.1)",
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ea7d00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {success ? (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            ) : (
              <>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </>
            )}
          </svg>
        </div>

        {/* Titolo */}
        <h1 style={{
          fontSize: 36, fontWeight: 800, color: "#ffffff",
          marginBottom: 8, letterSpacing: -0.5,
          fontStyle: "italic",
          textShadow: "0 0 40px rgba(234,125,0,0.2), 0 2px 10px rgba(0,0,0,0.5)",
        }}>
          Sblocca <span style={{
            color: "#ea7d00",
            textShadow: "0 0 30px rgba(234,125,0,0.3)",
          }}>Sparks3D Preventivi</span>
        </h1>

        <p style={{
          fontSize: 14, color: "#6b7a94", marginBottom: 48,
          fontWeight: 400, letterSpacing: 0.5,
        }}>
          Inserisci il tuo PIN per continuare
        </p>

        {/* ═══ 6 caselle PIN ═══ */}
        <div
          style={{
            display: "flex", gap: 14, marginBottom: 40,
            animation: shake ? "pinShake 0.6s ease-in-out" : "none",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const filled = i < pin.length;
            const isActive = i === pin.length && !isLockedOut && !verifying && !success;
            const isSuccess = success && filled;

            return (
              <div
                key={i}
                style={{
                  width: 58, height: 66,
                  borderRadius: 14,
                  position: "relative",
                  // Gradiente 3D
                  background: isError
                    ? "linear-gradient(175deg, rgba(248,113,113,0.12) 0%, rgba(120,30,30,0.08) 100%)"
                    : isSuccess
                    ? "linear-gradient(175deg, rgba(34,197,94,0.15) 0%, rgba(20,120,60,0.08) 100%)"
                    : isActive
                    ? "linear-gradient(175deg, rgba(234,125,0,0.12) 0%, rgba(12,15,26,0.95) 100%)"
                    : filled
                    ? "linear-gradient(175deg, rgba(234,125,0,0.08) 0%, rgba(12,15,26,0.95) 100%)"
                    : "linear-gradient(175deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.2) 100%)",
                  // Bordi 3D
                  borderTop: `1.5px solid ${isError ? "rgba(248,113,113,0.6)" : isSuccess ? "rgba(34,197,94,0.6)" : isActive ? "rgba(234,125,0,0.7)" : filled ? "rgba(234,125,0,0.35)" : "rgba(255,255,255,0.1)"}`,
                  borderLeft: `1.5px solid ${isError ? "rgba(248,113,113,0.4)" : isSuccess ? "rgba(34,197,94,0.4)" : isActive ? "rgba(234,125,0,0.5)" : filled ? "rgba(234,125,0,0.25)" : "rgba(255,255,255,0.07)"}`,
                  borderRight: `1.5px solid ${isError ? "rgba(200,80,80,0.3)" : isSuccess ? "rgba(20,120,60,0.3)" : isActive ? "rgba(200,100,0,0.3)" : filled ? "rgba(200,100,0,0.15)" : "rgba(255,255,255,0.04)"}`,
                  borderBottom: `1.5px solid ${isError ? "rgba(180,60,60,0.4)" : isSuccess ? "rgba(15,80,40,0.4)" : isActive ? "rgba(180,90,0,0.35)" : filled ? "rgba(180,90,0,0.2)" : "rgba(0,0,0,0.3)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease-out",
                  boxShadow: isActive
                    ? "0 0 0 3px rgba(234,125,0,0.12), 0 0 25px rgba(234,125,0,0.08), 0 4px 15px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)"
                    : isError
                    ? "0 0 0 3px rgba(248,113,113,0.1), 0 0 20px rgba(248,113,113,0.05), 0 4px 15px rgba(0,0,0,0.3)"
                    : isSuccess
                    ? "0 0 0 3px rgba(34,197,94,0.15), 0 0 25px rgba(34,197,94,0.1), 0 4px 15px rgba(0,0,0,0.3)"
                    : "0 4px 15px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.03)",
                  animation: filled && !isError && !isSuccess ? `dotPop 0.25s ease-out ${i * 0.03}s` : undefined,
                }}
              >
                {filled && (
                  <div style={{
                    width: 14, height: 14,
                    borderRadius: "50%",
                    background: isError
                      ? "radial-gradient(circle at 35% 35%, #ff8a8a, #f87171 50%, #dc2626)"
                      : isSuccess
                      ? "radial-gradient(circle at 35% 35%, #6ee7b7, #22c55e 50%, #16a34a)"
                      : "radial-gradient(circle at 35% 35%, #f5a623, #ea7d00 50%, #c66a00)",
                    boxShadow: isError
                      ? "0 0 12px rgba(248,113,113,0.6)"
                      : isSuccess
                      ? "0 0 12px rgba(34,197,94,0.6)"
                      : "0 0 12px rgba(234,125,0,0.5)",
                    transition: "all 0.15s ease-out",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Input nascosto */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={isLockedOut || verifying || success}
          style={{
            position: "absolute",
            opacity: 0,
            width: 1, height: 1,
            pointerEvents: "auto",
          }}
          autoFocus
        />

        {/* Messaggi stato */}
        <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {success ? (
            <div style={{
              fontSize: 14, color: "#22c55e", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8,
              animation: "fadeInUp 0.3s ease-out",
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Accesso consentito
            </div>
          ) : isLockedOut ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{
                fontSize: 14, color: "#f87171", fontWeight: 500,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                Bloccato — riprova tra {lockoutRemaining}s
              </div>
              <div style={{
                width: 220, height: 3, borderRadius: 2,
                background: "rgba(248,113,113,0.12)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: 2,
                  background: "linear-gradient(90deg, #f87171, #ef4444)",
                  width: `${(lockoutRemaining / LOCKOUT_SECONDS) * 100}%`,
                  transition: "width 0.3s linear",
                }} />
              </div>
            </div>
          ) : error ? (
            <div style={{
              fontSize: 14, color: "#f87171", fontWeight: 500,
              animation: "fadeInUp 0.3s ease-out",
            }}>
              {error}
            </div>
          ) : verifying ? (
            <div style={{ fontSize: 14, color: "#6b7a94", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 14, height: 14,
                border: "2px solid rgba(234,125,0,0.3)",
                borderTopColor: "#ea7d00",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              Verifica in corso...
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 28, zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
      }}>
        {appVersion && (
          <span style={{ fontSize: 11, color: "#9ca3b8" }}>
            v{appVersion}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#7a8194" }}>
          CC BY-NC-ND 4.0 — Sparks3D.it
        </span>
      </div>

      {/* ═══════════════════════════════════════════
           ANIMAZIONI CSS
          ═══════════════════════════════════════════ */}
      <style>{`
        @keyframes aurora1 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          25% { transform: translate(60px, 30px) scale(1.1) rotate(3deg); }
          50% { transform: translate(-30px, -40px) scale(0.9) rotate(-2deg); }
          75% { transform: translate(40px, -20px) scale(1.05) rotate(1deg); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          25% { transform: translate(-50px, 40px) scale(1.08) rotate(-3deg); }
          50% { transform: translate(40px, -30px) scale(0.95) rotate(2deg); }
          75% { transform: translate(-20px, 20px) scale(1.03) rotate(-1deg); }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          33% { transform: translate(50px, -40px) scale(1.12) rotate(4deg); }
          66% { transform: translate(-40px, 30px) scale(0.92) rotate(-3deg); }
        }
        @keyframes aurora4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -25px) scale(1.1); }
        }
        @keyframes raysRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.05; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.5); }
        }
        @keyframes particleRise {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(var(--drift, 0px)); opacity: 0; }
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
        }
        @keyframes orbitDot {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes iconFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes dotPop {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-10px); }
          30%, 70% { transform: translateX(10px); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes unlockZoom {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.05); opacity: 0; filter: blur(10px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
