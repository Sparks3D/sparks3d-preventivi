import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface ProfiloStampa { id:number; nome:string; profilo_slicer:string; slicer_origin:string; layer_height_mm:number; numero_pareti:number; infill_percentuale:number; top_layers:number; bottom_layers:number; supporti_albero:boolean; supporti_normali:boolean; }
interface Props { editId?:number|null; prefill?:any; onBack:()=>void; }
const EMPTY:Omit<ProfiloStampa,"id"> = { nome:"",profilo_slicer:"",slicer_origin:"bambu",layer_height_mm:0.2,numero_pareti:2,infill_percentuale:15,top_layers:4,bottom_layers:4,supporti_albero:false,supporti_normali:false };

export function ProfiloStampaForm({ editId, prefill, onBack }:Props) {
  const { t } = useTranslation();
  const [form,setForm] = useState(EMPTY);
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false); const [saved,setSaved] = useState(false);

  useEffect(()=>{
    if (editId) invoke<ProfiloStampa[]>("get_profili").then(items=>{ const p=items.find(i=>i.id===editId); if(p) setForm({nome:p.nome,profilo_slicer:p.profilo_slicer,slicer_origin:p.slicer_origin,layer_height_mm:p.layer_height_mm,numero_pareti:p.numero_pareti,infill_percentuale:p.infill_percentuale,top_layers:p.top_layers,bottom_layers:p.bottom_layers,supporti_albero:p.supporti_albero,supporti_normali:p.supporti_normali}); });
    else if (prefill?.params) {
      const p=prefill.params;
      const pn=(v:any,d:number)=>v?parseFloat(String(v).replace('%',''))||d:d;
      const pi=(v:any,d:number)=>v?parseInt(String(v))||d:d;
      const se=p.enable_support?(String(p.enable_support)==="1"||String(p.enable_support)==="true"):false;
      const isTree=se&&p.support_type?String(p.support_type).includes("tree"):false;
      setForm({nome:prefill.nome,profilo_slicer:prefill.nome,slicer_origin:prefill.origin||"bambu",layer_height_mm:pn(p.layer_height,0.2),numero_pareti:pi(p.wall_loops,2),infill_percentuale:pn(p.sparse_infill_density,15),top_layers:pi(p.top_shell_layers,4),bottom_layers:pi(p.bottom_shell_layers,4),supporti_albero:isTree,supporti_normali:se&&!isTree});
    }
  },[editId,prefill]);

  const up=(f:string,v:string|number|boolean)=>setForm(p=>({...p,[f]:v}));
  const handleSave=async()=>{
    if(!form.nome.trim()){setError(t("profili.errNome"));return;}
    try{ setSaving(true);setError("");
      const payload={id:editId||0,...form};
      if(editId) await invoke("update_profilo",{id:editId,data:payload});
      else await invoke("create_profilo",{data:payload});
      setSaved(true);setTimeout(()=>onBack(),800);
    }catch(e:any){setError(String(e));}finally{setSaving(false);}
  };

  return (
    <div className="animate-fade-in" style={{maxWidth:640}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>{t("profili.tornaAProfili")}</button>
      <h2 style={{fontSize:26,fontWeight:800,color:"var(--text-primary)",marginBottom:24}}>{editId?t("profili.formTitleEdit"):t("profili.formTitleNew")}</h2>
      {saved && <div style={{padding:14,background:"var(--green-soft)",border:"1px solid var(--green)",borderRadius:12,marginBottom:20,fontSize:14,color:"var(--green)",fontWeight:600}}>{t("profili.salvato")}</div>}
      {error && <div style={{padding:14,background:"var(--red-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,marginBottom:20,fontSize:13,color:"var(--red)"}}>{error}</div>}
      <div className="s3d-card" style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
        {form.profilo_slicer && <div style={{padding:8,background:"var(--accent-soft)",borderRadius:8,fontSize:12,color:"var(--accent)"}}>{t("materiali.profiloSlicer")} {form.profilo_slicer}</div>}
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("profili.labelNome")}</label>
          <input type="text" value={form.nome} onChange={e=>up("nome",e.target.value)} className="s3d-input"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("profili.labelLayer")}</label>
            <input type="number" step="0.01" value={form.layer_height_mm} onChange={e=>up("layer_height_mm",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("profili.labelPareti")}</label>
            <input type="number" step="1" value={form.numero_pareti} onChange={e=>up("numero_pareti",parseInt(e.target.value)||0)} className="s3d-input"/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("profili.labelInfill")}</label>
            <input type="number" step="1" value={form.infill_percentuale} onChange={e=>up("infill_percentuale",parseFloat(e.target.value)||0)} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("profili.labelTopLayers")}</label>
            <input type="number" step="1" value={form.top_layers} onChange={e=>up("top_layers",parseInt(e.target.value)||0)} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("profili.labelBottomLayers")}</label>
            <input type="number" step="1" value={form.bottom_layers} onChange={e=>up("bottom_layers",parseInt(e.target.value)||0)} className="s3d-input"/></div>
        </div>
        <div>
          <label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:8}}>{t("profili.labelSupporti")}</label>
          <div style={{display:"flex",gap:24}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <input type="checkbox" checked={form.supporti_albero} onChange={e=>{up("supporti_albero",e.target.checked);if(e.target.checked)up("supporti_normali",false);}} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
              <span style={{fontSize:13,color:"var(--text-secondary)"}}>{t("profili.supportiAlbero")}</span></label>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <input type="checkbox" checked={form.supporti_normali} onChange={e=>{up("supporti_normali",e.target.checked);if(e.target.checked)up("supporti_albero",false);}} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
              <span style={{fontSize:13,color:"var(--text-secondary)"}}>{t("profili.supportiNormali")}</span></label>
          </div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        <button onClick={onBack} className="s3d-btn s3d-btn-ghost">{t("common.cancel")}</button>
        <button onClick={handleSave} disabled={saving||saved} className="s3d-btn s3d-btn-primary" style={{minWidth:160}}>
          {saving?t("common.saving"):saved?t("common.saved"):editId?t("common.save"):t("profili.crea")}</button>
      </div>
    </div>
  );
}
