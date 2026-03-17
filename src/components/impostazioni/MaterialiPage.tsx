import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Materiale { id:number; nome:string; profilo_slicer:string; slicer_origin:string; peso_specifico_gcm3:number; prezzo_kg:number; markup_percentuale:number; fallimento_percentuale:number; magazzino_kg:number; link_acquisto:string; }
interface Props { onOpenForm:(id?:number,prefill?:any)=>void; onImportSlicer?:(slicer:"bambu"|"orca")=>void; }

export function MaterialiPage({ onOpenForm, onImportSlicer }:Props) {
  const [items,setItems] = useState<Materiale[]>([]); const [search,setSearch] = useState("");
  const [selectedIds,setSelectedIds] = useState<Set<number>>(new Set());
  const load = useCallback(async()=>{ try{setItems(await invoke<Materiale[]>("get_materiali"));}catch(e){console.error(e);} },[]);
  useEffect(()=>{load();},[load]);
  const filtered = items.filter(m=>m.nome.toLowerCase().includes(search.toLowerCase()));
  const handleDelete = async(id:number)=>{ await invoke("delete_materiale",{id}).catch(()=>{}); setSelectedIds(p=>{const n=new Set(p);n.delete(id);return n;}); await load(); };
  const handleDeleteSelected = async()=>{ for(const id of selectedIds) await invoke("delete_materiale",{id}).catch(()=>{}); setSelectedIds(new Set()); await load(); };
  const toggleSelect=(id:number)=>setSelectedIds(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n;});
  const toggleSelectAll=()=>{if(selectedIds.size===filtered.length)setSelectedIds(new Set());else setSelectedIds(new Set(filtered.map(m=>m.id)));};
  const formatPrice=(v:number)=>new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(v);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:20,fontWeight:800,color:"var(--text-primary)"}}>Materiali</h3>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>onImportSlicer?.("bambu")} className="s3d-btn s3d-btn-primary" style={{background:"var(--orange)",boxShadow:"0 2px 12px rgba(249,115,22,0.3)"}}>🟢 Importa da Bambu Studio</button>
          <button onClick={()=>onImportSlicer?.("orca")} className="s3d-btn s3d-btn-primary" style={{background:"#009688",boxShadow:"0 2px 12px rgba(0,150,136,0.3)"}}>🐋 Importa da Orca Slicer</button>
          <button onClick={()=>onOpenForm()} className="s3d-btn s3d-btn-primary">Nuovo materiale</button>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <input type="checkbox" checked={selectedIds.size===filtered.length&&filtered.length>0} onChange={toggleSelectAll} style={{width:16,height:16,accentColor:"var(--accent)"}}/>
        {selectedIds.size>0 && <button onClick={handleDeleteSelected} className="s3d-btn s3d-btn-danger">Elimina selezionati ({selectedIds.size})</button>}
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca materiale per nome" className="s3d-input" style={{flex:1}}/>
      </div>
      <div className="s3d-card" style={{overflow:"hidden"}}>
        {filtered.length===0?(
          <div style={{padding:"48px 0",textAlign:"center",color:"var(--text-muted)"}}>{items.length===0?'Nessun materiale inserito. Usa "Importa da Bambu Studio", "Importa da Orca Slicer" o "Nuovo materiale".':"Nessun risultato."}</div>
        ):(
          <table className="s3d-table"><thead><tr style={{background:"var(--bg-surface)",borderBottom:"1px solid var(--border-default)"}}>
            <th style={{width:40}}></th><th>Nome materiale</th><th>Peso sp.</th><th>Prezzo/kg</th><th>Markup</th><th>Fallim.</th><th>Magazzino</th><th style={{textAlign:"right"}}>Azioni</th>
          </tr></thead><tbody>{filtered.map(m=>(
            <tr key={m.id} style={{cursor:"pointer"}} onClick={()=>onOpenForm(m.id)}>
              <td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={selectedIds.has(m.id)} onChange={()=>toggleSelect(m.id)} style={{width:16,height:16,accentColor:"var(--accent)"}}/></td>
              <td><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,padding:"2px 8px",background:"var(--accent-soft)",color:"var(--accent)",borderRadius:4,fontWeight:600}}>{m.slicer_origin==="bambu"?"Bambu":"Orca"}</span><span style={{fontWeight:600,color:"var(--text-primary)"}}>{m.nome}</span></div></td>
              <td style={{color:"var(--text-secondary)"}}>{m.peso_specifico_gcm3} g/cm³</td>
              <td>{formatPrice(m.prezzo_kg)}/kg</td>
              <td style={{color:"var(--text-secondary)"}}>{m.markup_percentuale}%</td>
              <td style={{color:"var(--text-secondary)"}}>{m.fallimento_percentuale}%</td>
              <td><span style={{color:m.magazzino_kg<=1.5?"var(--red)":"inherit",fontWeight:m.magazzino_kg<=1.5?600:400}}>{m.magazzino_kg.toFixed(2)} kg</span></td>
              <td style={{textAlign:"right"}} onClick={e=>e.stopPropagation()}>
                <button onClick={()=>onOpenForm(m.id)} style={{background:"none",border:"none",color:"var(--accent)",fontSize:12,fontWeight:600,cursor:"pointer",marginRight:12}}>Modifica</button>
                <button onClick={()=>handleDelete(m.id)} style={{background:"none",border:"none",color:"var(--red)",fontSize:12,fontWeight:600,cursor:"pointer"}}>Elimina</button>
              </td>
            </tr>
          ))}</tbody></table>
        )}
      </div>
    </div>
  );
}
