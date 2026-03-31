import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

interface Stampante { id:number; nome:string; profilo_slicer:string; slicer_origin:string; consumo_kwh:number; ammortamento_ora:number; }
interface Props { onOpenForm:(id?:number,prefill?:any)=>void; onImportSlicer?:(slicer:"bambu"|"orca"|"anycubic"|"prusa")=>void; }

const ORIGIN_LABEL: Record<string,string> = { bambu:"Bambu", orca:"Orca", anycubic:"Anycubic", prusa:"Prusa" };
const ORIGIN_COLORS: Record<string,{bg:string;fg:string}> = {
  bambu:    { bg:"var(--accent-soft)", fg:"var(--accent)" },
  orca:     { bg:"rgba(0,150,136,0.15)", fg:"#009688" },
  anycubic: { bg:"rgba(66,165,245,0.15)", fg:"#42a5f5" },
  prusa:    { bg:"rgba(237,107,33,0.15)", fg:"#ed6b21" },
};

export function StampantiPage({ onOpenForm, onImportSlicer }:Props) {
  const { t } = useTranslation();
  const [items,setItems] = useState<Stampante[]>([]); const [search,setSearch] = useState("");
  const [costoEnergia,setCostoEnergia] = useState("0.30");
  const [selectedIds,setSelectedIds] = useState<Set<number>>(new Set());
  const load = useCallback(async()=>{ try{ setItems(await invoke<Stampante[]>("get_stampanti")); setCostoEnergia(await invoke<string>("get_impostazione",{chiave:"costo_energia_kwh"})); }catch(e){console.error(e);} },[]);
  useEffect(()=>{load();},[load]);
  const filtered = items.filter(s=>s.nome.toLowerCase().includes(search.toLowerCase()));
  const handleDelete = async(id:number)=>{ await invoke("delete_stampante",{id}).catch(()=>{}); setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;}); await load(); };
  const handleDeleteSelected = async()=>{ for(const id of selectedIds) await invoke("delete_stampante",{id}).catch(()=>{}); setSelectedIds(new Set()); await load(); };
  const saveCostoEnergia = async(val:string)=>{ setCostoEnergia(val); await invoke("set_impostazione",{chiave:"costo_energia_kwh",valore:val}).catch(()=>{}); };
  const toggleSelect=(id:number)=>setSelectedIds(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const toggleSelectAll=()=>{if(selectedIds.size===filtered.length)setSelectedIds(new Set());else setSelectedIds(new Set(filtered.map(s=>s.id)));};

  const getOrigin = (origin: string) => {
    const label = ORIGIN_LABEL[origin] || origin;
    const colors = ORIGIN_COLORS[origin] || ORIGIN_COLORS.bambu;
    return { label, ...colors };
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>{t("stampanti.title")}</h3>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onImportSlicer?.("bambu")} className="s3d-btn s3d-btn-primary" style={{background:"var(--orange)",boxShadow:"0 2px 12px rgba(249,115,22,0.3)"}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {t("materiali.importaSlicer")}
            </span>
          </button>
          <button onClick={()=>onOpenForm()} className="s3d-btn s3d-btn-primary">{t("stampanti.nuova")}</button>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:12,background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:10}}>
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">{t("stampanti.costoEnergia")}</span>
        <input type="number" step="0.01" value={costoEnergia} onChange={e=>saveCostoEnergia(e.target.value)} className="s3d-input" style={{width:96}}/>
        <span className="text-xs text-amber-600">{t("stampanti.costoEnergiaHelp")}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={toggleSelectAll} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
        {selectedIds.size>0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger" style={{padding:"6px 14px",fontSize:12}}>{t("common.delete")} ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("stampanti.searchPlaceholder")} className="s3d-input" style={{flex:1}}/>
      </div>
      <div className="s3d-card" style={{overflow:"hidden"}}>
        {filtered.length===0?(
          <div style={{padding:"48px 0",textAlign:"center",color:"var(--text-muted)"}}>{items.length===0?t("stampanti.noStampanti"):t("common.noResults")}</div>
        ):(
          <table className="s3d-table"><thead><tr style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--border-default)"}}>
            <th style={{width:40}}></th><th>{t("stampanti.thNome")}</th><th>{t("stampanti.thConsumo")}</th><th>{t("stampanti.thAmmortamento")}</th><th style={{textAlign:"right"}}>{t("common.actions")}</th>
          </tr></thead><tbody>{filtered.map(s=>{
            const o = getOrigin(s.slicer_origin);
            return (
            <tr key={s.id} style={{cursor:"pointer"}} onClick={()=>onOpenForm(s.id)}>
              <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(s.id)} onChange={()=>toggleSelect(s.id)} style={{width:16,height:16,accentColor:"var(--accent)"}}/></td>
              <td><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,padding:"2px 8px",background:o.bg,color:o.fg,borderRadius:4,fontWeight:600}}>{o.label}</span><span style={{fontWeight:600}}>{s.nome}</span></div></td>
              <td style={{color:"var(--text-secondary)"}}>{s.consumo_kwh} kW/h</td>
              <td style={{color:"var(--text-secondary)"}}>€ {s.ammortamento_ora.toFixed(2)}/h</td>
              <td style={{textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>onOpenForm(s.id)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:12,fontWeight:600,cursor:"pointer",marginRight:12}}>{t("common.edit")}</button>
                <button onClick={()=>handleDelete(s.id)} style={{background:"none",border:"none",color:"var(--red)",fontSize:12,fontWeight:600,cursor:"pointer"}}>{t("common.delete")}</button>
              </td>
            </tr>
          );})}</tbody></table>
        )}
      </div>
    </div>
  );
}
