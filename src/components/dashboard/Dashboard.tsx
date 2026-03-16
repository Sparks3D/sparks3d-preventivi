// src/components/dashboard/Dashboard.tsx
// Sparks3D Preventivi – Dashboard Statistiche (Vibrant Dark)
// ============================================================

import { useState, useEffect, CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";

interface StatoCount { stato: string; count: number; totale: number; }
interface TrendMese { mese: string; label: string; fatturato: number; profit: number; num_preventivi: number; }
interface TopCliente { cliente_id: number; nome_display: string; fatturato: number; num_preventivi: number; }
interface PreventivoRecente { id: number; numero: string; stato: string; data_creazione: string; cliente_nome: string; totale_finale: number; profit: number; num_righe: number; }
interface TopMateriale { materiale_id: number; nome: string; peso_totale_kg: number; num_utilizzi: number; }
interface DashboardStats {
  totale_preventivi: number; preventivi_confermati: number;
  fatturato_totale: number; profit_totale: number;
  materiale_totale_kg: number; tempo_stampa_totale_ore: number;
  per_stato: StatoCount[]; trend_mensile: TrendMese[];
  top_clienti: TopCliente[]; ultimi_preventivi: PreventivoRecente[];
  top_materiali: TopMateriale[];
  tasso_conversione: number; valore_medio: number;
}

interface Props {
  onOpenPreventivo: (id: number) => void;
  onNavigateToPreventivi: (filtroStato?: string) => void;
}

const V = {
  bg: "#0d1224", card: "#1a2340", cardHover: "#1f2b4d",
  border: "rgba(99,180,255,.15)", borderLight: "rgba(99,180,255,.25)",
  text: "#ffffff", textSec: "#b8c5db", textMuted: "#6b7fa0",
  accent: "#0ea5e9", accentGlow: "rgba(14,165,233,.12)",
  green: "#22c55e", greenGlow: "rgba(34,197,94,.12)",
  orange: "#f97316", orangeGlow: "rgba(249,115,22,.12)",
  pink: "#ec4899", pinkGlow: "rgba(236,72,153,.12)",
  cyan: "#22d3ee", cyanGlow: "rgba(34,211,238,.12)",
  purple: "#a855f7", purpleGlow: "rgba(168,85,247,.12)",
  red: "#f43f5e",
};

// ── Stato mapping (corrispondente ai veri stati dell'app) ──
const STATO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  bozza:          { bg: "rgba(136,153,180,.12)", text: "#8899b4", dot: "#8899b4" },
  non_confermato: { bg: "rgba(136,153,180,.12)", text: "#8899b4", dot: "#8899b4" },
  inviato:        { bg: "rgba(96,165,250,.12)",  text: "#60a5fa", dot: "#60a5fa" },
  accettato:      { bg: "rgba(52,211,153,.12)",  text: "#34d399", dot: "#34d399" },
  in_produzione:  { bg: "rgba(251,146,60,.12)",  text: "#fb923c", dot: "#fb923c" },
  completato:     { bg: "rgba(110,231,183,.12)", text: "#6ee7b7", dot: "#6ee7b7" },
  rifiutato:      { bg: "rgba(248,113,113,.12)", text: "#f87171", dot: "#f87171" },
};
const STATO_LABELS: Record<string, string> = {
  bozza: "Bozza", non_confermato: "Bozza", inviato: "Inviato",
  accettato: "Accettato", in_produzione: "In produzione",
  completato: "Completato", rifiutato: "Rifiutato",
};

const statoLabel = (stato: string) =>
  STATO_LABELS[stato] || stato.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase());

const eur = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const num = (n: number, d = 1) => n.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
const formatOre = (ore: number) => { if (ore < 1) return `${Math.round(ore * 60)}min`; const h = Math.floor(ore); const m = Math.round((ore - h) * 60); return m > 0 ? `${h}h ${m}m` : `${h}h`; };
const formatDate = (d: string) => { const p = d.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

export function Dashboard({ onOpenPreventivo, onNavigateToPreventivi }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { loadStats(); }, []);
  const loadStats = async () => { try { setLoading(true); setStats(await invoke<DashboardStats>("get_dashboard_stats")); } catch (e: any) { setError(e?.toString() || "Errore"); } finally { setLoading(false); } };
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadStats} />;
  if (!stats) return null;
  if (stats.totale_preventivi === 0) return <EmptyState />;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: V.text, margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: V.textSec, marginTop: 4 }}>Panoramica attività e statistiche</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Preventivi" value={stats.totale_preventivi.toString()} sub={`${stats.preventivi_confermati} confermati`} accent={V.accent} glow={V.accentGlow} icon="📋" />
        <KpiCard label="Fatturato" value={eur(stats.fatturato_totale)} sub={`Media ${eur(stats.valore_medio)}`} accent={V.green} glow={V.greenGlow} icon="💰" note="Solo completati" />
        <KpiCard label="Profitto" value={eur(stats.profit_totale)} sub={`Conversione ${num(stats.tasso_conversione, 0)}%`} accent={V.pink} glow={V.pinkGlow} icon="📈" note="Solo completati" />
        <KpiCard label="Materiale" value={`${num(stats.materiale_totale_kg)} kg`} sub={`${formatOre(stats.tempo_stampa_totale_ore)} di stampa`} accent={V.cyan} glow={V.cyanGlow} icon="🧱" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        <TrendChart data={stats.trend_mensile} />
        <StatiBreakdown data={stats.per_stato} totale={stats.totale_preventivi} onClickStato={(stato) => onNavigateToPreventivi(stato)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <UltimiPreventivi data={stats.ultimi_preventivi} onClickPreventivo={onOpenPreventivo} onClickStato={(stato) => onNavigateToPreventivi(stato)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TopClienti data={stats.top_clienti} />
          <TopMateriali data={stats.top_materiali} />
        </div>
      </div>
    </div>
  );
}

// ── KPI Card ──
function KpiCard({ label, value, sub, accent, glow, icon, note }: { label: string; value: string; sub: string; accent: string; glow: string; icon: string; note?: string }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{
      background: V.card, border: `1px solid ${h ? accent + "40" : V.border}`,
      borderRadius: 16, padding: 20, transition: "all .2s", cursor: "default",
      boxShadow: h ? `0 0 20px ${glow}` : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: V.textSec, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: V.text, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: V.textMuted }}>{sub}</div>
      {note && <div style={{ fontSize: 10, color: V.textMuted, marginTop: 4, fontStyle: "italic" }}>{note}</div>}
    </div>
  );
}

// ── Trend Chart ──
function TrendChart({ data }: { data: TrendMese[] }) {
  if (!data.length) return <div style={sty.card}><Sh>Trend mensile</Sh><div style={sty.empty}>Nessun dato</div></div>;
  const max = Math.max(...data.map(d => d.fatturato), 1);
  return (
    <div style={sty.card}><Sh>Trend mensile</Sh>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, marginTop: 16 }}>
        {data.map(m => (<div key={m.mese} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ fontSize: 10, color: V.textMuted, fontVariantNumeric: "tabular-nums" }}>{eur(m.fatturato)}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 3 }}>
            <div style={{ width: "40%", maxWidth: 26, height: Math.max((m.fatturato / max) * 155, 4), background: `linear-gradient(to top, ${V.accent}, #38bdf8)`, borderRadius: "4px 4px 2px 2px" }} />
            <div style={{ width: "40%", maxWidth: 26, height: Math.max((m.profit / max) * 155, 4), background: `linear-gradient(to top, ${V.green}, #86efac)`, borderRadius: "4px 4px 2px 2px", opacity: .85 }} />
          </div>
          <div style={{ fontSize: 11, color: V.textSec, fontWeight: 500 }}>{m.label.split(" ")[0]}</div>
        </div>))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 14, justifyContent: "center" }}>
        <Ld color={V.accent} label="Fatturato" /><Ld color={V.green} label="Profitto" />
      </div>
    </div>
  );
}
function Ld({ color, label }: { color: string; label: string }) { return <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} /><span style={{ fontSize: 11, color: V.textSec }}>{label}</span></div>; }

// ── Stato Breakdown (con etichette cliccabili) ──
function StatiBreakdown({ data, totale, onClickStato }: { data: StatoCount[]; totale: number; onClickStato: (stato: string) => void }) {
  return (<div style={sty.card}><Sh>Stato preventivi</Sh>
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
      {data.map(s => {
        const mapped = s.stato === "non_confermato" ? "bozza" : s.stato;
        const pct = totale > 0 ? (s.count / totale) * 100 : 0;
        const sc = STATO_COLORS[s.stato] || STATO_COLORS.bozza;
        return (<div key={s.stato}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <div onClick={() => onClickStato(mapped)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot }} />
              <span style={{ fontSize: 13, color: V.text, fontWeight: 500 }}>{statoLabel(s.stato)}</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 12, color: V.textSec }}>{s.count}</span>
              <span style={{ fontSize: 12, color: sc.text, fontWeight: 600, minWidth: 70, textAlign: "right" }}>{eur(s.totale)}</span>
            </div>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: sc.dot, borderRadius: 3, opacity: .7 }} />
          </div>
        </div>);
      })}
    </div>
  </div>);
}

// ── Ultimi Preventivi (numeri e stati cliccabili) ──
function UltimiPreventivi({ data, onClickPreventivo, onClickStato }: { data: PreventivoRecente[]; onClickPreventivo: (id: number) => void; onClickStato: (stato: string) => void }) {
  return (<div style={sty.card}><Sh>Ultimi preventivi</Sh>
    <div style={{ marginTop: 12, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead><tr>{["Numero","Cliente","Data","Stato","Totale","Profit"].map(h => <th key={h} style={sty.th}>{h}</th>)}</tr></thead>
      <tbody>{data.map(p => { const sc = STATO_COLORS[p.stato] || STATO_COLORS.bozza; const label = statoLabel(p.stato); return (
        <tr key={p.id} style={sty.tr}>
          <td style={sty.td}>
            <span onClick={() => onClickPreventivo(p.id)}
              style={{ fontWeight: 600, color: V.accent, cursor: "pointer", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              {p.numero}
            </span>
          </td>
          <td style={sty.td}><span style={{ color: p.cliente_nome ? V.text : V.textMuted }}>{p.cliente_nome || "—"}</span></td>
          <td style={{ ...sty.td, fontVariantNumeric: "tabular-nums" }}>{formatDate(p.data_creazione)}</td>
          <td style={sty.td}>
            <span onClick={() => { const mapped = p.stato === "non_confermato" ? "bozza" : p.stato; onClickStato(mapped); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text, cursor: "pointer", transition: "opacity .2s" }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.7")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />{label}
            </span>
          </td>
          <td style={{ ...sty.td, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: V.text }}>{eur(p.totale_finale)}</td>
          <td style={{ ...sty.td, fontVariantNumeric: "tabular-nums", fontWeight: 600, color: p.profit >= 0 ? V.green : V.red }}>{eur(p.profit)}</td>
        </tr>); })}</tbody>
    </table>{!data.length && <div style={sty.empty}>Nessun preventivo</div>}</div>
  </div>);
}

// ── Top Clienti ──
function TopClienti({ data }: { data: TopCliente[] }) {
  const max = Math.max(...data.map(c => c.fatturato), 1);
  return (<div style={sty.card}><Sh>Top clienti</Sh><div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
    {data.map((c, i) => (<div key={c.cliente_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: i === 0 ? V.orangeGlow : "rgba(255,255,255,.05)", color: i === 0 ? V.orange : V.textMuted, flexShrink: 0 }}>{i + 1}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: V.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome_display}</div>
        <div style={{ height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, marginTop: 4 }}><div style={{ height: "100%", borderRadius: 2, width: `${(c.fatturato / max) * 100}%`, background: `linear-gradient(90deg, ${V.accent}, ${V.cyan})`, opacity: .6 }} /></div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: V.text }}>{eur(c.fatturato)}</div><div style={{ fontSize: 10, color: V.textMuted }}>{c.num_preventivi} prev.</div></div>
    </div>))}{!data.length && <div style={sty.empty}>Nessun cliente</div>}</div></div>);
}

// ── Top Materiali ──
function TopMateriali({ data }: { data: TopMateriale[] }) {
  const max = Math.max(...data.map(m => m.peso_totale_kg), 0.01);
  const colors = ["#0ea5e9","#22d3ee","#22c55e","#a855f7","#f97316","#ec4899","#d946ef","#64748b"];
  return (<div style={sty.card}><Sh>Materiali più usati</Sh><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
    {data.map((m, i) => (<div key={m.materiale_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }} />
      <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: V.text, fontWeight: 500 }}>{m.nome}</span>
        <span style={{ fontSize: 12, color: V.textSec, marginLeft: 8 }}>{num(m.peso_totale_kg)} kg</span></div>
        <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2 }}><div style={{ height: "100%", borderRadius: 2, width: `${(m.peso_totale_kg / max) * 100}%`, background: colors[i % colors.length], opacity: .6 }} /></div></div>
    </div>))}{!data.length && <div style={sty.empty}>Nessun materiale</div>}</div></div>);
}

// ── Utility components ──
function Sh({ children }: { children: React.ReactNode }) { return <h3 style={{ fontSize: 14, fontWeight: 600, color: V.text, margin: 0 }}>{children}</h3>; }
function LoadingState() { return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}><div style={{ width: 20, height: 20, border: `2px solid ${V.border}`, borderTopColor: V.accent, borderRadius: "50%", animation: "spin 1s linear infinite" }} /><span style={{ color: V.textSec, fontSize: 14 }}>Caricamento…</span><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 16 }}><div style={{ fontSize: 40 }}>⚠️</div><p style={{ color: V.red, fontSize: 14 }}>{message}</p><button onClick={onRetry} style={{ padding: "8px 20px", borderRadius: 8, background: `linear-gradient(135deg, ${V.accent}, #6366f1)`, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Riprova</button></div>; }
function EmptyState() { return <div style={{ ...sty.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 320, gap: 16, textAlign: "center", maxWidth: 1400, margin: "60px auto" }}><div style={{ fontSize: 56, opacity: .8 }}>📊</div><h2 style={{ fontSize: 20, fontWeight: 600, color: V.text, margin: 0 }}>Nessun dato ancora</h2><p style={{ color: V.textSec, fontSize: 14, maxWidth: 360, lineHeight: 1.5 }}>Crea il tuo primo preventivo per iniziare a vedere le statistiche.</p></div>; }

const sty: Record<string, CSSProperties> = {
  card: { background: V.card, border: `1px solid ${V.border}`, borderRadius: 16, padding: 20 },
  th: { textAlign: "left" as const, fontSize: 11, fontWeight: 700, color: "#7dd3fc", textTransform: "uppercase" as const, letterSpacing: ".05em", padding: "8px 10px", borderBottom: `1px solid ${V.border}` },
  tr: { borderBottom: "1px solid rgba(255,255,255,.04)" },
  td: { padding: "10px 10px", fontSize: 13, color: V.textSec, verticalAlign: "middle" as const },
  empty: { textAlign: "center" as const, color: V.textMuted, fontSize: 13, padding: "24px 0" },
};
