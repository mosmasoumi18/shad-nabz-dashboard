
const DATA_URL = '/data.json.gz';
const NF = new Intl.NumberFormat('fa-IR', {maximumFractionDigits:1});
const N0 = new Intl.NumberFormat('fa-IR', {maximumFractionDigits:0});
const FULL = new Intl.NumberFormat('fa-IR', {maximumFractionDigits:2});
const COLORS = Array.from({length:8},(_,i)=>`var(--chart-${i+1}, var(--teal))`);
const themeColor = (name, fallback='--teal') => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || getComputedStyle(document.documentElement).getPropertyValue(fallback).trim() || 'currentColor';
const PAGE_INFO = {
 overview:['نمای کلان شاد','تصویر مدیریتی از وضعیت محصولات و سرویس‌ها بر اساس آخرین داده‌های موجود'],
 messenger:['پیام‌رسان و شبکه','فعالیت، پیام، عضویت، توزیع پلتفرم و ماندگاری'],
 tamasha:['تماشا و تعامل اجتماعی','کاربران فعال، مشاهده، پسندیدن، انتشار و درخواست‌های ارتباط'],
 search:['جست‌وجو و کشف','رتبه‌بندی عبارت‌ها و تاریخچه جست‌وجو در Top 100 هر روز'],
 traffic:['ترافیک و درآمد','مصرف ترافیک و درآمد ثبت‌شده محصولات به تفکیک اپراتور'],
 support:['مرکز تماس','نرخ پاسخ، حجم تماس و موضوعات پرتکرار پشتیبانی'],
 quality:['کیفیت و عملیات','بررسی فایل، سیاست‌های نظارتی، حذف حساب و بارگذاری فایل'],
 growth:['رشد و بازار','نصب، امتیاز بازار، کاربران فعال محصولات و رویدادها'],
 analytics:['مرکز تحلیل پیشرفته','همبستگی، توزیع، کنترل آماری، الگوهای تقویمی و روابط شاخص‌ها'],
 catalog:['فهرست داده‌ها و کاوشگر','فهرست جداول منبع و مشاهده رکوردهای واقعی داخل بسته']
};
let DATA=null, TABLES=null, ADVANCED_DATA=null, ADVANCED_OBSERVER=null, RANGE=30, SEARCH_PAGE=1, CATALOG_PAGE=1, EXPLORER_PAGE=1, selectedTable=null, currentSearchRows=[], ACTIVE_PAGE='overview';
const RENDERED_PAGES=new Set();
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{if(v===null||v===undefined||v==='')return null;let x=Number(String(v).replace(/,/g,''));return Number.isFinite(x)?x:null};
const normDate=v=>String(v??'').trim().replace(/-/g,'/').replace(/\/(\d)(?=\/|$)/g,'/0$1');
function indexedSeries(arr){const base=arr.find(p=>Number.isFinite(p.value)&&p.value!==0)?.value;return arr.map(p=>({...p,value:base?100*p.value/base:null}));}
const fmt=v=>v===null||v===undefined?'—':N0.format(v);
const fmt1=v=>v===null||v===undefined?'—':NF.format(v);
const compact=v=>{if(v===null||v===undefined)return '—';let a=Math.abs(v);if(a>=1e12)return NF.format(v/1e12)+' تریلیون';if(a>=1e9)return NF.format(v/1e9)+' میلیارد';if(a>=1e6)return NF.format(v/1e6)+' میلیون';if(a>=1e3)return NF.format(v/1e3)+' هزار';return fmt1(v)};
const fmtDate=v=>String(v??'—').replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const fmtFull=v=>v===null||v===undefined?'—':FULL.format(v);
const JALALI_MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const jalaliTick=v=>{const p=String(v??'').replace(/-/g,'/').split('/');if(p.length<2)return fmtDate(v);const m=Number(p[1]);if(m<1||m>12)return fmtDate(v);return p.length<3?JALALI_MONTHS[m-1]:N0.format(Number(p[2]))+' '+JALALI_MONTHS[m-1]};
const table=k=>TABLES[k]||null;
const TABLE_CUTOFFS={};
function tableObservedCutoff(k){const t=table(k);if(!t)return '';if(Object.prototype.hasOwnProperty.call(TABLE_CUTOFFS,k))return TABLE_CUTOFFS[k];const snapshot=DATA?.meta?.snapshotJalali?normDate(DATA.meta.snapshotJalali):'',isJalali=d=>/^(13|14)\d{2}\//.test(d),withinSnapshot=d=>!snapshot||!isJalali(d)||d<=snapshot;/* Recompute from rows: cached observedDateMax may omit a legitimate trailing zero-valued day. */const di=col(t,['date_key','date','shamsi_date','shamsidate','تاریخ جلالی','تاریخ','invoice_date','Friday_date','Date_Created_Jalali','Created_At']);if(di<0)return TABLE_CUTOFFS[k]='';const ix=t.columns.map((c,i)=>({c:String(c||'').trim().toLowerCase(),i})).filter(x=>!/(date|time|updated_at|created_at|(^|[_\\s])(id|year|month|ranking|accesscode)([_\\s]|$))/i.test(x.c)).map(x=>x.i);const all=t.rows.map(r=>normDate(r[di])).filter(d=>d&&withinSnapshot(d)).sort();const observed=t.rows.filter(r=>{const d=normDate(r[di]);return d&&withinSnapshot(d)&&ix.some(i=>{const v=num(r[i]);return v!==null;});}).map(r=>normDate(r[di])).filter(Boolean).sort();return TABLE_CUTOFFS[k]=observed.at(-1)||all.at(-1)||'';}
function withinTableDate(k,d){const cut=tableObservedCutoff(k),nd=normDate(d);return !cut||!nd||nd<=cut;}
const col=(t,names)=>{if(!t)return -1;for(const n of (Array.isArray(names)?names:[names])){let i=t.columns.findIndex(x=>String(x||'').trim().toLowerCase()===String(n).trim().toLowerCase());if(i>=0)return i}return -1};
function rowsFor(k){return table(k)?.rows||[]}
function latestRows(k,dateNames){let t=table(k);if(!t)return {date:'',rows:[]};let di=col(t,dateNames||['date_key','date','shamsidate','shamsi_date','تاریخ','تاریخ جلالی','invoice_date']);if(di<0)return {date:'',rows:t.rows};let d=tableObservedCutoff(k)||t.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop()||'';return {date:d,rows:t.rows.filter(r=>normDate(r[di])===d)}}
function series(k,valueNames,dateNames){let t=table(k);if(!t)return [];let di=col(t,dateNames||['date_key','date','shamsidate','shamsi_date','تاریخ','تاریخ جلالی']);let vi=col(t,valueNames);if(di<0||vi<0)return [];let out=t.rows.map(r=>({date:normDate(r[di]),value:num(r[vi])})).filter(x=>x.date&&x.value!==null&&withinTableDate(k,x.date)).sort((a,b)=>a.date.localeCompare(b.date));return out}
function seriesByLabel(k,label,valueNames,dateNames){let t=table(k);if(!t)return [];let di=col(t,dateNames||['date_key','date','shamsidate','shamsi_date']);let li=col(t,label),vi=col(t,valueNames);if(di<0||li<0||vi<0)return {};let out={};t.rows.forEach(r=>{let d=normDate(r[di]),l=String(r[li]??'');let v=num(r[vi]);if(d&&l&&v!==null&&withinTableDate(k,d)){(out[l]??=[]).push({date:d,value:v})}});Object.keys(out).forEach(l=>out[l].sort((a,b)=>a.date.localeCompare(b.date)));return out}
function lastPoint(arr){return arr&&arr.length?arr[arr.length-1]:null}
function prevPoint(arr){return arr&&arr.length>1?arr[arr.length-2]:null}
function change(a,b){if(a===null||b===null||b===0)return null;return (a-b)/Math.abs(b)*100}
function deltaHtml(d){if(d===null)return '<span class="delta flat">—</span>';let cls=d>0.15?'up':d<-.15?'down':'flat';let sign=d>0?'+':'';return `<span class="delta ${cls}">${sign}${NF.format(d)}٪</span>`}
function kpiHtml(label,value,date,changePct,icon,accent,soft,unit=''){return `<div class="kpi" style="--accent:var(--chart-1,var(--teal));--soft:var(--chart-1-soft,var(--teal2))"><div class="kpi-top"><span>${esc(label)}</span><span class="kpi-icon">${icon||'◈'}</span></div><div class="kpi-value">${esc(value)}${unit?` <small style="font-size:11px;color:var(--muted)">${esc(unit)}</small>`:''}</div><div class="kpi-foot"><span>${date?'آخرین تاریخ: '+fmtDate(date):'تاریخ نامشخص'}</span>${deltaHtml(changePct)}</div></div>`}
function kpiFromSeries(label,arr,icon,accent,soft,showDelta=true){let l=lastPoint(arr),p=prevPoint(arr),d=l&&p&&showDelta?change(l.value,p.value):null;return kpiHtml(label,l?compact(l.value):'—',l?.date||'',d,icon,accent,soft)}
function getLastValue(k,valueCol,dateCol){let a=series(k,valueCol,dateCol);return lastPoint(a)}
function latestLabelValues(k,dateNames=['date_key','date','shamsidate','shamsi_date'],labelNames=['label'],valueNames=['value_num']){let t=table(k);if(!t)return {date:'',rows:[]};let di=col(t,dateNames),li=col(t,labelNames),vi=col(t,valueNames);if(di<0||li<0||vi<0)return {date:'',rows:[]};let d=tableObservedCutoff(k)||t.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop()||'';return {date:d,rows:t.rows.filter(r=>normDate(r[di])===d).map(r=>({label:String(r[li]??''),value:num(r[vi])})).filter(x=>x.label&&x.value!==null)}}
function drawLine(id,specs,unit='',forcePct=false){
 const el=$(id);if(!el)return;
 const title=el.closest('.panel')?.querySelector('.panel-head h3')?.textContent?.trim()||'روند تغییرات';
 const chartUnit=forcePct?'٪':unit||'';
 const allDates=[...new Set((specs||[]).flatMap(sp=>sp.points||[]).filter(p=>p&&p.date&&p.value!==null&&Number.isFinite(Number(p.value))).map(p=>normDate(p.date)))].sort();
 const limit=RANGE==='all'?null:Math.max(1,Number(RANGE)||30),dates=limit?allDates.slice(-limit):allDates;
 const dateSet=new Set(dates);
 const plotted=(specs||[]).map((sp,si)=>({
  id:id+'-'+si,
  name:sp.name||('سری '+N0.format(si+1)),
  points:(sp.points||[]).filter(p=>p&&p.date&&dateSet.has(normDate(p.date))&&p.value!==null&&Number.isFinite(Number(p.value))).map(p=>({date:normDate(p.date),value:Number(p.value)})).sort((a,b)=>a.date.localeCompare(b.date))
 })).filter(sp=>sp.points.length);
 window.dispatchEvent(new CustomEvent('shad:sparkline-mount',{detail:{targetId:id,series:plotted,title,unit:chartUnit}}));
}
function drawBars(id,items,opts={}){
 let el=$(id);if(!el)return;
 if(!items.length){el.innerHTML='<div class="chart-empty">داده‌ای برای نمایش وجود ندارد.</div>';return}
 let max=Math.max(1,...items.map(x=>Math.abs(x.value||0)));
 el.innerHTML=items.map((it,i)=>{
  let pct=Math.min(100,Math.abs(it.value||0)/max*100),display=it.display??compact(it.value);
  const fullValue=it.value===null||it.value===undefined?'—':fmtFull(it.value);
  return `<div class="bar-row" role="img" aria-label="${esc(it.name)}: ${esc(display)}" title="${esc(it.name)} · ${esc(fullValue)} ${esc(opts.unit||'')}">
   <span class="bar-name" title="${esc(it.name)}">${esc(it.name)}</span>
   <div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${pct}%;--barcolor:${it.color||COLORS[i%COLORS.length]}"></div></div>
   <span class="bar-val">${esc(display)}</span>
  </div>`;
 }).join('');
}
function renderKpis(id,html){$(id).innerHTML=html}
function formatTable(headers,rows,opts={}){if(!rows.length)return '<div class="chart-empty">رکوردی برای نمایش وجود ندارد.</div>';const cellValue=v=>{if(v===null||v===undefined)return '—';if(typeof v==='number'&&Number.isFinite(v))return fmtFull(v);const text=String(v);const normalized=text.replace(/,/g,'');if(/^-?\d+(?:\.\d+)?$/.test(normalized))return fmtFull(Number(normalized));return text.replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[Number(d)])};let head=headers.map(h=>`<th>${esc(h)}</th>`).join('');let body=rows.map(r=>'<tr>'+r.map(v=>`<td>${v&&typeof v==='object'&&v.html?v.html:esc(cellValue(v))}</td>`).join('')+'</tr>').join('');return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`}
function rawValue(k, label, valueCol='value_num', dateCol=['date_key','date']){let a=series(k,valueCol,dateCol);let p=lastPoint(a);return p?{...p,label}:null}
function drawFreshness(){let wanted=[['پیام‌رسان','Messenger_statistics/DailyActivity'],['تماشا','Tamasha_statistics/ActiveUsers'],['جست‌وجو','Messenger_statistics/TopSearches'],['ترافیک','shad beat.xlsx::Traffic_V2'],['مرکز تماس','shad beat.xlsx::Callcenter SL'],['بازار','Bazar_averageRate.xlsx::Sheet1']];$('freshnessGrid').innerHTML=wanted.map(([n,k])=>{let t=table(k);let di=col(t,['date_key','date','shamsi_date']);let d=t?(tableObservedCutoff(k)||(di>=0?t.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop():'')):'';let c=DATA.inventory.find(x=>x.name===k);return `<div class="fresh-item"><b>${n}</b><span>آخرین تاریخ: ${fmtDate(d||c?.dateMax||'ناموجود')}</span><em>${t?'منبع متصل':'داده ندارد'}</em></div>`}).join('')}

function shadChangeMarkup(d){if(d===null||!Number.isFinite(d))return '<span class="ab-change flat">بدون مقایسه</span>';let cls=d>.15?'up':d<-.15?'down':'flat';let sign=d>0?'+':'';let icon=d>.15?'↑':d<-.15?'↓':'•';return `<span class="ab-change ${cls}">${icon} ${sign}${NF.format(d)}٪ نسبت به ردیف قبل</span>`}
function sparklineSlot(id){return `<div id="${id}" class="ab-spark"></div>`}
function mountSparkline(id,points,name,unit,height=88){window.dispatchEvent(new CustomEvent('shad:sparkline-mount',{detail:{targetId:id,series:[{id,name,points}],title:name,unit,height}}))}
function shadLatestTraffic(){let t=table('shad beat.xlsx::Traffic_V2');if(!t)return null;let di=col(t,'shamsi_date'),ri=t.rows.filter(r=>normDate(r[di])&&withinTableDate('shad beat.xlsx::Traffic_V2',normDate(r[di]))).slice().sort((a,b)=>normDate(a[di]).localeCompare(normDate(b[di])));return ri.length?{table:t,row:ri[ri.length-1],date:normDate(ri[ri.length-1][di])}:null}
function renderAnalyticsBento(){
  const revenue=series('shad beat.xlsx::Traffic_V2','all_operators_all_services_revenue','shamsi_date');
  const revenueToman=revenue.map(point=>({...point,value:point.value/10}));
  const rv=lastPoint(revenueToman),rp=prevPoint(revenueToman),rd=rv&&rp?change(rv.value,rp.value):null;
  const rvRows=RANGE==='all'?revenueToman:revenueToman.slice(-Number(RANGE));
  $('abRevenue').innerHTML=`<div class="ab-card-top"><div class="ab-eyebrow">درآمد ثبت‌شده همه سرویس‌ها</div><span class="ab-source">Traffic_V2 · تومان</span></div><div class="ab-value">${rv?compact(rv.value):'—'} <small>تومان</small></div><div class="ab-meta"><span>آخرین تاریخ: ${fmtDate(rv?.date||'—')}</span>${shadChangeMarkup(rd)}</div>${sparklineSlot('abRevenueSparkline')}`;
   mountSparkline('abRevenueSparkline',rvRows,'درآمد ثبت‌شده','تومان',88);

  const activity=(window.__shadRawSeries||series)('Messenger_statistics/DailyActivity','value_num'); // keep monthly aggregation independent of the dashboard range
  const login=series('Messenger_statistics/LoginUser','value_num');
  const msg=series('Messenger_statistics/NewMessage','value_num');
  const av=lastPoint(activity),ap=prevPoint(activity),ad=av&&ap?change(av.value,ap.value):null,lv=lastPoint(login),mv=lastPoint(msg);
  const ar=RANGE==='all'?activity:activity.slice(-Number(RANGE));
  $('abActivity').innerHTML=`<div class="ab-card-top"><div class="ab-eyebrow">فعالیت روزانه پیام‌رسان</div><span class="ab-source">DailyActivity</span></div><div class="ab-value">${av?compact(av.value):'—'} <small>مقدار ثبت‌شده</small></div><div class="ab-meta"><span>آخرین تاریخ: ${fmtDate(av?.date||'—')}</span>${shadChangeMarkup(ad)}</div>${sparklineSlot('abActivitySparkline')}<div class="ab-dual"><div class="ab-dual-item"><span>ورود کاربران · LoginUser</span><b>${lv?compact(lv.value):'—'}</b></div><div class="ab-dual-item"><span>پیام جدید · NewMessage</span><b>${mv?compact(mv.value):'—'}</b></div></div>`;
   mountSparkline('abActivitySparkline',ar,'فعالیت روزانه','کاربر',88);

  const latest=shadLatestTraffic();
  if(latest){
    const {table:t,row,date}=latest;
    const defs=[['didani','دیدنی','Didani_All_operators_GB'],['sport','ورزشی','Sport_All_operators_GB'],['shadbin','شادبین','Shadbin_All_operators_GB'],['tamasha','تماشا','Tamasha_All_operators_GB'],['tv','تلویزیون','TV_All_operators_GB']];
    const data=defs.map(([id,name,colName])=>({id,name,value:num(row[col(t,colName)])||0})).filter(item=>item.value>0);
    $('abProducts').innerHTML='<div class="ab-card-top"><div class="ab-eyebrow">نقشه مصرف ترافیک محصولات</div><span class="ab-source">آخرین تاریخ Traffic_V2 · '+fmtDate(date)+'</span></div><div id="react-treemap-chart-root"></div>';
    window.dispatchEvent(new CustomEvent('shad:treemap-mount',{detail:{data,dateLabel:fmtDate(date)}}));
  } else $('abProducts').innerHTML='<div class="ab-loading">منبع Traffic_V2 در این بسته در دسترس نیست.</div>';

  // Monthly totals are sums of the recorded DailyActivity values, not unique-user counts.
  const monthTotals={};activity.forEach(p=>{let d=normDate(p.date),k=d.slice(0,7);if(/^\d{4}\/\d{2}$/.test(k))monthTotals[k]=(monthTotals[k]||0)+p.value});
  const months=Object.entries(monthTotals).sort((a,b)=>a[0].localeCompare(b[0])).slice(-12);
  const monthNames=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  if(months.length){let vals=months.map(x=>x[1]),max=Math.max(...vals),min=Math.min(...vals),total=vals.reduce((a,b)=>a+b,0),avg=total/vals.length,peak=months[vals.indexOf(max)];let W=250,H=208,C=125,R=75,N=months.length;const xy=(v,i,r=R)=>{let a=-Math.PI/2-(i/N)*Math.PI*2,rr=r*(.28+.72*(v/(max||1)));return [C+Math.cos(a)*rr,C+Math.sin(a)*rr]};let polygon=vals.map((v,i)=>xy(v,i).map(n=>n.toFixed(1)).join(',')).join(' ');let rings=[.33,.66,1].map(q=>`<circle cx="${C}" cy="${C}" r="${R*q}" fill="none" stroke="${themeColor('--border')}" stroke-width="1"/>`).join('');let axes=months.map((m,i)=>{let a=-Math.PI/2-(i/N)*Math.PI*2,x=C+Math.cos(a)*R,y=C+Math.sin(a)*R,lx=C+Math.cos(a)*(R+16),ly=C+Math.sin(a)*(R+16);return `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" stroke="${themeColor('--border')}"/><text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="${themeColor('--muted-foreground','--muted')}">${monthNames[Number(m[0].slice(5,7))-1]?.slice(0,2)||m[0].slice(5)}</text>`}).join('');let dots=vals.map((v,i)=>{let [x,y]=xy(v,i);return `<circle cx="${x}" cy="${y}" r="3.2" fill="${themeColor('--chart-1')}" stroke="${themeColor('--surface')}" stroke-width="1.5"><title>${fmtDate(months[i][0])} · ${fmt(v)}</title></circle>`}).join('');$('abMonthly').innerHTML=`<div class="ab-card-top"><div class="ab-eyebrow">الگوی ماهانه فعالیت ثبت‌شده</div><span class="ab-source">DailyActivity · ۱۲ ماه اخیر</span></div><div class="ab-month-chart"><svg class="ab-radar" viewBox="0 0 ${W} ${H}" role="img" aria-label="تجمیع ماهانه فعالیت روزانه"><g>${rings}${axes}</g><polygon points="${polygon}" fill="${themeColor('--chart-1')}" fill-opacity=".14" stroke="${themeColor('--chart-1')}" stroke-width="2.2" stroke-linejoin="round"/>${dots}<circle cx="${C}" cy="${C}" r="3" fill="${themeColor('--chart-1')}"/></svg><div class="ab-radar-stats"><div class="ab-radar-stat"><span>میانگین ماهانه</span><b>${compact(avg)}</b></div><div class="ab-radar-stat"><span>بیشترین ماه</span><b>${monthNames[Number(peak[0].slice(5,7))-1]||peak[0]}</b></div><div class="ab-radar-stat"><span>مجموع ۱۲ ماه</span><b>${compact(total)}</b></div></div></div><div class="ab-meta"><span>جمع مقدارهای روزانه در هر ماه؛ نه تعداد کاربر یکتا</span></div>`}
  else $('abMonthly').innerHTML='<div class="ab-loading">داده تاریخ‌دار کافی برای تجمیع ماهانه وجود ندارد.</div>';
}
function moduleCardSpec(){
  const inv=DATA.inventory||[];
  const qualityRx=/(Policy|Ban|CheckFile|FileTag|FileSize|RequestFile|UploadedFile|DeleteAccount|GlobalDeleteMessage|LocalDeleteMessage|Spam|ChannelPolicy|GroupPolicy|UserPolicy|ObjectDetected)/i;
  const get=(predicate)=>inv.filter(predicate);
  const specs=[
    {page:'messenger',title:'پیام‌رسان و شبکه',desc:'فعالیت، پیام‌ها، کانال‌ها، گروه‌ها و ماندگاری',icon:'✉',items:get(x=>x.section==='پیام‌رسان'&&!/TopSearches/.test(x.name)&&!qualityRx.test(x.name)),accent:'var(--chart-1,var(--teal))',soft:'var(--chart-1-soft,var(--teal2))'},
    {page:'tamasha',title:'تماشا و تعامل',desc:'کاربران فعال، بازدید، پسندیدن و مدیریت تعامل',icon:'▣',items:get(x=>x.section==='تماشا'),accent:'var(--chart-2,var(--blue))',soft:'var(--chart-2-soft,var(--blue2))'},
    {page:'search',title:'جست‌وجو و کشف',desc:'عبارت‌های برتر و روند تاریخی جست‌وجوها',icon:'⌕',items:get(x=>/TopSearches/.test(x.name)),accent:'var(--chart-3,var(--amber))',soft:'var(--chart-3-soft,var(--amber2))'},
    {page:'traffic',title:'ترافیک و درآمد',desc:'مصرف سرویس‌ها، اپراتورها و درآمد ثبت‌شده',icon:'⌁',items:get(x=>x.section==='محصول، ترافیک و درآمد'),accent:'var(--chart-4,var(--violet))',soft:'var(--chart-4-soft,var(--violet2))'},
    {page:'support',title:'مرکز تماس',desc:'نرخ پاسخ، حجم تماس و موضوعات پشتیبانی',icon:'◷',items:get(x=>/Callcenter SL|Call Reason|callReasons\.xlsx/i.test(x.name)),accent:'var(--chart-5,var(--rose))',soft:'var(--chart-5-soft,var(--rose2))'},
    {page:'quality',title:'کیفیت و عملیات',desc:'بررسی فایل، سیاست‌ها، گزارش و حذف حساب',icon:'✓',items:get(x=>x.section==='پیام‌رسان'&&qualityRx.test(x.name)),accent:'var(--chart-6,var(--teal))',soft:'var(--chart-1-soft,var(--teal2))'},
    {page:'growth',title:'رشد و بازار',desc:'نصب، امتیاز فروشگاه‌ها و شاخص محصولات',icon:'↗',items:get(x=>x.name.startsWith('Bazar_')||/Myket|Shaad_in_Bazaar|Best_Events|active user/i.test(x.name)),accent:'var(--chart-7,var(--amber))',soft:'var(--chart-3-soft,var(--amber2))'},
    {page:'catalog',title:'فهرست منابع و کاوشگر',desc:'جست‌وجو در تمام جداول و دریافت خروجی CSV',icon:'▤',items:inv,accent:'var(--chart-8,var(--violet))',soft:'var(--chart-4-soft,var(--violet2))'}
  ];
  return specs;
}
function renderModuleCards(){
 const specs=moduleCardSpec(),maxRows=Math.max(1,...specs.map(x=>x.items.reduce((a,b)=>a+(b.rows||0),0)));
 $('moduleCards').innerHTML=specs.map(x=>{let rows=x.items.reduce((a,b)=>a+(b.rows||0),0),date=x.items.map(z=>z.dateMax).filter(Boolean).sort().at(-1)||'',pct=Math.max(2,Math.min(100,rows/maxRows*100));return `<button class="module-card" type="button" data-module-page="${x.page}" style="--module-accent:${x.accent};--module-soft:${x.soft}" aria-label="ورود به بخش ${esc(x.title)}"><div class="module-card-head"><span class="module-card-date">${date?'داده تا '+fmtDate(date):'تاریخ ناموجود'}</span><span class="module-card-go">${x.icon}</span></div><div><h3 class="module-card-title">${esc(x.title)}</h3><p class="module-card-desc">${esc(x.desc)}</p></div><div class="module-data"><div><strong>${fmt(rows)}</strong><span>رکورد موجود</span></div><div style="text-align:left"><strong>${fmt(x.items.length)}</strong><span>جدول / منبع</span></div></div><div class="module-progress" aria-label="حجم داده نسبت به بزرگ‌ترین بخش"><i style="width:${pct}%"></i></div><div class="module-card-foot"><span>حجم نسبی داده در ماژول</span><b>${NF.format(rows/maxRows*100)}٪</b></div></button>`}).join('');
 document.querySelectorAll('[data-module-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.modulePage)));
}

function drawOverview(){let da=series('Messenger_statistics/DailyActivity','value_num'), msg=series('Messenger_statistics/NewMessage','value_num'), login=series('Messenger_statistics/LoginUser','value_num'), nu=series('Messenger_statistics/NewUser','value_num');let plat=latestLabelValues('Messenger_statistics/PlatformActivity');let total=plat.rows.find(x=>x.label.toLowerCase()==='total')?.value||null;let kpi=`${kpiFromSeries('فعالیت روزانه · DailyActivity',da,'◈','#087f78','#dff3ef')}${kpiHtml('فعالیت پلتفرمی · Total',total===null?'—':compact(total),plat.date,null,'▦','#3269b4','#e8f0fc')}${kpiFromSeries('پیام جدید · NewMessage',msg,'✉','#7565b5','#f0edfb')}${kpiFromSeries('ورود کاربران · LoginUser',login,'↪','#bf7d27','#fff2df')}${kpiFromSeries('کاربران جدید · NewUser',nu,'＋','#c45f69','#fcecef')}`;renderKpis('overviewKpis',kpi);drawLine('overviewActivity',[{name:'DailyActivity',points:da,color:COLORS[0]}]);drawLine('overviewMessages',[{name:'NewMessage',points:msg,color:COLORS[1]}]);let valid=plat.rows.filter(x=>x.label.toLowerCase()!=='total').sort((a,b)=>b.value-a.value);drawBars('platformBars',valid.map(x=>({name:x.label,value:x.value,display:compact(x.value)+(total?' · '+NF.format(x.value/total*100)+'٪':'')})));let ret=latestLabelValues('Messenger_statistics/DailyRetention');drawBars('retentionBars',ret.rows.sort((a,b)=>b.value-a.value).map(x=>({name:x.label.replace('Daily_',''),value:x.value})));drawFreshness();renderAnalyticsBento();renderModuleCards()}
function drawMessenger(){let da=series('Messenger_statistics/DailyActivity','value_num'),login=series('Messenger_statistics/LoginUser','value_num'),msg=series('Messenger_statistics/NewMessage','value_num'),fwd=series('Messenger_statistics/ForwardMessage','value_num');let nu=series('Messenger_statistics/NewUser','value_num'),jc=series('Messenger_statistics/JoinChannel','value_num'),lc=series('Messenger_statistics/LeaveChannel','value_num'),jg=series('Messenger_statistics/JoinGroup','value_num'),lg=series('Messenger_statistics/LeaveGroup','value_num');renderKpis('messengerKpis',`${kpiFromSeries('فعالیت روزانه',da,'◈')}${kpiFromSeries('ورود کاربران',login,'↪','#3269b4','#e8f0fc')}${kpiFromSeries('کاربران جدید',nu,'＋','#7565b5','#f0edfb')}${kpiFromSeries('پیام جدید',msg,'✉','#bf7d27','#fff2df')}`);drawLine('messengerActivityChart',[{name:'DailyActivity · شاخص',points:indexedSeries(da),color:COLORS[0]},{name:'LoginUser · شاخص',points:indexedSeries(login),color:COLORS[1]}],'شاخص (شروع=۱۰۰)');drawLine('messengerMessageChart',[{name:'NewMessage · شاخص',points:indexedSeries(msg),color:COLORS[2]},{name:'ForwardMessage · شاخص',points:indexedSeries(fwd),color:COLORS[3]}],'شاخص (شروع=۱۰۰)');drawLine('channelChart',[{name:'JoinChannel',points:jc,color:COLORS[0]},{name:'LeaveChannel',points:lc,color:COLORS[4]}]);drawLine('groupChart',[{name:'JoinGroup · شاخص',points:indexedSeries(jg),color:COLORS[1]},{name:'LeaveGroup · شاخص',points:indexedSeries(lg),color:COLORS[4]}],'شاخص (شروع=۱۰۰)');let v=latestLabelValues('Messenger_statistics/AndroidVersionsActivity');drawBars('androidVersionBars',v.rows.sort((a,b)=>b.value-a.value).map(x=>({name:x.label,value:x.value,display:NF.format(x.value)+'٪'})));let r=latestLabelValues('Messenger_statistics/DailyRetention');drawBars('messengerRetentionBars',r.rows.sort((a,b)=>b.value-a.value).map(x=>({name:x.label.replace('Daily_',''),value:x.value})));}
function drawTamasha(){let active=series('Tamasha_statistics/ActiveUsers','value_num'),views=series('Tamasha_statistics/ViewPost','value_num'),likes=series('Tamasha_statistics/LikePost','value_num'),posts=series('Tamasha_statistics/AddPost','value_num'),follow=series('Tamasha_statistics/FollowRequest','value_num'),unfollow=series('Tamasha_statistics/Unfollow','value_num');let l=[['ActiveUsers','کاربران فعال'],['ViewPost','بازدید پست'],['LikePost','پسندیدن پست'],['AddPost','انتشار پست'],['FollowRequest','درخواست دنبال‌کردن']];let html='';for(const [k,n] of l)html+=kpiFromSeries(n,series('Tamasha_statistics/'+k,'value_num'),'◈');renderKpis('tamashaKpis',html);drawLine('tamashaActiveChart',[{name:'ActiveUsers',points:active,color:COLORS[0]}]);drawLine('tamashaEngagementChart',[{name:'ViewPost · شاخص',points:indexedSeries(views),color:COLORS[1]},{name:'LikePost · شاخص',points:indexedSeries(likes),color:COLORS[2]}],'شاخص (شروع=۱۰۰)');drawLine('tamashaGrowthChart',[{name:'AddPost · شاخص',points:indexedSeries(posts),color:COLORS[0]},{name:'FollowRequest · شاخص',points:indexedSeries(follow),color:COLORS[1]},{name:'Unfollow · شاخص',points:indexedSeries(unfollow),color:COLORS[4]}],'شاخص (شروع=۱۰۰)');let modKeys=['TotalCheckPosts','TotalCheckVideos','TotalOkPosts','TotalOkVideos','TotalErrorPosts','TotalErrorVideos','TotalHighConfidencePosts','TotalHighConfidenceVideos'];let mod=modKeys.map(k=>{let p=getLastValue('Tamasha_statistics/'+k,'value_num');return {name:k,value:p?.value??0,display:p?compact(p.value):'—'}});drawBars('moderationBars',mod);let ops=['AcceptRequest','DeclineRequest','FollowRequest','Unfollow','SetBlock','SetUnblock','SetReport','PostReport','ProfileReport'];let rr=[];ops.forEach(k=>{let p=getLastValue('Tamasha_statistics/'+k,'value_num');if(p)rr.push([k,compact(p.value),fmtDate(p.date)])});$('tamashaOpsTable').innerHTML=formatTable(['جدول منبع','آخرین مقدار','تاریخ'],rr)}
function drawSearch(){let t=table('Messenger_statistics/TopSearches');if(!t)return;let di=col(t,'shamsi_date'),ri=col(t,'ranking'),qi=col(t,'search_text'),ci=col(t,'search_count');let date=tableObservedCutoff('Messenger_statistics/TopSearches')||t.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop();currentSearchRows=t.rows.filter(r=>normDate(r[di])===date&&withinTableDate('Messenger_statistics/TopSearches',normDate(r[di]))).sort((a,b)=>num(a[ri])-num(b[ri]));let top=currentSearchRows[0];renderKpis('searchKpis',`${kpiHtml('عبارت رتبه اول',top?.[qi]||'—',date,null,'⌕','#087f78','#dff3ef')}${kpiHtml('تعداد جست‌وجوی رتبه اول',top?fmt(num(top[ci])):'—',date,null,'#','#3269b4','#e8f0fc')}${kpiHtml('عبارت‌های ثبت‌شده در روز',fmt(currentSearchRows.length),date,null,'▤','#7565b5','#f0edfb')}${kpiHtml('تعداد تاریخ‌های موجود',fmt(new Set(t.rows.map(r=>normDate(r[di]))).size),date,null,'◷','#bf7d27','#fff2df')}`);$('searchDateLabel').textContent='تاریخ آخرین رتبه‌بندی: '+fmtDate(date);$('topSearchFilter').value='';SEARCH_PAGE=1;renderTopSearchTable();$('searchRankBars').innerHTML='';drawBars('searchRankBars',[...currentSearchRows.slice(0,10).map(r=>({name:r[2],value:num(r[3])||0}))].map(x=>({...x,display:fmt(x.value)+' جست‌وجو'})));$('queryTrendChart').innerHTML='<div class="chart-empty">یک عبارت را وارد کنید تا روند آن نمایش داده شود.</div>';}
function renderTopSearchTable(){let q=$('topSearchFilter').value.trim().toLowerCase();let rows=currentSearchRows.filter(r=>!q||String(r[2]).toLowerCase().includes(q)||String(r[1]).includes(q));let pages=Math.max(1,Math.ceil(rows.length/20));SEARCH_PAGE=Math.min(SEARCH_PAGE,pages);let page=rows.slice((SEARCH_PAGE-1)*20,SEARCH_PAGE*20);$('topSearchTable').innerHTML=formatTable(['رتبه','عبارت','تعداد جست‌وجو'],page.map(r=>[fmt(num(r[1])),r[2],fmt(num(r[3]))]));$('searchFilteredCount').textContent=fmt(rows.length)+' عبارت';$('topSearchPagination').innerHTML=`<span>صفحه ${fmt(SEARCH_PAGE)} از ${fmt(pages)}</span><div><button class="btn" id="searchPrev" ${SEARCH_PAGE<=1?'disabled':''}>قبلی</button> <button class="btn" id="searchNext" ${SEARCH_PAGE>=pages?'disabled':''}>بعدی</button></div>`;$('searchPrev')?.addEventListener('click',()=>{SEARCH_PAGE--;renderTopSearchTable()});$('searchNext')?.addEventListener('click',()=>{SEARCH_PAGE++;renderTopSearchTable()})}
function drawQueryTrend(){let q=$('queryTrendInput').value.trim();if(!q)return;let t=table('Messenger_statistics/TopSearches');let di=col(t,'shamsi_date'),qi=col(t,'search_text'),ci=col(t,'search_count'),ri=col(t,'ranking');let points=t.rows.filter(r=>String(r[qi]||'').trim()===q) .map(r=>({date:normDate(r[di]),value:num(r[ci]),rank:num(r[ri])})).filter(x=>x.date&&x.value!==null&&withinTableDate('Messenger_statistics/TopSearches',x.date)).sort((a,b)=>a.date.localeCompare(b.date));if(!points.length){$('queryTrendChart').innerHTML='<div class="chart-empty">این عبارت در داده موجود پیدا نشد.</div>';return}drawLine('queryTrendChart',[{name:q,points,color:COLORS[0]}]);}
function drawTraffic(){let t=table('shad beat.xlsx::Traffic_V2');if(!t)return;let p=t.rows.filter(r=>r[0]&&withinTableDate('shad beat.xlsx::Traffic_V2',normDate(r[0]))).sort((a,b)=>normDate(a[0]).localeCompare(normDate(b[0]))).at(-1);let h=t.columns,idx=n=>h.indexOf(n),get=n=>num(p?.[idx(n)]);let date=normDate(p?.[idx('shamsi_date')]);let totalTraffic=get('all_operators_all_services_traffic'),totalRevenue=get('all_operators_all_services_revenue')/10;renderKpis('trafficKpis',`${kpiHtml('ترافیک کل سرویس‌ها',compact(totalTraffic),date,null,'⌁','#087f78','#dff3ef','GB')}${kpiHtml('درآمد کل ثبت‌شده',compact(totalRevenue),date,null,'◉','#3269b4','#e8f0fc','تومان')}${kpiHtml('سهم ترافیک همراه اول',get('MCI_traffic_share')===null?'—':NF.format(get('MCI_traffic_share')*100),date,null,'▤','#7565b5','#f0edfb','٪')}${kpiHtml('ترافیک تماشا',compact(get('Tamasha_All_operators_GB')),date,null,'▣','#bf7d27','#fff2df','GB')}`);let products=[['دیدنی','Didani_All_operators_GB'],['ورزشی','Sport_All_operators_GB'],['شادبین','Shadbin_All_operators_GB'],['تماشا','Tamasha_All_operators_GB'],['TV','TV_All_operators_GB']].map(([n,k])=>({name:n,value:get(k)}));drawBars('productTrafficBars',products);let ops=[['همراه اول','MCI_all_sevices_traffic'],['ایرانسل','MTN_all_sevices_traffic'],['رایتل','Rightel_all_sevices_traffic'],['سایر','Other_all_sevices_traffic']].map(([n,k])=>({name:n,value:get(k)}));drawBars('operatorTrafficBars',ops);drawLine('trafficTrendChart',[{name:'کل ترافیک',points:series('shad beat.xlsx::Traffic_V2','all_operators_all_services_traffic','shamsi_date'),color:COLORS[0]}], 'GB');let revenues=[['دیدنی','Didani__All_operators_revenue'],['ورزشی','Sport__All_operators_revenue'],['شادبین','Shadbin_All_operators_revenue'],['تماشا','Tamasha_All_operators_revenue'],['TV','TV_All_operators_revenue']].map(([n,k])=>({name:n,value:get(k)/10}));drawBars('productRevenueBars',revenues.map(x=>({...x,display:compact(x.value)+' تومان'})));let inv=table('shad beat.xlsx::invoices');if(inv){let dateI=col(inv,'invoice_date'),op=col(inv,'operator'),traffic=col(inv,'traffic_GB'),net=col(inv,'Net Amount'),gross=col(inv,'Gross Amount');let rs=inv.rows.slice().filter(r=>r[dateI]).sort((a,b)=>normDate(b[dateI]).localeCompare(normDate(a[dateI]))).slice(0,12).map(r=>[fmtDate(normDate(r[dateI])),r[op],fmt(num(r[traffic])),fmt(num(r[gross])/10),fmt(num(r[net])/10)]);$('invoiceTable').innerHTML=formatTable(['تاریخ فاکتور','اپراتور','ترافیک GB','مبلغ ناخالص تومان','مبلغ خالص تومان'],rs)}}
function drawSupport(){let t=table('shad beat.xlsx::Callcenter SL'),a=series('shad beat.xlsx::Callcenter SL','نرخ پاسخ به تماس','date'),incoming=series('shad beat.xlsx::Callcenter SL','تماس ورودی','date'),answered=series('shad beat.xlsx::Callcenter SL','تماس پاسخ داده شده','date');let p=lastPoint(a),inc=lastPoint(incoming),ans=lastPoint(answered);let time=series('shad beat.xlsx::Callcenter SL','طول زمان تماس (ثانیه)','date'),speed=series('shad beat.xlsx::Callcenter SL','سرعت پاسخ به تماس (ثانیه)','date');renderKpis('supportKpis',`${kpiHtml('نرخ پاسخ‌گویی',p?NF.format(p.value*100)+'٪':'—',p?.date,null,'✓','#087f78','#dff3ef')}${kpiHtml('تماس ورودی',inc?fmt(inc.value):'—',inc?.date,null,'↙','#3269b4','#e8f0fc')}${kpiHtml('تماس پاسخ‌داده‌شده',ans?fmt(ans.value):'—',ans?.date,null,'↗','#7565b5','#f0edfb')}${kpiHtml('میانگین زمان پاسخ',lastPoint(speed)?fmt(lastPoint(speed).value)+' ثانیه':'—',lastPoint(speed)?.date,null,'◷','#bf7d27','#fff2df')}`);drawLine('answerRateChart',[{name:'نرخ پاسخ',points:a.map(x=>({...x,value:x.value*100})),color:COLORS[0]}],'٪',true);drawLine('callVolumeChart',[{name:'تماس ورودی',points:incoming,color:COLORS[1]},{name:'تماس پاسخ‌داده‌شده',points:answered,color:COLORS[0]}]);let cr=table('shad beat.xlsx::Call Reason');if(cr){let di=col(cr,'date'),ni=col(cr,'call reason'),vi=col(cr,'count_current_week');let d=tableObservedCutoff('shad beat.xlsx::Call Reason')||cr.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop();let r=cr.rows.filter(x=>normDate(x[di])===d).map(x=>({name:x[ni],value:num(x[vi])})).sort((a,b)=>b.value-a.value).slice(0,10);drawBars('callReasonBars',r)}let det=table('callReasons.xlsx::Sheet1');if(det){let di=col(det,'shamsidate'),ni=col(det,'srlevel3'),vi=col(det,'calls');let d=tableObservedCutoff('callReasons.xlsx::Sheet1')||det.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop();let ag={};det.rows.filter(r=>normDate(r[di])===d).forEach(r=>{let n=String(r[ni]||'سایر');ag[n]=(ag[n]||0)+(num(r[vi])||0)});drawBars('detailedCallReasonBars',Object.entries(ag).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,10))}}
function drawQuality(){let kpis=[['حذف حساب','Messenger_statistics/DeleteAccount'],['درخواست فایل','Messenger_statistics/RequestFile'],['فایل بارگذاری‌شده','Messenger_statistics/UploadedFile'],['حجم فایل','Messenger_statistics/FileSize']];let h='';for(const [n,k] of kpis){let a=series(k,'value_num');let p=lastPoint(a);let val=p?(k.endsWith('FileSize')?compact(p.value/1024**4)+' TiB':compact(p.value)):'—';h+=kpiHtml(n,val,p?.date,null,'◈')}renderKpis('qualityKpis',h);let pol=['PolicyNoBan','PolicyLimitBan','PolicyFullBan'].map((k,i)=>{let p=getLastValue('Messenger_statistics/'+k,'value_num');return {name:k,value:p?.value||0,display:p?compact(p.value):'—',color:COLORS[i]}});drawBars('policyBars',pol);let check=['CheckFileEntry','CheckFileChecked','CheckFileError','CheckFileHighConfidence','CheckFileNotChecked'].map((k,i)=>{let p=getLastValue('Messenger_statistics/'+k,'value_num');return {name:k.replace('CheckFile',''),value:p?.value||0,display:p?compact(p.value):'—',color:COLORS[i]}});drawBars('fileCheckBars',check);let rq=series('Messenger_statistics/RequestFile','value_num'),up=series('Messenger_statistics/UploadedFile','value_num');drawLine('fileTrendChart',[{name:'RequestFile',points:rq,color:COLORS[1]},{name:'UploadedFile',points:up,color:COLORS[0]}]);let tags=['FileTagHigh','FileTagMedium','FileTagLow','FileTagNone'].map((k,i)=>{let p=getLastValue('Messenger_statistics/'+k,'value_num');return {name:k.replace('FileTag',''),value:p?.value||0,display:p?compact(p.value):'—',color:COLORS[i]}});drawBars('fileTagBars',tags);let dates=['CheckFileEntry','FileTagNone'].map(k=>lastPoint(series('Messenger_statistics/'+k,'value_num'))?.date||'');let latest=dates[0]||dates[1]||'',snapshot=normDate(DATA.meta.snapshotJalali);$('checkFileFreshness').textContent='آخرین داده: '+fmtDate(latest||'ناموجود')+(latest&&snapshot&&latest<snapshot?' · منبع قدیمی نسبت به Snapshot':'')}
function drawGrowth(){let bazarRate=series('Bazar_averageRate.xlsx::Sheet1','average_rate'),inst=series('Bazar_newInstall.xlsx::Sheet1','new_install'),upd=series('Bazar_updates.xlsx::Sheet1','updates'),myket=series('shad beat.xlsx::Myket_AVG_new_rate','AVG_new_rate'),shaadBaz=series('shad beat.xlsx::Shaad_in_Bazaar','final_rate');let p=lastPoint(bazarRate),pi=lastPoint(inst),pu=lastPoint(upd),pm=lastPoint(myket),ps=lastPoint(shaadBaz);renderKpis('growthKpis',`${kpiHtml('میانگین امتیاز بازار',p?NF.format(p.value):'—',p?.date,null,'★','#087f78','#dff3ef')}${kpiHtml('نصب جدید بازار',pi?fmt(pi.value):'—',pi?.date,null,'＋','#3269b4','#e8f0fc')}${kpiHtml('به‌روزرسانی بازار',pu?fmt(pu.value):'—',pu?.date,null,'↻','#7565b5','#f0edfb')}${kpiHtml('میانگین امتیاز جدید مایکت',pm?NF.format(pm.value):'—',pm?.date,null,'★','#bf7d27','#fff2df')}`);drawLine('installChart',[{name:'نصب جدید',points:inst,color:COLORS[0]}]);drawLine('ratingChart',[{name:'بازار',points:bazarRate,color:COLORS[1]},{name:'مایکت',points:myket,color:COLORS[0]},{name:'امتیاز شاد در بازار',points:shaadBaz,color:COLORS[2]}]);let au=table('shad beat.xlsx::active user');if(au){let di=col(au,'date');let d=tableObservedCutoff('shad beat.xlsx::active user')||au.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop();let r=au.rows.find(r=>normDate(r[di])===d);drawBars('productUsersBars',[['ورزشی','Sport DAU'],['دیدنی','Didani DAU'],['شادبین','ShadBin DAU']].map(([n,k])=>({name:n,value:num(r?.[col(au,k)])||0})));}let ev=table('shad beat.xlsx::Best_Events');if(ev){let di=col(ev,'Friday_date');let d=tableObservedCutoff('shad beat.xlsx::Best_Events')||ev.rows.map(r=>normDate(r[di])).filter(Boolean).sort().pop();let name=col(ev,'event'),v=col(ev,'count_current_week');drawBars('bestEventsBars',ev.rows.filter(r=>normDate(r[di])===d).map(r=>({name:r[name],value:num(r[v])||0})).sort((a,b)=>b.value-a.value).slice(0,8))}}

const ADVANCED_HIDDEN=new Map();
const ADVANCED_LABELS={Messenger:'پیام‌رسان',Tamasha:'تماشا',Infrastructure:'ترافیک و زیرساخت',Support:'پشتیبانی',Analytics:'تحلیل ترکیبی'};
const ADVANCED_COLORS=Array.from({length:8},(_,i)=>themeColor('--chart-'+(i+1)));
function advValid(s){return (s?.points||[]).filter(p=>p[1]!==null&&p[1]!==undefined&&Number.isFinite(Number(p[1])))}
function advMean(a){return a.length?a.reduce((s,v)=>s+v,0)/a.length:0}
function advSd(a){return a.length?Math.sqrt(advMean(a.map(v=>(v-advMean(a))**2))):0}
function advSeries(c){const dates=[...new Set((c.series||[]).flatMap(s=>(s.points||[]).map(p=>p[0])))].sort();const keep=RANGE==='all'?null:new Set(dates.slice(-Number(RANGE)));return (c.series||[]).map(s=>({...s,points:RANGE==='all'?s.points.slice():s.points.filter(p=>keep.has(p[0]))}))}
function sourceSeries(k,valueCol='value_num',dateCol=null){const t=table(k);if(!t)return [];const di=col(t,dateCol||['date_key','date','shamsi_date','shamsidate','تاریخ جلالی','تاریخ']),vi=col(t,valueCol);if(di<0||vi<0)return [];return t.rows.map(r=>({date:normDate(r[di]),value:num(r[vi])})).filter(p=>p.date&&p.value!==null&&withinTableDate(k,p.date)).sort((a,b)=>a.date.localeCompare(b.date)).map(p=>[p.date,p.value]);}
function sourceLabelSeries(k,labelCol='label',valueCol='value_num',dateCol='date_key'){const t=table(k);if(!t)return [];const di=col(t,dateCol),li=col(t,labelCol),vi=col(t,valueCol);if(di<0||li<0||vi<0)return [];const g={};for(const r of t.rows){const d=normDate(r[di]),l=String(r[li]??''),v=num(r[vi]);if(d&&l&&v!==null&&withinTableDate(k,d))(g[l]??=[]).push([d,v]);}return Object.entries(g).map(([name,points])=>({name,points:points.sort((a,b)=>a[0].localeCompare(b[0]))}));}
function sourceGroupedSeries(k,groupCols,valueCol,dateCol){const t=table(k);if(!t)return [];const di=col(t,dateCol),vi=col(t,valueCol),gis=groupCols.map(c=>col(t,c));if(di<0||vi<0||gis.some(i=>i<0))return [];const g={};for(const r of t.rows){const d=normDate(r[di]),v=num(r[vi]);if(!d||v===null||!withinTableDate(k,d))continue;const label=gis.map(i=>String(r[i]??'نامشخص').trim()||'نامشخص').join(' / ');g[label]??={};g[label][d]=(g[label][d]||0)+v;}return Object.entries(g).map(([name,ds])=>({name,points:Object.entries(ds).sort((a,b)=>a[0].localeCompare(b[0])).map(([d,v])=>[d,v])}));}
function sumSourceSeries(a,b,name){const m={};for(const [d,v] of [...a,...b])m[d]=(m[d]||0)+v;return {name,points:Object.entries(m).sort((x,y)=>x[0].localeCompare(y[0])).map(([d,v])=>[d,v])};}
function rebuildAdvancedFromSource(){if(!ADVANCED_DATA)return {};const byId=new Map(Object.values(ADVANCED_DATA).flat().map(c=>[c.id,c]));const set=(id,source,series,title)=>{const c=byId.get(id);if(c){c.source=source;c.series=series;if(title)c.title=title;}};
set('Messenger-24','Messenger_statistics/DailyRetention.csv',sourceLabelSeries('Messenger_statistics/DailyRetention','label','value_num','date_key'));
set('Messenger-26','Messenger_statistics/DailyActivity.csv',[{name:'فعالیت روزانه',points:sourceSeries('Messenger_statistics/DailyActivity')}],'الگوی تقویمی فعالیت روزانه');
set('Messenger-27','Messenger_statistics/NewMessage.csv',[{name:'پیام جدید',points:sourceSeries('Messenger_statistics/NewMessage')}],'پراکندگی حجم پیام‌های جدید');
set('Messenger-28','Messenger_statistics/CheckFileError.csv',[{name:'خطای بررسی فایل',points:sourceSeries('Messenger_statistics/CheckFileError')}],'کنترل آماری خطاهای بررسی فایل');
set('Messenger-30','Messenger_statistics/DailyActivity.csv',[{name:'فعالیت روزانه',points:sourceSeries('Messenger_statistics/DailyActivity')}]);
set('Messenger-31','Messenger_statistics/DailyActivity.csv + Messenger_statistics/NewMessage.csv',[{name:'فعالیت',points:sourceSeries('Messenger_statistics/DailyActivity')},{name:'پیام جدید',points:sourceSeries('Messenger_statistics/NewMessage')}]);
set('Tamasha-18','Tamasha_statistics/ActiveUsers.csv',[{name:'کاربران فعال',points:sourceSeries('Tamasha_statistics/ActiveUsers')}]);
set('Tamasha-19','Tamasha_statistics/ViewPost.csv',[{name:'بازدید پست',points:sourceSeries('Tamasha_statistics/ViewPost')}]);
set('Tamasha-20','Tamasha_statistics/TotalProcessErrorPosts.csv + Tamasha_statistics/TotalProcessErrorVideos.csv',[sumSourceSeries(sourceSeries('Tamasha_statistics/TotalProcessErrorPosts'),sourceSeries('Tamasha_statistics/TotalProcessErrorVideos'),'خطای پردازش پست و ویدئو')],'روند خطاهای پردازش پست و ویدئو');
set('Tamasha-22','Tamasha_statistics/ActiveUsers.csv + Tamasha_statistics/ViewPost.csv',[{name:'کاربران فعال',points:sourceSeries('Tamasha_statistics/ActiveUsers')},{name:'بازدید پست',points:sourceSeries('Tamasha_statistics/ViewPost')}]);
const infra='Mr_JafarGholi_report.xlsx::Page1 - TB';const infraPts=sourceSeries(infra,'ترافیک کل کشور (ترابایت) ','تاریخ جلالی');
set('Infrastructure-16',infra+' · ترافیک کل کشور (ترابایت)',[{name:'ترافیک کل کشور',points:infraPts}],'پراکندگی ترافیک کل کشور');
set('Infrastructure-17',infra+' · ترافیک کل کشور (ترابایت)',[{name:'ترافیک کل کشور',points:infraPts}],'کنترل آماری ترافیک کل کشور');
const support=sourceGroupedSeries('callReasons.xlsx::Sheet1',['srlevel2','srlevel3'],'calls','shamsidate');
for(const [id,title] of [['Support-9','پارتو دلایل تماس در گروه‌های کاربری'],['Support-10','ترکیب دلایل تماس در گروه‌های کاربری'],['Support-11','سلسله‌مراتب دلایل تماس در گروه‌های کاربری']])set(id,'callReasons.xlsx::Sheet1 · srlevel2 / srlevel3 / calls',support,title);
const analytics=[['کاربر فعال','Messenger_statistics/DailyActivity'],['پیام جدید','Messenger_statistics/NewMessage'],['کاربر جدید','Messenger_statistics/NewUser'],['حذف حساب','Messenger_statistics/DeleteAccount'],['تماس','Messenger_statistics/CallMessage'],['خطای فایل','Messenger_statistics/CheckFileError'],['عضویت گروه','Messenger_statistics/JoinGroup'],['بازنشر','Messenger_statistics/ForwardMessage']].map(([name,k])=>({name,points:sourceSeries(k)}));
set('Analytics-1','Messenger_statistics/*.csv · تغییرات هم‌تاریخ بر اساس date_key',analytics,'ماتریس همبستگی تغییرات شاخص‌های پیام‌رسان');
set('Analytics-5','Messenger_statistics/DailyActivity.csv',[{name:'فعالیت روزانه',points:sourceSeries('Messenger_statistics/DailyActivity')}]);
set('Analytics-8','Messenger_statistics/NewMessage.csv',[{name:'پیام جدید',points:sourceSeries('Messenger_statistics/NewMessage')}]);return ADVANCED_DATA;}

function advAligned(a,b){let m=new Map(advValid(b));return advValid(a).filter(([d])=>m.has(d)).map(([d,v])=>[d,+v,+m.get(d)])}
function advDiff(s){let a=advValid(s);return {points:a.slice(1).map(([d,v],i)=>[a[i][0]+' → '+d,+v-Number(a[i][1])])}}
function advCorr(a,b){if(a.length<30)return null;let x=advMean(a),y=advMean(b),sx=advSd(a),sy=advSd(b);return sx&&sy?advMean(a.map((v,i)=>(v-x)*(b[i]-y)))/(sx*sy):null}
function drawAdvancedChart(div,chart){
 const allSeries=advSeries(chart),hidden=ADVANCED_HIDDEN.get(chart.id)||new Set(),ss=allSeries.filter(series=>!hidden.has(series.name)),kind=chart.kind,W=900,H=340,L=72,R=28,T=26,B=64,iw=W-L-R,ih=H-T-B;
 const css=getComputedStyle(document.documentElement),C={
  teal:themeColor('--chart-1'),
  blue:themeColor('--chart-2'),
  amber:themeColor('--chart-3'),
  rose:themeColor('--chart-5'),
  violet:themeColor('--chart-4'),
  ink:themeColor('--foreground','--ink'),
  muted:themeColor('--muted-foreground','--muted'),
  line:themeColor('--border'),
  surface:themeColor('--surface')
 };
 const colors=Array.from({length:8},(_,i)=>themeColor('--chart-'+(i+1)));
 const escSvg=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const fa=v=>Number(v).toLocaleString('fa-IR',{maximumFractionDigits:1});
 const faDate=v=>jalaliTick(v);
 const short=v=>{let a=Math.abs(v);return a>=1e9?fa(v/1e9)+' میلیارد':a>=1e6?fa(v/1e6)+' میلیون':a>=1e3?fa(v/1e3)+' هزار':fa(v)};
 const valid=ss.map(s=>({...s,points:advValid(s).map(p=>[String(p[0]),Number(p[1])])}));
 if(!valid.some(s=>s.points.length)){div.innerHTML='<div class="chart-empty">در بازه انتخابی داده معتبر وجود ندارد.</div>';return}
 let note=chart.note||'تحلیل اکتشافی بر اساس داده‌های ثبت‌شده؛ همبستگی به معنی رابطه علّی نیست.';
 let body='',legend='',defs='<defs><linearGradient id="advArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="'+C.teal+'" stop-opacity=".20"/><stop offset="1" stop-color="'+C.teal+'" stop-opacity="0"/></linearGradient></defs>';
 const txt=(x,y,v,anchor='middle',size=12,color=C.muted,weight=500)=>'<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" direction="rtl" font-family="Vazirmatn,Tahoma,Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+escSvg(v)+'</text>';
 const rect=(x,y,w,h,fill,rx=5,stroke='none')=>'<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+rx+'" fill="'+fill+'" stroke="'+stroke+'"/>';
 const line=(x1,y1,x2,y2,stroke=C.line,dash='')=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="1" '+(dash?'stroke-dasharray="'+dash+'"':'')+'/>';
 const circle=(x,y,r,fill,title='')=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'">'+(title?'<title>'+escSvg(title)+'</title>':'')+'</circle>';
 const frame=(min,max,unit)=>{if(max===min){max+=Math.abs(max)*.1||1;min-=Math.abs(min)*.1||1}const span=max-min;let g='';for(let i=0;i<5;i++){let v=max-span*i/4,y=T+ih*i/4;g+=line(L,y,W-R,y,C.line)+txt(W-R+12,y+4,short(v), 'start',10,C.muted)}g+=txt(W-R,T-8,unit||'', 'end',10,C.muted);return {g,x:i=>L+(i/(Math.max(1,frame.count-1)))*iw,y:v=>T+(max-v)/span*ih,min,max}};
 const wrap=()=>'<svg class="advanced-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+escSvg(chart.title)+'" direction="rtl" style="width:100%;height:100%;display:block;overflow:visible" preserveAspectRatio="xMidYMid meet">'+defs+body+'</svg>';
 const xLabels=dates=>{let out='',n=Math.min(6,dates.length);for(let i=0;i<n;i++){let j=Math.round(i*(dates.length-1)/Math.max(1,n-1));out+=txt(W-R-j*iw/Math.max(1,dates.length-1),H-22,faDate(dates[j]),'middle',10,C.muted)}return out};
 if(kind==='box'||kind==='histogram'){
  const values=valid.map(s=>s.points.map(p=>p[1])).flat(),mn=Math.min(...values),mx=Math.max(...values);
  const f=frame(mn,mx,chart.unit);if(kind==='box')body+=f.g;
  if(kind==='box'){
   const q=a=>{let b=a.slice().sort((x,y)=>x-y),p=(b.length-1)*a;return b[Math.floor(p)]*(1-(p%1))+b[Math.ceil(p)]*(p%1)};
   valid.forEach((s,i)=>{let a=s.points.map(p=>p[1]).sort((x,y)=>x-y);if(!a.length)return;const quant=p=>{let k=(a.length-1)*p,lo=Math.floor(k),hi=Math.ceil(k);return a[lo]*(hi-k)+a[hi]*(k-lo)};let q1=quant(.25),med=quant(.5),q3=quant(.75),iqr=q3-q1,low=Math.max(a[0],q1-1.5*iqr),high=Math.min(a[a.length-1],q3+1.5*iqr),x=L+(i+.5)*iw/valid.length,bw=Math.min(88,iw/valid.length*.48),col=colors[i%colors.length];body+=line(x,f.y(low),x,f.y(high),col)+line(x-bw/3,f.y(low),x+bw/3,f.y(low),col)+line(x-bw/3,f.y(high),x+bw/3,f.y(high),col)+rect(x-bw/2,f.y(q3),bw,Math.max(2,f.y(q1)-f.y(q3)),col,5)+line(x-bw/2,f.y(med),x+bw/2,f.y(med),C.surface,'')+txt(x,H-24,s.name,'middle',11,C.ink);a.forEach(v=>{if(v<low||v>high)body+=circle(x,f.y(v),3,C.rose,fa(v))})});
   note='نمودار جعبه‌ای: میانه، چارک‌ها و نقاط پرت بر اساس مشاهدات همین بازه.';
  }else{
   const bins=12,step=(mx-mn||1)/bins,counts=Array(bins).fill(0);values.forEach(v=>counts[Math.min(bins-1,Math.floor((v-mn)/step))]++);const max=Math.max(1,...counts);
   for(let i=0;i<5;i++){let v=max*(1-i/4),y=T+ih*i/4;body+=line(L,y,W-R,y,C.line)+txt(W-R+12,y+4,fa(Math.round(v)),'start',10,C.muted)}
   counts.forEach((n,i)=>{let bw=iw/bins-4,x=L+i*iw/bins,y=T+ih-n/max*ih;body+=rect(x,y,bw,n/max*ih,colors[0],4)+txt(x+bw/2,H-24,fa(mn+i*step),'middle',9,C.muted)});
   body+=txt(W-R,15,'فراوانی','end',11,C.ink,700)+txt(W/2,H-5,'بازه مقدار · '+(chart.unit||''),'middle',10,C.muted);note='هیستوگرام توزیع مقادیر؛ محور افقی بازه مقدار و محور عمودی فراوانی مشاهدات را نشان می‌دهد.';
  }
 }else if(kind==='scatter'){
  let a=valid[0]?.points||[],b=valid[1]?.points||[],map=new Map(b),pairs=a.filter(p=>map.has(p[0])).map(p=>[p[0],p[1],map.get(p[0])[1]]);
  if(!pairs.length){div.innerHTML='<div class="chart-empty">داده‌ی هم‌تاریخ کافی برای مقایسه وجود ندارد.</div>';return}
  let xs=pairs.map(p=>p[1]),ys=pairs.map(p=>p[2]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys);if(xmin===xmax)xmax++;if(ymin===ymax)ymax++;
  const px=v=>W-R-(v-xmin)/(xmax-xmin)*iw,py=v=>T+(ymax-v)/(ymax-ymin)*ih;
  for(let i=0;i<5;i++){let v=ymax-(ymax-ymin)*i/4,y=T+ih*i/4;body+=line(L,y,W-R,y)+txt(W-R+12,y+4,short(v),'start',10)}
  pairs.forEach(p=>body+=circle(px(p[1]),py(p[2]),4,colors[0],jalaliTick(p[0])+' · '+fa(p[1])+' / '+fa(p[2])));
  body+=txt(W/2,H-12,valid[0].name+' · '+(chart.unit||''),'middle',11,C.ink)+txt(20,H/2,valid[1].name,'middle',11,C.ink);
  note='تعداد جفت‌های هم‌تاریخ: '+fa(pairs.length)+'؛ نقاط، دو شاخص را در تاریخ مشترک مقایسه می‌کنند و رابطه علّی را اثبات نمی‌کنند.';
 }else if(kind==='heatmap'){
  if(valid.length>1){
   const dates=[...new Set(valid.flatMap(s=>s.points.map(p=>p[0])))].sort(),cellW=iw/Math.max(1,dates.length),cellH=Math.min(38,ih/valid.length);
   valid.forEach((s,ri)=>{let m=new Map(s.points);body+=txt(W-R+10,T+ri*cellH+cellH*.65,s.name,'start',10,C.ink);dates.forEach((d,ci)=>{let v=m.get(d)?.[1];if(v===undefined)return;let all=valid.flatMap(x=>x.points.map(p=>p[1])),lo=Math.min(...all),hi=Math.max(...all),alpha=.18+.82*(v-lo)/(hi-lo||1);body+=rect(W-R-(ci+1)*cellW,T+ri*cellH,Math.max(1,cellW-2),cellH-2,'color-mix(in srgb, '+C.teal+' '+(alpha*100)+'%, '+C.surface+')',3)+ '<title>'+escSvg(jalaliTick(d)+' · '+fa(v))+'</title>'})});
   body+=txt(W/2,H-10,'تاریخ جلالی','middle',10);
  }else{
   let pts=valid[0].points,months=[...new Set(pts.map(p=>p[0].slice(0,7)))].sort(),m=new Map(pts),max=Math.max(1,...pts.map(p=>p[1])),cellW=iw/31,cellH=Math.min(40,ih/Math.max(1,months.length));
   months.forEach((mon,ri)=>{body+=txt(W-R+10,T+ri*cellH+cellH*.65,faDate(mon),'start',10,C.ink);for(let d=1;d<=31;d++){let key=mon+'/'+String(d).padStart(2,'0'),v=m.get(key)?.[1];if(v===undefined){key=mon+'-'+String(d).padStart(2,'0');v=m.get(key)?.[1]}if(v===undefined)continue;let opacity=.14+.86*v/max;body+=rect(W-R-d*cellW,T+ri*cellH,cellW-2,cellH-3,'color-mix(in srgb, '+C.teal+' '+(opacity*100)+'%, '+C.surface+')',3)+'<title>'+escSvg(jalaliTick(key)+' · '+fa(v))+'</title>'}});
   body+=txt(W/2,H-10,'روز ماه','middle',10);note='نقشه حرارتی تقویم شمسی؛ شدت رنگ مقدار ثبت‌شده و خانه خالی به معنی نبود رکورد است.';
  }
 }else if(kind==='control'||kind==='forecast'||kind==='line'||kind==='bar'){
  const dates=[...new Set(valid.flatMap(s=>s.points.map(p=>p[0])))].sort(),mapDates=new Set(dates),all=valid.flatMap(s=>s.points.map(p=>p[1])),min=Math.min(0,...all),max=Math.max(...all),f=frame(min,max,chart.unit);body+=f.g;
  const x=d=>W-R-dates.indexOf(d)*iw/Math.max(1,dates.length-1),y=v=>T+(f.max-v)/(f.max-f.min)*ih;
  valid.forEach((s,si)=>{let m=new Map(s.points),path='',drawing=false;dates.forEach(d=>{if(m.has(d)){path+=(drawing?' L ':'M ')+x(d)+' '+y(m.get(d)[1]);drawing=true}else drawing=false});if(kind==='bar'){s.points.forEach(p=>body+=rect(x(p[0])-Math.min(16,iw/dates.length*.32),y(p[1]),Math.min(32,iw/dates.length*.64),T+ih-y(p[1]),colors[si%colors.length],4))}else{body+='<path d="'+path+'" fill="none" stroke="'+colors[si%colors.length]+'" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>';s.points.forEach(p=>body+=circle(x(p[0]),y(p[1]),2.8,colors[si%colors.length],s.name+' · '+p[0]+' · '+fa(p[1]))) }});
  if(kind==='control'||kind==='forecast'){
   let a=valid[0].points,w=30,mid=[],upper=[],lower=[],out=[];
   if(kind==='control'&&a.length>w){for(let i=w;i<a.length;i++){let hist=a.slice(i-w,i).map(p=>p[1]),avg=hist.reduce((u,v)=>u+v,0)/hist.length,sd=Math.sqrt(hist.reduce((u,v)=>u+(v-avg)*(v-avg),0)/hist.length),v=a[i][1];mid.push([a[i][0],avg]);upper.push([a[i][0],avg+3*sd]);lower.push([a[i][0],Math.max(0,avg-3*sd)]);if(Math.abs(v-avg)>3*sd)out.push(a[i])}const drawBand=(arr,col,dash)=>{let p=arr.map((v,i)=>(i?'L':'M')+x(v[0])+' '+y(v[1])).join(' ');return '<path d="'+p+'" fill="none" stroke="'+col+'" stroke-width="1.8" stroke-dasharray="'+dash+'"/>'};body+=drawBand(mid,C.blue,'3 4')+drawBand(upper,C.rose,'6 4')+drawBand(lower,C.rose,'6 4');out.forEach(p=>body+=circle(x(p[0]),y(p[1]),6,C.rose,'نقطه خارج از حدود · '+p[0]+' · '+fa(p[1])));note='حدود اکتشافی بر پایه ۳۰ مشاهده پیشین؛ '+fa(out.length)+' نقطه بیرون از محدوده. روند و فصل‌مندی به‌طور کامل تعدیل نشده‌اند.'}
   if(kind==='forecast'&&a.length>8){let train=a.slice(0,-1),tail=train.slice(-7),pred=tail.reduce((u,p)=>u+p[1],0)/tail.length,last=train[train.length-1];body+=line(x(last[0]),y(last[1]),W-R,y(pred),C.amber,'7 5')+circle(W-R,y(pred),5,C.amber,'پیش‌بینی مبنا · '+fa(pred));note='پیش‌بینی ساده با میانگین ۷ مشاهده اخیر؛ صرفاً مبنای مقایسه است و تضمین دقت ندارد.'}
  }
  body+=xLabels(dates);
  
 }else if(kind==='pareto'||kind==='treemap'||kind==='sunburst'){
  let rows=valid.map(s=>({name:s.name,v:s.points.reduce((u,p)=>u+p[1],0)})).filter(r=>r.v>=5).sort((a,b)=>b.v-a.v).slice(0,kind==='pareto'?12:20),total=rows.reduce((u,r)=>u+r.v,0);
  if(!rows.length){div.innerHTML='<div class="chart-empty">داده‌ی کافی برای این تحلیل وجود ندارد.</div>';return}
  if(kind==='pareto'){
   let max=Math.max(...rows.map(r=>r.v)),acc=0,points=[];
   rows.forEach((r,i)=>{let bw=iw/rows.length-8,x=L+i*iw/rows.length,h=r.v/max*ih,y=T+ih-h;body+=rect(x,y,bw,h,colors[i%colors.length],5)+txt(x+bw/2,H-28,r.name.slice(0,14),'middle',10,C.ink);acc+=r.v;points.push([x+bw/2,T+ih-(acc/total)*ih])});
   body+='<polyline points="'+points.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+C.rose+'" stroke-width="3"/>';points.forEach((p,i)=>body+=circle(p[0],p[1],4,C.rose,fa(100*rows.slice(0,i+1).reduce((u,r)=>u+r.v,0)/total)+'٪ تجمعی'));body+=txt(W-R,T+12,'٪ تجمعی','end',10,C.rose);
  }else if(kind==='sunburst'){
   const parents=new Map();rows.forEach(r=>{let p=r.name.split(' / ')[0];parents.set(p,(parents.get(p)||0)+r.v)});
   const cx=W/2,cy=H/2,r0=38,r1=94,r2=148,TAU=Math.PI*2;
   const arc=(a,b,inner,outer)=>{const x1=cx+outer*Math.cos(a),y1=cy+outer*Math.sin(a),x2=cx+outer*Math.cos(b),y2=cy+outer*Math.sin(b),x3=cx+inner*Math.cos(b),y3=cy+inner*Math.sin(b),x4=cx+inner*Math.cos(a),y4=cy+inner*Math.sin(a),large=b-a>Math.PI?1:0;return 'M '+x1+' '+y1+' A '+outer+' '+outer+' 0 '+large+' 1 '+x2+' '+y2+' L '+x3+' '+y3+' A '+inner+' '+inner+' 0 '+large+' 0 '+x4+' '+y4+' Z'};
   let angle=-Math.PI/2,idx=0;
   for(const [parent,pv] of parents){const span=TAU*pv/Math.max(1,total),end=angle+span,col=colors[idx%colors.length];body+='<path d="'+arc(angle,end,r0,r1)+'" fill="'+col+'" stroke="'+C.surface+'" stroke-width="2"><title>'+escSvg(parent+' · '+fa(pv))+'</title></path>';let childAngle=angle;rows.filter(r=>r.name.split(' / ')[0]===parent).forEach((r,j)=>{let childSpan=span*r.v/Math.max(1,pv),childEnd=childAngle+childSpan;body+='<path d="'+arc(childAngle,childEnd,r1+3,r2)+'" fill="'+col+'" fill-opacity="'+(j%2?.62:.82)+'" stroke="'+C.surface+'" stroke-width="2"><title>'+escSvg(r.name+' · '+fa(r.v))+'</title></path>';childAngle=childEnd});let mid=(angle+end)/2;body+=txt(cx+Math.cos(mid)*(r1+24),cy+Math.sin(mid)*(r1+24),parent.slice(0,12),'middle',9,C.ink,700);angle=end;idx++}
   body+=circle(cx,cy,r0-3,C.surface)+txt(cx,cy+4,'دلایل تماس','middle',12,C.ink,800);
   note='سان‌برست دوحلقه‌ای؛ حلقه داخلی سطح اول و حلقه بیرونی زیرگروه‌های همان دسته را نشان می‌دهد.';
  }else{
   const groups=new Map();rows.forEach(r=>{let p=r.name.split(' / ')[0];if(!groups.has(p))groups.set(p,[]);groups.get(p).push(r)});
   let gx=L,gi=0;for(const [parent,children] of groups){let sum=children.reduce((u,r)=>u+r.v,0),gw=iw*sum/Math.max(1,total),col=colors[gi%colors.length];body+=rect(gx,T,Math.max(2,gw-3),ih,'color-mix(in srgb, '+col+' 12%, '+C.surface+')',6,col);body+=txt(gx+gw/2,T+15,parent.slice(0,18),'middle',10,C.ink,800);let gy=T+24,available=ih-28;children.forEach((r,ci)=>{let hh=available*r.v/Math.max(1,sum);body+=rect(gx+4,gy,Math.max(2,gw-11),Math.max(2,hh-3),col,4)+txt(gx+gw/2,gy+Math.max(12,hh/2),r.name.split(' / ').slice(1).join(' / ').slice(0,20),'middle',9,C.surface,700)+'<title>'+escSvg(r.name+' · '+fa(r.v))+'</title>';gy+=hh});gx+=gw;gi++}
   note='نقشه درختی سلسله‌مراتبی؛ عرض هر گروه متناسب با مجموع تماس‌ها و ارتفاع هر زیرگروه متناسب با سهم آن است.';
  }
 }else if(kind==='correlation'||kind==='network'){
  const diffs=valid.map(s=>s.points.slice(1).map((p,i)=>[p[0],p[1]-s.points[i][1]]));
  const corr=(a,b)=>{let mb=new Map(b),pairs=a.filter(p=>mb.has(p[0])).map(p=>[p[1],mb.get(p[0])]);if(pairs.length<30)return null;let ax=pairs.reduce((u,p)=>u+p[0],0)/pairs.length,ay=pairs.reduce((u,p)=>u+p[1],0)/pairs.length,n=0,dx=0,dy=0;pairs.forEach(p=>{n+=(p[0]-ax)*(p[1]-ay);dx+=(p[0]-ax)**2;dy+=(p[1]-ay)**2});return dx&&dy?n/Math.sqrt(dx*dy):null};
  let z=diffs.map(a=>diffs.map(b=>corr(a,b))),n=valid.length,cell=Math.min(iw/n,ih/n);
  z.forEach((row,i)=>row.forEach((v,j)=>{let strength=v===null?0:Math.abs(v),col=v===null?C.line:(v>=0?C.teal:C.rose),x=L+j*iw/n,y=T+i*ih/n;body+=rect(x+2,y+2,iw/n-4,ih/n-4,col,4)+txt(x+iw/n/2,y+ih/n/2+4,v===null?'—':fa(v),'middle',11,C.surface,800);if(i===0)body+=txt(x+iw/n/2,T-8,valid[j].name.slice(0,12),'middle',9,C.muted);if(j===0)body+=txt(L-8,y+ih/n/2+4,valid[i].name.slice(0,12),'end',9,C.muted)}));
  note='همبستگی تغییرات متوالی هم‌تاریخ؛ حداقل ۳۰ جفت مشترک. خانه خالی یعنی نمونه کافی یا واریانس لازم وجود ندارد.';
 }else{
  const dates=[...new Set(valid.flatMap(s=>s.points.map(p=>p[0])))].sort(),all=valid.flatMap(s=>s.points.map(p=>p[1])),f=frame(Math.min(0,...all),Math.max(...all),chart.unit);body+=f.g;
  valid.forEach((s,si)=>{let m=new Map(s.points),d='',drawing=false;dates.forEach((date,i)=>{if(m.has(date)){d+=(drawing?' L ':'M ')+(L+i*iw/Math.max(1,dates.length-1))+' '+(T+(f.max-m.get(date)[1])/(f.max-f.min)*ih);drawing=true}else drawing=false});body+='<path d="'+d+'" fill="none" stroke="'+colors[si%colors.length]+'" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>';});
  body+=xLabels(dates);legend=valid.map((s,i)=>'<span><i style="background:'+colors[i%colors.length]+'"></i>'+escSvg(s.name)+'</span>').join('');
 }
 const legendButtons=allSeries.map((item,index)=>{const isVisible=!hidden.has(item.name),disabled=isVisible&&ss.length<=1;return '<button type="button" class="chart-legend-toggle" data-series-name="'+escSvg(item.name)+'" aria-pressed="'+isVisible+'" '+(disabled?'disabled':'')+'><i style="background:'+colors[index%colors.length]+'"></i>'+escSvg(item.name)+'</button>'}).join('');
  const rawRows=allSeries.flatMap(item=>item.points.map(point=>'<tr><th>'+escSvg(item.name)+'</th><td>'+escSvg(jalaliTick(point[0]))+'</td><td>'+escSvg(fmtFull(Number(point[1])))+'</td></tr>')).join('');
  const rawTable='<table class="sr-only"><caption>جدول داده‌های خام نمودار '+escSvg(chart.title)+'</caption><thead><tr><th>سری</th><th>تاریخ</th><th>مقدار</th></tr></thead><tbody>'+rawRows+'</tbody></table>';
  div.innerHTML=wrap()+(legendButtons?'<div class="legend">'+legendButtons+'</div>':'')+rawTable;
  div.querySelectorAll('.chart-legend-toggle').forEach(button=>button.addEventListener('click',()=>{const name=button.getAttribute('data-series-name');if(!name)return;const next=new Set(ADVANCED_HIDDEN.get(chart.id)||[]);if(next.has(name))next.delete(name);else if(ss.length>1)next.add(name);ADVANCED_HIDDEN.set(chart.id,next);drawAdvancedChart(div,chart)}));
 let computed=div.parentElement.querySelector('.computed');if(computed)computed.textContent=note;
}
function drawAdvanced(){
 const root=$('advancedCharts');if(!root)return;
 if(ADVANCED_OBSERVER){ADVANCED_OBSERVER.disconnect();ADVANCED_OBSERVER=null}
 if(window.Plotly)root.querySelectorAll('.plot').forEach(p=>{if(p.data)Plotly.purge(p)});
 if(!ADVANCED_DATA||!Object.keys(ADVANCED_DATA).length){root.innerHTML='<div class="chart-empty">داده نمودارهای پیشرفته در دسترس نیست.</div>';return}
 let group=$('advancedGroup')?.value||'',q=($('advancedSearch')?.value||'').trim().toLowerCase(),items=[];
 for(const [key,charts] of Object.entries(ADVANCED_DATA)){for(const c of charts){if((!group||c.group===group)&&(!q||c.title.toLowerCase().includes(q)||c.source.toLowerCase().includes(q)))items.push({...c,section:key})}}
 $('advancedCount').textContent=items.length+' نمودار منتخب';
 root.innerHTML='';
 if(!items.length){root.innerHTML='<div class="chart-empty">نموداری با این فیلتر پیدا نشد.</div>';return}
 let observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{for(let e of entries)if(e.isIntersecting){observer.unobserve(e.target);drawAdvancedChart(e.target,e.target.chart)}},{rootMargin:'260px'}):null;ADVANCED_OBSERVER=observer;
 for(const c of items){let card=document.createElement('article');card.className='panel';let head=document.createElement('div');head.className='panel-head';let left=document.createElement('div'),h=document.createElement('h3'),sub=document.createElement('p');h.textContent=c.title;sub.textContent=c.source+' · '+c.unit;left.append(h,sub);let tag=document.createElement('span');tag.className='source-tag';tag.textContent=(ADVANCED_LABELS[c.section]||c.section)+' · '+c.kind;head.append(left,tag);let plot=document.createElement('div');plot.className='plot';plot.chart=c;let note=document.createElement('div');note.className='computed';note.textContent=c.note||'تحلیل اکتشافی';card.append(head,plot,note);root.append(card);if(observer)observer.observe(plot);else drawAdvancedChart(plot,c)}
}

function drawCatalog(){let inv=DATA.inventory;renderKpis('catalogKpis',`${kpiHtml('فایل‌های CSV',fmt(DATA.meta.csvFiles),'',null,'▤','#087f78','#dff3ef')}${kpiHtml('فایل‌های Excel',fmt(DATA.meta.xlsxFiles),'',null,'▦','#3269b4','#e8f0fc')}${kpiHtml('جداول جاسازی‌شده',fmt(DATA.meta.tableCount),'',null,'▤','#7565b5','#f0edfb')}${kpiHtml('رکوردهای تجمیع‌شده',compact(inv.reduce((a,x)=>a+(x.rows||0),0)),'',null,'∑','#bf7d27','#fff2df')}`);$('catalogCount').textContent=fmt(inv.length)+' منبع/شیت';let secs=[...new Set(inv.map(x=>x.section))].sort();$('catalogSection').innerHTML='<option value="">همه بخش‌ها</option>'+secs.map(s=>`<option>${esc(s)}</option>`).join('');CATALOG_PAGE=1;renderCatalog()}
function renderCatalog(){let q=$('catalogFilter').value.trim().toLowerCase(),sec=$('catalogSection').value;let inv=DATA.inventory.filter(x=>(!sec||x.section===sec)&&(!q||[x.name,x.source,x.section,x.format].join(' ').toLowerCase().includes(q)));let pages=Math.max(1,Math.ceil(inv.length/20));CATALOG_PAGE=Math.min(CATALOG_PAGE,pages);let rows=inv.slice((CATALOG_PAGE-1)*20,CATALOG_PAGE*20);$('catalogTable').innerHTML=formatTable(['منبع / جدول','بخش','قالب','رکورد','از تاریخ','تا تاریخ','اقدام'],rows.map(x=>[x.name,x.section,x.format,fmt(x.rows),fmtDate(x.dateMin),fmtDate(tableObservedCutoff(x.name)||x.dateMax),{html:`<button class="btn" data-open-table="${esc(x.name)}">مشاهده</button>`}]));$('catalogFiltered').textContent=fmt(inv.length)+' منبع';$('catalogPagination').innerHTML=`<span>صفحه ${fmt(CATALOG_PAGE)} از ${fmt(pages)}</span><div><button class="btn" id="catPrev" ${CATALOG_PAGE<=1?'disabled':''}>قبلی</button> <button class="btn" id="catNext" ${CATALOG_PAGE>=pages?'disabled':''}>بعدی</button></div>`;$('catPrev')?.addEventListener('click',()=>{CATALOG_PAGE--;renderCatalog()});$('catNext')?.addEventListener('click',()=>{CATALOG_PAGE++;renderCatalog()});document.querySelectorAll('[data-open-table]').forEach(b=>b.addEventListener('click',()=>openTable(b.dataset.openTable)))}
function openTable(key){selectedTable=key;EXPLORER_PAGE=1;$('exportCurrentTable').disabled=false;$('rowFilter').disabled=false;$('rowFilter').value='';let t=table(key);$('explorerSubtitle').textContent=key+' · '+fmt(t.rows.length)+' رکورد';renderExplorer()}
function renderExplorer(){if(!selectedTable)return;let t=table(selectedTable),q=$('rowFilter').value.trim().toLowerCase();let rows=t.rows.filter(r=>!q||r.some(v=>String(v??'').toLowerCase().includes(q)));let pages=Math.max(1,Math.ceil(rows.length/25));EXPLORER_PAGE=Math.min(EXPLORER_PAGE,pages);let slice=rows.slice((EXPLORER_PAGE-1)*25,EXPLORER_PAGE*25);$('explorerTable').innerHTML=formatTable(t.columns,slice);$('explorerPagination').innerHTML=`<span>${fmt(rows.length)} ردیف مطابق فیلتر · صفحه ${fmt(EXPLORER_PAGE)} از ${fmt(pages)}</span><div><button class="btn" id="expPrev" ${EXPLORER_PAGE<=1?'disabled':''}>قبلی</button> <button class="btn" id="expNext" ${EXPLORER_PAGE>=pages?'disabled':''}>بعدی</button></div>`;$('expPrev')?.addEventListener('click',()=>{EXPLORER_PAGE--;renderExplorer()});$('expNext')?.addEventListener('click',()=>{EXPLORER_PAGE++;renderExplorer()})}
function downloadCSV(key){let t=table(key);if(!t)return;let csv=[t.columns,...t.rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');let blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=key.replace(/[^\w\u0600-\u06FF.-]+/g,'_')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function renderPage(page,force=false){if(!force&&RENDERED_PAGES.has(page))return;const renderers={overview:drawOverview,messenger:drawMessenger,tamasha:drawTamasha,search:drawSearch,traffic:drawTraffic,support:drawSupport,quality:drawQuality,growth:drawGrowth,analytics:drawAdvanced,catalog:drawCatalog};const render=renderers[page];if(render){render();RENDERED_PAGES.add(page)}}
function renderCurrentPage(force=false){const active=document.querySelector('.page.active')?.id?.replace('page-','')||ACTIVE_PAGE;renderPage(active,force)}
function setPage(page){ACTIVE_PAGE=page;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));$('pageTitle').textContent=PAGE_INFO[page][0];$('pageSubtitle').textContent=PAGE_INFO[page][1];renderPage(page);window.dispatchEvent(new CustomEvent('shad:page-change',{detail:{page}}));window.scrollTo({top:0,behavior:'smooth'})}
function renderAll(){renderPage('overview',true)}
async function loadData(){try{const bytes=new Uint8Array(await (await fetch(DATA_URL)).arrayBuffer());if(!('DecompressionStream'in window))throw new Error('این مرورگر از بازکردن داده فشرده پشتیبانی نمی‌کند.');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));const txt=await new Response(stream).text();DATA=JSON.parse(txt);TABLES=DATA.tables;window.dispatchEvent(new CustomEvent('shad:data-ready',{detail:{points:window.__shadRawSeries('Messenger_statistics/DailyActivity','value_num'),snapshot:DATA.meta?.snapshotJalali||''}}));try{const ab=new Uint8Array(await (await fetch('/advanced.json')).arrayBuffer());ADVANCED_DATA=await (await fetch('/advanced.json')).json()}catch(advancedError){console.warn('Advanced charts could not be loaded',advancedError);ADVANCED_DATA={}}ADVANCED_DATA=rebuildAdvancedFromSource();$('snapshotDate').textContent=fmtDate(DATA.meta.snapshotJalali);$('footerMeta').textContent=`${fmt(DATA.meta.fileCount)} فایل · ${fmt(DATA.meta.tableCount)} جدول · آخرین تاریخ کلی ${fmtDate(DATA.meta.snapshotJalali)}`;renderAll();$('loading').remove()}catch(e){$('loading').innerHTML=`<div class="loading-card"><div class="loading-mark is-error" aria-hidden="true">!</div><div class="loading-brand">شاد <span>|</span> نبض</div><h2>بارگذاری داده انجام نشد</h2><p>${esc(e.message)}</p><p>فایل را با نسخه جدید Chrome یا Edge باز کنید.</p></div>`;console.error(e)}}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{RANGE=b.dataset.range;document.querySelectorAll('[data-range]').forEach(x=>x.classList.toggle('active',x===b));renderCurrentPage(true)}));
$('topSearchFilter').addEventListener('input',()=>{SEARCH_PAGE=1;renderTopSearchTable()});$('exportSearchCsv').addEventListener('click',()=>{let t=table('Messenger_statistics/TopSearches');downloadCSV('Messenger_statistics/TopSearches')});$('queryTrendBtn').addEventListener('click',drawQueryTrend);$('queryTrendInput').addEventListener('keydown',e=>{if(e.key==='Enter')drawQueryTrend()});$('advancedGroup').addEventListener('change',drawAdvanced);$('advancedSearch').addEventListener('input',drawAdvanced);$('catalogFilter').addEventListener('input',()=>{CATALOG_PAGE=1;renderCatalog()});$('catalogSection').addEventListener('change',()=>{CATALOG_PAGE=1;renderCatalog()});$('rowFilter').addEventListener('input',()=>{EXPLORER_PAGE=1;renderExplorer()});$('exportCurrentTable').addEventListener('click',()=>selectedTable&&downloadCSV(selectedTable));

/* Range-aware aggregation: every chart is recalculated from the selected source-date window. */
(function(){
 if(window.__shadRangeAggregationInstalled)return;
 window.__shadRangeAggregationInstalled=true;
 const dateCols=['date_key','date','shamsi_date','shamsidate','تاریخ جلالی','تاریخ','invoice_date','Friday_date','Date_Created_Jalali','Created_At'];
 window.__shadRawSeries=series;
 const maxDates=()=>RANGE==='all'?Infinity:Math.max(1,Number(RANGE)||30);
 function rangeRows(key,names=dateCols){
  const t=table(key);if(!t)return [];
  const di=col(t,names);if(di<0)return t.rows.slice();
  const dates=[...new Set(t.rows.map(r=>normDate(r[di])).filter(d=>d&&withinTableDate(key,d)))].sort();
  const keep=new Set(dates.slice(-maxDates()));
  return t.rows.filter(r=>{const d=normDate(r[di]);return d&&withinTableDate(key,d)&&keep.has(d)});
 }
 function avg(values){const a=values.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null}
 function sum(values){const a=values.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0):null}
 function windowSeries(key,valueNames,dateNames){
  const t=table(key);if(!t)return [];
  const names=dateNames||dateCols,di=col(t,names),vi=col(t,valueNames);if(di<0||vi<0)return [];
  return rangeRows(key,names).map(r=>({date:normDate(r[di]),value:num(r[vi])})).filter(p=>p.date&&p.value!==null).sort((a,b)=>a.date.localeCompare(b.date));
 }
 function aggregateLabels(key,dateNames,labelNames,valueNames){
  const t=table(key);if(!t)return {date:'',rows:[]};
  const di=col(t,dateNames),li=col(t,labelNames),vi=col(t,valueNames);if(di<0||li<0||vi<0)return {date:'',rows:[]};
  const rows=rangeRows(key,dateNames),groups=new Map();
  for(const r of rows){const label=String(r[li]??'').trim(),value=num(r[vi]);if(!label||value===null)continue;if(!groups.has(label))groups.set(label,[]);groups.get(label).push(value)}
  const date=rows.map(r=>normDate(r[di])).filter(Boolean).sort().at(-1)||'';
  return {date,rows:[...groups].map(([label,values])=>({label,value:avg(values)})).filter(x=>x.value!==null)};
 }
 function periodKpi(label,a,icon,accent,soft){
  const points=(a||[]).filter(p=>Number.isFinite(p.value)),last=points.at(-1),first=points[0],value=avg(points.map(p=>p.value));
  return kpiHtml(label+' · میانگین دوره',value===null?'—':compact(value),last?.date||'',points.length>1?change(last.value,first.value):null,icon,accent,soft);
 }
 series=function(key,valueNames,dateNames){return windowSeries(key,valueNames,dateNames)};
 latestRows=function(key,dateNames){
  const t=table(key);if(!t)return {date:'',rows:[]};const names=dateNames||dateCols,di=col(t,names);if(di<0)return {date:'',rows:t.rows};
  const rows=rangeRows(key,names),date=rows.map(r=>normDate(r[di])).filter(Boolean).sort().at(-1)||'';
  return {date,rows:rows.filter(r=>normDate(r[di])===date)};
 };
 latestLabelValues=function(key,dateNames=['date_key','date','shamsidate','shamsi_date'],labelNames=['label'],valueNames=['value_num']){return aggregateLabels(key,dateNames,labelNames,valueNames)};
 getLastValue=function(key,valueNames,dateNames){const a=windowSeries(key,valueNames,dateNames),v=avg(a.map(x=>x.value));return v===null?null:{date:a.at(-1)?.date||'',value:v}};
 kpiFromSeries=function(label,a,icon,accent,soft){return periodKpi(label,a,icon,accent,soft)};

 /* Search ranking is the sum of actual search_count values in the chosen dates. */
 drawSearch=function(){
  const key='Messenger_statistics/TopSearches',t=table(key);if(!t)return;
  const di=col(t,'shamsi_date'),qi=col(t,'search_text'),ci=col(t,'search_count');if(di<0||qi<0||ci<0)return;
  const rows=rangeRows(key,['shamsi_date']),dates=[...new Set(rows.map(r=>normDate(r[di])))].sort(),groups=new Map();
  for(const r of rows){const q=String(r[qi]||'').trim(),v=num(r[ci]);if(q&&v!==null)groups.set(q,(groups.get(q)||0)+v)}
  currentSearchRows=[...groups].sort((a,b)=>b[1]-a[1]).map(([q,v],i)=>[dates.at(-1)||'',i+1,q,v]);
  const top=currentSearchRows[0],date=dates.at(-1)||'';
  renderKpis('searchKpis',kpiHtml('عبارت اول در بازه',top?.[2]||'—',date,null,'⌕','#087f78','#dff3ef')+kpiHtml('مجموع جست‌وجوی عبارت اول',top?fmt(top[3]):'—',date,null,'#','#3269b4','#e8f0fc')+kpiHtml('عبارت‌های یکتا در بازه',fmt(currentSearchRows.length),date,null,'▤','#7565b5','#f0edfb')+kpiHtml('روزهای دارای داده',fmt(dates.length),date,null,'◷','#bf7d27','#fff2df'));
  $('searchDateLabel').textContent='تجمیع بازه: '+fmtDate(dates[0]||'—')+' تا '+fmtDate(date);
  $('topSearchFilter').value='';SEARCH_PAGE=1;renderTopSearchTable();
  drawBars('searchRankBars',currentSearchRows.slice(0,10).map(r=>({name:r[2],value:r[3],display:fmt(r[3])+' جست‌وجو'})));
  $('queryTrendChart').innerHTML='<div class="chart-empty">یک عبارت را وارد کنید تا روند آن در بازه انتخابی نمایش داده شود.</div>';
 };
 drawQueryTrend=function(){
  const q=$('queryTrendInput').value.trim();if(!q)return;
  const key='Messenger_statistics/TopSearches',t=table(key);if(!t)return;
  const di=col(t,'shamsi_date'),qi=col(t,'search_text'),ci=col(t,'search_count'),g=new Map();
  for(const r of rangeRows(key,['shamsi_date'])){if(String(r[qi]||'').trim()!==q)continue;const d=normDate(r[di]),v=num(r[ci]);if(d&&v!==null)g.set(d,(g.get(d)||0)+v)}
  const points=[...g].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,value])=>({date,value}));
  if(!points.length){$('queryTrendChart').innerHTML='<div class="chart-empty">این عبارت در بازه انتخابی پیدا نشد.</div>';return}
  drawLine('queryTrendChart',[{name:q,points,color:COLORS[0]}]);
 };
 $('queryTrendBtn').addEventListener('click',drawQueryTrend);
 $('queryTrendInput').addEventListener('keydown',e=>{if(e.key==='Enter')drawQueryTrend()});

 /* Traffic: totals and category bars are recalculated across the selected period. */
 drawTraffic=function(){
  const key='shad beat.xlsx::Traffic_V2',t=table(key);if(!t)return;
  const rows=rangeRows(key,['shamsi_date']),ix=n=>col(t,n),sumCol=n=>sum(rows.map(r=>num(r[ix(n)])).filter(v=>v!==null));
  const date=rows.map(r=>normDate(r[ix('shamsi_date')])).filter(Boolean).sort().at(-1)||'';
  const traffic=sumCol('all_operators_all_services_traffic'),revenue=sumCol('all_operators_all_services_revenue'),mci=sumCol('MCI_all_sevices_traffic');
  const products=[['دیدنی','Didani_All_operators_GB'],['ورزشی','Sport_All_operators_GB'],['شادبین','Shadbin_All_operators_GB'],['تماشا','Tamasha_All_operators_GB'],['TV','TV_All_operators_GB']].map(([name,key])=>({name,value:sumCol(key)}));
  const operators=[['همراه اول','MCI_all_sevices_traffic'],['ایرانسل','MTN_all_sevices_traffic'],['رایتل','Rightel_all_sevices_traffic'],['سایر','Other_all_sevices_traffic']].map(([name,key])=>({name,value:sumCol(key)}));
  const revenues=[['دیدنی','Didani__All_operators_revenue'],['ورزشی','Sport__All_operators_revenue'],['شادبین','Shadbin__All_operators_revenue'],['تماشا','Tamasha__All_operators_revenue'],['TV','TV__All_operators_revenue']].map(([name,key])=>({name,value:sumCol(key)}));
  renderKpis('trafficKpis',kpiHtml('مجموع ترافیک بازه',compact(traffic),date,null,'⌁','#087f78','#dff3ef','GB')+kpiHtml('مجموع درآمد بازه',compact(revenue),date,null,'◉','#3269b4','#e8f0fc','ریال')+kpiHtml('سهم وزنی ترافیک همراه اول',traffic&&mci!==null?NF.format(mci/traffic*100):'—',date,null,'▤','#7565b5','#f0edfb','٪')+kpiHtml('مجموع ترافیک تماشا',compact(products[3]?.value),date,null,'▣','#bf7d27','#fff2df','GB'));
  drawBars('productTrafficBars',products.map(x=>({...x,display:compact(x.value)+' GB'})));
  drawBars('operatorTrafficBars',operators.map(x=>({...x,display:compact(x.value)+' GB'})));
  drawLine('trafficTrendChart',[{name:'کل ترافیک',points:windowSeries(key,'all_operators_all_services_traffic','shamsi_date'),color:COLORS[0]}],'GB');
  drawBars('productRevenueBars',revenues.map(x=>({...x,display:compact(x.value)+' ریال'})));
  const inv=table('shad beat.xlsx::invoices');if(inv){const di=col(inv,'invoice_date'),op=col(inv,'operator'),tr=col(inv,'traffic_GB'),net=col(inv,'Net Amount'),gross=col(inv,'Gross Amount');const data=rangeRows('shad beat.xlsx::invoices',['invoice_date']).sort((a,b)=>normDate(b[di]).localeCompare(normDate(a[di]))).slice(0,12).map(r=>[fmtDate(normDate(r[di])),r[op],fmt(num(r[tr])),fmt(num(r[gross])),fmt(num(r[net]))]);$('invoiceTable').innerHTML=formatTable(['تاریخ فاکتور','اپراتور','ترافیک GB','مبلغ ناخالص ریال','مبلغ خالص ریال'],data)}
 };

 /* Support: weighted answer rate, period call totals, and date-filtered reasons. */
 drawSupport=function(){
  const key='shad beat.xlsx::Callcenter SL',rate=windowSeries(key,'نرخ پاسخ به تماس','date'),incoming=windowSeries(key,'تماس ورودی','date'),answered=windowSeries(key,'تماس پاسخ داده شده','date'),speed=windowSeries(key,'سرعت پاسخ به تماس (ثانیه)','date');
  const inTotal=sum(incoming.map(x=>x.value)),ansTotal=sum(answered.map(x=>x.value)),weighted=inTotal?ansTotal/inTotal:avg(rate.map(x=>x.value)),date=rate.at(-1)?.date||incoming.at(-1)?.date||'';
  renderKpis('supportKpis',kpiHtml('نرخ پاسخ‌گویی وزنی',weighted===null?'—':NF.format(weighted*100)+'٪',date,null,'✓','#087f78','#dff3ef')+kpiHtml('مجموع تماس ورودی',inTotal===null?'—':fmt(inTotal),date,null,'↙','#3269b4','#e8f0fc')+kpiHtml('مجموع تماس پاسخ‌داده‌شده',ansTotal===null?'—':fmt(ansTotal),date,null,'↗','#7565b5','#f0edfb')+kpiHtml('میانگین سرعت پاسخ',avg(speed.map(x=>x.value))===null?'—':fmt(avg(speed.map(x=>x.value)))+' ثانیه',date,null,'◷','#bf7d27','#fff2df'));
  drawLine('answerRateChart',[{name:'نرخ پاسخ',points:rate.map(x=>({...x,value:x.value*100})),color:COLORS[0]}],'٪',true);
  drawLine('callVolumeChart',[{name:'تماس ورودی',points:incoming,color:COLORS[1]},{name:'تماس پاسخ‌داده‌شده',points:answered,color:COLORS[0]}]);
  const cr=table('shad beat.xlsx::Call Reason');if(cr){const ni=col(cr,'call reason'),vi=col(cr,'count_current_week'),g=new Map();for(const r of rangeRows('shad beat.xlsx::Call Reason',['date'])){const n=String(r[ni]||'').trim(),v=num(r[vi]);if(n&&v!==null){if(!g.has(n))g.set(n,[]);g.get(n).push(v)}}drawBars('callReasonBars',[...g].map(([name,values])=>({name,value:avg(values),display:compact(avg(values))+' میانگین'})).sort((a,b)=>b.value-a.value).slice(0,10))}
  const det=table('callReasons.xlsx::Sheet1');if(det){const ni=col(det,'srlevel3'),vi=col(det,'calls'),g=new Map();for(const r of rangeRows('callReasons.xlsx::Sheet1',['shamsidate'])){const n=String(r[ni]||'سایر'),v=num(r[vi]);if(v!==null)g.set(n,(g.get(n)||0)+v)}drawBars('detailedCallReasonBars',[...g].map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,10))}
 };

 drawQuality=function(){
  const defs=[['حذف حساب','Messenger_statistics/DeleteAccount'],['درخواست فایل','Messenger_statistics/RequestFile'],['فایل بارگذاری‌شده','Messenger_statistics/UploadedFile'],['حجم فایل','Messenger_statistics/FileSize']];
  renderKpis('qualityKpis',defs.map(([name,key])=>{const a=windowSeries(key,'value_num'),v=avg(a.map(x=>x.value));return kpiHtml(name+' · میانگین روزانه',v===null?'—':key.endsWith('FileSize')?compact(v/1024**4)+' TiB':compact(v),a.at(-1)?.date||'',null,'◈')}).join(''));
  const v=k=>avg(windowSeries('Messenger_statistics/'+k,'value_num').map(x=>x.value));
  drawBars('policyBars',['PolicyNoBan','PolicyLimitBan','PolicyFullBan'].map((k,i)=>({name:k,value:v(k),display:v(k)===null?'—':compact(v(k))+' میانگین',color:COLORS[i]})));
  drawBars('fileCheckBars',['CheckFileEntry','CheckFileChecked','CheckFileError','CheckFileHighConfidence','CheckFileNotChecked'].map((k,i)=>({name:k.replace('CheckFile',''),value:v(k),display:v(k)===null?'—':compact(v(k))+' میانگین',color:COLORS[i]})));
  drawLine('fileTrendChart',[{name:'RequestFile',points:windowSeries('Messenger_statistics/RequestFile','value_num'),color:COLORS[1]},{name:'UploadedFile',points:windowSeries('Messenger_statistics/UploadedFile','value_num'),color:COLORS[0]}]);
  drawBars('fileTagBars',['FileTagHigh','FileTagMedium','FileTagLow','FileTagNone'].map((k,i)=>({name:k.replace('FileTag',''),value:v(k),display:v(k)===null?'—':compact(v(k))+' میانگین',color:COLORS[i]})));
  const latest=windowSeries('Messenger_statistics/CheckFileEntry','value_num').at(-1)?.date||windowSeries('Messenger_statistics/FileTagNone','value_num').at(-1)?.date||'',snapshot=normDate(DATA.meta.snapshotJalali);
  $('checkFileFreshness').textContent='آخرین داده: '+fmtDate(latest||'ناموجود')+(latest&&snapshot&&latest<snapshot?' · منبع قدیمی نسبت به Snapshot':'');
 };

 drawGrowth=function(){
  const rate=windowSeries('Bazar_averageRate.xlsx::Sheet1','average_rate'),inst=windowSeries('Bazar_newInstall.xlsx::Sheet1','new_install'),updates=windowSeries('Bazar_updates.xlsx::Sheet1','updates'),myket=windowSeries('shad beat.xlsx::Myket_AVG_new_rate','AVG_new_rate'),shaad=windowSeries('shad beat.xlsx::Shaad_in_Bazaar','final_rate');
  const installTotal=sum(inst.map(x=>x.value)),updateTotal=sum(updates.map(x=>x.value)),marketAvg=avg(rate.map(x=>x.value)),myketAvg=avg(myket.map(x=>x.value));
  renderKpis('growthKpis',kpiHtml('میانگین امتیاز بازار',marketAvg===null?'—':NF.format(marketAvg),rate.at(-1)?.date||'',null,'★','#087f78','#dff3ef')+kpiHtml('مجموع نصب جدید بازه',installTotal===null?'—':fmt(installTotal),inst.at(-1)?.date||'',null,'＋','#3269b4','#e8f0fc')+kpiHtml('مجموع به‌روزرسانی بازه',updateTotal===null?'—':fmt(updateTotal),updates.at(-1)?.date||'',null,'↻','#7565b5','#f0edfb')+kpiHtml('میانگین امتیاز جدید مایکت',myketAvg===null?'—':NF.format(myketAvg),myket.at(-1)?.date||'',null,'★','#bf7d27','#fff2df'));
  drawLine('installChart',[{name:'نصب جدید',points:inst,color:COLORS[0]}]);
  drawLine('ratingChart',[{name:'بازار',points:rate,color:COLORS[1]},{name:'مایکت',points:myket,color:COLORS[0]},{name:'امتیاز شاد در بازار',points:shaad,color:COLORS[2]}]);
  const au=table('shad beat.xlsx::active user');if(au){const rows=rangeRows('shad beat.xlsx::active user',['date']),defs=[['ورزشی','Sport DAU'],['دیدنی','Didani DAU'],['شادبین','ShadBin DAU']];drawBars('productUsersBars',defs.map(([name,c])=>{const i=col(au,c),v=avg(rows.map(r=>num(r[i])).filter(x=>x!==null));return {name,value:v,display:v===null?'—':compact(v)+' میانگین روزانه'}}))}
  const ev=table('shad beat.xlsx::Best_Events');if(ev){const ni=col(ev,'event'),vi=col(ev,'count_current_week'),g=new Map();for(const r of rangeRows('shad beat.xlsx::Best_Events',['Friday_date'])){const n=String(r[ni]||'').trim(),v=num(r[vi]);if(n&&v!==null){if(!g.has(n))g.set(n,[]);g.get(n).push(v)}}drawBars('bestEventsBars',[...g].map(([name,values])=>({name,value:avg(values),display:compact(avg(values))+' میانگین هفتگی'})).sort((a,b)=>b.value-a.value).slice(0,8))}
 };

 /* Retain Bento visuals, but make its KPI values and product treemap period-aware. */
 const originalBento=renderAnalyticsBento;
 renderAnalyticsBento=function(){
  originalBento();
  const revenue=windowSeries('shad beat.xlsx::Traffic_V2','all_operators_all_services_revenue','shamsi_date'),rv=sum(revenue.map(x=>x.value));
  const rvEl=$('abRevenue')?.querySelector('.ab-value');if(rvEl)rvEl.innerHTML=(rv===null?'—':compact(rv))+' <small>ریال · مجموع بازه</small>';
  const activity=windowSeries('Messenger_statistics/DailyActivity','value_num'),login=windowSeries('Messenger_statistics/LoginUser','value_num'),messages=windowSeries('Messenger_statistics/NewMessage','value_num');
  const av=avg(activity.map(x=>x.value)),lv=avg(login.map(x=>x.value)),mv=avg(messages.map(x=>x.value));
  const avEl=$('abActivity')?.querySelector('.ab-value');if(avEl)avEl.innerHTML=(av===null?'—':compact(av))+' <small>میانگین روزانه</small>';
  const dual=$('abActivity')?.querySelectorAll('.ab-dual-item b');if(dual?.[0])dual[0].textContent=lv===null?'—':compact(lv);if(dual?.[1])dual[1].textContent=mv===null?'—':compact(mv);
  const t=table('shad beat.xlsx::Traffic_V2');if(t){const rows=rangeRows('shad beat.xlsx::Traffic_V2',['shamsi_date']),ix=n=>col(t,n),defs=[['didani','دیدنی','Didani_All_operators_GB'],['sport','ورزشی','Sport_All_operators_GB'],['shadbin','شادبین','Shadbin_All_operators_GB'],['tamasha','تماشا','Tamasha_All_operators_GB'],['tv','تلویزیون','TV_All_operators_GB']],data=defs.map(([id,name,c])=>({id,name,value:sum(rows.map(r=>num(r[ix(c)])||0))||0})).filter(x=>x.value>0),date=rows.map(r=>normDate(r[ix('shamsi_date')])).sort().at(-1)||'';$('abProducts').innerHTML='<div class="ab-card-top"><div class="ab-eyebrow">مجموع مصرف ترافیک محصولات در بازه</div><span class="ab-source">Traffic_V2 · '+fmtDate(date)+'</span></div><div id="react-treemap-chart-root"></div>';window.dispatchEvent(new CustomEvent('shad:treemap-mount',{detail:{data,dateLabel:fmtDate(date)}}))}
 };

 /* A previously visited page must never reuse stale chart DOM after changing range. */
 renderPage=function(page,force=false){
  const renderers={overview:drawOverview,messenger:drawMessenger,tamasha:drawTamasha,search:drawSearch,traffic:drawTraffic,support:drawSupport,quality:drawQuality,growth:drawGrowth,analytics:drawAdvanced,catalog:drawCatalog};
  const render=renderers[page];if(render){render();RENDERED_PAGES.add(page)}
 };
 document.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('shad:range-change',{detail:{range:String(RANGE)}}))));
 if(typeof DATA!=='undefined'&&DATA&&TABLES){try{renderCurrentPage(true);window.dispatchEvent(new CustomEvent('shad:range-change',{detail:{range:String(RANGE)}}))}catch(e){console.error('Range-aware redraw failed',e)}}
})();
loadData();
