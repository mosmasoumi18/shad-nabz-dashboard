import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type TreemapDatum = { id: string; name: string; value: number };
export interface TreemapChartProps { data: TreemapDatum[]; dateLabel?: string; unit?: string; className?: string }
type Box = { x:number; y:number; width:number; height:number };
type Tile = TreemapDatum & Box & { share:number; colorIndex:number };
const colors=["var(--chart-1, var(--teal))","var(--chart-2, var(--blue))","var(--chart-3, var(--violet))","var(--chart-4, var(--amber))","var(--chart-5, var(--rose))"];
const nf=new Intl.NumberFormat("fa-IR",{maximumFractionDigits:2}), pf=new Intl.NumberFormat("fa-IR",{maximumFractionDigits:1});
const full=(n:number)=>nf.format(n);
const compact=(n:number)=>n>=1e9?nf.format(n/1e9)+" میلیارد":n>=1e6?nf.format(n/1e6)+" میلیون":n>=1e3?nf.format(n/1e3)+" هزار":nf.format(n);
function worst(row:{area:number}[],side:number){if(!row.length||side<=0)return Infinity;const sum=row.reduce((s,d)=>s+d.area,0),max=Math.max(...row.map(d=>d.area)),min=Math.min(...row.map(d=>d.area));return Math.max(side*side*max/(sum*sum),sum*sum/(side*side*min));}
// Squarified treemap (Bruls et al.): strips are consumed from the right edge;
// horizontal strips start at the top. No viewBox: coordinates are real pixels.
function squarify(data:TreemapDatum[],bounds:Box):Tile[]{
 const total=data.reduce((s,d)=>s+d.value,0);if(!total||bounds.width<=0||bounds.height<=0)return [];
 let pending=data.map(d=>({...d,area:d.value/total*bounds.width*bounds.height})).sort((a,b)=>b.area-a.area),remaining={...bounds};const result:Tile[]=[];
 while(pending.length){const side=Math.min(remaining.width,remaining.height);let row:typeof pending=[];
  while(pending.length){const candidate=[...row,pending[0]];if(row.length&&worst(candidate,side)>worst(row,side))break;row=candidate;pending=pending.slice(1);}
  const rowArea=row.reduce((s,d)=>s+d.area,0);
  if(remaining.width>=remaining.height){const stripWidth=rowArea/remaining.height;let y=remaining.y;for(const item of row){const h=item.area/stripWidth;result.push({...item,x:remaining.x,y,width:stripWidth,height:h,share:item.value/total,colorIndex:data.findIndex(d=>d.id===item.id)});y+=h;}remaining={...remaining,x:remaining.x+stripWidth,width:Math.max(0,remaining.width-stripWidth)};}
  else{const stripHeight=rowArea/remaining.width;let x=remaining.x;for(const item of row){const w=item.area/stripHeight;result.push({...item,x,y:remaining.y,width:w,height:stripHeight,share:item.value/total,colorIndex:data.findIndex(d=>d.id===item.id)});x+=w;}remaining={...remaining,y:remaining.y+stripHeight,height:Math.max(0,remaining.height-stripHeight)};}
 }
 return result.map(t=>({...t,x:bounds.width-t.x-t.width}));
}
export function TreemapChart({data,dateLabel,unit="گیگابایت",className}:TreemapChartProps){
 const host=useRef<HTMLDivElement>(null),[size,setSize]=useState({width:0,height:260}),[hidden,setHidden]=useState<string[]>([]),[active,setActive]=useState(0),[tip,setTip]=useState<{id:string;x:number;y:number}|null>(null);
 const clean=useMemo(()=>data.filter(d=>Number.isFinite(d.value)&&d.value>0),[data]),visible=useMemo(()=>clean.filter(d=>!hidden.includes(d.id)),[clean,hidden]),total=visible.reduce((s,d)=>s+d.value,0);
 const tiles=useMemo(()=>squarify(visible,{x:0,y:0,width:size.width,height:size.height}),[visible,size]),activeTile=tiles[Math.min(active,Math.max(0,tiles.length-1))];
 useEffect(()=>{const node=host.current;if(!node)return;const observer=new ResizeObserver(([entry])=>{const width=Math.floor(entry.contentRect.width),height=Math.max(220,Math.min(360,Math.round(width*.48)));setSize(old=>old.width===width&&old.height===height?old:{width,height});});observer.observe(node);return()=>observer.disconnect();},[]);
 useEffect(()=>{setActive(0);setTip(null);},[hidden,data]);
 const keyDown=(e:React.KeyboardEvent<HTMLDivElement>)=>{if(!tiles.length)return;if(e.key==="Escape"){setTip(null);return;}if(e.key==="Home"){e.preventDefault();setActive(0);}else if(e.key==="End"){e.preventDefault();setActive(tiles.length-1);}else if(e.key==="ArrowLeft"){e.preventDefault();setActive(i=>(i+1)%tiles.length);}else if(e.key==="ArrowRight"){e.preventDefault();setActive(i=>(i-1+tiles.length)%tiles.length);}};
 const toggle=(id:string)=>setHidden(current=>current.includes(id)?current.filter(x=>x!==id):visible.length<=1?current:[...current,id]);
 const showTip=(id:string,e:React.MouseEvent<SVGRectElement>)=>{const rect=host.current?.getBoundingClientRect();if(rect)setTip({id,x:e.clientX-rect.left,y:e.clientY-rect.top});};
 const tipItem=tip?visible.find(d=>d.id===tip.id):undefined;
 return <section dir="rtl" className={cn("min-w-0 text-foreground",className)}>
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold">ترکیب مصرف ترافیک محصولات</p>{dateLabel&&<p className="mt-1 text-xs text-muted-foreground">آخرین تاریخ ثبت‌شده: {dateLabel}</p>}</div><div className="text-start"><p className="text-xs text-muted-foreground">مجموع محصولات قابل مشاهده</p><p className="text-lg font-extrabold tabular-nums">{compact(total)} <span className="text-xs font-medium text-muted-foreground">{unit}</span></p></div></div>
  <div ref={host} className="relative min-w-0">
   {tiles.length?<div role="group" aria-label="نقشه درختی مصرف ترافیک" tabIndex={0} onKeyDown={keyDown} className="block w-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <svg width={size.width} height={size.height} role="img" aria-label="نمودار درختی مصرف ترافیک محصولات" className="block max-w-full overflow-hidden rounded-xl">
     {tiles.map((tile,index)=>{const x=tile.x,fill=colors[tile.colorIndex%colors.length],fits=tile.width>=Math.max(76,tile.name.length*8+24)&&tile.height>=48;return <g key={tile.id} className="treemap-tile" style={{animation:"treemap-enter var(--motion,180ms) var(--motion-ease,ease-out) both",animationDelay:Math.min(index*24,120)+"ms"}}>
      <rect x={x+2} y={tile.y+2} width={Math.max(0,tile.width-4)} height={Math.max(0,tile.height-4)} rx="7" fill={fill} stroke="var(--bg)" strokeWidth="2" onMouseEnter={e=>{setActive(index);showTip(tile.id,e);}} onMouseMove={e=>showTip(tile.id,e)} onMouseLeave={()=>setTip(null)}/>
      {fits&&<text x={x+tile.width-12} y={tile.y+21} textAnchor="start" direction="rtl" fill="var(--bg)" fontSize="12" fontWeight="700">{tile.name}</text>}
      {fits&&tile.height>=70&&<text x={x+tile.width-12} y={tile.y+43} textAnchor="start" direction="rtl" fill="var(--bg)" fontSize="11">{compact(tile.value)} {unit}</text>}
      {fits&&tile.height>=92&&<text x={x+tile.width-12} y={tile.y+62} textAnchor="start" direction="rtl" fill="var(--bg)" fontSize="10">{pf.format(tile.share*100)}٪</text>}
     </g>;})}
     {activeTile&&<rect x={activeTile.x+2} y={activeTile.y+2} width={Math.max(0,activeTile.width-4)} height={Math.max(0,activeTile.height-4)} rx="7" fill="none" stroke="var(--teal)" strokeWidth="2" pointerEvents="none"/>}
    </svg>
   </div>:<div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">داده مثبتی برای نمایش وجود ندارد.</div>}
   {tipItem&&tip&&<div role="tooltip" className="pointer-events-none absolute z-10 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg" style={{insetInlineStart:Math.max(0,Math.min(tip.x,size.width-190)),top:Math.max(0,tip.y-66)}}><strong className="block">{tipItem.name}</strong><span>{full(tipItem.value)} {unit}</span><span className="mx-1">·</span><span>{pf.format(tipItem.value/total*100)}٪</span></div>}
  </div>
  <div className="mt-3 flex flex-wrap gap-2" aria-label="راهنمای محصولات">{clean.map((item,index)=>{const off=hidden.includes(item.id);return <button key={item.id} type="button" aria-pressed={!off} onClick={()=>toggle(item.id)} disabled={!off&&visible.length===1} className={cn("inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",off?"text-muted-foreground line-through":"text-foreground hover:bg-muted")}><span className="h-2.5 w-2.5 rounded-sm" style={{background:colors[index%colors.length],opacity:off?0.35:1}}/>{item.name}</button>;})}</div>
  <p aria-live="polite" className="sr-only">{activeTile?"مورد انتخاب‌شده: "+activeTile.name+"، "+full(activeTile.value)+" "+unit:"موردی انتخاب نشده است."}</p>
  <table className="sr-only"><caption>جدول داده‌های خام نمودار مصرف ترافیک محصولات</caption><thead><tr><th>محصول</th><th>مصرف</th><th>سهم از مجموع</th></tr></thead><tbody>{clean.map(item=><tr key={item.id}><th>{item.name}</th><td>{full(item.value)} {unit}</td><td>{pf.format(total?item.value/total*100:0)}٪</td></tr>)}</tbody></table>
  <style>{"@keyframes treemap-enter{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:reduce){.treemap-tile{animation:none!important}}"}</style>
 </section>;
}