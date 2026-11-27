import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
export type PeakPoint = { date: string; value: number };
type Period = "weekly" | "monthly" | "yearly";
export interface PeakChartProps { data: PeakPoint[]; title?: string; subtitle?: string; unit?: string; className?: string; }
const periods: { key: Period; label: string; count: number }[] = [{key:"weekly",label:"Weekly",count:7},{key:"monthly",label:"Monthly",count:30},{key:"yearly",label:"Yearly",count:365}];
const faNumber = new Intl.NumberFormat("fa-IR",{maximumFractionDigits:0});
const faDate = (s:string) => s.replace(/\d/g,d=>"۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
export function PeakChart({data,title="روند فعالیت روزانه",subtitle="بر پایه داده‌های واقعی DailyActivity",unit="کاربر",className}:PeakChartProps){
 const canvasRef=useRef<HTMLCanvasElement>(null),wrapRef=useRef<HTMLDivElement>(null);
 const [period,setPeriod]=useState<Period>("monthly"),[hoverIndex,setHoverIndex]=useState<number|null>(null),[visible,setVisible]=useState(false);
 const points=useMemo(()=>data.filter(p=>Number.isFinite(p.value)).slice(-periods.find(p=>p.key===period)!.count),[data,period]);
 useEffect(()=>{const n=wrapRef.current;if(!n)return;const o=new IntersectionObserver(([e])=>setVisible(e.isIntersecting),{threshold:.08});o.observe(n);return()=>o.disconnect()},[]);
 useEffect(()=>{
  const canvas=canvasRef.current,wrap=wrapRef.current;if(!canvas||!wrap||!visible)return;const ctx=canvas.getContext("2d");if(!ctx)return;
  let raf=0,dead=false,progress=0;const dpr=Math.min(window.devicePixelRatio||1,2);
  const draw=()=>{if(dead)return;const rect=wrap.getBoundingClientRect(),w=Math.max(320,rect.width),h=238;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width="100%";canvas.style.height=h+"px";ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!points.length)return;
   const pad={t:16,r:18,b:34,l:64},pw=w-pad.l-pad.r,ph=h-pad.t-pad.b,vals=points.map(p=>p.value);let min=Math.min(0,...vals),max=Math.max(...vals);if(max===min)max=min+1;
   const x=(i:number)=>pad.l+(points.length<=1?pw/2:i/(points.length-1)*pw),y=(v:number)=>pad.t+(max-v)/(max-min)*ph;
   ctx.strokeStyle="rgba(255,255,255,.09)";ctx.lineWidth=1;ctx.font="11px Vazirmatn,sans-serif";ctx.fillStyle="rgba(222,239,226,.58)";ctx.textAlign="right";
   for(let i=0;i<=4;i++){const yy=pad.t+ph*i/4,v=max-(max-min)*i/4;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();ctx.fillText(faNumber.format(v),pad.l-10,yy+4)}
   const count=Math.max(1,Math.floor(points.length*progress)),visiblePoints=points.slice(0,count);
   if(visiblePoints.length){const g=ctx.createLinearGradient(0,pad.t,0,h-pad.b);g.addColorStop(0,"rgba(36,190,103,.28)");g.addColorStop(1,"rgba(36,190,103,0)");
    ctx.beginPath();visiblePoints.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.value)):ctx.moveTo(x(i),y(p.value)));ctx.lineTo(x(visiblePoints.length-1),h-pad.b);ctx.lineTo(x(0),h-pad.b);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();visiblePoints.forEach((p,i)=>i?ctx.lineTo(x(i),y(p.value)):ctx.moveTo(x(i),y(p.value)));ctx.strokeStyle="#35c878";ctx.lineWidth=2.8;ctx.lineJoin="round";ctx.lineCap="round";ctx.stroke();
    const i=visiblePoints.length-1;ctx.beginPath();ctx.arc(x(i),y(visiblePoints[i].value),4,0,Math.PI*2);ctx.fillStyle="#a5f3c2";ctx.fill()}
   const labels=Math.min(6,points.length);ctx.fillStyle="rgba(222,239,226,.52)";ctx.textAlign="center";for(let i=0;i<labels;i++){const ix=Math.round(i*(points.length-1)/Math.max(1,labels-1));ctx.fillText(faDate(points[ix].date.slice(5)),x(ix),h-10)}
   if(hoverIndex!==null&&points[hoverIndex]){const p=points[hoverIndex];ctx.strokeStyle="rgba(225,255,235,.45)";ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(x(hoverIndex),pad.t);ctx.lineTo(x(hoverIndex),h-pad.b);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(x(hoverIndex),y(p.value),5,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill()}
  };
  const animate=()=>{progress=Math.min(1,progress+.045);draw();if(progress<1)raf=requestAnimationFrame(animate)};
  const ro=new ResizeObserver(()=>draw());ro.observe(wrap);raf=requestAnimationFrame(animate);return()=>{dead=true;cancelAnimationFrame(raf);ro.disconnect()};
 },[points,visible,hoverIndex]);
 const onMove=(e:PointerEvent<HTMLCanvasElement>)=>{const r=e.currentTarget.getBoundingClientRect(),px=Math.max(0,Math.min(r.width-82,e.clientX-r.left-64));setHoverIndex(points.length<2?0:Math.round(px/Math.max(1,r.width-82)*(points.length-1)))};
 const current=hoverIndex!==null?points[hoverIndex]:points.at(-1);
 return <section ref={wrapRef} className={cn("rounded-2xl border border-white/10 bg-[#0c2114]/75 p-4 shadow-xl shadow-black/10 backdrop-blur-xl",className)}>
  <div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-emerald-50">{title}</p><p className="mt-1 text-xs text-emerald-100/55">{subtitle}</p></div>
  <div className="flex rounded-xl border border-white/10 bg-black/20 p-1" role="group" aria-label="بازه نمودار">{periods.map(p=><button key={p.key} type="button" onClick={()=>{setPeriod(p.key);setHoverIndex(null)}} className={cn("rounded-lg px-3 py-1.5 text-xs transition",period===p.key?"bg-emerald-500/20 text-emerald-100":"text-emerald-100/55 hover:text-emerald-50")}>{p.label}</button>)}</div></div>
  {points.length?<><div className="mb-1 flex items-center justify-between text-xs text-emerald-100/55"><span>{periods.find(p=>p.key===period)?.label} · {faNumber.format(points.length)} نقطه</span><span>{current?faDate(current.date)+" · "+faNumber.format(current.value)+" "+unit:""}</span></div><canvas ref={canvasRef} onPointerMove={onMove} onPointerLeave={()=>setHoverIndex(null)} className="block w-full touch-pan-y" aria-label={title} role="img"/></>:<div className="grid h-56 place-items-center text-sm text-emerald-100/45">داده‌ای برای نمایش وجود ندارد.</div>}
  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-100/50"><span className="h-2 w-2 rounded-full bg-emerald-400"/>DailyActivity · داده خام منبع</div>
 </section>;
}
type DataEvent=CustomEvent<{points:PeakPoint[];snapshot:string}>;
export function PeakChartHost(){const [data,setData]=useState<PeakPoint[]>([]),[snapshot,setSnapshot]=useState("");
 useEffect(()=>{const receive=(e:Event)=>{const d=(e as DataEvent).detail;setData(d.points||[]);setSnapshot(d.snapshot||"")};window.addEventListener("shad:data-ready",receive);return()=>window.removeEventListener("shad:data-ready",receive)},[]);
 return <PeakChart data={data} title="روند فعالیت واقعی شاد" subtitle={snapshot?"Snapshot دیتابیس: "+faDate(snapshot):"DailyActivity · از بسته داده بارگذاری‌شده"} unit="رویداد"/>;
}