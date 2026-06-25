import { useState, useEffect, useRef } from "react";
import { parseCSV, transformToProjects } from "./lib/csvParser";
import { saveProjects, savePMs, loadAll, hasData, clearAll, saveTheme, loadTheme } from "./lib/store";
import { generateReport } from "./lib/reportGenerator";


// ── TOKENS & DATA ───────────────────────────────────────────
let C = { bg:"#080E1A",sf:"#0F1729",cd:"#131D35",bd:"#1E2A45",bh:"#2A3A5C",tx:"#E8ECF4",sb:"#7B8BA8",dm:"#4A5A78",ac:"#3B82F6",pp:"#8B5CF6",gn:"#10B981",am:"#F59E0B",rd:"#EF4444",pk:"#EC4899" };
let G=`linear-gradient(135deg,${C.ac},${C.pp})`;
let BRAND = { name: "DeliverIQ", logo: null, tagline: "Delivery Intelligence", radius: 12 };
// Apply a saved white-label theme onto the live dashboard tokens
function applyTheme(t) {
  if (!t) return;
  const c = t.colors || t;
  if (c.bg) C.bg = c.bg;
  if (c.surface) { C.sf = c.surface; C.cd = c.surface; }
  if (c.border) { C.bd = c.border; C.bh = c.border; }
  if (c.text) C.tx = c.text;
  if (c.muted) C.sb = c.muted;
  if (c.dim) C.dm = c.dim;
  if (c.primary) C.ac = c.primary;
  if (c.secondary) C.pp = c.secondary;
  if (c.success) C.gn = c.success;
  if (c.warning) C.am = c.warning;
  if (c.danger) C.rd = c.danger;
  if (c.primary && c.secondary) G = `linear-gradient(135deg,${c.primary},${c.secondary})`;
  if (t.orgName !== undefined) BRAND.name = t.orgName || "DeliverIQ";
  if (t.logoUrl !== undefined) BRAND.logo = t.logoUrl;
  if (t.tagline !== undefined) BRAND.tagline = t.tagline || "Delivery Intelligence";
  if (t.radius !== undefined) BRAND.radius = t.radius;
}
const hc=h=>h>=70?C.gn:h>=40?C.am:C.rd;
const sc=s=>s==="on-track"?C.gn:s==="at-risk"?C.am:C.rd;
const fmt=n=>n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}K`:`$${n}`;

const LEVELS=[{n:"Rookie",m:0,i:"🌱",c:"#7B8BA8"},{n:"Bronze",m:500,i:"🥉",c:"#CD7F32"},{n:"Silver",m:1200,i:"🥈",c:"#A8B5C8"},{n:"Gold",m:2200,i:"🥇",c:"#FFD700"},{n:"Platinum",m:3500,i:"💎",c:"#7DD3FC"},{n:"Diamond",m:5000,i:"👑",c:"#C084FC"}];
const gLv=xp=>{for(let i=LEVELS.length-1;i>=0;i--)if(xp>=LEVELS[i].m)return{...LEVELS[i],nx:LEVELS[i+1]||null};return{...LEVELS[0],nx:LEVELS[1]}};

const BADGES={perfectBilling:{i:"💰",n:"Cash Machine",d:"Billing >90%"},zeroOverdue:{i:"⏱️",n:"Clockwork",d:"Zero overdue"},streakMaster:{i:"🔥",n:"On Fire",d:"10+ week streak"},topHealth:{i:"💚",n:"Green Giant",d:"Health >85%"},fastCloser:{i:"⚡",n:"Speed Demon",d:"Ahead of schedule"},teamPlayer:{i:"🤝",n:"Team Player",d:"3+ cross-team"},csatStar:{i:"⭐",n:"Client Star",d:"CSAT >4.5"},certified:{i:"📜",n:"Scholar",d:"3+ certs"},utilization:{i:"📊",n:"Fully Loaded",d:"Util >85%"},mentor:{i:"🎓",n:"Mentor",d:"Mentored 2+"}};
const CATS={delivery:{c:C.gn,l:"Delivery"},revenue:{c:C.ac,l:"Revenue"},quality:{c:C.am,l:"Quality"},governance:{c:C.pp,l:"Governance"},efficiency:{c:C.pk,l:"Efficiency"},growth:{c:"#C084FC",l:"Growth"}};

const SAMPLE_P=[
  {id:1,name:"Titan ERP Migration",client:"Meridian Corp",pm:"Sarah Chen",region:"APAC",status:"at-risk",health:38,rev:2400000,billed:960000,ms:12,cms:5,ov:2,dd:14,nm:"UAT Sign-off",nd:"Jul 12",trend:[-2,-5,-3,-8,-4],ics:["Anika P.","Tomás R."]},
  {id:2,name:"CloudFirst Platform",client:"Nordvik AS",pm:"Erik Lindberg",region:"EMEA",status:"on-track",health:82,rev:1850000,billed:1480000,ms:8,cms:7,ov:0,dd:0,nm:"Go-Live",nd:"Jul 1",trend:[3,2,5,4,1],ics:["Yuki T.","Fatima A."]},
  {id:3,name:"FinCore Rollout",client:"Atlas Financial",pm:"Priya Sharma",region:"MEA",status:"on-track",health:91,rev:3100000,billed:2790000,ms:10,cms:9,ov:0,dd:0,nm:"Hypercare Exit",nd:"Jul 20",trend:[1,3,2,2,4],ics:["Fatima A.","Daniel O."]},
  {id:4,name:"RetailHub Integration",client:"Luxe Group",pm:"Sarah Chen",region:"APAC",status:"critical",health:22,rev:1200000,billed:240000,ms:6,cms:1,ov:3,dd:45,nm:"Data Migration",nd:"Jun 15",trend:[-4,-8,-6,-12,-10],ics:["Anika P."]},
  {id:5,name:"SmartFleet Telematics",client:"Vanguard Motors",pm:"James Okafor",region:"EMEA",status:"on-track",health:75,rev:980000,billed:588000,ms:5,cms:3,ov:0,dd:0,nm:"Phase 2",nd:"Aug 1",trend:[2,1,3,0,2],ics:["Yuki T.","Lena H."]},
  {id:6,name:"Omni Commerce",client:"Peak Retail",pm:"Laura Martinez",region:"AMER",status:"at-risk",health:45,rev:1650000,billed:495000,ms:9,cms:3,ov:1,dd:8,nm:"API Gateway",nd:"Jul 5",trend:[1,-2,-1,-3,-2],ics:["Carlos M.","Tomás R."]},
  {id:7,name:"HR Transformation",client:"Cascade Health",pm:"Priya Sharma",region:"MEA",status:"on-track",health:88,rev:750000,billed:600000,ms:4,cms:3,ov:0,dd:0,nm:"Training",nd:"Jul 15",trend:[2,4,3,1,5],ics:["Daniel O."]},
  {id:8,name:"DataVault Analytics",client:"Crestline Bank",pm:"Erik Lindberg",region:"EMEA",status:"at-risk",health:52,rev:2200000,billed:660000,ms:7,cms:2,ov:1,dd:11,nm:"ETL Pipeline",nd:"Jul 8",trend:[0,-1,-3,-2,-4],ics:["Lena H.","Carlos M."]},
  {id:9,name:"Supply Chain 360",client:"Orion Logistics",pm:"James Okafor",region:"EMEA",status:"on-track",health:69,rev:1400000,billed:840000,ms:6,cms:4,ov:0,dd:0,nm:"Warehouse",nd:"Aug 10",trend:[1,0,2,1,3],ics:["Yuki T."]},
  {id:10,name:"CX Platform Revamp",client:"Zenith Telecom",pm:"Laura Martinez",region:"AMER",status:"critical",health:15,rev:900000,billed:90000,ms:5,cms:0,ov:2,dd:30,nm:"Req Sign-off",nd:"Jun 1",trend:[-5,-10,-8,-15,-12],ics:["Carlos M."]},
];

const SAMPLE_PMS=[
  {name:"Priya Sharma",ini:"PS",region:"MEA",xp:4200,ah:89.5,br:0.92,ov:0,streak:14,badges:["perfectBilling","zeroOverdue","streakMaster","topHealth"]},
  {name:"James Okafor",ini:"JO",region:"EMEA",xp:2800,ah:72,br:0.6,ov:0,streak:8,badges:["zeroOverdue","teamPlayer"]},
  {name:"Erik Lindberg",ini:"EL",region:"EMEA",xp:2400,ah:67,br:0.78,ov:1,streak:5,badges:["fastCloser"]},
  {name:"Sarah Chen",ini:"SC",region:"APAC",xp:1400,ah:30,br:0.5,ov:5,streak:0,badges:[]},
  {name:"Laura Martinez",ini:"LM",region:"AMER",xp:800,ah:30,br:0.23,ov:3,streak:0,badges:[]},
];

const SAMPLE_ICS=[
  {name:"Fatima Al-Rashid",ini:"FA",region:"MEA",role:"Senior",xp:4800,util:92,csat:4.8,tickets:47,kb:12,certs:4,streak:18,badges:["csatStar","certified","utilization","mentor","streakMaster"],projs:["CloudFirst Platform","FinCore Rollout"]},
  {name:"Yuki Tanaka",ini:"YT",region:"APAC",role:"Consultant",xp:3600,util:88,csat:4.6,tickets:38,kb:8,certs:3,streak:11,badges:["csatStar","certified","utilization","streakMaster"],projs:["CloudFirst Platform","SmartFleet Telematics","Supply Chain 360"]},
  {name:"Daniel Osei",ini:"DO",region:"MEA",role:"Senior",xp:3200,util:85,csat:4.5,tickets:35,kb:6,certs:3,streak:9,badges:["csatStar","certified","teamPlayer"],projs:["FinCore Rollout","HR Transformation"]},
  {name:"Lena Hoffman",ini:"LH",region:"EMEA",role:"Consultant",xp:2100,util:78,csat:4.2,tickets:29,kb:4,certs:2,streak:4,badges:["teamPlayer"],projs:["SmartFleet Telematics","DataVault Analytics"]},
  {name:"Tomás Rivera",ini:"TR",region:"AMER",role:"Associate",xp:1500,util:72,csat:4.0,tickets:22,kb:2,certs:1,streak:2,badges:[],projs:["Titan ERP Migration","Omni Commerce"]},
  {name:"Anika Patel",ini:"AP",region:"APAC",role:"Consultant",xp:1100,util:65,csat:3.8,tickets:18,kb:1,certs:1,streak:0,badges:[],projs:["Titan ERP Migration","RetailHub Integration"]},
  {name:"Carlos Mendez",ini:"CM",region:"AMER",role:"Associate",xp:700,util:60,csat:3.6,tickets:14,kb:0,certs:1,streak:0,badges:[],projs:["Omni Commerce","DataVault Analytics","CX Platform Revamp"]},
];

const BILL=[{m:"Jan",f:1200,a:1150},{m:"Feb",f:1400,a:1380},{m:"Mar",f:1100,a:980},{m:"Apr",f:1600,a:1520},{m:"May",f:1350,a:1410},{m:"Jun",f:1500,a:1280},{m:"Jul",f:1700,a:null},{m:"Aug",f:1450,a:null}];

const CHALL_T=[
  {id:"overdue_zero",icon:"🎯",title:"Zero Overdue Week",desc:"Close all overdue milestones",xp:150,cat:"delivery"},
  {id:"billing_blitz",icon:"💸",title:"Billing Blitz",desc:"Bill $500K+ this week",xp:200,cat:"revenue"},
  {id:"review_rally",icon:"📋",title:"Review Rally",desc:"Complete all PM reviews",xp:100,cat:"governance"},
  {id:"health_boost",icon:"💚",title:"Health Boost",desc:"Improve avg health by 5+ pts",xp:175,cat:"delivery"},
  {id:"csat_champion",icon:"⭐",title:"CSAT Champion",desc:"Avg CSAT above 4.5",xp:200,cat:"quality"},
  {id:"kb_contributor",icon:"📚",title:"Knowledge Builder",desc:"Publish 3+ KB articles",xp:120,cat:"growth"},
  {id:"risk_buster",icon:"🛡️",title:"Risk Buster",desc:"Move 2+ at-risk to on-track",xp:250,cat:"delivery"},
];

const WCHAL=[{title:"Zero Overdue Week",icon:"🎯",xp:150,prog:7,tgt:9},{title:"Billing Blitz",icon:"💸",xp:200,prog:420,tgt:500},{title:"Review Rally",icon:"📋",xp:100,prog:4,tgt:5}];

const SYNC_H=[
  {t:"08:15 AM",s:"success",r:245,d:"1.2s",tp:"scheduled"},
  {t:"08:00 AM",s:"success",r:245,d:"1.1s",tp:"scheduled"},
  {t:"07:45 AM",s:"success",r:244,d:"1.3s",tp:"scheduled"},
  {t:"07:30 AM",s:"warning",r:242,d:"3.8s",tp:"scheduled",n:"3 rows missing PM — defaults applied"},
  {t:"07:15 AM",s:"success",r:244,d:"1.0s",tp:"webhook"},
  {t:"07:00 AM",s:"error",r:0,d:"—",tp:"scheduled",n:"401 — API key rotated on source"},
  {t:"06:30 AM",s:"success",r:243,d:"1.4s",tp:"scheduled"},
];

const CSV_MAP=[
  {csv:"Your Reference",field:"Project ID",conf:95},{csv:"Order Description",field:"Project Name",conf:92},
  {csv:"Customer Name",field:"Client",conf:98},{csv:"Milestone Description",field:"Milestone",conf:94},
  {csv:"Milestone Value (GBP)",field:"Revenue",conf:90},{csv:"Milestone Status",field:"Status",conf:96},
  {csv:"Expected Billing Date",field:"Expected Date",conf:93},{csv:"PM Name",field:"Project Manager",conf:88},
  {csv:"Region",field:"Region",conf:99},{csv:"Project Health Score",field:"Health",conf:85},
];

let P=SAMPLE_P, PMS=SAMPLE_PMS, ICS=SAMPLE_ICS;
export function __setData(d){ if(d.projects&&d.projects.length)P=d.projects; if(d.pms&&d.pms.length)PMS=d.pms; if(d.ics&&d.ics.length)ICS=d.ics; }
export function __useDemo(){ P=SAMPLE_P; PMS=SAMPLE_PMS; ICS=SAMPLE_ICS; }

// ── SHARED COMPONENTS ───────────────────────────────────────
function Ring({v,s=40,w=3,children}){const[a,sA]=useState(0);const r=(s-w)/2,ci=2*Math.PI*r;useEffect(()=>{const t=setTimeout(()=>sA(v),80);return()=>clearTimeout(t)},[v]);return(<div style={{position:"relative",width:s,height:s}}><svg width={s} height={s} style={{transform:"rotate(-90deg)"}}><circle cx={s/2} cy={s/2} r={r} fill="none" stroke={C.bd} strokeWidth={w}/><circle cx={s/2} cy={s/2} r={r} fill="none" stroke={hc(v)} strokeWidth={w} strokeDasharray={ci} strokeDashoffset={ci-ci*a/100} strokeLinecap="round" style={{transition:"stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{children||<span style={{fontSize:s*.25,fontWeight:800,color:hc(v)}}>{v}</span>}</div></div>)}

function Spark({data,color,w=48,h=16}){const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*h}`).join(" ");return (<svg width={w} height={h} style={{overflow:"visible"}}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><circle cx={w} cy={h-((data[data.length-1]-mn)/rng)*h} r="2" fill={color}/></svg>)}

function Ctr({to,pre="",suf="",color=C.tx}){const[d,sD]=useState(0);const ref=useRef();useEffect(()=>{const st=performance.now();const tk=()=>{const p=Math.min((performance.now()-st)/800,1);sD(Math.round(to*(1-(1-p)**3)));if(p<1)ref.current=requestAnimationFrame(tk)};ref.current=requestAnimationFrame(tk);return()=>cancelAnimationFrame(ref.current)},[to]);return (<span style={{color,fontVariantNumeric:"tabular-nums"}}>{pre}{d.toLocaleString()}{suf}</span>)}

function XPBar({xp,compact}){const lv=gLv(xp);const pct=lv.nx?Math.round(((xp-lv.m)/(lv.nx.m-lv.m))*100):100;return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:compact?2:4}}><span style={{fontSize:compact?9:10,fontWeight:700,color:lv.c}}>{lv.i} {lv.n}</span><span style={{fontSize:compact?8:9,color:C.dm}}>{xp.toLocaleString()} XP</span></div><div style={{height:compact?3:5,background:C.bd,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:G,borderRadius:3,transition:"width 1s ease"}}/></div></div>)}

function BadgeRow({badges,small}){const[tt,sTt]=useState(null);return(<div style={{display:"flex",gap:small?3:5,flexWrap:"wrap",position:"relative"}}>{badges.map((bk,i)=>{const b=BADGES[bk];if(!b)return null;return(<div key={i} style={{position:"relative"}} onMouseEnter={()=>sTt(i)} onMouseLeave={()=>sTt(null)}><div style={{width:small?24:30,height:small?24:30,borderRadius:small?6:7,background:C.sf,border:`1px solid ${C.bh}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:small?11:14,cursor:"default",transition:"all 0.2s",...(tt===i?{transform:"scale(1.2)",borderColor:C.ac}:{})}}>{b.i}</div>{tt===i&&<div style={{position:"absolute",bottom:"115%",left:"50%",transform:"translateX(-50%)",background:C.bd,border:`1px solid ${C.bh}`,borderRadius:6,padding:"4px 8px",whiteSpace:"nowrap",zIndex:20,boxShadow:"0 6px 20px rgba(0,0,0,.5)",textAlign:"center"}}><div style={{fontSize:9,fontWeight:700,color:C.tx}}>{b.n}</div><div style={{fontSize:7,color:C.sb}}>{b.d}</div></div>}</div>)})}{badges.length===0&&<span style={{fontSize:9,color:C.dm,fontStyle:"italic"}}>No badges</span>}</div>)}

function Drawer({p,onClose}){if(!p)return null;const pct=Math.round(p.billed/p.rev*100);return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:100,display:"flex",justifyContent:"flex-end",backdropFilter:"blur(4px)"}}><div onClick={e=>e.stopPropagation()} style={{width:380,maxWidth:"90vw",height:"100%",background:"#0B1120",borderLeft:`1px solid ${C.bd}`,padding:"22px 18px",overflowY:"auto",animation:"slI .3s ease"}}><style>{`@keyframes slI{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div><div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:sc(p.status),marginBottom:3}}>{p.status==="on-track"?"● ON TRACK":p.status==="at-risk"?"▲ AT RISK":"◆ CRITICAL"}</div><div style={{fontSize:17,fontWeight:800,color:C.tx}}>{p.name}</div><div style={{fontSize:11,color:C.sb,marginTop:2}}>{p.client} · {p.region} · PM: {p.pm}</div></div><button onClick={onClose} style={{background:C.bd,border:"none",borderRadius:7,width:30,height:30,color:C.sb,fontSize:14,cursor:"pointer"}}>✕</button></div><div style={{display:"flex",gap:14,alignItems:"center",padding:"14px 0",borderTop:`1px solid ${C.bd}`,borderBottom:`1px solid ${C.bd}`,marginBottom:14}}><Ring v={p.health} s={70} w={5}/><div><div style={{fontSize:22,fontWeight:800,color:C.tx}}>{fmt(p.rev)}</div><div style={{fontSize:11,color:C.sb}}>{pct}% billed · {p.cms}/{p.ms} ms</div></div></div>{p.ov>0&&<div style={{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",borderRadius:9,padding:12,marginBottom:10}}><div style={{fontSize:12,fontWeight:700,color:C.rd}}>⚡ {p.ov} overdue · {p.dd}d behind</div></div>}<div style={{background:C.sf,borderRadius:9,padding:12,border:`1px solid ${C.bd}`,marginBottom:10}}><div style={{fontSize:9,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm,marginBottom:4}}>Next: {p.nm}</div><div style={{fontSize:11,color:C.sb}}>Due {p.nd}</div></div><div style={{background:C.sf,borderRadius:9,padding:12,border:`1px solid ${C.bd}`,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:9,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm}}>5-Week Trend</span><Spark data={p.trend} color={p.trend[4]>=0?C.gn:C.rd} w={72} h={22}/></div></div>{p.ics&&<div style={{background:C.sf,borderRadius:9,padding:12,border:`1px solid ${C.bd}`}}><div style={{fontSize:9,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm,marginBottom:6}}>Consultants</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{p.ics.map((ic,i)=><span key={i} style={{padding:"3px 8px",borderRadius:5,background:`${C.bd}80`,border:`1px solid ${C.bh}`,fontSize:10,color:C.tx}}>{ic}</span>)}</div></div>}</div></div>)}

// ── PORTFOLIO ───────────────────────────────────────────────
function Portfolio({onSel}){const[fl,sFl]=useState("all");const fd=fl==="all"?P:P.filter(p=>p.status===fl);const cn={all:P.length,"on-track":P.filter(p=>p.status==="on-track").length,"at-risk":P.filter(p=>p.status==="at-risk").length,critical:P.filter(p=>p.status==="critical").length};const tR=P.reduce((s,p)=>s+p.rev,0),tB=P.reduce((s,p)=>s+p.billed,0),rR=P.filter(p=>p.status!=="on-track").reduce((s,p)=>s+(p.rev-p.billed),0),aH=Math.round(P.reduce((s,p)=>s+p.health,0)/P.length),oT=P.reduce((s,p)=>s+p.ov,0);
return(<div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>{[{i:"💰",l:"Portfolio",v:Math.round(tR/1e6*10)/10,p:"$",su:"M",sb:`${Math.round(tB/tR*100)}% billed`,c:C.tx},{i:"🔥",l:"At Risk",v:Math.round(rR/1e3),p:"$",su:"K",sb:`${cn["at-risk"]+cn.critical} projects`,c:C.rd},{i:"💚",l:"Avg Health",v:aH,p:"",su:"%",sb:`${cn["on-track"]} on track`,c:hc(aH)},{i:"⏰",l:"Overdue",v:oT,p:"",su:"",sb:"milestones",c:oT>0?C.rd:C.gn}].map((k,i)=><div key={i} style={{background:`linear-gradient(135deg,${C.sf},${C.cd})`,border:`1px solid ${C.bd}`,borderRadius:12,padding:"16px 18px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-6,right:-2,fontSize:38,opacity:.06}}>{k.i}</div><div style={{fontSize:8,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:C.dm,marginBottom:6}}>{k.l}</div><div style={{fontSize:26,fontWeight:800,lineHeight:1}}><Ctr to={k.v} pre={k.p} suf={k.su} color={k.c}/></div><div style={{fontSize:9,color:C.sb,marginTop:5}}>{k.sb}</div></div>)}</div>

{/* Challenges */}
<div style={{background:`linear-gradient(135deg,${C.sf},#1a1040)`,border:`1px solid ${C.bh}`,borderRadius:12,padding:16,marginBottom:16}}>
<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><span style={{fontSize:13,fontWeight:700,color:C.tx}}>🏆 Weekly Challenges</span><span style={{fontSize:9,color:"#C084FC",fontWeight:600}}>Resets 3d 14h</span></div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{WCHAL.map((ch,i)=>{const pct=Math.min(Math.round(ch.prog/ch.tgt*100),100),dn=pct>=100;return(<div key={i} style={{background:dn?`${C.gn}06`:C.bg,border:`1px solid ${dn?C.gn+"30":C.bd}`,borderRadius:8,padding:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16}}>{ch.icon}</span><span style={{fontSize:8,fontWeight:700,color:"#C084FC",background:"rgba(192,132,252,.12)",padding:"1px 6px",borderRadius:5}}>+{ch.xp} XP</span></div><div style={{fontSize:10,fontWeight:700,color:C.tx,marginBottom:1}}>{ch.title}</div><div style={{height:4,background:C.bd,borderRadius:2,marginTop:6,marginBottom:3}}><div style={{height:"100%",width:`${pct}%`,background:dn?C.gn:G,borderRadius:2}}/></div><div style={{fontSize:7,color:dn?C.gn:C.sb,fontWeight:600,textAlign:"right"}}>{dn?"✓ Done":`${ch.prog}/${ch.tgt}`}</div></div>)})}</div></div>

{/* Filters */}
<div style={{display:"flex",gap:5,marginBottom:14}}>{[{k:"all",l:"All",c:null},{k:"on-track",l:"On Track",c:C.gn},{k:"at-risk",l:"At Risk",c:C.am},{k:"critical",l:"Critical",c:C.rd}].map(f=><button key={f.k} onClick={()=>sFl(f.k)} style={{padding:"5px 12px",borderRadius:16,border:`1.5px solid ${fl===f.k?(f.c||C.ac):C.bd}`,background:fl===f.k?(f.c||C.ac)+"15":"transparent",color:fl===f.k?(f.c||C.ac):C.sb,fontSize:10,fontWeight:600,cursor:"pointer",display:"flex",gap:4,alignItems:"center"}}>{f.l}<span style={{background:fl===f.k?(f.c||C.ac)+"25":C.bd,padding:"0 5px",borderRadius:7,fontSize:9,fontWeight:700}}>{cn[f.k]}</span></button>)}</div>

{/* Cards */}
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10}}>{fd.sort((a,b)=>a.health-b.health).map(p=>{const bp=Math.round(p.billed/p.rev*100);return(<div key={p.id} onClick={()=>onSel(p)} style={{background:C.sf,border:`1px solid ${p.status==="critical"?C.rd+"40":C.bd}`,borderRadius:12,padding:14,cursor:"pointer",transition:"all .2s"}} onMouseOver={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,.3)"}} onMouseOut={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:700,color:C.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div><div style={{fontSize:9,color:C.sb,marginTop:1}}>{p.client} · {p.region}</div></div><Ring v={p.health} s={38} w={2.5}/></div><div style={{display:"flex",gap:12,marginBottom:10}}><div><div style={{fontSize:7,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm}}>Value</div><div style={{fontSize:12,fontWeight:700,color:C.tx}}>{fmt(p.rev)}</div></div><div><div style={{fontSize:7,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm}}>Billed</div><div style={{fontSize:12,fontWeight:700,color:bp>70?C.gn:bp>30?C.am:C.rd}}>{bp}%</div></div><div><div style={{fontSize:7,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm}}>Trend</div><Spark data={p.trend} color={p.trend[4]>=0?C.gn:C.rd} w={40} h={14}/></div></div><div style={{height:2,background:C.bd,borderRadius:1,marginBottom:8}}><div style={{height:"100%",width:`${bp}%`,background:`linear-gradient(90deg,${bp>70?C.gn:bp>30?C.am:C.rd},${C.ac})`,borderRadius:1}}/></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:9,color:C.sb}}><b style={{color:C.tx}}>{p.cms}</b>/{p.ms} ms</span>{p.ov>0?<span style={{fontSize:8,fontWeight:700,color:C.rd,background:`${C.rd}12`,padding:"1px 6px",borderRadius:4}}>{p.ov} overdue</span>:<span style={{fontSize:8,color:C.gn,fontWeight:600}}>✓ On schedule</span>}</div></div>)})}</div>
</div>)}

// ── REVENUE ─────────────────────────────────────────────────
function Revenue(){const[hov,sH]=useState(null);const mx=1700;const byR={};P.forEach(p=>{if(!byR[p.region])byR[p.region]={t:0,b:0,r:0,c:0};byR[p.region].t+=p.rev;byR[p.region].b+=p.billed;byR[p.region].c++;if(p.status!=="on-track")byR[p.region].r+=(p.rev-p.billed)});const regs=Object.entries(byR).sort((a,b)=>b[1].t-a[1].t);const mR=regs[0][1].t;
return(<div>
<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:12,padding:18,marginBottom:14}}>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><div><div style={{fontSize:14,fontWeight:700,color:C.tx}}>Billing: Forecast vs Actuals</div><div style={{fontSize:10,color:C.sb,marginTop:2}}>Hover for details</div></div><div style={{display:"flex",gap:12}}>{[{c:C.ac,l:"Forecast"},{c:C.gn,l:"Actual"},{c:C.am,l:"Shortfall"}].map((x,i)=><span key={i} style={{display:"flex",alignItems:"center",gap:3,fontSize:9,color:C.sb}}><span style={{width:6,height:6,borderRadius:"50%",background:x.c}}/>{x.l}</span>)}</div></div>
<div style={{display:"flex",alignItems:"flex-end",gap:6,height:140,padding:"0 4px"}}>{BILL.map((b,i)=>{const fH=(b.f/mx)*120,aH=b.a?(b.a/mx)*120:0,fut=!b.a,isH=hov===i,sh=b.a&&b.a<b.f;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",position:"relative"}} onMouseEnter={()=>sH(i)} onMouseLeave={()=>sH(null)}>{isH&&<div style={{position:"absolute",bottom:fH+24,background:C.bd,borderRadius:6,padding:"3px 7px",fontSize:8,color:C.tx,whiteSpace:"nowrap",zIndex:5}}>{b.m}: ${b.f}K{b.a?` / $${b.a}K`:""}{sh?<span style={{color:C.rd}}> Gap: ${b.f-b.a}K</span>:""}</div>}<div style={{display:"flex",gap:2,alignItems:"flex-end",height:120}}><div style={{width:14,height:fH,borderRadius:"3px 3px 0 0",background:fut?"transparent":isH?C.ac:C.ac+"80",border:fut?`1.5px dashed ${C.ac}60`:"none"}}/>{!fut&&<div style={{width:14,height:aH,borderRadius:"3px 3px 0 0",background:isH?(sh?C.am:C.gn):(sh?C.am+"80":C.gn+"80")}}/>}</div><span style={{fontSize:8,color:isH?C.tx:C.dm,fontWeight:isH?700:400,marginTop:5}}>{b.m}</span></div>)})}</div></div>

<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:12,padding:18}}>
<div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:14}}>Revenue by Region</div>
{regs.map(([r,d],i)=><div key={r} style={{marginBottom:i<regs.length-1?14:0}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,fontWeight:600,color:C.tx}}>{r} <span style={{color:C.dm,fontSize:9}}>· {d.c}</span></span><span style={{fontSize:12,fontWeight:700,color:C.tx}}>{fmt(d.t)}</span></div><div style={{height:7,background:C.bd,borderRadius:4,overflow:"hidden",display:"flex"}}><div style={{width:`${(d.b/mR)*100}%`,height:"100%",background:`linear-gradient(90deg,${C.gn},#059669)`}}/><div style={{width:`${((d.t-d.b)/mR)*100}%`,height:"100%",background:d.r>0?C.am+"40":C.ac+"30"}}/></div><div style={{display:"flex",gap:8,marginTop:3,fontSize:8,color:C.sb}}><span>Billed {fmt(d.b)}</span>{d.r>0&&<span style={{color:C.rd}}>Risk {fmt(d.r)}</span>}</div></div>)}</div>

<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:12,padding:18}}>
<div style={{fontSize:13,fontWeight:700,color:C.tx,marginBottom:14}}>Efficiency</div>
<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{[{l:"Billing Velocity",v:62,t:75,c:C.am},{l:"Forecast Accuracy",v:91,t:95,c:C.gn},{l:"MS Hit Rate",v:72,t:85,c:C.ac},{l:"Collection",v:87,t:90,c:C.pp}].map((m,i)=><div key={i} style={{background:C.bg,borderRadius:8,padding:12,border:`1px solid ${C.bd}80`,textAlign:"center"}}><Ring v={m.v} s={44} w={3}><span style={{fontSize:11,fontWeight:800,color:m.c}}>{m.v}</span></Ring><div style={{fontSize:8,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginTop:5}}>{m.l}</div><div style={{fontSize:8,color:C.sb,marginTop:1}}>Target: {m.t}%</div></div>)}</div></div>
</div></div>)}

// ── PM PERFORMANCE ──────────────────────────────────────────
function PMPerf({onSel}){const[expanded,setExpanded]=useState({});const grads=["linear-gradient(135deg,#10B981,#059669)","linear-gradient(135deg,#3B82F6,#2563EB)","linear-gradient(135deg,#8B5CF6,#7C3AED)","linear-gradient(135deg,#F59E0B,#D97706)","linear-gradient(135deg,#EF4444,#DC2626)"];
return(<div style={{display:"flex",flexDirection:"column",gap:8}}>{PMS.map((pm,i)=>{const lv=gLv(pm.xp);const pp=P.filter(p=>p.pm===pm.name);return(<div key={i} style={{background:i===0?`linear-gradient(135deg,${C.sf},${C.gn}08)`:C.sf,border:`1px solid ${i===0?C.gn+"30":C.bd}`,borderRadius:12,padding:"14px 18px"}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{["🥇","🥈","🥉"][i]||<span style={{fontSize:13,color:C.dm,fontWeight:700}}>#{i+1}</span>}</div><div style={{width:40,height:40,borderRadius:20,background:grads[i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0,position:"relative"}}>{pm.ini}<div style={{position:"absolute",bottom:-3,right:-3,fontSize:10,background:C.sf,borderRadius:5,padding:"0 2px",border:`1px solid ${C.bd}`}}>{lv.i}</div></div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:700,color:C.tx}}>{pm.name}</span><span style={{fontSize:9,color:C.dm}}>{pm.region}</span>{pm.streak>0&&<span style={{fontSize:8,fontWeight:700,color:C.am,background:`${C.am}12`,padding:"1px 5px",borderRadius:5}}>🔥{pm.streak}w</span>}<span style={{fontSize:8,fontWeight:600,color:lv.c}}>{lv.n}</span></div><div style={{marginTop:4,maxWidth:180}}><XPBar xp={pm.xp} compact/></div><div style={{display:"flex",gap:3,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>{(expanded[i]?pp:pp.slice(0,5)).map(proj=><button key={proj.id} onClick={(e)=>{e.stopPropagation();onSel(proj)}} style={{padding:"1px 7px",borderRadius:4,border:`1px solid ${sc(proj.status)}30`,background:`${sc(proj.status)}10`,color:sc(proj.status),fontSize:8,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{proj.name.length>16?proj.name.slice(0,16)+"…":proj.name}</button>)}{pp.length>5&&<button onClick={(e)=>{e.stopPropagation();setExpanded(s=>({...s,[i]:!s[i]}))}} style={{padding:"1px 8px",borderRadius:4,border:`1px solid ${C.ac}40`,background:`${C.ac}15`,color:C.ac,fontSize:8,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{expanded[i]?"Show less":`+${pp.length-5} more`}</button>}</div></div><div style={{display:"flex",gap:5,marginRight:6}}><BadgeRow badges={pm.badges} small/></div><div style={{display:"flex",gap:14,flexShrink:0}}><div style={{textAlign:"center"}}><div style={{fontSize:7,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:2}}>Health</div><Ring v={Math.round(pm.ah)} s={34} w={2.5}/></div><div style={{textAlign:"center"}}><div style={{fontSize:7,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:2}}>Billing</div><div style={{fontSize:15,fontWeight:800,color:pm.br>=.7?C.gn:pm.br>=.4?C.am:C.rd}}>{Math.round(pm.br*100)}%</div></div><div style={{textAlign:"center"}}><div style={{fontSize:7,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:2}}>Overdue</div><div style={{fontSize:15,fontWeight:800,color:pm.ov===0?C.gn:C.rd}}>{pm.ov===0?"✓":pm.ov}</div></div></div></div>{pm.ah<50&&<div style={{marginTop:8,marginLeft:80,padding:"5px 10px",background:`${C.rd}06`,border:`1px solid ${C.rd}15`,borderRadius:6,fontSize:10,color:"#F87171",borderLeft:`3px solid ${C.rd}`}}>⚡ Health below 50% — coaching recommended</div>}</div>)})}</div>)}

// ── IC PERFORMANCE ──────────────────────────────────────────
function ICPerf(){const[exp,sE]=useState(null);const grads=["linear-gradient(135deg,#C084FC,#8B5CF6)","linear-gradient(135deg,#3B82F6,#2563EB)","linear-gradient(135deg,#10B981,#059669)","linear-gradient(135deg,#F59E0B,#D97706)","linear-gradient(135deg,#EF4444,#DC2626)","linear-gradient(135deg,#EC4899,#DB2777)","linear-gradient(135deg,#7B8BA8,#64748B)"];const tA={u:Math.round(ICS.reduce((s,c)=>s+c.util,0)/ICS.length),cs:(ICS.reduce((s,c)=>s+c.csat,0)/ICS.length).toFixed(1),tk:ICS.reduce((s,c)=>s+c.tickets,0),kb:ICS.reduce((s,c)=>s+c.kb,0)};
return(<div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>{[{i:"📊",l:"Avg Util",v:tA.u,su:"%",c:tA.u>=80?C.gn:C.am},{i:"⭐",l:"Avg CSAT",v:parseFloat(tA.cs),su:"/5",c:parseFloat(tA.cs)>=4.2?C.gn:C.am},{i:"🎫",l:"Tickets",v:tA.tk,su:"",c:C.ac},{i:"📚",l:"KB Articles",v:tA.kb,su:"",c:"#C084FC"}].map((k,i)=><div key={i} style={{background:`linear-gradient(135deg,${C.sf},${C.cd})`,border:`1px solid ${C.bd}`,borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:-4,right:-1,fontSize:34,opacity:.06}}>{k.i}</div><div style={{fontSize:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.dm,marginBottom:5}}>{k.l}</div><div style={{fontSize:24,fontWeight:800,lineHeight:1}}><Ctr to={k.v} suf={k.su} color={k.c}/></div></div>)}</div>

<div style={{display:"flex",flexDirection:"column",gap:8}}>{ICS.map((ic,i)=>{const lv=gLv(ic.xp);const isE=exp===i;return(<div key={i} style={{background:i===0?`linear-gradient(135deg,${C.sf},#C084FC08)`:C.sf,border:`1px solid ${i===0?"#C084FC30":C.bd}`,borderRadius:12,overflow:"hidden"}}><div style={{padding:"14px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}} onClick={()=>sE(isE?null:i)}><div style={{fontSize:20,width:28,textAlign:"center",flexShrink:0}}>{["🥇","🥈","🥉"][i]||<span style={{fontSize:13,color:C.dm,fontWeight:700}}>#{i+1}</span>}</div><div style={{width:40,height:40,borderRadius:20,background:grads[i%grads.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0,position:"relative"}}>{ic.ini}<div style={{position:"absolute",bottom:-3,right:-3,fontSize:10,background:C.sf,borderRadius:5,padding:"0 2px",border:`1px solid ${C.bd}`}}>{lv.i}</div></div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}><span style={{fontSize:13,fontWeight:700,color:C.tx}}>{ic.name}</span><span style={{fontSize:9,color:C.dm}}>{ic.role} · {ic.region}</span>{ic.streak>0&&<span style={{fontSize:8,fontWeight:700,color:C.am,background:`${C.am}12`,padding:"1px 5px",borderRadius:5}}>🔥{ic.streak}w</span>}<span style={{fontSize:8,fontWeight:600,color:lv.c}}>{lv.n}</span></div><div style={{marginTop:4,maxWidth:170}}><XPBar xp={ic.xp} compact/></div></div><div style={{display:"flex",gap:5,marginRight:6}}><BadgeRow badges={ic.badges} small/></div><div style={{display:"flex",gap:14,flexShrink:0}}><div style={{textAlign:"center"}}><div style={{fontSize:7,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:2}}>Util</div><div style={{fontSize:14,fontWeight:800,color:ic.util>=80?C.gn:ic.util>=65?C.am:C.rd}}>{ic.util}%</div></div><div style={{textAlign:"center"}}><div style={{fontSize:7,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:2}}>CSAT</div><div style={{fontSize:14,fontWeight:800,color:ic.csat>=4.5?C.gn:ic.csat>=3.8?C.am:C.rd}}>{ic.csat}</div></div><div style={{textAlign:"center"}}><div style={{fontSize:7,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:2}}>Tickets</div><div style={{fontSize:14,fontWeight:800,color:C.ac}}>{ic.tickets}</div></div></div><div style={{fontSize:16,color:C.dm,transition:"transform .2s",transform:isE?"rotate(180deg)":""}}>▾</div></div>
{isE&&<div style={{padding:"0 18px 16px",borderTop:`1px solid ${C.bd}`,paddingTop:14}}>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>{[{l:"Utilization",v:`${ic.util}%`,c:ic.util>=80?C.gn:C.am,pct:ic.util},{l:"CSAT",v:`${ic.csat}/5`,c:ic.csat>=4.5?C.gn:C.am,pct:(ic.csat/5)*100},{l:"KB Articles",v:ic.kb,c:"#C084FC",pct:Math.min((ic.kb/12)*100,100)},{l:"Certs",v:ic.certs,c:C.ac,pct:Math.min((ic.certs/4)*100,100)}].map((m,j)=><div key={j} style={{background:C.bg,borderRadius:8,padding:10,border:`1px solid ${C.bd}80`}}><div style={{fontSize:8,fontWeight:600,letterSpacing:.5,textTransform:"uppercase",color:C.dm,marginBottom:4}}>{m.l}</div><div style={{fontSize:16,fontWeight:800,color:m.c,marginBottom:6}}>{m.v}</div><div style={{height:3,background:C.bd,borderRadius:2}}><div style={{height:"100%",width:`${m.pct}%`,background:m.c,borderRadius:2}}/></div></div>)}</div>
<div><div style={{fontSize:8,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm,marginBottom:6}}>Projects</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{ic.projs.map((pn,j)=>{const pr=P.find(p=>p.name===pn);return (<span key={j} style={{padding:"3px 8px",borderRadius:5,background:pr?`${sc(pr.status)}10`:`${C.bd}80`,border:`1px solid ${pr?sc(pr.status)+"30":C.bh}`,fontSize:9,fontWeight:600,color:pr?sc(pr.status):C.sb}}>{pn}</span>)})}</div></div>
</div>}</div>)})}</div></div>)}

// ── SETTINGS: CHALLENGES ────────────────────────────────────
function Challenges(){const[active,sA]=useState(["overdue_zero","billing_blitz","review_rally"]);const[showLib,sL]=useState(false);
return(<div>
<div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:14}}>🏆 Challenge Manager</div>
<div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:18}}>{active.map(id=>{const ch=CHALL_T.find(t=>t.id===id);if(!ch)return null;const cat=CATS[ch.cat];return(<div key={id} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:20}}>{ch.icon}</span><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:700,color:C.tx}}>{ch.title}</span><span style={{fontSize:8,fontWeight:600,color:cat.c,background:cat.c+"18",padding:"1px 6px",borderRadius:4}}>{cat.l}</span></div><div style={{fontSize:10,color:C.sb,marginTop:1}}>{ch.desc}</div></div><span style={{fontSize:12,fontWeight:800,color:"#C084FC"}}>+{ch.xp}</span><button onClick={()=>sA(active.filter(a=>a!==id))} style={{width:28,height:28,borderRadius:6,border:`1px solid ${C.bd}`,background:"transparent",color:C.rd,fontSize:12,cursor:"pointer"}}>✕</button></div>)})}</div>
<button onClick={()=>sL(!showLib)} style={{width:"100%",padding:"10px 0",borderRadius:8,border:`1px solid ${C.bd}`,background:"transparent",color:C.sb,fontSize:11,fontWeight:600,cursor:"pointer"}}>{showLib?"Hide":"Browse"} Templates ({CHALL_T.filter(t=>!active.includes(t.id)).length})</button>
{showLib&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8,marginTop:10}}>{CHALL_T.filter(t=>!active.includes(t.id)).map(ch=>{const cat=CATS[ch.cat];return(<div key={ch.id} style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:8,padding:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:16}}>{ch.icon}</span><span style={{fontSize:8,fontWeight:600,color:cat.c,background:cat.c+"18",padding:"1px 5px",borderRadius:4}}>{cat.l}</span></div><div style={{fontSize:11,fontWeight:700,color:C.tx,marginBottom:2}}>{ch.title}</div><div style={{fontSize:9,color:C.sb,marginBottom:8}}>{ch.desc}</div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:9,fontWeight:700,color:"#C084FC"}}>+{ch.xp} XP</span><button onClick={()=>{if(active.length<5)sA([...active,ch.id])}} disabled={active.length>=5} style={{padding:"3px 10px",borderRadius:5,border:`1px solid ${C.ac}40`,background:`${C.ac}15`,color:C.ac,fontSize:9,fontWeight:700,cursor:active.length>=5?"not-allowed":"pointer",opacity:active.length>=5?.4:1}}>+ Add</button></div></div>)})}</div>}
</div>)}

// ── SETTINGS: DATA MAPPER ───────────────────────────────────
function DataMapper(){const[stage,sS]=useState("upload");const[prog,sP]=useState(0);const[rows,sR]=useState(0);
const startA=()=>{sS("analyzing");sP(0);let i=0;const steps=[{p:20,t:350},{p:45,t:300},{p:70,t:350},{p:90,t:250},{p:100,t:200}];const run=()=>{if(i<steps.length)setTimeout(()=>{sP(steps[i].p);i++;run()},steps[i].t);else setTimeout(()=>{sS("mapped");let r=0;const rv=()=>{if(r<CSV_MAP.length)setTimeout(()=>{r++;sR(r);rv()},100)};rv()},300)};run()};
return(<div>
<div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:14}}>🤖 AI Data Mapper</div>
{stage==="upload"&&<div><div onClick={startA} style={{border:`2px dashed ${C.bh}`,borderRadius:12,padding:"36px 24px",textAlign:"center",cursor:"pointer",background:C.sf}} onMouseOver={e=>{e.currentTarget.style.borderColor=C.ac}} onMouseOut={e=>{e.currentTarget.style.borderColor=C.bh}}><div style={{fontSize:32,marginBottom:8}}>📄</div><div style={{fontSize:13,fontWeight:700,color:C.tx}}>Drop CSV here or click to browse</div><div style={{fontSize:10,color:C.sb,marginTop:4}}>UTF-8, UTF-16 LE/BE supported</div></div><div style={{marginTop:12,padding:12,background:C.sf,border:`1px solid ${C.bd}`,borderRadius:8,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>📊</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:C.tx}}>backlog_export_jun2026.csv</div><div style={{fontSize:10,color:C.sb}}>245 rows · 15 columns</div></div><button onClick={startA} style={{padding:"7px 16px",borderRadius:7,border:"none",background:G,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>Analyze</button></div></div>}
{stage==="analyzing"&&<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:12,padding:28,textAlign:"center"}}><div style={{fontSize:32,marginBottom:12,animation:"spin 2s linear infinite"}}>🤖</div><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style><div style={{fontSize:14,fontWeight:700,color:C.tx,marginBottom:6}}>Analyzing your data...</div><div style={{height:5,background:C.bd,borderRadius:3,maxWidth:250,margin:"0 auto",overflow:"hidden"}}><div style={{height:"100%",width:`${prog}%`,background:G,borderRadius:3,transition:"width .3s ease"}}/></div><div style={{fontSize:10,color:C.dm,marginTop:6}}>{prog}%</div></div>}
{stage==="mapped"&&<div><div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:12,overflow:"hidden"}}><div style={{padding:"12px 16px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,fontWeight:700,color:C.tx}}>Column Mapping</span><span style={{fontSize:10,color:C.gn,fontWeight:600}}>Avg conf: 92%</span></div><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["","CSV Column","→","Dashboard Field","Conf"].map((h,i)=><th key={i} style={{padding:"6px 12px",textAlign:"left",fontSize:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.dm}}>{h}</th>)}</tr></thead><tbody>{CSV_MAP.map((r,i)=><tr key={i} style={{opacity:i<rows?1:.15,transition:"opacity .3s",borderBottom:`1px solid ${C.bd}06`}}><td style={{padding:"8px 12px",width:24}}>{i<rows&&<span style={{color:C.gn,fontSize:13}}>✓</span>}</td><td style={{padding:"8px 12px"}}><span style={{fontSize:10,fontFamily:"monospace",fontWeight:600,color:C.tx,background:C.bg,padding:"1px 5px",borderRadius:3}}>{r.csv}</span></td><td style={{padding:"8px 12px",color:C.dm,fontSize:14}}>→</td><td style={{padding:"8px 12px",fontSize:10,fontWeight:600,color:C.tx}}>{r.field}</td><td style={{padding:"8px 12px"}}><span style={{fontSize:9,fontWeight:700,color:r.conf>=90?C.gn:C.am,background:(r.conf>=90?C.gn:C.am)+"18",padding:"1px 6px",borderRadius:4}}>{r.conf}%</span></td></tr>)}</tbody></table></div><div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button onClick={()=>sS("upload")} style={{padding:"8px 18px",borderRadius:7,border:"none",background:C.gn,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Confirm & Build Dashboard</button></div></div>}
</div>)}

// ── SETTINGS: API CONFIG ────────────────────────────────────
function APIConfig(){const[mode,sM]=useState("pull");const[sched,sSc]=useState("15min");const[testSt,sT]=useState(null);
const test=()=>{sT("testing");setTimeout(()=>{sT("success");setTimeout(()=>sT(null),2500)},1500)};
return(<div>
<div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:14}}>🔌 API Configuration</div>
<div style={{display:"flex",gap:6,marginBottom:18}}>{[{id:"pull",l:"🔄 Pull (Polling)",d:"Fetch on schedule"},{id:"push",l:"📨 Push (Webhook)",d:"Receive real-time"},{id:"rest",l:"🔌 REST API",d:"Programmatic access"}].map(m=><button key={m.id} onClick={()=>sM(m.id)} style={{flex:1,padding:"12px 14px",borderRadius:10,textAlign:"left",cursor:"pointer",border:`1.5px solid ${mode===m.id?C.ac:C.bd}`,background:mode===m.id?`${C.ac}08`:C.sf}}><div style={{fontSize:11,fontWeight:700,color:mode===m.id?C.ac:C.tx}}>{m.l}</div><div style={{fontSize:9,color:C.sb,marginTop:2}}>{m.d}</div></button>)}</div>

{mode==="pull"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
<div style={{background:C.sf,borderRadius:12,padding:18,border:`1px solid ${C.bd}`}}>
<div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:12}}>Endpoint</div>
<div style={{padding:"8px 12px",borderRadius:7,border:`1px solid ${C.bh}`,background:C.bg,color:C.tx,fontSize:11,fontFamily:"monospace",marginBottom:10}}>https://api.yourcompany.com/v1/export</div>
<div style={{fontSize:10,fontWeight:600,color:C.dm,marginBottom:4}}>Auth: Bearer Token</div>
<div style={{padding:"8px 12px",borderRadius:7,border:`1px solid ${C.bh}`,background:C.bg,color:C.sb,fontSize:10,fontFamily:"monospace",marginBottom:12}}>sk_live_••••••••••••••••••</div>
<button onClick={test} style={{width:"100%",padding:"10px 0",borderRadius:7,border:"none",background:testSt==="success"?C.gn:testSt==="testing"?C.am:C.ac,color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>{testSt==="testing"?"⟳ Testing...":testSt==="success"?"✓ Connected — 245 records":"Test Connection"}</button></div>

<div style={{background:C.sf,borderRadius:12,padding:18,border:`1px solid ${C.bd}`}}>
<div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:12}}>Refresh Schedule</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>{[{id:"5min",l:"5 min"},{id:"15min",l:"15 min"},{id:"30min",l:"30 min"},{id:"1hr",l:"1 hour"},{id:"6hr",l:"6 hours"},{id:"daily",l:"Daily"}].map(s=><button key={s.id} onClick={()=>sSc(s.id)} style={{padding:"10px 8px",borderRadius:8,textAlign:"center",cursor:"pointer",border:`1.5px solid ${sched===s.id?C.gn:C.bd}`,background:sched===s.id?`${C.gn}10`:"transparent"}}><div style={{fontSize:12,fontWeight:800,color:sched===s.id?C.gn:C.tx}}>{s.l}</div>{s.id==="15min"&&<div style={{fontSize:6,fontWeight:700,color:C.ac,marginTop:2}}>★ POPULAR</div>}</button>)}</div>
<div style={{marginTop:12}}>{["AI Auto-Mapping","Retry on Failure","Alert on Failure"].map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:C.bg,borderRadius:7,border:`1px solid ${C.bd}`,marginBottom:4}}><span style={{fontSize:10,fontWeight:600,color:C.tx}}>{t}</span><div style={{width:32,height:16,borderRadius:8,background:C.gn,padding:1}}><div style={{width:14,height:14,borderRadius:7,background:"#fff",marginLeft:16}}/></div></div>)}</div></div></div>}

{mode==="push"&&<div style={{background:C.sf,borderRadius:12,padding:18,border:`1px solid ${C.bd}`}}><div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>Your Webhook Endpoint</div><div style={{padding:"8px 12px",borderRadius:7,border:`1px solid ${C.bh}`,background:C.bg,color:C.ac,fontSize:10,fontFamily:"monospace",marginBottom:10}}>https://api.deliveriq.io/webhooks/whk_a8x3m9q2br</div><div style={{fontSize:10,color:C.sb,lineHeight:1.5}}>POST JSON, CSV, or NDJSON to this URL. AI auto-maps your payload — no schema needed.</div><pre style={{background:C.bg,borderRadius:8,padding:12,border:`1px solid ${C.bd}`,fontSize:9,color:C.sb,marginTop:10,overflow:"auto",lineHeight:1.5}}>{`curl -X POST https://api.deliveriq.io/webhooks/whk_... \\
  -H "Content-Type: application/json" \\
  -d '{"projects":[{"ref":"PRJ-001","name":"Titan ERP",...}]}'`}</pre></div>}

{mode==="rest"&&<div style={{background:C.sf,borderRadius:12,padding:18,border:`1px solid ${C.bd}`}}><div style={{fontSize:12,fontWeight:700,color:C.tx,marginBottom:10}}>REST API Endpoints</div>{[{m:"POST",p:"/projects/sync",d:"Bulk upsert"},{m:"PUT",p:"/projects/:id",d:"Update one"},{m:"POST",p:"/milestones/sync",d:"Bulk milestones"},{m:"PATCH",p:"/milestones/:id/status",d:"Update status"},{m:"GET",p:"/health",d:"Health check"}].map((ep,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px",background:C.bg,borderRadius:6,border:`1px solid ${C.bd}`,marginBottom:3}}><span style={{fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:3,color:ep.m==="GET"?C.gn:C.ac,background:(ep.m==="GET"?C.gn:C.ac)+"18",minWidth:32,textAlign:"center"}}>{ep.m}</span><span style={{fontSize:10,fontFamily:"monospace",fontWeight:600,color:C.tx}}>{ep.p}</span><span style={{fontSize:9,color:C.dm,marginLeft:"auto"}}>{ep.d}</span></div>)}</div>}
</div>)}

// ── SETTINGS: SYNC MONITOR ──────────────────────────────────
function SyncMon(){const[nextS,sN]=useState(847);useEffect(()=>{const t=setInterval(()=>sN(p=>p<=0?900:p-1),1000);return()=>clearInterval(t)},[]);
return(<div>
<div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:14}}>📡 Sync Monitor</div>
<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>{[{i:"🟢",l:"Status",v:"Healthy",c:C.gn},{i:"⏱️",l:"Next Sync",v:`${Math.floor(nextS/60)}:${(nextS%60).toString().padStart(2,"0")}`,c:nextS<30?C.am:C.sb},{i:"📊",l:"Success Rate",v:"86%",c:C.gn},{i:"📦",l:"Last Records",v:"245",c:C.ac}].map((k,i)=><div key={i} style={{background:C.sf,borderRadius:10,padding:"12px 14px",border:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:18}}>{k.i}</span><div><div style={{fontSize:8,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",color:C.dm}}>{k.l}</div><div style={{fontSize:16,fontWeight:800,color:k.c,marginTop:1,fontVariantNumeric:"tabular-nums"}}>{k.v}</div></div></div>)}</div>

<div style={{background:C.sf,border:`1px solid ${C.bd}`,borderRadius:12,overflow:"hidden"}}><div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bd}`,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:12,fontWeight:700,color:C.tx}}>Sync History</span><span style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:600,color:C.gn}}><span style={{width:6,height:6,borderRadius:3,background:C.gn,animation:"pulse 2s infinite"}}/> Live</span><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style></div>
<table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{borderBottom:`1px solid ${C.bd}`}}>{["Status","Time","Source","Records","Duration","Notes"].map(h=><th key={h} style={{padding:"6px 12px",textAlign:"left",fontSize:8,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:C.dm}}>{h}</th>)}</tr></thead><tbody>{SYNC_H.map((s,i)=>{const c=s.s==="success"?C.gn:s.s==="warning"?C.am:C.rd;return(<tr key={i} style={{borderBottom:`1px solid ${C.bd}06`}}><td style={{padding:"7px 12px"}}><span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:3,background:c}}/><span style={{fontSize:9,fontWeight:600,color:c,textTransform:"capitalize"}}>{s.s}</span></span></td><td style={{padding:"7px 12px",fontSize:10,color:C.tx}}>{s.t}</td><td style={{padding:"7px 12px"}}><span style={{fontSize:8,fontWeight:600,padding:"1px 6px",borderRadius:3,textTransform:"capitalize",color:s.tp==="webhook"?C.pp:C.ac,background:(s.tp==="webhook"?C.pp:C.ac)+"15"}}>{s.tp}</span></td><td style={{padding:"7px 12px",fontSize:10,fontWeight:600,color:C.tx}}>{s.r||"—"}</td><td style={{padding:"7px 12px",fontSize:10,color:C.sb}}>{s.d}</td><td style={{padding:"7px 12px",fontSize:9,color:s.s==="error"?C.rd:s.s==="warning"?C.am:C.dm,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.n||"—"}</td></tr>)})}</tbody></table></div></div>)}

// ── QR CODE GENERATOR ───────────────────────────────────────
function generateQRMatrix(text, size = 25) {
  // Create matrix with finder patterns and data
  const m = Array.from({ length: size }, () => Array(size).fill(0));
  
  // Finder pattern (7x7 squares in 3 corners)
  const drawFinder = (r, c) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4))
        m[r + i][c + j] = 1;
    }
    // Separator
    for (let i = -1; i <= 7; i++) {
      if (r + i >= 0 && r + i < size && c - 1 >= 0) m[r + i][c - 1] = 0;
      if (r + i >= 0 && r + i < size && c + 7 < size) m[r + i][c + 7] = 0;
      if (c + i >= 0 && c + i < size && r - 1 >= 0) m[r - 1][c + i] = 0;
      if (c + i >= 0 && c + i < size && r + 7 < size) m[r + 7][c + i] = 0;
    }
  };
  
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);
  
  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    m[i][6] = i % 2 === 0 ? 1 : 0;
  }
  
  // Alignment pattern (for version 2+)
  const ap = size - 9;
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) === 2 || Math.abs(j) === 2 || (i === 0 && j === 0))
      m[ap + i][ap + j] = 1;
  }
  
  // Dark module
  m[size - 8][8] = 1;
  
  // Fill data area with seeded pattern from text
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = ((seed << 5) - seed + text.charCodeAt(i)) | 0;
  
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip reserved areas
      if (r < 9 && c < 9) continue;
      if (r < 9 && c >= size - 8) continue;
      if (r >= size - 8 && c < 9) continue;
      if (r === 6 || c === 6) continue;
      if (r >= ap - 2 && r <= ap + 2 && c >= ap - 2 && c <= ap + 2) continue;
      
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      m[r][c] = seed % 3 === 0 ? 1 : 0;
    }
  }
  
  return m;
}

function QRCode({ text, size = 200, color = "#E8ECF4", bg = "transparent" }) {
  const matrix = generateQRMatrix(text);
  const cellSize = size / matrix.length;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${matrix.length} ${matrix.length}`} style={{ borderRadius: 4 }}>
      <rect width={matrix.length} height={matrix.length} fill={bg} rx="0.5" />
      {matrix.map((row, r) => row.map((cell, c) => cell ? (
        <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} rx="0.15" />
      ) : null))}
    </svg>
  );
}

// ── MOBILE CONNECT PAGE ─────────────────────────────────────
function MobileConnect() {
  const [copied, setCopied] = useState(null);
  const [pairCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [devices] = useState([
    { name: "Omar's iPhone", status: "connected", last: "Active now", os: "iOS 19" },
    { name: "iPad Pro", status: "connected", last: "2 min ago", os: "iPadOS 19" },
  ]);
  const [codeExpiry, setCodeExpiry] = useState(300);
  const dashUrl = "https://app.deliveriq.io/org/keyloop-mea";
  const mobileUrl = `https://m.deliveriq.io/connect?org=keyloop-mea&token=diq_mob_${Math.random().toString(36).slice(2, 10)}`;

  useEffect(() => {
    const t = setInterval(() => setCodeExpiry(p => p <= 0 ? 300 : p - 1), 1000);
    return () => clearInterval(t);
  }, []);

  const copy = (text, id) => {
    navigator.clipboard?.writeText?.(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left: QR Code */}
        <div style={{ background: C.sf, borderRadius: 16, padding: 28, border: `1px solid ${C.bd}`, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.tx, marginBottom: 4 }}>Scan to Connect</div>
          <div style={{ fontSize: 11, color: C.sb, marginBottom: 24, lineHeight: 1.5 }}>
            Open DeliverIQ Mobile on your phone and scan this QR code to connect instantly.
          </div>

          {/* QR Code */}
          <div style={{ display: "inline-flex", padding: 16, background: "#ffffff", borderRadius: 16, marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <QRCode text={mobileUrl} size={180} color="#0F1729" bg="#ffffff" />
          </div>

          {/* URL */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: C.dm, marginBottom: 6 }}>Or enter this URL manually</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ flex: 1, padding: "10px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.bd}`, fontSize: 10, fontFamily: "monospace", color: C.ac, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {mobileUrl}
              </div>
              <button onClick={() => copy(mobileUrl, "url")} style={{
                padding: "10px 14px", borderRadius: 8, border: `1px solid ${copied === "url" ? C.gn + "40" : C.bd}`,
                background: copied === "url" ? `${C.gn}10` : "transparent",
                color: copied === "url" ? C.gn : C.ac, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
              }}>
                {copied === "url" ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Pair Code */}
          <div style={{ padding: 16, background: C.bg, borderRadius: 12, border: `1px solid ${C.bd}` }}>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: C.dm, marginBottom: 8 }}>Or use pairing code</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
              {pairCode.split("").map((d, i) => (
                <div key={i} style={{
                  width: 44, height: 56, borderRadius: 10, background: C.sf, border: `2px solid ${C.bh}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, fontWeight: 800, color: C.ac, fontVariantNumeric: "tabular-nums"
                }}>{d}</div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.dm }}>
              Expires in <span style={{ color: codeExpiry < 60 ? C.am : C.sb, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                {Math.floor(codeExpiry / 60)}:{(codeExpiry % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Instructions + Connected Devices */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* How to Connect */}
          <div style={{ background: C.sf, borderRadius: 16, padding: 22, border: `1px solid ${C.bd}` }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.tx, marginBottom: 16 }}>How to Connect</div>
            {[
              { step: "1", title: "Download the app", desc: "Visit m.deliveriq.io on your phone or search 'DeliverIQ' in your app store" },
              { step: "2", title: "Scan or enter code", desc: "Tap 'Connect' in the app and scan the QR code, or enter the 4-digit pairing code" },
              { step: "3", title: "Install as PWA", desc: "Tap your browser menu → 'Add to Home Screen' for the native app experience" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < 2 ? 16 : 0, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, background: G, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0
                }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: C.sb, lineHeight: 1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Connected Devices */}
          <div style={{ background: C.sf, borderRadius: 16, padding: 22, border: `1px solid ${C.bd}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.tx }}>Connected Devices</div>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.gn, background: `${C.gn}15`, padding: "3px 10px", borderRadius: 6 }}>{devices.length} active</span>
            </div>
            {devices.map((d, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 14px",
                background: C.bg, borderRadius: 10, border: `1px solid ${C.bd}`, marginBottom: i < devices.length - 1 ? 8 : 0
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.ac}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {d.os.includes("iPad") ? "📱" : "📱"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: C.sb }}>{d.os} · {d.last}</div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color: C.gn }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: C.gn, animation: "pulse 2s infinite" }} />
                  {d.status === "connected" ? "Active" : "Idle"}
                </span>
                <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
              </div>
            ))}
            <button style={{
              width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 8, border: `1px solid ${C.bd}`,
              background: "transparent", color: C.sb, fontSize: 11, fontWeight: 600, cursor: "pointer"
            }}>Revoke All Sessions</button>
          </div>

          {/* PWA Features */}
          <div style={{ background: `linear-gradient(135deg, ${C.sf}, #131535)`, borderRadius: 16, padding: 22, border: `1px solid ${C.pp}25` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.pp, marginBottom: 12 }}>📱 Mobile App Features</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { icon: "⚡", label: "Real-time sync" },
                { icon: "🔔", label: "Push notifications" },
                { icon: "📴", label: "Offline access" },
                { icon: "🔒", label: "Biometric lock" },
                { icon: "📊", label: "Portfolio overview" },
                { icon: "🏆", label: "Team leaderboard" },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <span style={{ fontSize: 14 }}>{f.icon}</span>
                  <span style={{ fontSize: 11, color: C.tx }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


const DEFAULT_THEME = {
  name: "DeliverIQ",
  tagline: "Delivery Intelligence",
  logo: null,
  colors: {
    bg: "#080E1A",
    surface: "#0F1729",
    border: "#1E2A45",
    text: "#E8ECF4",
    muted: "#7B8BA8",
    dim: "#4A5A78",
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  borderRadius: 12,
  domain: "app.deliveriq.io",
  features: { gamification: true, challenges: true, icPerformance: true, aiMapper: true, apiConnector: true, mobileApp: true },
};

const PRESETS = [
  { name: "DeliverIQ Default", colors: { primary: "#3B82F6", secondary: "#8B5CF6", bg: "#080E1A", surface: "#0F1729", border: "#1E2A45", text: "#E8ECF4", muted: "#7B8BA8", dim: "#4A5A78", success: "#10B981", warning: "#F59E0B", danger: "#EF4444" } },
  { name: "Corporate Blue", colors: { primary: "#1E40AF", secondary: "#3B82F6", bg: "#0A0F1F", surface: "#111827", border: "#1F2937", text: "#F9FAFB", muted: "#9CA3AF", dim: "#6B7280", success: "#059669", warning: "#D97706", danger: "#DC2626" } },
  { name: "Emerald Pro", colors: { primary: "#059669", secondary: "#10B981", bg: "#021A0F", surface: "#032117", border: "#064E3B", text: "#ECFDF5", muted: "#6EE7B7", dim: "#34D399", success: "#10B981", warning: "#FBBF24", danger: "#EF4444" } },
  { name: "Sunset Gold", colors: { primary: "#D97706", secondary: "#F59E0B", bg: "#1A0F02", surface: "#27180A", border: "#4E3B06", text: "#FEF3C7", muted: "#FCD34D", dim: "#92400E", success: "#10B981", warning: "#F59E0B", danger: "#EF4444" } },
  { name: "Royal Purple", colors: { primary: "#7C3AED", secondary: "#A78BFA", bg: "#0D0520", surface: "#1E1040", border: "#2E1A5E", text: "#EDE9FE", muted: "#A78BFA", dim: "#6D28D9", success: "#10B981", warning: "#F59E0B", danger: "#EF4444" } },
  { name: "Slate Minimal", colors: { primary: "#475569", secondary: "#64748B", bg: "#0F172A", surface: "#1E293B", border: "#334155", text: "#F1F5F9", muted: "#94A3B8", dim: "#64748B", success: "#10B981", warning: "#F59E0B", danger: "#EF4444" } },
  { name: "Light Mode", colors: { primary: "#2563EB", secondary: "#7C3AED", bg: "#F8FAFC", surface: "#FFFFFF", border: "#E2E8F0", text: "#0F172A", muted: "#64748B", dim: "#94A3B8", success: "#059669", warning: "#D97706", danger: "#DC2626" } },
];

// ── Demo Project Data ───────────────────────────────────────
const DEMO_PROJECTS = [
  { name: "ERP Migration", health: 38, status: "at-risk", val: "$2.4M", billed: 40, trend: [-2,-5,-3,-8,-4] },
  { name: "Cloud Platform", health: 82, status: "on-track", val: "$1.9M", billed: 80, trend: [3,2,5,4,1] },
  { name: "Analytics Suite", health: 91, status: "on-track", val: "$3.1M", billed: 90, trend: [1,3,2,2,4] },
  { name: "Retail Integration", health: 22, status: "critical", val: "$1.2M", billed: 20, trend: [-4,-8,-6,-12,-10] },
];

// ── Mini Components with Theme ──────────────────────────────
function WLRing({ v, s = 40, w = 3, theme }) {
  const [a, sA] = useState(0);
  const r = (s - w) / 2, ci = 2 * Math.PI * r;
  const color = v >= 70 ? theme.success : v >= 40 ? theme.warning : theme.danger;
  useEffect(() => { const t = setTimeout(() => sA(v), 150); return () => clearTimeout(t); }, [v]);
  return (
    <div style={{ position: "relative", width: s, height: s }}>
      <svg width={s} height={s} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={theme.border} strokeWidth={w} />
        <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={color} strokeWidth={w}
          strokeDasharray={ci} strokeDashoffset={ci - ci * a / 100} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: s * .26, fontWeight: 800, color }}>{v}</div>
    </div>
  );
}

function WLSpark({ data, color, w = 48, h = 16 }) {
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-mn)/rng)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={w} cy={h-((data[data.length-1]-mn)/rng)*h} r="2" fill={color} />
    </svg>
  );
}

// ── Live Preview Dashboard ──────────────────────────────────
function LivePreview({ theme, orgName, tagline, logoUrl, radius }) {
  const t = theme;
  const grad = `linear-gradient(135deg, ${t.primary}, ${t.secondary})`;

  return (
    <div style={{ background: t.bg, borderRadius: radius + 4, overflow: "hidden", border: `1px solid ${t.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.4)" }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 44, borderBottom: `1px solid ${t.border}`, background: t.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {logoUrl ? (
            <img src={logoUrl} alt="" style={{ height: 24, width: 24, borderRadius: 6, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 24, height: 24, borderRadius: 6, background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>
              {orgName.charAt(0)}
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: t.text, lineHeight: 1 }}>{orgName}</div>
            <div style={{ fontSize: 6, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: t.primary, marginTop: 1 }}>{tagline}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, background: t.bg, borderRadius: 6, padding: 2 }}>
          {["Portfolio", "Revenue", "Team"].map((n, i) => (
            <div key={n} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 9, fontWeight: 600, background: i === 0 ? t.border : "transparent", color: i === 0 ? t.text : t.dim }}>{n}</div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 12 }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
          {[
            { l: "Portfolio", v: "$16.4M", c: t.text },
            { l: "At Risk", v: "$4.2M", c: t.danger },
            { l: "Health", v: "61%", c: t.warning },
            { l: "Overdue", v: "9", c: t.danger },
          ].map((k, i) => (
            <div key={i} style={{ background: t.surface, borderRadius: radius - 2, padding: "8px 10px", border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: t.dim }}>{k.l}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: k.c, marginTop: 3 }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Project Cards */}
        {DEMO_PROJECTS.map((p, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 3,
            background: i === 0 ? `${t.surface}` : "transparent", borderRadius: radius - 4,
            border: p.status === "critical" ? `1px solid ${t.danger}30` : `1px solid transparent`
          }}>
            <WLRing v={p.health} s={28} w={2.5} theme={t} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: t.text }}>{p.name}</div>
              <div style={{ fontSize: 7, color: t.dim }}>{p.val} · {p.billed}% billed</div>
            </div>
            <WLSpark data={p.trend} color={p.trend[4] >= 0 ? t.success : t.danger} w={32} h={12} />
          </div>
        ))}

        {/* Mini Leaderboard */}
        <div style={{ marginTop: 8, padding: "8px 10px", background: t.surface, borderRadius: radius - 2, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: t.text, marginBottom: 6 }}>🏆 Top PMs</div>
          {[{ n: "Priya S.", xp: 4200, r: "🥇" }, { n: "James O.", xp: 2800, r: "🥈" }].map((pm, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
              <span style={{ fontSize: 10 }}>{pm.r}</span>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, fontWeight: 800, color: "#fff" }}>{pm.n.split(" ").map(x => x[0]).join("")}</div>
              <span style={{ fontSize: 8, fontWeight: 600, color: t.text, flex: 1 }}>{pm.n}</span>
              <div style={{ width: 40, height: 3, background: t.border, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${(pm.xp / 5000) * 100}%`, background: grad, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Color Utilities ──────────────────────────────────────────
function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToHex(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = n => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ── Full Spectrum Color Picker ──────────────────────────────
function ColorPicker({ value, onChange, onClose }) {
  const hsv = hexToHsv(value);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);
  const [hexInput, setHexInput] = useState(value);
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const dragging = useRef(null);

  const currentHex = hsvToHex(hue, sat, val);
  const rgb = hexToRgb(currentHex);

  useEffect(() => {
    onChange(currentHex);
    setHexInput(currentHex);
  }, [hue, sat, val]);

  // Draw saturation/value gradient
  const svCanvasRef = useRef(null);
  useEffect(() => {
    const canvas = svCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    // Horizontal: white to hue color
    const hueColor = hsvToHex(hue, 1, 1);
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, "#ffffff");
    gradH.addColorStop(1, hueColor);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);
    // Vertical: transparent to black
    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "#000000");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  // Draw hue wheel/spectrum
  const hueCanvasRef = useRef(null);
  useEffect(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width, h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 6; i++) {
      const colors = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"];
      grad.addColorStop(i / 6, colors[i]);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  const handleSVMouse = (e, rect) => {
    if (!rect) rect = svCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setSat(x);
    setVal(1 - y);
  };

  const handleHueMouse = (e, rect) => {
    if (!rect) rect = hueCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHue(x * 360);
  };

  useEffect(() => {
    const onMove = (e) => {
      if (dragging.current === "sv") handleSVMouse(e);
      else if (dragging.current === "hue") handleHueMouse(e);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const handleHexChange = (v) => {
    setHexInput(v);
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
      const h = hexToHsv(v);
      setHue(h.h);
      setSat(h.s);
      setVal(h.v);
    }
  };

  return (
    <div style={{
      position: "absolute", top: "100%", left: 0, zIndex: 100, marginTop: 6,
      background: "#0F1729", border: "1px solid #2A3A5C", borderRadius: 14, padding: 16, width: 260,
      boxShadow: "0 16px 48px rgba(0,0,0,0.6)"
    }}>
      {/* SV Square */}
      <div style={{ position: "relative", marginBottom: 12, borderRadius: 8, overflow: "hidden", cursor: "crosshair" }}>
        <canvas ref={svCanvasRef} width={228} height={150} style={{ width: "100%", height: 150, display: "block", borderRadius: 8 }}
          onMouseDown={(e) => { dragging.current = "sv"; handleSVMouse(e); }} />
        {/* SV Indicator */}
        <div style={{
          position: "absolute", left: `${sat * 100}%`, top: `${(1 - val) * 100}%`,
          width: 16, height: 16, borderRadius: "50%", border: "2px solid #fff",
          transform: "translate(-50%,-50%)", boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          pointerEvents: "none"
        }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: currentHex }} />
        </div>
      </div>

      {/* Hue Spectrum Bar */}
      <div style={{ position: "relative", marginBottom: 14, borderRadius: 6, overflow: "hidden", cursor: "crosshair" }}>
        <canvas ref={hueCanvasRef} width={228} height={16} style={{ width: "100%", height: 16, display: "block", borderRadius: 6 }}
          onMouseDown={(e) => { dragging.current = "hue"; handleHueMouse(e); }} />
        {/* Hue Indicator */}
        <div style={{
          position: "absolute", left: `${(hue / 360) * 100}%`, top: "50%",
          width: 12, height: 20, borderRadius: 4, border: "2px solid #fff",
          transform: "translate(-50%,-50%)", boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
          background: hsvToHex(hue, 1, 1), pointerEvents: "none"
        }} />
      </div>

      {/* Hex + RGB Inputs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#4A5878", marginBottom: 3 }}>HEX</div>
          <input value={hexInput} onChange={e => handleHexChange(e.target.value)} maxLength={7}
            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #2A3A5C", background: "#080E1A", color: "#E8ECF4", fontSize: 12, fontWeight: 600, fontFamily: "monospace", textAlign: "center" }} />
        </div>
        <div>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#4A5878", marginBottom: 3 }}>R</div>
          <input value={rgb.r} readOnly style={{ width: 40, padding: "6px 4px", borderRadius: 6, border: "1px solid #1E2A45", background: "#080E1A", color: "#7B8BA8", fontSize: 10, fontFamily: "monospace", textAlign: "center" }} />
        </div>
        <div>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#4A5878", marginBottom: 3 }}>G</div>
          <input value={rgb.g} readOnly style={{ width: 40, padding: "6px 4px", borderRadius: 6, border: "1px solid #1E2A45", background: "#080E1A", color: "#7B8BA8", fontSize: 10, fontFamily: "monospace", textAlign: "center" }} />
        </div>
        <div>
          <div style={{ fontSize: 8, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", color: "#4A5878", marginBottom: 3 }}>B</div>
          <input value={rgb.b} readOnly style={{ width: 40, padding: "6px 4px", borderRadius: 6, border: "1px solid #1E2A45", background: "#080E1A", color: "#7B8BA8", fontSize: 10, fontFamily: "monospace", textAlign: "center" }} />
        </div>
      </div>

      {/* Color preview bar */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <div style={{ flex: 1, height: 28, borderRadius: 6, background: currentHex, border: "1px solid rgba(255,255,255,0.1)" }} />
        <button onClick={onClose} style={{
          padding: "6px 16px", borderRadius: 6, border: "none", background: "#3B82F6", color: "#fff",
          fontSize: 11, fontWeight: 700, cursor: "pointer"
        }}>Done</button>
      </div>
    </div>
  );
}

// ── Color Input with Picker ─────────────────────────────────
function ColorInput({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setOpen(!open)}>
        {/* Color Swatch */}
        <div style={{
          width: 36, height: 36, borderRadius: 8, background: value, border: "2px solid #2A3A5C",
          cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
          boxShadow: open ? `0 0 0 2px #3B82F6` : "none"
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#E8ECF4" }}>{label}</div>
          <input
            value={value}
            onChange={e => {
              if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) onChange(e.target.value);
              }
            }}
            onClick={e => e.stopPropagation()}
            maxLength={7}
            style={{
              fontSize: 10, fontFamily: "monospace", color: "#7B8BA8", fontWeight: 500,
              background: "transparent", border: "none", padding: 0, width: 70, marginTop: 1,
              cursor: "text"
            }}
          />
        </div>
        <span style={{ fontSize: 10, color: open ? "#3B82F6" : "#4A5878", transition: "all 0.2s" }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {/* Picker Popup */}
      {open && (
        <ColorPicker value={value} onChange={onChange} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

// ── Main Customizer ─────────────────────────────────────────
function WhiteLabelStudio({ onBack, onApply, initial }) {
  const init = initial || {};
  const [theme, setTheme] = useState(init.colors ? { ...init.colors } : { ...DEFAULT_THEME.colors });
  const [orgName, setOrgName] = useState(init.orgName || "DeliverIQ");
  const [tagline, setTagline] = useState(init.tagline || "Delivery Intelligence");
  const [domain, setDomain] = useState(init.domain || "app.deliveriq.io");
  const [radius, setRadius] = useState(init.radius ?? 12);
  const [logoUrl, setLogoUrl] = useState(init.logoUrl || null);
  const [activeSection, setActiveSection] = useState("brand");
  const [features, setFeatures] = useState({ ...DEFAULT_THEME.features });
  const [saved, setSaved] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const fileRef = useRef(null);

  const updateColor = (key, val) => setTheme(prev => ({ ...prev, [key]: val }));
  const toggleFeature = (key) => setFeatures(prev => ({ ...prev, [key]: !prev[key] }));

  const applyPreset = (preset, idx) => {
    setTheme({ ...preset.colors });
    setActivePreset(idx);
  };

  const handleSave = () => {
    setSaved(true);
    if (onApply) onApply({ colors: theme, orgName, tagline, logoUrl, radius, domain, features });
    setTimeout(() => { setSaved(false); if (onBack) onBack(); }, 900);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoUrl(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const sections = [
    { id: "brand", label: "Brand", icon: "🎨" },
    { id: "colors", label: "Colors", icon: "🎯" },
    { id: "layout", label: "Layout", icon: "📐" },
    { id: "features", label: "Features", icon: "⚙️" },
    { id: "domain", label: "Domain", icon: "🌐" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080E1A", color: "#E8ECF4", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1E2A45;border-radius:3px}button,select,input{font-family:inherit;outline:none}input:focus{border-color:#3B82F6 !important}input[type="color"]{-webkit-appearance:none;appearance:none}input[type="color"]::-webkit-color-swatch-wrapper{padding:0}input[type="color"]::-webkit-color-swatch{border:2px solid #2A3A5C;border-radius:6px}`}</style>

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,14,26,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid #1E2A45", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, color: "#fff" }}>D</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#E8ECF4", letterSpacing: -0.3, lineHeight: 1 }}>DeliverIQ</div>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#3B82F6", marginTop: 1 }}>Customize</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setTheme({ ...DEFAULT_THEME.colors }); setOrgName("DeliverIQ"); setTagline("Delivery Intelligence"); setLogoUrl(null); setRadius(12); setActivePreset(0); }} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #1E2A45", background: "transparent", color: "#7B8BA8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            Reset
          </button>
          <button onClick={onBack} style={{ padding: "7px 16px", borderRadius: 8, border: "1px solid #1E2A45", background: "transparent", color: "#7B8BA8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>← Dashboard</button>
          <button onClick={handleSave} style={{
            padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer",
            background: saved ? "#10B981" : "linear-gradient(135deg,#3B82F6,#8B5CF6)", color: "#fff",
            boxShadow: saved ? "0 4px 12px rgba(16,185,129,0.3)" : "0 4px 12px rgba(59,130,246,0.3)"
          }}>
            {saved ? "✓ Applied to Dashboard" : "Save & Publish"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {/* Left Panel: Controls */}
        <div style={{ width: 360, borderRight: "1px solid #1E2A45", overflowY: "auto", flexShrink: 0 }}>
          {/* Section Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1E2A45" }}>
            {sections.map(s => (
              <button key={s.id} onClick={() => setActiveSection(s.id)} style={{
                flex: 1, padding: "12px 0", border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
                background: "transparent", color: activeSection === s.id ? "#3B82F6" : "#4A5878",
                borderBottom: `2px solid ${activeSection === s.id ? "#3B82F6" : "transparent"}`
              }}>{s.icon} {s.label}</button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {/* Brand Section */}
            {activeSection === "brand" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8ECF4", marginBottom: 16 }}>Brand Identity</div>

                {/* Logo Upload */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#4A5878", marginBottom: 8 }}>Logo</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div onClick={() => fileRef.current?.click()} style={{
                      width: 64, height: 64, borderRadius: 14, border: "2px dashed #2A3A5C", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                      background: logoUrl ? "transparent" : "#0F1729"
                    }}>
                      {logoUrl ? (
                        <img src={logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 24 }}>+</span>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#E8ECF4" }}>{logoUrl ? "Logo uploaded" : "Upload logo"}</div>
                      <div style={{ fontSize: 9, color: "#7B8BA8", marginTop: 2 }}>PNG, SVG, or JPG · 512×512px</div>
                      {logoUrl && <button onClick={() => setLogoUrl(null)} style={{ fontSize: 9, color: "#EF4444", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>Remove</button>}
                    </div>
                  </div>
                </div>

                {/* Org Name */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#4A5878", marginBottom: 6 }}>Organization Name</div>
                  <input value={orgName} onChange={e => setOrgName(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #2A3A5C", background: "#0F1729", color: "#E8ECF4", fontSize: 14, fontWeight: 600 }} />
                </div>

                {/* Tagline */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#4A5878", marginBottom: 6 }}>Tagline</div>
                  <input value={tagline} onChange={e => setTagline(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #2A3A5C", background: "#0F1729", color: "#E8ECF4", fontSize: 13 }} />
                </div>
              </div>
            )}

            {/* Colors Section */}
            {activeSection === "colors" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8ECF4", marginBottom: 6 }}>Color Theme</div>
                <div style={{ fontSize: 11, color: "#7B8BA8", marginBottom: 16 }}>Pick a preset or customize individual colors</div>

                {/* Presets */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6, marginBottom: 20 }}>
                  {PRESETS.map((p, i) => (
                    <button key={i} onClick={() => applyPreset(p, i)} style={{
                      padding: "10px 12px", borderRadius: 10, textAlign: "left", cursor: "pointer",
                      border: `1.5px solid ${activePreset === i ? "#3B82F6" : "#1E2A45"}`,
                      background: activePreset === i ? "rgba(59,130,246,0.08)" : "#0F1729"
                    }}>
                      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                        {[p.colors.primary, p.colors.secondary, p.colors.success, p.colors.bg].map((c, j) => (
                          <div key={j} style={{ width: 14, height: 14, borderRadius: 4, background: c, border: "1px solid rgba(255,255,255,0.1)" }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: activePreset === i ? "#3B82F6" : "#E8ECF4" }}>{p.name}</div>
                    </button>
                  ))}
                </div>

                {/* Individual Colors */}
                <div style={{ fontSize: 11, fontWeight: 600, color: "#7B8BA8", marginBottom: 10 }}>Customize</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <ColorInput label="Primary" value={theme.primary} onChange={v => updateColor("primary", v)} />
                  <ColorInput label="Secondary" value={theme.secondary} onChange={v => updateColor("secondary", v)} />
                  <ColorInput label="Background" value={theme.bg} onChange={v => updateColor("bg", v)} />
                  <ColorInput label="Surface" value={theme.surface} onChange={v => updateColor("surface", v)} />
                  <ColorInput label="Border" value={theme.border} onChange={v => updateColor("border", v)} />
                  <ColorInput label="Text" value={theme.text} onChange={v => updateColor("text", v)} />
                  <ColorInput label="Muted Text" value={theme.muted} onChange={v => updateColor("muted", v)} />
                  <ColorInput label="Success" value={theme.success} onChange={v => updateColor("success", v)} />
                  <ColorInput label="Warning" value={theme.warning} onChange={v => updateColor("warning", v)} />
                  <ColorInput label="Danger" value={theme.danger} onChange={v => updateColor("danger", v)} />
                </div>
              </div>
            )}

            {/* Layout Section */}
            {activeSection === "layout" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8ECF4", marginBottom: 16 }}>Layout & Style</div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#4A5878", marginBottom: 8 }}>Border Radius</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <input type="range" min={0} max={24} value={radius} onChange={e => setRadius(Number(e.target.value))}
                      style={{ flex: 1, accentColor: "#3B82F6" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#E8ECF4", minWidth: 32, textAlign: "right" }}>{radius}px</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    {[0, 4, 8, 12, 16, 24].map(v => (
                      <button key={v} onClick={() => setRadius(v)} style={{
                        width: 36, height: 36, borderRadius: v, border: `1.5px solid ${radius === v ? "#3B82F6" : "#1E2A45"}`,
                        background: radius === v ? "rgba(59,130,246,0.1)" : "#0F1729",
                        color: radius === v ? "#3B82F6" : "#4A5878", fontSize: 9, fontWeight: 700, cursor: "pointer"
                      }}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* Preview shapes */}
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#4A5878", marginBottom: 8 }}>Preview</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ width: 60, height: 40, borderRadius: radius, background: theme.primary, opacity: 0.8 }} />
                  <div style={{ width: 60, height: 40, borderRadius: radius, background: theme.surface, border: `1px solid ${theme.border}` }} />
                  <div style={{ flex: 1, height: 40, borderRadius: radius, background: theme.surface, border: `1px solid ${theme.border}` }} />
                </div>
              </div>
            )}

            {/* Features Section */}
            {activeSection === "features" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8ECF4", marginBottom: 6 }}>Feature Visibility</div>
                <div style={{ fontSize: 11, color: "#7B8BA8", marginBottom: 16 }}>Choose which features to show in the white-label version</div>

                {[
                  { key: "gamification", label: "Gamification", desc: "XP, levels, badges, streaks", icon: "🏆" },
                  { key: "challenges", label: "Weekly Challenges", desc: "Configurable team challenges", icon: "🎯" },
                  { key: "icPerformance", label: "IC Performance", desc: "Consultant leaderboard", icon: "👥" },
                  { key: "aiMapper", label: "AI Data Mapper", desc: "Auto column mapping", icon: "🤖" },
                  { key: "apiConnector", label: "API Connector", desc: "Pull/Push/REST data sync", icon: "🔌" },
                  { key: "mobileApp", label: "Mobile App", desc: "PWA companion", icon: "📱" },
                ].map(f => (
                  <div key={f.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#0F1729", borderRadius: 10, border: "1px solid #1E2A45", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{f.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#E8ECF4" }}>{f.label}</div>
                        <div style={{ fontSize: 9, color: "#7B8BA8" }}>{f.desc}</div>
                      </div>
                    </div>
                    <div onClick={() => toggleFeature(f.key)} style={{ width: 42, height: 24, borderRadius: 12, background: features[f.key] ? "#10B981" : "#1E2A45", padding: 2, cursor: "pointer", transition: "all 0.2s" }}>
                      <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", marginLeft: features[f.key] ? 18 : 0, transition: "all 0.2s" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Domain Section */}
            {activeSection === "domain" && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#E8ECF4", marginBottom: 16 }}>Custom Domain</div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase", color: "#4A5878", marginBottom: 6 }}>Dashboard URL</div>
                  <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="delivery.yourcompany.com"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #2A3A5C", background: "#0F1729", color: "#E8ECF4", fontSize: 13, fontFamily: "monospace" }} />
                  <div style={{ fontSize: 9, color: "#7B8BA8", marginTop: 4 }}>Point a CNAME record to proxy.deliveriq.io</div>
                </div>

                <div style={{ padding: 16, background: "#0F1729", borderRadius: 10, border: "1px solid #1E2A45", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#E8ECF4", marginBottom: 8 }}>DNS Configuration</div>
                  <div style={{ fontSize: 10, color: "#7B8BA8", fontFamily: "monospace", lineHeight: 1.8 }}>
                    <div>Type: <span style={{ color: "#3B82F6" }}>CNAME</span></div>
                    <div>Name: <span style={{ color: "#E8ECF4" }}>{domain.split(".")[0] || "delivery"}</span></div>
                    <div>Value: <span style={{ color: "#10B981" }}>proxy.deliveriq.io</span></div>
                  </div>
                </div>

                <div style={{ padding: 14, background: "rgba(16,185,129,0.06)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#10B981", marginBottom: 4 }}>🔒 SSL Certificate</div>
                  <div style={{ fontSize: 10, color: "#7B8BA8" }}>Auto-provisioned via Let's Encrypt once DNS is verified.</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div style={{ flex: 1, padding: 32, overflowY: "auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060B16" }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "#4A5878", marginBottom: 16 }}>Live Preview — changes apply instantly</div>
          <div style={{ width: "100%", maxWidth: 520 }}>
            <LivePreview theme={theme} orgName={orgName} tagline={tagline} logoUrl={logoUrl} radius={radius} />
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 16, fontSize: 10, color: "#4A5878" }}>
            <span>🖥️ Desktop</span>
            <span>📱 Mobile</span>
            <span>📧 Emails</span>
            <span>📄 Reports</span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ── UPLOAD PAGE (real CSV with encryption detection) ────────
function UploadPage({ onData, onDemo }) {
  const [parsing, setP] = useState(false);
  const [result, setR] = useState(null);
  const [err, setE] = useState(null);
  const [prog, setProg] = useState(null); // { pct, msg }
  const [hoverCol, setHoverCol] = useState(null); // sync highlight image↔grid
  const ref = useRef(null);
  const FIELDS = ["project_ref", "project_name", "client", "milestone_name", "milestone_no", "milestone_value", "milestone_status", "expected_date", "actual_date", "pm", "region", "health", "overdue", "csat", "consultant"];

  const handle = async (f) => {
    if (!f) return;
    setP(true); setE(null); setR(null); setProg(null);
    try {
      const isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
      let r;
      if (isPdf) {
        setProg({ pct: 2, msg: "Loading PDF engine…" });
        const { parsePDF } = await import("./lib/pdfParser");
        r = await parsePDF(f, (pct, msg) => setProg({ pct, msg }));
      } else {
        r = await parseCSV(f);
      }
      setR(r);
    } catch (e) {
      setE(e.message || "Could not read this file.");
    }
    setP(false); setProg(null);
  };

  const confirm = () => {
    if (!result) return;
    const { projects, pms } = transformToProjects(result.rows, result.mapping);
    saveProjects(projects); savePMs(pms);
    onData();
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: G, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 8px 32px rgba(59,130,246,0.3)" }}>
          <svg width="34" height="34" viewBox="0 0 64 64"><defs><linearGradient id="ul" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.9"/><stop offset="1" stopColor="#fff"/></linearGradient></defs><path d="M32 5 L53 17 L53 47 L32 59 L11 47 L11 17 Z" fill="rgba(255,255,255,0.15)" stroke="#fff" strokeWidth="2.5"/><path d="M21 40 L28 31 L35 36 L45 23" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="45" cy="23" r="3" fill="#fff"/></svg>
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.tx }}>Deliver<span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IQ</span></div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: C.ac, marginTop: 4 }}>Delivery Intelligence</div>
      </div>

      {!result ? (
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div onClick={() => ref.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handle(e.dataTransfer.files[0]); }}
            style={{ border: `2px dashed ${C.bh}`, borderRadius: 20, padding: "44px 32px", textAlign: "center", cursor: "pointer", background: C.sf }}>
            <input ref={ref} type="file" accept=".csv,.tsv,.txt,.pdf" style={{ display: "none" }} onChange={e => handle(e.target.files[0])} />
            {parsing ? (
              <div><div style={{ fontSize: 40, marginBottom: 12, animation: "spin 1.5s linear infinite" }}>🔄</div><div style={{ fontSize: 16, fontWeight: 700, color: C.tx, marginBottom: prog ? 10 : 0 }}>{prog?.msg || "Reading your data…"}</div>{prog && (<div style={{ maxWidth: 280, margin: "0 auto" }}><div style={{ height: 5, background: C.bd, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${prog.pct}%`, background: G, borderRadius: 3, transition: "width .3s ease" }} /></div><div style={{ fontSize: 10, color: C.dm, marginTop: 5 }}>{prog.pct}%</div></div>)}</div>
            ) : (
              <div><div style={{ fontSize: 46, marginBottom: 14 }}>📄</div><div style={{ fontSize: 18, fontWeight: 700, color: C.tx, marginBottom: 6 }}>Drop your CSV or PDF here</div><div style={{ fontSize: 13, color: C.sb }}>or click to browse · CSV, TSV, PDF</div><div style={{ fontSize: 11, color: C.dm, marginTop: 6 }}>Scanned PDFs are read with OCR — first run downloads a language pack</div></div>
            )}
          </div>

          {err && (
            <div style={{ marginTop: 16, padding: 16, background: `${C.rd}10`, border: `1px solid ${C.rd}30`, borderRadius: 12, color: "#FCA5A5", fontSize: 13, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 700, color: C.rd, marginBottom: 4 }}>⚠ {err}</div>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div style={{ fontSize: 12, color: C.dm, marginBottom: 8 }}>or</div>
            <button onClick={onDemo} style={{ padding: "12px 28px", borderRadius: 12, border: `1.5px solid ${C.bh}`, background: "transparent", color: C.sb, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>🎮 Explore with Demo Data</button>
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: result.pageImage ? 1000 : 720 }}>
          <div style={{ background: C.sf, borderRadius: 16, padding: 24, border: `1px solid ${C.bd}` }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.tx, marginBottom: 4 }}>{result.pageImage ? "Review & Map Columns" : "Review Column Mapping"}</div>
            <div style={{ fontSize: 12, color: C.sb, marginBottom: 16 }}>{result.rowCount} rows · {result.headers.length} columns detected{result.method === "ocr" ? " via OCR (scanned PDF — please double-check the values)" : result.method === "text" ? " from PDF text" : ""}. {result.pageImage ? "Hover a column to see it on the page." : "Adjust any mapping below."}</div>

            {result.pageImage ? (
              <div>
                {/* Source document with detected column bands overlaid */}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.dm, marginBottom: 8 }}>Source Document · detected columns</div>
                <div style={{ maxHeight: 300, overflow: "auto", borderRadius: 10, border: `1px solid ${C.bd}`, background: "#fff", marginBottom: 20 }}>
                  <div style={{ position: "relative", width: "100%", lineHeight: 0 }}>
                    <img src={result.pageImage.dataUrl} alt="PDF page" style={{ width: "100%", display: "block" }} />
                    {result.columnBands.map((b, i) => b && (
                      <div key={i} onMouseEnter={() => setHoverCol(i)} onMouseLeave={() => setHoverCol(null)}
                        style={{ position: "absolute", top: 0, bottom: 0, left: `${b.x0 * 100}%`, width: `${(b.x1 - b.x0) * 100}%`, cursor: "pointer",
                          background: hoverCol === i ? `${C.ac}26` : "transparent",
                          borderLeft: `1.5px dashed ${hoverCol === i ? C.ac : C.ac + "55"}`,
                          borderRight: i === result.columnBands.length - 1 ? `1.5px dashed ${hoverCol === i ? C.ac : C.ac + "55"}` : "none",
                          transition: "background .12s" }}>
                        <div style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 800, color: "#fff", background: hoverCol === i ? C.ac : "rgba(59,130,246,.7)", borderRadius: 4, padding: "1px 6px", whiteSpace: "nowrap" }}>{i + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Extracted data as a spreadsheet-style grid */}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.dm, marginBottom: 8 }}>Extracted Data · map each column</div>
                <div style={{ overflowX: "auto", border: `1px solid ${C.bd}`, borderRadius: 10 }}>
                  <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%" }}>
                    <thead>
                      <tr>{result.headers.map((h, i) => { const m = result.mapping[h]; const cc = m.confidence >= 85 ? C.gn : m.confidence >= 60 ? C.am : C.rd; const mapped = m.field !== "unmapped"; return (
                        <th key={i} onMouseEnter={() => setHoverCol(i)} onMouseLeave={() => setHoverCol(null)}
                          style={{ padding: "10px 10px 12px", textAlign: "left", verticalAlign: "top", borderBottom: `2px solid ${C.bd}`, borderRight: `1px solid ${C.bd}`, background: hoverCol === i ? `${C.ac}1A` : C.cd, minWidth: 130 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: hoverCol === i ? C.ac : C.dm, borderRadius: 3, padding: "0px 5px" }}>{i + 1}</span>
                            <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600, color: C.sb, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{h}</span>
                          </div>
                          <select value={m.field} onChange={e => { const nm = { ...result.mapping }; nm[h] = { ...m, field: e.target.value, confidence: 100 }; setR({ ...result, mapping: nm }); }}
                            style={{ width: "100%", background: mapped ? `${C.ac}14` : C.bg, border: `1px solid ${mapped ? C.ac + "55" : C.bd}`, borderRadius: 6, padding: "5px 6px", color: mapped ? C.tx : C.sb, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                            <option value="unmapped">— Skip —</option>
                            {FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
                          </select>
                          <div style={{ marginTop: 5, fontSize: 8, fontWeight: 700, color: cc }}>{m.confidence >= 85 ? "● high" : m.confidence >= 60 ? "● medium" : "● low"} match</div>
                        </th>
                      ); })}</tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 8).map((row, ri) => (
                        <tr key={ri} style={{ background: ri % 2 ? "transparent" : `${C.bd}10` }}>
                          {result.headers.map((h, ci) => (
                            <td key={ci} onMouseEnter={() => setHoverCol(ci)} onMouseLeave={() => setHoverCol(null)}
                              style={{ padding: "7px 10px", borderRight: `1px solid ${C.bd}`, borderBottom: `1px solid ${C.bd}08`, fontSize: 10, color: C.tx, whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", background: hoverCol === ci ? `${C.ac}12` : "transparent" }}>
                              {String(row[h] ?? "").trim() || <span style={{ color: C.dm }}>—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {result.rowCount > 8 && <div style={{ fontSize: 10, color: C.dm, marginTop: 8, textAlign: "center" }}>+ {result.rowCount - 8} more rows</div>}
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: "auto", border: `1px solid ${C.bd}`, borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: `1px solid ${C.bd}`, position: "sticky", top: 0, background: C.cd }}>{["Column", "→", "Maps To", "Sample", "Conf"].map((h, i) => <th key={i} style={{ padding: "8px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: C.dm }}>{h}</th>)}</tr></thead>
                  <tbody>{result.headers.map((h, i) => { const m = result.mapping[h]; return (<tr key={i} style={{ borderBottom: `1px solid ${C.bd}06` }}><td style={{ padding: "8px 12px" }}><span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 600, color: C.tx, background: C.bg, padding: "2px 6px", borderRadius: 4 }}>{h}</span></td><td style={{ padding: "8px 12px", color: C.dm }}>→</td><td style={{ padding: "8px 12px" }}><select value={m.field} onChange={e => { const nm = { ...result.mapping }; nm[h] = { ...m, field: e.target.value, confidence: 100 }; setR({ ...result, mapping: nm }); }} style={{ background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 6, padding: "4px 8px", color: C.tx, fontSize: 10, fontWeight: 600 }}><option value="unmapped">— Skip —</option>{FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}</select></td><td style={{ padding: "8px 12px", fontSize: 9, color: C.sb, fontFamily: "monospace", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(result.preview[0]?.[h] ?? "—")}</td><td style={{ padding: "8px 12px" }}><span style={{ fontSize: 9, fontWeight: 700, color: m.confidence >= 85 ? C.gn : m.confidence >= 60 ? C.am : C.rd, background: (m.confidence >= 85 ? C.gn : m.confidence >= 60 ? C.am : C.rd) + "18", padding: "2px 6px", borderRadius: 4 }}>{m.confidence}%</span></td></tr>); })}</tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button onClick={() => { setR(null); setHoverCol(null); }} style={{ padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "transparent", color: C.sb, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>← Back</button>
              <button onClick={confirm} style={{ padding: "10px 28px", borderRadius: 10, border: "none", background: G, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✓ Build Dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ────────────────────────────────────────────────
const NAV = [{ id: "portfolio", l: "Portfolio", i: "⬡" }, { id: "revenue", l: "Revenue", i: "◆" }, { id: "pms", l: "PMs", i: "◉" }, { id: "ics", l: "Consultants", i: "◎" }, { id: "mobile", l: "Mobile", i: "📱" }];
const SNAV = [{ id: "challenges", l: "Challenges" }, { id: "mapper", l: "Data Mapper" }, { id: "api", l: "API" }, { id: "sync", l: "Sync Monitor" }];

export default function App() {
  const [mode, setMode] = useState(() => hasData() ? "dash" : "upload");
  const [ver, setVer] = useState(0);
  const [view, sV] = useState("portfolio");
  const [settings, sS] = useState(false);
  const [stab, sSt] = useState("challenges");
  const [studio, setStudio] = useState(false);
  const [selP, sP] = useState(null);

  // Load persisted data + saved theme into module vars on mount
  useEffect(() => { applyTheme(loadTheme()); if (hasData()) { __setData(loadAll()); } setVer(v => v + 1); }, []);

  const onData = () => { __setData(loadAll()); setVer(v => v + 1); setMode("dash"); };
  const onDemo = () => { __useDemo(); setVer(v => v + 1); setMode("dash"); };
  const reupload = () => { clearAll(); __useDemo(); setMode("upload"); };
  const applyAndSave = (t) => { saveTheme(t); applyTheme(t); setVer(v => v + 1); setStudio(false); };

  if (mode === "upload") return (<div style={{ background: C.bg, minHeight: "100vh", color: C.tx, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}><style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}button,select,input{font-family:inherit;outline:none}`}</style><UploadPage onData={onData} onDemo={onDemo} /></div>);

  if (studio) return (<WhiteLabelStudio onBack={() => setStudio(false)} onApply={applyAndSave} initial={loadTheme()} />);

  const titles = { portfolio: "Portfolio Overview", revenue: "Revenue Intelligence", pms: "PM Performance", ics: "Consultant Performance", mobile: "Connect Mobile App", challenges: "Challenge Manager", mapper: "AI Data Mapper", api: "API Configuration", sync: "Sync Monitor" };
  const curTitle = settings ? titles[stab] : titles[view];

  return (<div key={ver} style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.bd};border-radius:2px}button,select,input{font-family:inherit;outline:none}@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>

    <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(8,14,26,.9)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.bd}`, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {BRAND.logo ? <img src={BRAND.logo} alt="" style={{ width: 28, height: 28, borderRadius: 7, objectFit: "cover" }} /> : <svg width="28" height="28" viewBox="0 0 64 64"><defs><linearGradient id="nv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.ac}/><stop offset="1" stopColor={C.pp}/></linearGradient></defs><path d="M32 3 L52.8 15 L52.8 49 L32 61 L11.2 49 L11.2 15 Z" fill="url(#nv)"/><path d="M20 40 L27 31 L34 36 L44 23" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="44" cy="23" r="3.4" fill="#fff"/></svg>}
          <div><div style={{ fontSize: 13, fontWeight: 800, color: C.tx, lineHeight: 1 }}>{BRAND.name === "DeliverIQ" ? <>Deliver<span style={{ background: G, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IQ</span></> : BRAND.name}</div><div style={{ fontSize: 6, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.ac, marginTop: 1 }}>{BRAND.tagline}</div></div>
        </div>
        <div style={{ display: "flex", gap: 1, background: C.sf, borderRadius: 8, padding: 2 }}>
          {NAV.map(n => <button key={n.id} onClick={() => { sV(n.id); sS(false); }} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: !settings && view === n.id ? C.bd : "transparent", color: !settings && view === n.id ? C.tx : C.dm, display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, opacity: !settings && view === n.id ? 1 : .5 }}>{n.i}</span>{n.l}</button>)}
          <button onClick={() => sS(!settings)} style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: settings ? C.bd : "transparent", color: settings ? C.tx : C.dm, display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 10, opacity: settings ? 1 : .5 }}>⚙</span>Settings</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button onClick={() => setStudio(true)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.pp}40`, background: `${C.pp}12`, color: "#C4B5FD", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>🎨 Customize</button>
        <button onClick={() => generateReport({ projects: P, pms: PMS, orgName: BRAND.name, logoUrl: BRAND.logo, theme: { primary: C.ac, secondary: C.pp } })} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: G, color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>📄 Board Report</button>
        <button onClick={reupload} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.bd}`, background: "transparent", color: C.sb, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>↻ Re-upload</button>
      </div>
    </div>

    {settings && <div style={{ padding: "0 24px", borderBottom: `1px solid ${C.bd}`, background: C.sf }}><div style={{ display: "flex", gap: 1, maxWidth: 1200, margin: "0 auto" }}>{SNAV.map(s => <button key={s.id} onClick={() => sSt(s.id)} style={{ padding: "10px 16px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: "transparent", color: stab === s.id ? C.ac : C.dm, borderBottom: `2px solid ${stab === s.id ? C.ac : "transparent"}` }}>{s.l}</button>)}</div></div>}

    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}><div style={{ fontSize: 20, fontWeight: 800, color: C.tx, letterSpacing: -.5 }}>{curTitle}</div></div>
      {!settings && view === "portfolio" && <Portfolio onSel={sP} />}
      {!settings && view === "revenue" && <Revenue />}
      {!settings && view === "pms" && <PMPerf onSel={sP} />}
      {!settings && view === "ics" && <ICPerf />}
      {!settings && view === "mobile" && <MobileConnect />}
      {settings && stab === "challenges" && <Challenges />}
      {settings && stab === "mapper" && <DataMapper />}
      {settings && stab === "api" && <APIConfig />}
      {settings && stab === "sync" && <SyncMon />}
    </div>
    <Drawer p={selP} onClose={() => sP(null)} />
  </div>);
}
