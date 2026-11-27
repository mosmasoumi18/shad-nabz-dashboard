import {useEffect,useRef,useState} from "react";
import {createRoot,type Root} from "react-dom/client";
import {PeakChartHost} from "@/components/ui/peak-chart";
import {TreemapChart,type TreemapDatum} from "@/components/ui/treemap-chart";
type TreemapMountEvent=CustomEvent<{data:TreemapDatum[];dateLabel:string}>;
export function LegacyDashboard(){
 const hostRef=useRef<HTMLDivElement>(null);const [error,setError]=useState("");
 useEffect(()=>{
  let cancelled=false;let peakRoot:Root|undefined;let treemapRoot:Root|undefined;let core:HTMLScriptElement|undefined;let silk:HTMLScriptElement|undefined;
  const onTreemapMount=(event:Event)=>{const slot=hostRef.current?.querySelector("#react-treemap-chart-root");const payload=(event as TreemapMountEvent).detail;if(slot&&payload){treemapRoot?.unmount();treemapRoot=createRoot(slot);treemapRoot.render(<TreemapChart data={payload.data} dateLabel={payload.dateLabel}/>);}};
  window.addEventListener("shad:treemap-mount",onTreemapMount);
  async function mount(){try{const r=await fetch("/legacy-dashboard.html",{cache:"no-store"});if(!r.ok)throw new Error("بارگذاری ساختار داشبورد ناموفق بود ("+r.status+")");const markup=await r.text();if(cancelled||!hostRef.current)return;hostRef.current.innerHTML=markup;const slot=hostRef.current.querySelector("#react-peak-chart-root");if(slot){peakRoot=createRoot(slot);peakRoot.render(<PeakChartHost/>);}core=document.createElement("script");core.src="/legacy-dashboard.js";core.async=false;core.onerror=()=>setError("اجرای منطق داشبورد انجام نشد.");document.body.appendChild(core);silk=document.createElement("script");silk.src="/silk-background.js";silk.async=false;document.body.appendChild(silk);}catch(e){setError(e instanceof Error?e.message:"خطای ناشناخته در راه‌اندازی داشبورد");}}
  void mount();return()=>{cancelled=true;window.removeEventListener("shad:treemap-mount",onTreemapMount);peakRoot?.unmount();treemapRoot?.unmount();core?.remove();silk?.remove();document.getElementById("shad-silk-background")?.remove();document.querySelectorAll("style[data-shad-silk]").forEach(x=>x.remove());};
 },[]);
 return <>{error&&<div role="alert" className="m-4 rounded-xl border border-red-500/30 bg-red-950/60 p-4 text-red-100">{error}</div>}<div ref={hostRef}/></>;
}