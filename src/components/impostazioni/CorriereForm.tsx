import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Corriere { id:number; nome:string; servizio:string; costo_spedizione:number; tempo_consegna:string; packlink_service_id:string; note:string; }
interface Props { editId?:number|null; prefill?:Partial<Corriere>; onBack:()=>void; }
const EMPTY:Omit<Corriere,"id"> = { nome:"",servizio:"",costo_spedizione:0,tempo_consegna:"",packlink_service_id:"",note:"" };

export function CorriereForm({ editId, prefill, onBack }:Props) {
  const [form,setForm] = useState<Omit<Corriere,"id">>(EMPTY);
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false); const [saved,setSaved] = useState(false);

  useEffect(()=>{
    if (editId) invoke<Corriere[]>("get_corrieri").then(items=>{ const c=items.find(i=>i.id===editId); if(c) setForm({nome:c.nome,servizio:c.servizio,costo_spedizione:c.costo_spedizione,tempo_consegna:c.tempo_consegna,packlink_service_id:c.packlink_service_id,note:c.note}); });
    else if (prefill) setForm({...EMPTY,...prefill});
  },[editId,prefill]);

  const up=(f:string,v:string|number)=>setForm(p=>({...p,[f]:v}));
  const handleSave=async()=>{
    if(!form.nome.trim()){setError("Il nome non può essere vuoto");return;}
    try{ setSaving(true);setError("");
      const data={id:editId||0,...form};
      if(editId) await invoke("update_corriere",{id:editId,data});
      else await invoke("create_corriere",{data});
      setSaved(true);setTimeout(()=>onBack(),800);
    }catch(e:any){setError(String(e));}finally{setSaving(false);}
  };

  return (
    <div className="animate-fade-in" style={{maxWidth:640}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>← Torna a Corrieri</button>
      <h2 style={{fontSize:26,fontWeight:800,color:"var(--text-primary)",marginBottom:24}}>{editId?"Modifica corriere":"Nuovo corriere"}</h2>
      {saved && <div style={{padding:14,background:"var(--green-soft)",border:"1px solid var(--green)",borderRadius:12,marginBottom:20,fontSize:14,color:"var(--green)",fontWeight:600}}>✅ Corriere salvato con successo!</div>}
      {error && <div style={{padding:14,background:"var(--red-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,marginBottom:20,fontSize:13,color:"var(--red)"}}>{error}</div>}
      <div className="s3d-card" style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
        {form.packlink_service_id && <div style={{padding:8,background:"var(--accent-soft)",borderRadius:8,fontSize:12,color:"var(--accent)"}}>PackLink ID: {form.packlink_service_id}</div>}
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Nome corriere *</label>
          <input type="text" value={form.nome} onChange={e=>up("nome",e.target.value)} placeholder="Es. BRT, GLS, DHL" className="s3d-input"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Servizio</label>
            <input type="text" value={form.servizio} onChange={e=>up("servizio",e.target.value)} placeholder="Es. Express, Economy" className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Costo spedizione (€)</label>
            <input type="number" step="0.01" min="0" value={form.costo_spedizione} onChange={e=>up("costo_spedizione",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Tempo consegna</label>
            <input type="text" value={form.tempo_consegna} onChange={e=>up("tempo_consegna",e.target.value)} placeholder="Es. 24-48h" className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>PackLink Service ID</label>
            <input type="text" value={form.packlink_service_id} onChange={e=>up("packlink_service_id",e.target.value)} placeholder="Auto da PackLink" className="s3d-input" style={{opacity:0.6}}/></div>
        </div>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>Note</label>
          <textarea value={form.note} onChange={e=>up("note",e.target.value)} placeholder="Note libere…" rows={2} className="s3d-input" style={{resize:"vertical"}}/></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        <button onClick={onBack} className="s3d-btn s3d-btn-ghost">Annulla</button>
        <button onClick={handleSave} disabled={saving||saved} className="s3d-btn s3d-btn-primary" style={{minWidth:160}}>
          {saving?"Salvataggio...":saved?"✅ Salvato!":editId?"Salva modifiche":"Crea corriere"}</button>
      </div>
    </div>
  );
}
