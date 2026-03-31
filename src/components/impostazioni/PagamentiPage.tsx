import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface MetodoPagamento { id:number; nome:string; descrizione_pdf:string; commissione_percentuale:number; commissione_fissa:number; addebita_al_cliente:boolean; }
interface Props { onOpenForm:(id?:number,prefill?:any)=>void; }
const eur=(n:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n);
function getIcon(nome:string):string { const n=nome.toLowerCase(); if(n.includes("paypal"))return"🅿️"; if(n.includes("bonifico")||n.includes("banca"))return"🏦"; if(n.includes("carta")||n.includes("credit"))return"💳"; if(n.includes("contant"))return"💵"; if(n.includes("satispay"))return"📱"; return"💰"; }

const PRESETS = [
  { nome:"PayPal",labelKey:"pagamenti.predefPaypal",descrizione_pdf:"Pagamento tramite PayPal all'indirizzo: ___@___.com",commissione_percentuale:3.4,commissione_fissa:0.35,addebita_al_cliente:true },
  { nome:"Bonifico bancario",labelKey:"pagamenti.predefBonifico",descrizione_pdf:"Pagamento tramite bonifico bancario.\nIBAN: IT___ intestato a ___",commissione_percentuale:0,commissione_fissa:0,addebita_al_cliente:false },
  { nome:"Carta di credito",labelKey:"pagamenti.predefCarta",descrizione_pdf:"Pagamento con carta di credito/debito",commissione_percentuale:0,commissione_fissa:0,addebita_al_cliente:false },
  { nome:"Contanti",labelKey:"pagamenti.predefContanti",descrizione_pdf:"Pagamento in contanti alla consegna",commissione_percentuale:0,commissione_fissa:0,addebita_al_cliente:false },
  { nome:"Satispay",labelKey:"pagamenti.predefSatispay",descrizione_pdf:"Pagamento tramite Satispay",commissione_percentuale:0,commissione_fissa:0,addebita_al_cliente:false },
];

export function PagamentiPage({ onOpenForm }:Props) {
  const { t } = useTranslation();
  const [items,setItems] = useState<MetodoPagamento[]>([]); const [search,setSearch] = useState("");
  const [selectedIds,setSelectedIds] = useState<Set<number>>(new Set());
  const load = useCallback(async()=>{ try{setItems(await invoke<MetodoPagamento[]>("get_metodi_pagamento"));}catch(e){console.error(e);} },[]);
  useEffect(()=>{load();},[load]);
  const filtered = items.filter(m=>m.nome.toLowerCase().includes(search.toLowerCase())||m.descrizione_pdf.toLowerCase().includes(search.toLowerCase()));
  const handleDelete = async(id:number)=>{ await invoke("delete_metodo_pagamento",{id}).catch(()=>{}); setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;}); await load(); };
  const handleDeleteSelected = async()=>{ for(const id of selectedIds) await invoke("delete_metodo_pagamento",{id}).catch(()=>{}); setSelectedIds(new Set()); await load(); };
  const toggleSelect=(id:number)=>setSelectedIds(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const toggleSelectAll=()=>{if(selectedIds.size===filtered.length)setSelectedIds(new Set());else setSelectedIds(new Set(filtered.map(m=>m.id)));};

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>{t("pagamenti.title")}</h3>
        <button onClick={()=>onOpenForm()} className="s3d-btn s3d-btn-primary">{t("pagamenti.nuovo")}</button>
      </div>
      <div className="s3d-card-glow p-5 mb-5">
        <p style={{fontSize:11,fontWeight:700,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:12}}>{t("pagamenti.aggiungiRapidamente")}</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p=>(<button key={p.nome} onClick={()=>onOpenForm(undefined,p)} className="s3d-btn s3d-btn-ghost text-xs">{getIcon(p.nome)} {t(p.labelKey)}{p.commissione_percentuale>0&&<span style={{opacity:0.6,marginLeft:4}}>({p.commissione_percentuale}% + {eur(p.commissione_fissa)})</span>}</button>))}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={toggleSelectAll} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
        {selectedIds.size>0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger">{t("common.deleteSelected")} ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("pagamenti.searchPlaceholder")} className="s3d-input" style={{flex:1}}/>
      </div>
      <div className="s3d-card" style={{overflow:"hidden"}}>
        {filtered.length===0?(
          <div style={{padding:"48px 0",textAlign:"center",color:"var(--text-muted)"}}>{items.length===0?t("pagamenti.noMetodi"):t("common.noResults")}</div>
        ):(
          <table className="s3d-table"><thead><tr style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--border-default)"}}>
            <th style={{width:40}}></th><th>{t("pagamenti.thMetodo")}</th><th>{t("pagamenti.thDescrizionePdf")}</th><th>{t("pagamenti.thCommissione")}</th><th>{t("pagamenti.thAddebito")}</th><th style={{textAlign:"right"}}>{t("common.actions")}</th>
          </tr></thead><tbody>{filtered.map(m=>(
            <tr key={m.id} style={{cursor:"pointer"}} onClick={()=>onOpenForm(m.id)}>
              <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={()=>toggleSelect(m.id)} style={{width:16,height:16,accentColor:"var(--accent)"}}/></td>
              <td><div style={{display:"flex",alignItems:"center",gap:8}}><span>{getIcon(m.nome)}</span><span style={{fontWeight:600,color:"var(--text-primary)"}}>{m.nome}</span></div></td>
              <td><span style={{fontSize:12,color:"var(--text-secondary)",maxWidth:200,display:"inline-block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.descrizione_pdf||"—"}</span></td>
              <td>{m.commissione_percentuale>0||m.commissione_fissa>0?<span style={{color:"var(--orange)",fontWeight:600,fontSize:13}}>{m.commissione_percentuale>0&&`${m.commissione_percentuale}%`}{m.commissione_percentuale>0&&m.commissione_fissa>0&&" + "}{m.commissione_fissa>0&&eur(m.commissione_fissa)}</span>:<span style={{color:"var(--text-muted)"}}>—</span>}</td>
              <td>{m.addebita_al_cliente?<span className="s3d-badge" style={{background:"var(--green-soft)",color:"var(--green)"}}>{t("pagamenti.addebitoCliente")}</span>:<span style={{color:"var(--text-muted)",fontSize:12}}>{t("common.no")}</span>}</td>
              <td style={{textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>onOpenForm(m.id)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:12,fontWeight:600,cursor:"pointer",marginRight:12}}>{t("common.edit")}</button>
                <button onClick={()=>handleDelete(m.id)} style={{background:"none",border:"none",color:"var(--red)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{t("common.delete")}</button>
              </td>
            </tr>
          ))}</tbody></table>
        )}
      </div>
      {items.length>0 && <div style={{marginTop:12,fontSize:12,color:"var(--text-muted)"}}>{t("pagamenti.countLabel", { count: filtered.length, total: items.length })}</div>}
    </div>
  );
}
