import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ProfiloStampa { id:number; nome:string; profilo_slicer:string; slicer_origin:string; layer_height_mm:number; numero_pareti:number; infill_percentuale:number; top_layers:number; bottom_layers:number; supporti_albero:boolean; supporti_normali:boolean; }
interface Props { onOpenForm:(id?:number,prefill?:any)=>void; onImportSlicer?:(slicer:"bambu"|"orca"|"anycubic")=>void; }

const ORIGIN_LABEL: Record<string,string> = { bambu:"Bambu", orca:"Orca", anycubic:"Anycubic" };
const ORIGIN_COLORS: Record<string,{bg:string;fg:string}> = {
  bambu:    { bg:"var(--accent-soft)", fg:"var(--accent)" },
  orca:     { bg:"rgba(0,150,136,0.15)", fg:"#009688" },
  anycubic: { bg:"rgba(66,165,245,0.15)", fg:"#42a5f5" },
};

export function ProfiliStampaPage({ onOpenForm, onImportSlicer }:Props) {
  const [items,setItems] = useState<ProfiloStampa[]>([]); const [search,setSearch] = useState("");
  const [selectedIds,setSelectedIds] = useState<Set<number>>(new Set());
  const load = useCallback(async()=>{ try{setItems(await invoke<ProfiloStampa[]>("get_profili"));}catch(e){console.error(e);} },[]);
  useEffect(()=>{load();},[load]);
  const filtered = items.filter(p=>p.nome.toLowerCase().includes(search.toLowerCase()));
  const handleDelete = async(id:number)=>{ await invoke("delete_profilo",{id}).catch(()=>{}); setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;}); await load(); };
  const handleDeleteSelected = async()=>{ for(const id of selectedIds) await invoke("delete_profilo",{id}).catch(()=>{}); setSelectedIds(new Set()); await load(); };
  const toggleSelect=(id:number)=>setSelectedIds(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const toggleSelectAll=()=>{if(selectedIds.size===filtered.length)setSelectedIds(new Set());else setSelectedIds(new Set(filtered.map(p=>p.id)));};

  const getOrigin = (origin: string) => {
    const label = ORIGIN_LABEL[origin] || origin;
    const colors = ORIGIN_COLORS[origin] || ORIGIN_COLORS.bambu;
    return { label, ...colors };
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>Profili di stampa</h3>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onImportSlicer?.("bambu")} className="s3d-btn s3d-btn-primary" style={{background:"var(--orange)",boxShadow:"0 2px 12px rgba(249,115,22,0.3)"}}>
            <span style={{display:"flex",alignItems:"center",gap:6}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Importa dallo Slicer
            </span>
          </button>
          <button onClick={()=>onOpenForm()} className="s3d-btn s3d-btn-primary">Nuovo profilo</button>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={toggleSelectAll} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
        {selectedIds.size>0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger" style={{padding:"6px 14px",fontSize:12}}>Elimina ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca profilo" className="s3d-input" style={{flex:1}}/>
      </div>
      <div className="s3d-card" style={{overflow:"hidden"}}>
        {filtered.length===0?(
          <div style={{padding:"48px 0",textAlign:"center",color:"var(--text-muted)"}}>{items.length===0?'Usa "Importa dallo Slicer" per importare i profili o "Nuovo profilo" per crearne uno manualmente.':"Nessun risultato."}</div>
        ):(
          <table className="s3d-table"><thead><tr style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--border-default)"}}>
            <th style={{width:40}}></th><th>Nome</th><th>Layer</th><th>Pareti</th><th>Infill</th><th>Top/Bot</th><th>Supporti</th><th style={{textAlign:"right"}}>Azioni</th>
          </tr></thead><tbody>{filtered.map(p=>{
            const o = getOrigin(p.slicer_origin);
            return (
            <tr key={p.id} style={{cursor:"pointer"}} onClick={()=>onOpenForm(p.id)}>
              <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(p.id)} onChange={()=>toggleSelect(p.id)} style={{width:16,height:16,accentColor:"var(--accent)"}}/></td>
              <td><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,padding:"2px 8px",background:o.bg,color:o.fg,borderRadius:4,fontWeight:600}}>{o.label}</span><span style={{fontWeight:600}}>{p.nome}</span></div></td>
              <td style={{color:"var(--text-secondary)"}}>{p.layer_height_mm}mm</td>
              <td style={{color:"var(--text-secondary)"}}>{p.numero_pareti}</td>
              <td style={{color:"var(--text-secondary)"}}>{p.infill_percentuale}%</td>
              <td style={{color:"var(--text-secondary)"}}>{p.top_layers}/{p.bottom_layers}</td>
              <td>
                {p.supporti_albero && <span style={{fontSize:10,padding:"2px 6px",background:"var(--green-soft)",color:"var(--green)",borderRadius:4,marginRight:4}}>Albero</span>}
                {p.supporti_normali && <span style={{fontSize:10,padding:"2px 6px",background:"var(--orange-soft)",color:"var(--orange)",borderRadius:4}}>Normali</span>}
                {!p.supporti_albero && !p.supporti_normali && <span style={{color:"var(--text-muted)"}}>-</span>}
              </td>
              <td style={{textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>onOpenForm(p.id)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:12,fontWeight:600,cursor:"pointer",marginRight:12}}>Modifica</button>
                <button onClick={()=>handleDelete(p.id)} style={{background:"none",border:"none",color:"var(--red)",fontSize:12,fontWeight:600,cursor:"pointer"}}>Elimina</button>
              </td>
            </tr>
          );})}</tbody></table>
        )}
      </div>
    </div>
  );
}
