import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface Stampante { id:number; nome:string; profilo_slicer:string; slicer_origin:string; consumo_kwh:number; ammortamento_ora:number; }
interface Props { editId?:number|null; prefill?:any; onBack:()=>void; }
const EMPTY:Omit<Stampante,"id"> = { nome:"",profilo_slicer:"",slicer_origin:"bambu",consumo_kwh:0.12,ammortamento_ora:1.5 };

export function StampanteForm({ editId, prefill, onBack }:Props) {
  const { t } = useTranslation();
  const [form,setForm] = useState(EMPTY);
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false); const [saved,setSaved] = useState(false);

  useEffect(()=>{
    if (editId) invoke<Stampante[]>("get_stampanti").then(items=>{ const s=items.find(i=>i.id===editId); if(s) setForm({nome:s.nome,profilo_slicer:s.profilo_slicer,slicer_origin:s.slicer_origin,consumo_kwh:s.consumo_kwh,ammortamento_ora:s.ammortamento_ora}); });
    else if (prefill?.nome) setForm({...EMPTY,nome:prefill.nome,profilo_slicer:prefill.nome,slicer_origin:prefill.origin||"bambu"});
  },[editId,prefill]);

  const up=(f:string,v:string|number)=>setForm(p=>({...p,[f]:v}));
  const handleSave=async()=>{
    if(!form.nome.trim()){setError(t("stampanti.errNome"));return;}
    try{ setSaving(true);setError("");
      if(editId) await invoke("update_stampante",{id:editId,data:{id:editId,...form}});
      else await invoke("create_stampante",{data:{id:0,...form}});
      setSaved(true);setTimeout(()=>onBack(),800);
    }catch(e:any){setError(String(e));}finally{setSaving(false);}
  };

  return (
    <div className="animate-fade-in" style={{maxWidth:640}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>{t("stampanti.tornaAStampanti")}</button>
      <h2 style={{fontSize:26,fontWeight:800,color:"var(--text-primary)",marginBottom:24}}>{editId?t("stampanti.formTitleEdit"):t("stampanti.formTitleNew")}</h2>
      {saved && <div style={{padding:14,background:"var(--green-soft)",border:"1px solid var(--green)",borderRadius:12,marginBottom:20,fontSize:14,color:"var(--green)",fontWeight:600}}>{t("stampanti.salvata")}</div>}
      {error && <div style={{padding:14,background:"var(--red-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,marginBottom:20,fontSize:13,color:"var(--red)"}}>{error}</div>}
      <div className="s3d-card" style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
        {form.profilo_slicer && <div style={{padding:8,background:"var(--accent-soft)",borderRadius:8,fontSize:12,color:"var(--accent)"}}>{t("materiali.profiloSlicer")} {form.profilo_slicer}</div>}
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("stampanti.labelNome")}</label>
          <input type="text" value={form.nome} onChange={e=>up("nome",e.target.value)} placeholder={t("stampanti.phNome")} className="s3d-input"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("stampanti.labelConsumo")}</label>
            <input type="number" step="0.01" value={form.consumo_kwh} onChange={e=>up("consumo_kwh",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("stampanti.labelAmmortamento")}</label>
            <input type="number" step="0.01" value={form.ammortamento_ora} onChange={e=>up("ammortamento_ora",parseFloat(e.target.value)||0)} className="s3d-input"/>
            <p style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{t("stampanti.ammortamentoHelp")}</p></div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        <button onClick={onBack} className="s3d-btn s3d-btn-ghost">{t("common.cancel")}</button>
        <button onClick={handleSave} disabled={saving||saved} className="s3d-btn s3d-btn-primary" style={{minWidth:160}}>
          {saving?t("common.saving"):saved?t("common.saved"):editId?t("common.save"):t("stampanti.crea")}</button>
      </div>
    </div>
  );
}
