import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface ServizioExtra { id:number; nome:string; importo_predefinito:number; addebita:boolean; addebita_senza_costo:boolean; markup_percentuale:number; }
interface Props { editId?:number|null; prefill?:Omit<ServizioExtra,"id">; onBack:()=>void; }
const EMPTY:Omit<ServizioExtra,"id"> = { nome:"",importo_predefinito:0,addebita:false,addebita_senza_costo:false,markup_percentuale:0 };
const eur=(n:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n);

export function ServizioExtraForm({ editId, prefill, onBack }:Props) {
  const { t } = useTranslation();
  const [form,setForm] = useState(EMPTY);
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false); const [saved,setSaved] = useState(false);

  useEffect(()=>{
    if (editId) invoke<ServizioExtra[]>("get_servizi_extra").then(items=>{ const s=items.find(i=>i.id===editId); if(s) setForm({nome:s.nome,importo_predefinito:s.importo_predefinito,addebita:s.addebita,addebita_senza_costo:s.addebita_senza_costo,markup_percentuale:s.markup_percentuale}); });
    else if (prefill) setForm({...prefill});
  },[editId,prefill]);

  const pc=form.importo_predefinito+(form.importo_predefinito*form.markup_percentuale/100);
  const handleSave=async()=>{
    if(!form.nome.trim()){setError(t("servizi.errNome"));return;}
    try{ setSaving(true);setError("");
      if(editId) await invoke("update_servizio_extra",{id:editId,data:{id:editId,...form}});
      else await invoke("create_servizio_extra",{data:{id:0,...form}});
      setSaved(true);setTimeout(()=>onBack(),800);
    }catch(e:any){setError(String(e));}finally{setSaving(false);}
  };

  return (
    <div className="animate-fade-in" style={{maxWidth:640}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>{t("servizi.tornaAServizi")}</button>
      <h2 style={{fontSize:26,fontWeight:800,color:"var(--text-primary)",marginBottom:24}}>{editId?t("servizi.formTitleEdit"):t("servizi.formTitleNew")}</h2>
      {saved && <div style={{padding:14,background:"var(--green-soft)",border:"1px solid var(--green)",borderRadius:12,marginBottom:20,fontSize:14,color:"var(--green)",fontWeight:600}}>{t("servizi.salvato")}</div>}
      {error && <div style={{padding:14,background:"var(--red-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,marginBottom:20,fontSize:13,color:"var(--red)"}}>{error}</div>}
      <div className="s3d-card" style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("servizi.labelNome")}</label>
          <input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder={t("servizi.phNome")} className="s3d-input"/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("servizi.labelCostoBase")}</label>
            <input type="number" step="0.01" min="0" value={form.importo_predefinito} onChange={e=>setForm({...form,importo_predefinito:parseFloat(e.target.value)||0})} className="s3d-input"/></div>
          <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("servizi.labelMarkup")}</label>
            <input type="number" step="0.1" min="0" value={form.markup_percentuale} onChange={e=>setForm({...form,markup_percentuale:parseFloat(e.target.value)||0})} className="s3d-input"/></div>
        </div>
        {form.importo_predefinito>0 && (
          <div style={{padding:12,background:"var(--accent-soft)",borderRadius:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:"var(--text-secondary)"}}>{t("servizi.costoBaseLabel")}</span><span>{eur(form.importo_predefinito)}</span></div>
            {form.markup_percentuale>0 && <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginTop:4}}><span style={{color:"var(--text-secondary)"}}>{t("servizi.piuMarkup")} {form.markup_percentuale}%</span><span>{eur(form.importo_predefinito*form.markup_percentuale/100)}</span></div>}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginTop:4,paddingTop:4,borderTop:"1px solid var(--border-subtle)"}}>
              <span style={{fontWeight:600,color:"var(--text-primary)"}}>{t("servizi.prezzoCliente")}</span>
              <span style={{fontWeight:700,color:"var(--green)"}}>{eur(pc)}</span></div>
          </div>
        )}
        <div>
          <p style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>{t("servizi.sezComportamento")}</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={form.addebita} onChange={e=>setForm({...form,addebita:e.target.checked,addebita_senza_costo:e.target.checked?false:form.addebita_senza_costo})} style={{width:16,height:16,marginTop:2,accentColor:"var(--accent)"}}/>
              <div><span style={{fontSize:13,color:"var(--text-secondary)",fontWeight:600}}>{t("servizi.addebitaAlCliente")}</span>
                <p style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{t("servizi.addebitaAlClienteHelp")}</p></div></label>
            <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
              <input type="checkbox" checked={form.addebita_senza_costo} onChange={e=>setForm({...form,addebita_senza_costo:e.target.checked,addebita:e.target.checked?false:form.addebita})} style={{width:16,height:16,marginTop:2,accentColor:"var(--accent)"}}/>
              <div><span style={{fontSize:13,color:"var(--text-secondary)",fontWeight:600}}>{t("servizi.mostraSenzaCosto")}</span>
                <p style={{fontSize:11,color:"var(--text-muted)",marginTop:2}}>{t("servizi.mostraSenzaCostoHelp")}</p></div></label>
            {!form.addebita && !form.addebita_senza_costo && <p style={{fontSize:11,color:"var(--text-muted)",marginLeft:26}}>{t("servizi.costoInterno")}</p>}
          </div>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        <button onClick={onBack} className="s3d-btn s3d-btn-ghost">{t("common.cancel")}</button>
        <button onClick={handleSave} disabled={saving||saved} className="s3d-btn s3d-btn-primary" style={{minWidth:160}}>
          {saving?t("common.saving"):saved?t("common.saved"):editId?t("common.save"):t("servizi.crea")}</button>
      </div>
    </div>
  );
}
