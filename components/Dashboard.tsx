"use client";
import {useEffect,useRef,useState} from "react";
import ReactMarkdown from "react-markdown";import remarkGfm from "remark-gfm";import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import {MODES} from "@/lib/modes";
type FileInfo={id:string;kind:string;name?:string;size?:number;files?:{path:string;size:number}[]};
type Msg={id?:number;role:string;content:string;file?:FileInfo;att?:{id:string;mime:string}[]};
type Img={mime:string;data:string;url:string};
type MI={id:string;name:string};
const b64=(f:Blob)=>new Promise<string>(res=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.readAsDataURL(f)});
const H={"Content-Type":"application/json"};
export default function Dashboard(){
const [convs,setConvs]=useState<{id:string;title:string}[]>([]);const [cid,setCid]=useState<string>();
const [msgs,setMsgs]=useState<Msg[]>([]);const [text,setText]=useState("");const [model,setModel]=useState("MEDIUM");
const [catalog,setCatalog]=useState<any>();const [imgModel,setImgModel]=useState("");
const [tool,setTool]=useState<"chat"|"image"|"zip">("chat");const [aspect,setAspect]=useState("1:1");const [revise,setRevise]=useState(false);
const [imgs,setImgs]=useState<Img[]>([]);const [rec,setRec]=useState(false);const [secs,setSecs]=useState(0);
const [vn,setVn]=useState<{blob:Blob;url:string}>();const [busy,setBusy]=useState(false);const [err,setErr]=useState("");
const [me,setMe]=useState<any>({});const [open,setOpen]=useState(false);const [panel,setPanel]=useState<""|"set"|"info">("");
const mr=useRef<MediaRecorder|null>(null);const timer=useRef<any>();const end=useRef<HTMLDivElement>(null);const ac=useRef<AbortController|null>(null);
const loadConvs=()=>fetch("/api/conversations").then(r=>r.json()).then(d=>Array.isArray(d)&&setConvs(d));
useEffect(()=>{loadConvs();fetch("/api/me").then(r=>r.json()).then(d=>{setMe(d);if(d.default_mode)setModel(d.default_mode)});fetch("/api/models").then(r=>r.json()).then(setCatalog)},[]);
useEffect(()=>{end.current?.scrollIntoView({behavior:"smooth"})},[msgs,busy]);
const lastZip=[...msgs].reverse().find(m=>m.file?.kind==="zip")?.file;
async function openConv(id:string){setCid(id);setOpen(false);const r=await fetch("/api/conversations/"+id);if(r.ok)setMsgs(await r.json())}
function newConv(){setCid(undefined);setMsgs([]);setOpen(false)}
async function pick(e:React.ChangeEvent<HTMLInputElement>){const fs=Array.from(e.target.files||[]);e.target.value="";setErr("");
let tot=imgs.length;for(const f of fs){if(!["image/jpeg","image/png","image/webp"].includes(f.type)){setErr("Hanya JPEG/PNG/WebP.");continue}
if(f.size>1_000_000||tot>=3){setErr("Maks 3 gambar, masing-masing ≤1MB (batas request Vercel).");continue}
tot++;const data=await b64(f);setImgs(p=>[...p,{mime:f.type,data,url:URL.createObjectURL(f)}])}}
async function toggleRec(){if(rec){mr.current?.stop();return}
try{const s=await navigator.mediaDevices.getUserMedia({audio:true});const m=new MediaRecorder(s);const ch:Blob[]=[];
m.ondataavailable=e=>ch.push(e.data);
m.onstop=()=>{s.getTracks().forEach(t=>t.stop());clearInterval(timer.current);setRec(false);const bl=new Blob(ch,{type:m.mimeType});setVn({blob:bl,url:URL.createObjectURL(bl)})};
m.start();mr.current=m;setRec(true);setSecs(0);let n=0;timer.current=setInterval(()=>{n++;setSecs(n);if(n>=120)m.stop()},1000)}catch{setErr("Izin mikrofon ditolak atau tidak tersedia.")}}
const setLast=(f:(m:Msg)=>Msg)=>setMsgs(a=>a.length?[...a.slice(0,-1),f(a[a.length-1])]:a);
// opts.truncateFrom: id pesan user yang diedit/diregenerate. opts.shown: pesan user yang ditampilkan.
async function run(t:string,opts:{truncateFrom?:number;shown?:Msg;tl?:"chat"|"image"|"zip";basedOn?:string}={}){
if(busy)return;const tl=opts.tl||tool;setErr("");setBusy(true);
const snapI=imgs,snapV=vn;setText("");setImgs([]);setVn(undefined);
if(opts.shown)setMsgs(m=>[...m,opts.shown!]);
else if(!opts.truncateFrom)setMsgs(m=>[...m,{role:"user",content:(tl==="image"?"🎨 ":tl==="zip"?"📦 ":"")+t+(snapI.length?` 🖼×${snapI.length}`:"")+(snapV?" 🎙️VN":"")}]);
const imgsBody=snapI.map(i=>({mime:i.mime,data:i.data}));
try{
if(tl!=="chat"){const body=tl==="image"?{prompt:t,aspect,model:imgModel,images:imgsBody,conversationId:cid}:{prompt:t,model,basedOn:opts.basedOn,conversationId:cid};
const r=await fetch(tl==="image"?"/api/images":"/api/files",{method:"POST",headers:H,body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw d.error;
if(!cid){setCid(d.conversationId);loadConvs()}await openConv(d.conversationId)}
else{ac.current=new AbortController();
const audio=snapV?{mime:snapV.blob.type,data:await b64(snapV.blob)}:undefined;
const r=await fetch("/api/chat",{method:"POST",headers:H,signal:ac.current.signal,body:JSON.stringify({conversationId:cid,model,text:t,images:imgsBody,audio,truncateFrom:opts.truncateFrom})});
if(!r.ok||!r.body){const d=await r.json().catch(()=>({}));throw d.error||"Gagal"}
setMsgs(m=>[...m,{role:"ai",content:""}]);
const rd=r.body.getReader(),dec=new TextDecoder();let buf="";const isNew=!cid;
for(;;){const {done,value}=await rd.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;
while((i=buf.indexOf("\n"))>=0){const line=buf.slice(0,i);buf=buf.slice(i+1);if(!line)continue;const o=JSON.parse(line);
if(o.t==="meta"){setCid(o.cid);setMsgs(m=>{const c=[...m];const k=c.length-2;if(k>=0&&c[k].role==="user")c[k]={...c[k],id:o.umid};return c})}
else if(o.t==="d")setLast(m=>({...m,content:m.content+o.x}));
else if(o.t==="err")setErr(o.m);
else if(o.t==="done"){setLast(m=>({...m,id:o.amid}));if(isNew)loadConvs()}}}}
}catch(e:any){if(e?.name!=="AbortError")setErr(typeof e==="string"?e:"Terjadi kesalahan jaringan.")}
setBusy(false);ac.current=null}
const stop=()=>ac.current?.abort();
function send(){const t=text.trim();if(!t&&!imgs.length&&!vn)return;run(t,{basedOn:tool==="zip"&&revise?lastZip?.id:undefined})}
function edit(i:number){const m=msgs[i];const t=prompt("Edit pesan:",m.content);if(!t||!m.id)return;
setMsgs(a=>a.slice(0,i));run(t,{truncateFrom:m.id,shown:{role:"user",content:t,att:m.att}})}
function regen(i:number){const u=msgs[i-1];if(!u?.id)return;setMsgs(a=>a.slice(0,i));run("",{truncateFrom:u.id})}
function redo(i:number){const u=msgs[i-1];const k=msgs[i].file!.kind==="zip"?"zip":"image";run(u.content.replace(/^(🎨|📦) /,""),{tl:k})}
const speak=(s:string)=>{if(!("speechSynthesis" in window))return setErr("TTS tidak didukung browser.");const u=new SpeechSynthesisUtterance(s.replace(/[#*`]/g,""));u.lang="id-ID";speechSynthesis.cancel();speechSynthesis.speak(u)};
async function rename(id:string){const t=prompt("Nama baru?");if(!t)return;await fetch("/api/conversations/"+id,{method:"PATCH",headers:H,body:JSON.stringify({title:t})});loadConvs()}
async function del(id:string){if(!confirm("Hapus percakapan?"))return;await fetch("/api/conversations/"+id,{method:"DELETE"});if(id===cid)newConv();loadConvs()}
async function logout(){await fetch("/api/auth/logout",{method:"POST"});location.href="/login"}
async function saveSet(){await fetch("/api/me",{method:"PATCH",headers:H,body:JSON.stringify({default_mode:model,instructions:me.instructions||"",answer_length:me.answer_length||"sedang"})});setPanel("")}
const code=(p:any)=>(<div className="relative"><button className="absolute right-2 top-2 text-xs bg-[#16233d] rounded px-2 py-1" onClick={e=>navigator.clipboard.writeText((e.currentTarget.parentElement?.querySelector("code") as HTMLElement)?.innerText||"")}>Salin</button><pre {...p}/></div>);
const sel="bg-[#0b1220] border border-[#16233d] rounded-lg px-2 py-1 text-sm max-w-[55vw]";
return <div className="h-screen flex">
<aside className={`${open?"flex":"hidden"} md:flex fixed md:static inset-y-0 left-0 z-20 w-72 flex-col bg-[#070b14] border-r border-[#16233d] p-3`}>
<div className="font-bold text-neon mb-1">KEY AI ASISTEN</div><div className="text-xs text-slate-400 mb-3">{me.display} · {me.email}</div>
<button onClick={newConv} className="rounded-xl bg-neon py-2 mb-3 font-semibold">+ Percakapan baru</button>
<div className="flex-1 overflow-auto space-y-1">{convs.map(c=><div key={c.id} className={`flex items-center rounded-lg px-2 py-2 text-sm ${c.id===cid?"bg-[#0f1b33]":"hover:bg-[#0b1220]"}`}>
<button className="flex-1 text-left truncate" onClick={()=>openConv(c.id)}>{c.title}</button><button onClick={()=>rename(c.id)} className="px-1">✏️</button><button onClick={()=>del(c.id)} className="px-1">🗑️</button></div>)}</div>
<button onClick={()=>{setPanel("set");setOpen(false)}} className="py-2 text-left text-sm">⚙️ Pengaturan</button>
<button onClick={()=>{setPanel("info");setOpen(false)}} className="py-2 text-left text-sm">ℹ️ Info model</button>
<button onClick={logout} className="py-2 text-left text-sm text-red-400">Logout</button></aside>
<main className="flex-1 flex flex-col min-w-0">
<header className="flex items-center gap-2 p-3 border-b border-[#16233d]"><button className="md:hidden text-xl" onClick={()=>setOpen(!open)}>☰</button>
<h1 className="font-bold text-neon hidden sm:block">KEY AI ASISTEN</h1>
<select value={model} onChange={e=>setModel(e.target.value)} className={sel+" ml-auto"}>
<optgroup label="Mode KEY AI">{MODES.map(m=><option key={m.key} value={m.key}>{m.label} — {m.desc}</option>)}</optgroup>
{catalog?.chat?.length>0&&<optgroup label="Semua model Gemini">{catalog.chat.map((m:MI)=><option key={m.id} value={"m:"+m.id}>{m.name} ({m.id})</option>)}</optgroup>}</select></header>
<div className="flex-1 overflow-auto p-3 space-y-3">{!msgs.length&&<p className="text-center text-slate-500 mt-20">Halo{me.display?`, ${me.display}`:""}! Pilih model, lalu chat, kirim foto/VN, buat/edit gambar, atau buat ZIP proyek.</p>}
{msgs.map((m,i)=><div key={i} className={`max-w-[92%] md:max-w-[75%] rounded-2xl px-4 py-3 ${m.role==="user"?"ml-auto bg-neon/20 border border-neon/40":"bg-[#0b1220] border border-[#16233d]"}`}>
{m.att?.map(a=>a.mime.startsWith("image")?<img key={a.id} src={`/api/files/${a.id}`} alt="" className="h-20 rounded mb-1 inline-block mr-1"/>:<audio key={a.id} controls src={`/api/files/${a.id}`} className="h-8 mb-1"/>)}
<div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={{pre:code}}>{m.content}</ReactMarkdown></div>
{m.file?.kind==="image"&&<div><img src={`/api/files/${m.file.id}`} alt="hasil" className="rounded-xl mt-2 max-h-96"/><a href={`/api/files/${m.file.id}?dl=1`} className="text-neon text-sm">⬇ Unduh</a></div>}
{m.file?.kind==="zip"&&<div className="mt-2 text-sm"><div>{m.file.name} · {((m.file.size||0)/1024).toFixed(1)} KB</div><ul className="text-xs text-slate-400 max-h-32 overflow-auto">{m.file.files?.map(f=><li key={f.path}>{f.path}</li>)}</ul><a href={`/api/files/${m.file.id}`} className="inline-block mt-1 rounded-lg bg-neon px-3 py-1">⬇ Unduh ZIP</a></div>}
<div className="mt-2 flex gap-3 text-xs text-slate-400">
{m.role==="user"&&m.id&&!m.content.startsWith("🎨")&&!m.content.startsWith("📦")&&<button onClick={()=>edit(i)}>✏️ Edit</button>}
{m.role==="ai"&&!m.file&&m.content&&<><button onClick={()=>navigator.clipboard.writeText(m.content)}>Salin</button><button onClick={()=>speak(m.content)}>🔊 Bacakan</button>{msgs[i-1]?.id&&<button onClick={()=>regen(i)}>🔁 Ulangi</button>}</>}
{m.role==="ai"&&m.file&&<button onClick={()=>redo(i)}>🔁 Buat ulang</button>}</div></div>)}
{busy&&!msgs[msgs.length-1]?.content&&<div className="text-slate-400 animate-pulse">KEY AI sedang berpikir…</div>}<div ref={end}/></div>
{err&&<div className="mx-3 mb-1 text-sm text-red-400">{err}</div>}
<div className="p-3 border-t border-[#16233d] space-y-2">
<div className="flex gap-2 text-xs flex-wrap items-center">{(["chat","image","zip"] as const).map(t=><button key={t} onClick={()=>setTool(t)} className={`rounded-full px-3 py-1 border ${tool===t?"bg-neon border-neon":"border-[#16233d]"}`}>{t==="chat"?"💬 Chat":t==="image"?"🎨 Gambar":"📦 ZIP"}</button>)}
{tool==="image"&&<><select value={aspect} onChange={e=>setAspect(e.target.value)} className={sel}>{["1:1","16:9","9:16","4:3"].map(a=><option key={a}>{a}</option>)}</select>
<select value={imgModel} onChange={e=>setImgModel(e.target.value)} className={sel}><option value="">Model gambar default</option>{catalog?.image?.map((m:MI)=><option key={m.id} value={"m:"+m.id}>{m.name}</option>)}</select>
<span className="text-slate-500">Lampirkan foto untuk mengedit</span></>}
{tool==="zip"&&lastZip&&<label className="flex items-center gap-1"><input type="checkbox" checked={revise} onChange={e=>setRevise(e.target.checked)}/>Revisi ZIP terakhir</label>}</div>
{(imgs.length>0||vn)&&<div className="flex gap-2 items-center flex-wrap">{imgs.map((i,k)=><div key={k} className="relative"><img src={i.url} alt="" className="h-14 rounded"/><button onClick={()=>setImgs(imgs.filter((_,j)=>j!==k))} className="absolute -top-1 -right-1 bg-red-600 rounded-full w-5 h-5 text-xs">×</button></div>)}
{vn&&<div className="flex items-center gap-1"><audio controls src={vn.url} className="h-8"/><button onClick={()=>setVn(undefined)}>🗑️</button></div>}</div>}
<div className="flex items-end gap-2">
<label className="cursor-pointer p-2">📎<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={pick}/></label>
<button onClick={toggleRec} className={`p-2 ${rec?"text-red-500 animate-pulse":""}`}>{rec?`⏹ ${secs}s`:"🎤"}</button>
<textarea value={text} onChange={e=>setText(e.target.value)} rows={1} placeholder={tool==="image"?"Deskripsikan gambar…":tool==="zip"?"Deskripsikan proyek…":"Tulis pesan…"} className="flex-1 resize-none rounded-xl bg-[#0b1220] border border-[#16233d] px-3 py-2 outline-none focus:border-neon max-h-32"/>
{busy&&tool==="chat"?<button onClick={stop} className="rounded-xl bg-red-600 px-4 py-2 font-semibold">Stop</button>:<button onClick={send} disabled={busy} className="rounded-xl bg-neon px-4 py-2 font-semibold disabled:opacity-50">Kirim</button>}</div></div></main>
{panel&&<div className="fixed inset-0 z-30 bg-black/70 grid place-items-center p-4" onClick={()=>setPanel("")}><div className="w-full max-w-md max-h-[90vh] overflow-auto rounded-2xl bg-[#070b14] border border-[#16233d] p-5 space-y-3" onClick={e=>e.stopPropagation()}>
{panel==="set"?<><h2 className="font-bold">Pengaturan</h2><p className="text-sm text-slate-400">{me.display} · {me.email}</p>
<label className="text-sm">Instruksi khusus AI</label><textarea value={me.instructions||""} onChange={e=>setMe({...me,instructions:e.target.value})} rows={4} className="w-full rounded-xl bg-[#0b1220] border border-[#16233d] p-2"/>
<label className="text-sm">Panjang jawaban </label><select value={me.answer_length||"sedang"} onChange={e=>setMe({...me,answer_length:e.target.value})} className={sel}><option value="pendek">Pendek</option><option value="sedang">Sedang</option><option value="panjang">Panjang</option></select>
<p className="text-xs text-slate-500">Model saat ini disimpan sebagai default.</p>
<div className="flex gap-2 flex-wrap"><button onClick={saveSet} className="rounded-lg bg-neon px-3 py-2">Simpan</button>
<button className="rounded-lg border border-[#16233d] px-3 py-2" onClick={async()=>{if(confirm("Hapus SEMUA riwayat?")){await fetch("/api/conversations",{method:"DELETE"});newConv();loadConvs()}}}>Hapus riwayat</button>
<button className="rounded-lg border border-red-600 text-red-400 px-3 py-2" onClick={async()=>{if(confirm("Hapus akun & semua data?")){await fetch("/api/me",{method:"DELETE"});logout()}}}>Hapus akun</button></div></>
:<><h2 className="font-bold">Info model</h2><p className="text-sm text-slate-400">Provider: {catalog?.provider}. Daftar {catalog?.live?"diambil langsung dari Gemini API":"tidak bisa diambil (hanya mode KEY AI tersedia)"}.</p>
{catalog&&Object.entries(catalog.modes).map(([k,v])=><div key={k} className="text-sm">KEY AI {k} → <code>{String(v)}</code></div>)}
<div className="text-sm">Gambar default → <code>{catalog?.imageDefault}</code></div>
<div className="text-xs text-slate-500">{catalog?.chat?.length||0} model chat, {catalog?.image?.length||0} model gambar tersedia.</div></>}
</div></div>}</div>}
