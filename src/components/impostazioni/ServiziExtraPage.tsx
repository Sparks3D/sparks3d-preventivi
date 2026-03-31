import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface ServizioExtra { id:number; nome:string; importo_predefinito:number; addebita:boolean; addebita_senza_costo:boolean; markup_percentuale:number; }
interface Props { onOpenForm:(id?:number,prefill?:any)=>void; }
const eur=(n:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n);
const calcPc=(importo:number,markup:number)=>importo+(importo*markup/100);

const PRESETS = [
  { nome:"Post-processing (levigatura)",labelKey:"servizi.sugPostProc",importo_predefinito:10,addebita:true,addebita_senza_costo:false,markup_percentuale:0 },
  { nome:"Verniciatura",labelKey:"servizi.sugVerniciatura",importo_predefinito:15,addebita:true,addebita_senza_costo:false,markup_percentuale:0 },
  { nome:"Inserti filettati",labelKey:"servizi.sugInserti",importo_predefinito:2,addebita:true,addebita_senza_costo:false,markup_percentuale:0 },
  { nome:"Assemblaggio",labelKey:"servizi.sugAssemblaggio",importo_predefinito:5,addebita:true,addebita_senza_costo:false,markup_percentuale:0 },
  { nome:"Urgenza (priorità coda)",labelKey:"servizi.sugUrgenza",importo_predefinito:20,addebita:true,addebita_senza_costo:false,markup_percentuale:50 },
  { nome:"Imballaggio rinforzato",labelKey:"servizi.sugImballaggio",importo_predefinito:3,addebita:false,addebita_senza_costo:false,markup_percentuale:0 },
];

export function ServiziExtraPage({ onOpenForm }:Props) {
  const { t } = useTranslation();
  const [items,setItems] = useState<ServizioExtra[]>([]); const [search,setSearch] = useState("");
  const [selectedIds,setSelectedIds] = useState<Set<number>>(new Set());
  const load = useCallback(async()=>{ try{setItems(await invoke<ServizioExtra[]>("get_servizi_extra"));}catch(e){console.error(e);} },[]);
  useEffect(()=>{load();},[load]);
  const filtered = items.filter(s=>s.nome.toLowerCase().includes(search.toLowerCase()));
  const handleDelete = async(id:number)=>{ await invoke("delete_servizio_extra",{id}).catch(()=>{}); setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;}); await load(); };
  const handleDeleteSelected = async()=>{ for(const id of selectedIds) await invoke("delete_servizio_extra",{id}).catch(()=>{}); setSelectedIds(new Set()); await load(); };
  const toggleSelect=(id:number)=>setSelectedIds(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const toggleSelectAll=()=>{if(selectedIds.size===filtered.length)setSelectedIds(new Set());else setSelectedIds(new Set(filtered.map(s=>s.id)));};

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>{t("servizi.title")}</h3>
        <button onClick={()=>onOpenForm()} className="s3d-btn s3d-btn-primary">{t("servizi.nuovo")}</button>
      </div>
      <div className="s3d-card-glow p-5 mb-5">
        <p style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>{t("servizi.suggerimenti")}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p=>(<button key={p.nome} onClick={()=>onOpenForm(undefined,p)} className="s3d-btn s3d-btn-ghost text-xs">+ {t(p.labelKey)} ({eur(p.importo_predefinito)})</button>))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={toggleSelectAll} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
        {selectedIds.size>0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger">{t("common.deleteSelected")} ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("servizi.searchPlaceholder")} className="s3d-input" style={{flex:1}}/>
      </div>
      <div className="s3d-card" style={{overflow:"hidden"}}>
        {filtered.length===0?(
          <div style={{padding:"48px 0",textAlign:"center",color:"var(--text-muted)"}}>{items.length===0?t("servizi.noServizi"):t("common.noResults")}</div>
        ):(
          <table className="s3d-table"><thead><tr style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--border-default)"}}>
            <th style={{width:40}}></th><th>{t("servizi.thServizio")}</th><th>{t("servizi.thCostoBase")}</th><th>{t("servizi.thMarkup")}</th><th>{t("servizi.thCliente")}</th><th>{t("servizi.thAddebito")}</th><th style={{textAlign:"right"}}>{t("common.actions")}</th>
          </tr></thead><tbody>{filtered.map(s=>{const pc=calcPc(s.importo_predefinito,s.markup_percentuale);return(
            <tr key={s.id} style={{cursor:"pointer"}} onClick={()=>onOpenForm(s.id)}>
              <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={()=>toggleSelect(s.id)} style={{width:16,height:16,accentColor:"var(--accent)"}}/></td>
              <td><span style={{fontWeight:600,color:"var(--text-primary)"}}>{s.nome}</span></td>
              <td style={{fontVariantNumeric:"tabular-nums"}}>{eur(s.importo_predefinito)}</td>
              <td>{s.markup_percentuale>0?<span style={{color:"var(--purple,#c084fc)",fontWeight:600}}>+{s.markup_percentuale}%</span>:<span style={{color:"var(--text-muted)"}}>—</span>}</td>
              <td style={{fontVariantNumeric:"tabular-nums",fontWeight:600}}>{s.addebita||s.addebita_senza_costo?<span style={{color:"var(--green)"}}>{eur(pc)}</span>:<span style={{color:"var(--text-muted)"}}>—</span>}</td>
              <td>{s.addebita?<span className="s3d-badge" style={{background:"var(--green-soft)",color:"var(--green)"}}>{t("servizi.addebitoSi")}</span>:s.addebita_senza_costo?<span className="s3d-badge" style={{background:"var(--orange-soft)",color:"var(--orange)"}}>{t("servizi.addebitoNoCosto")}</span>:<span style={{color:"var(--text-muted)",fontSize:12}}>{t("servizi.addebitoInterno")}</span>}</td>
              <td style={{textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>onOpenForm(s.id)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:12,fontWeight:600,cursor:"pointer",marginRight:12}}>{t("common.edit")}</button>
                <button onClick={()=>handleDelete(s.id)} style={{background:"none",border:"none",color:"var(--red)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{t("common.delete")}</button>
              </td>
            </tr>);})}</tbody></table>
        )}
      </div>
      {items.length>0 && <div style={{marginTop:12,fontSize:12,color:"var(--text-muted)"}}>{t("servizi.countLabel", { count: filtered.length, total: items.length })}</div>}
    </div>
  );
}
