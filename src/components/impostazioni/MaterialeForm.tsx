import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Materiale {
  id: number; nome: string; profilo_slicer: string; slicer_origin: string;
  peso_specifico_gcm3: number; prezzo_kg: number; markup_percentuale: number;
  fallimento_percentuale: number; magazzino_kg: number; link_acquisto: string;
}
interface Props { editId?: number | null; prefill?: any; onBack: () => void; }

const EMPTY: Omit<Materiale,"id"> = { nome:"",profilo_slicer:"",slicer_origin:"bambu",peso_specifico_gcm3:1.24,prezzo_kg:0,markup_percentuale:0,fallimento_percentuale:0,magazzino_kg:0,link_acquisto:"" };

export function MaterialeForm({ editId, prefill, onBack }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editId) {
      invoke<Materiale[]>("get_materiali").then(items => {
        const m = items.find(i => i.id === editId);
        if (m) setForm({ nome:m.nome,profilo_slicer:m.profilo_slicer,slicer_origin:m.slicer_origin,peso_specifico_gcm3:m.peso_specifico_gcm3,prezzo_kg:m.prezzo_kg,markup_percentuale:m.markup_percentuale,fallimento_percentuale:m.fallimento_percentuale,magazzino_kg:m.magazzino_kg,link_acquisto:m.link_acquisto });
      });
    } else if (prefill?.params) {
      const p = prefill.params;
      setForm({ ...EMPTY, nome:prefill.nome, profilo_slicer:prefill.nome, slicer_origin:prefill.origin||"bambu",
        peso_specifico_gcm3: p.filament_density ? parseFloat(String(p.filament_density))||1.24 : 1.24,
        prezzo_kg: p.filament_cost ? parseFloat(String(p.filament_cost))||0 : 0 });
    }
  }, [editId, prefill]);

  const up = (f:string,v:string|number) => setForm(p=>({...p,[f]:v}));
  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Il nome non può essere vuoto"); return; }
    if (form.prezzo_kg<=0) { setError("Il prezzo deve essere maggiore di zero"); return; }
    try {
      setSaving(true); setError("");
      if (editId) await invoke("update_materiale",{id:editId,data:{id:editId,...form}});
      else await invoke("create_materiale",{data:{id:0,...form}});
      setSaved(true); setTimeout(()=>onBack(),800);
    } catch(e:any) { setError(String(e)); } finally { setSaving(false); }
  };

  return (
    <div className="animate-fade-in" style={{maxWidth:640}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        ← Torna a Materiali
      </button>
      <h2 style={{fontSize:26,fontWeight:800,color:"var(--text-primary)",marginBottom:24}}>{editId?"Modifica materiale":"Nuovo materiale"}</h2>

      {saved && <div style={{padding:14,background:"var(--green-soft)",border:"1px solid var(--green)",borderRadius:12,marginBottom:20,fontSize:14,color:"var(--green)",fontWeight:600}}>✅ Materiale salvato con successo!</div>}
      {error && <div style={{padding:14,background:"var(--red-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,marginBottom:20,fontSize:13,color:"var(--red)"}}>{error}</div>}

      <div className="s3d-card" style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
        {form.profilo_slicer && <div style={{padding:8,background:"var(--accent-soft)",borderRadius:8,fontSize:12,color:"var(--accent)"}}>Profilo slicer: {form.profilo_slicer}</div>}
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Nome materiale *</label>
          <input type="text" value={form.nome} onChange={e=>up("nome",e.target.value)} placeholder="Es. Bambu PLA Basic" className="s3d-input"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Peso specifico (g/cm³)</label>
            <input type="number" step="0.01" value={form.peso_specifico_gcm3} onChange={e=>up("peso_specifico_gcm3",parseFloat(e.target.value)||0)} className="s3d-input" style={{opacity:form.profilo_slicer?0.6:1}} readOnly={!!form.profilo_slicer}/>
            {form.profilo_slicer && <p style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>Letto dal profilo slicer</p>}</div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Prezzo (€/kg) *</label>
            <input type="number" step="0.01" value={form.prezzo_kg} onChange={e=>up("prezzo_kg",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Markup materiale %</label>
            <input type="number" step="0.1" value={form.markup_percentuale} onChange={e=>up("markup_percentuale",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Fallimento %</label>
            <input type="number" step="0.1" value={form.fallimento_percentuale} onChange={e=>up("fallimento_percentuale",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Magazzino (kg)</label>
            <input type="number" step="0.01" value={form.magazzino_kg} onChange={e=>up("magazzino_kg",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Link acquisto</label>
            <input type="url" value={form.link_acquisto} onChange={e=>up("link_acquisto",e.target.value)} placeholder="https://..." className="s3d-input"/></div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        <button onClick={onBack} className="s3d-btn s3d-btn-ghost">Annulla</button>
        <button onClick={handleSave} disabled={saving||saved} className="s3d-btn s3d-btn-primary" style={{minWidth:160}}>
          {saving?"Salvataggio...":saved?"✅ Salvato!":editId?"Salva modifiche":"Crea materiale"}
        </button>
      </div>
    </div>
  );
}
