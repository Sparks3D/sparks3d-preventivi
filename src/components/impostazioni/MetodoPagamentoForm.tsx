import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface MetodoPagamento { id:number; nome:string; descrizione_pdf:string; commissione_percentuale:number; commissione_fissa:number; addebita_al_cliente:boolean; }
interface Props { editId?:number|null; prefill?:Omit<MetodoPagamento,"id">; onBack:()=>void; }
const EMPTY:Omit<MetodoPagamento,"id"> = { nome:"",descrizione_pdf:"",commissione_percentuale:0,commissione_fissa:0,addebita_al_cliente:false };
const eur=(n:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n);
export function MetodoPagamentoForm({ editId, prefill, onBack }:Props) {
  const { t } = useTranslation();
  const [form,setForm] = useState(EMPTY);
  const [error,setError] = useState(""); const [saving,setSaving] = useState(false); const [saved,setSaved] = useState(false);

  useEffect(()=>{
    if (editId) invoke<MetodoPagamento[]>("get_metodi_pagamento").then(items=>{ const m=items.find(i=>i.id===editId); if(m) setForm({nome:m.nome,descrizione_pdf:m.descrizione_pdf,commissione_percentuale:m.commissione_percentuale,commissione_fissa:m.commissione_fissa,addebita_al_cliente:m.addebita_al_cliente}); });
    else if (prefill) setForm({...prefill});
  },[editId,prefill]);

  const calcComm=(importo:number)=>(importo*form.commissione_percentuale/100)+form.commissione_fissa;
  const handleSave=async()=>{
    if(!form.nome.trim()){setError(t("pagamenti.errNome"));return;}
    try{ setSaving(true);setError("");
      if(editId) await invoke("update_metodo_pagamento",{id:editId,data:{id:editId,...form}});
      else await invoke("create_metodo_pagamento",{data:{id:0,...form}});
      setSaved(true);setTimeout(()=>onBack(),800);
    }catch(e:any){setError(String(e));}finally{setSaving(false);}
  };

  return (
    <div className="animate-fade-in" style={{maxWidth:640}}>
      <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"var(--text-muted)",fontSize:13,cursor:"pointer",padding:"6px 0",marginBottom:24}}
        onMouseEnter={e=>e.currentTarget.style.color="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.color="var(--text-muted)"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>{t("pagamenti.tornaAPagamenti")}</button>
      <h2 style={{fontSize:26,fontWeight:800,color:"var(--text-primary)",marginBottom:24}}>{editId?t("pagamenti.formTitleEdit"):t("pagamenti.formTitleNew")}</h2>
      {saved && <div style={{padding:14,background:"var(--green-soft)",border:"1px solid var(--green)",borderRadius:12,marginBottom:20,fontSize:14,color:"var(--green)",fontWeight:600}}>{t("pagamenti.salvato")}</div>}
      {error && <div style={{padding:14,background:"var(--red-soft)",border:"1px solid rgba(244,63,94,0.3)",borderRadius:12,marginBottom:20,fontSize:13,color:"var(--red)"}}>{error}</div>}
      <div className="s3d-card" style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("pagamenti.labelNome")}</label>
          <input type="text" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder={t("pagamenti.phNome")} className="s3d-input"/></div>
        <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("pagamenti.labelDescPdf")}</label>
          <textarea value={form.descrizione_pdf} onChange={e=>setForm({...form,descrizione_pdf:e.target.value})} placeholder={t("pagamenti.phDescPdf")} rows={3} className="s3d-input" style={{resize:"vertical"}}/>
          <p style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{t("pagamenti.descPdfHelp")}</p></div>
        <div>
          <p style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>{t("pagamenti.sezCommissioni")}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("pagamenti.labelPercentuale")}</label>
              <input type="number" step="0.01" min="0" value={form.commissione_percentuale} onChange={e=>setForm({...form,commissione_percentuale:parseFloat(e.target.value)||0})} className="s3d-input"/>
              <p style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{t("pagamenti.phPercentuale")}</p></div>
            <div><label style={{display:"block",fontSize:12,fontWeight:600,color:"var(--text-muted)",marginBottom:4}}>{t("pagamenti.labelFisso")}</label>
              <input type="number" step="0.01" min="0" value={form.commissione_fissa} onChange={e=>setForm({...form,commissione_fissa:parseFloat(e.target.value)||0})} className="s3d-input"/>
              <p style={{fontSize:11,color:"var(--text-muted)",marginTop:4}}>{t("pagamenti.phFisso")}</p></div>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginTop:16}}>
            <input type="checkbox" checked={form.addebita_al_cliente} onChange={e=>setForm({...form,addebita_al_cliente:e.target.checked})} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
            <span style={{fontSize:13,color:"var(--text-secondary)",fontWeight:600}}>{t("pagamenti.addebitaAlCliente")}</span></label>
          {form.addebita_al_cliente && <p style={{fontSize:11,color:"var(--text-muted)",marginTop:6,marginLeft:26}}>{t("pagamenti.addebitaHelp")}</p>}
        </div>
        {(form.commissione_percentuale>0||form.commissione_fissa>0) && (
          <div style={{padding:16,background:"var(--orange-soft,rgba(251,146,60,.1))",border:"1px solid rgba(251,146,60,.25)",borderRadius:10}}>
            <p style={{fontSize:10,fontWeight:700,color:"var(--orange)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:8}}>{t("pagamenti.simulazione")}</p>
            {[50,100,200,500].map(importo=>{const c=calcComm(importo);return(
              <div key={importo} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginTop:4}}>
                <span style={{color:"var(--text-secondary)"}}>{t("pagamenti.preventivo")} {eur(importo)}</span>
                <span style={{fontWeight:600,color:"var(--orange)"}}>+{eur(c)} {form.addebita_al_cliente&&<span style={{color:"var(--text-muted)",fontWeight:400}}>→ {eur(importo+c)}</span>}</span>
              </div>);
            })}
          </div>
        )}
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        <button onClick={onBack} className="s3d-btn s3d-btn-ghost">{t("common.cancel")}</button>
        <button onClick={handleSave} disabled={saving||saved} className="s3d-btn s3d-btn-primary" style={{minWidth:160}}>
          {saving?t("common.saving"):saved?t("common.saved"):editId?t("common.save"):t("pagamenti.crea")}</button>
      </div>
    </div>
  );
}
