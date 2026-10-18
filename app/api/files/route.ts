import {NextResponse} from "next/server";import JSZip from "jszip";import {db} from "@/lib/db";import {userId} from "@/lib/auth";
import {MODEL_IDS,resolveModel} from "@/lib/models";import {ai,friendly} from "@/lib/gemini";import {hit} from "@/lib/rate";
import {ensureConv,saveFile,loadFiles} from "@/lib/conv";
export const maxDuration=60;
const SECRET=/(AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/;
function safePath(p:string){if(typeof p!=="string")return null;const n=p.replace(/\\/g,"/").replace(/^\.\//,"");
if(!n||n.length>120||n.startsWith("/")||/(^|\/)\.\.(\/|$)/.test(n)||/[^\w.\-\/ ]/.test(n)||(/(^|\/)\.env($|\.)/.test(n)&&!n.endsWith(".example")))return null;return n}
const err=(m:string,s:number)=>NextResponse.json({error:m},{status:s});
export async function POST(r:Request){
const uid=await userId();if(!uid)return err("Belum login",401);
if(!hit("zip:"+uid,5,60_000))return err("Terlalu cepat.",429);
const b=await r.json();const prompt=String(b.prompt||"").trim().slice(0,4000);
if(!prompt)return err("Deskripsi proyek kosong.",400);
const model=await resolveModel(b.model,["chat"],MODEL_IDS.MAX);if(!model)return err("Model tidak tersedia.",400);
const sql=await db();let prev="";
if(b.basedOn){const f=(await loadFiles(sql,uid,[String(b.basedOn)]))[0];
if(f){const z=await JSZip.loadAsync(f.data,{base64:true});let n=0;
for(const [p,e] of Object.entries(z.files)){if(e.dir)continue;const c=await e.async("string");n+=c.length;if(n>150000)break;prev+=`--- ${p}\n${c}\n`}}}
let data:any;
try{const res=await ai().models.generateContent({model,contents:`Buat proyek sesuai permintaan. Balas HANYA JSON: {"name":"nama-proyek","files":[{"path":"relatif/path.ext","content":"isi file"}]}. Sertakan README.md. Jangan sertakan API key/secret asli; pakai .env.example. ${prev?`Ini proyek sebelumnya, revisi sesuai permintaan dan kembalikan SEMUA file versi baru:\n${prev}\n`:""}Permintaan: ${prompt}`,config:{responseMimeType:"application/json"}});
data=JSON.parse((res.text||"").replace(/^```json|```$/g,"").trim())}
catch(e){if(e instanceof SyntaxError)return err("AI mengembalikan format tidak valid. Coba lagi.",502);const f=friendly(e);return err(f.msg,f.status)}
const files=Array.isArray(data?.files)?data.files:[];
if(!files.length||files.length>60)return err("Jumlah file tidak valid (1-60).",422);
const zip=new JSZip();const list:{path:string,size:number}[]=[];let total=0;
const root=String(data.name||"proyek").replace(/[^\w-]/g,"").slice(0,40)||"proyek";
for(const f of files){const p=safePath(f.path);const c=typeof f.content==="string"?f.content:"";
if(!p)return err(`Path file tidak aman: ${String(f.path).slice(0,60)}`,422);
if(SECRET.test(c))return err("Terdeteksi secret di file hasil AI; dibatalkan.",422);
total+=c.length;if(total>1_500_000)return err("Proyek terlalu besar.",422);
zip.file(`${root}/${p}`,c);list.push({path:p,size:c.length})}
const buf=await zip.generateAsync({type:"nodebuffer",compression:"DEFLATE"});
const cid=await ensureConv(sql,uid,b.conversationId,prompt);if(!cid)return err("Percakapan tidak ditemukan.",404);
const fid=await saveFile(sql,uid,cid,"zip",`${root}.zip`,"application/zip",buf.toString("base64"),{size:buf.length,files:list});
const um=await sql`INSERT INTO messages(conv_id,role,content,mode) VALUES(${cid},'user',${"📦 "+prompt},'ZIP') RETURNING id`;
const am=await sql`INSERT INTO messages(conv_id,role,content,mode,file_id) VALUES(${cid},'ai',${`Proyek "${root}" dibuat (${list.length} file). Kode belum dijalankan/diuji otomatis.`},'ZIP',${fid}) RETURNING id`;
return NextResponse.json({conversationId:cid,fileId:fid,umid:um[0].id,amid:am[0].id})}
