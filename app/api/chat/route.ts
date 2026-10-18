import {NextResponse} from "next/server";import {db} from "@/lib/db";import {userId} from "@/lib/auth";
import {MODEL_IDS,resolveModel} from "@/lib/models";import {ai,friendly,OK_IMG} from "@/lib/gemini";import {hit} from "@/lib/rate";
import {ensureConv,saveFile,loadFiles} from "@/lib/conv";
export const maxDuration=60;
const err=(m:string,s:number)=>NextResponse.json({error:m},{status:s});
const LEN:Record<string,string>={pendek:"Jawab singkat dan padat.",sedang:"",panjang:"Jawab detail dan lengkap."};
export async function POST(r:Request){
const uid=await userId();if(!uid)return err("Belum login",401);
if(!hit("chat:"+uid,20,60_000))return err("Terlalu cepat, tunggu sebentar.",429);
const b=await r.json();
const model=await resolveModel(b.model,["chat"],MODEL_IDS.MEDIUM);if(!model)return err("Model tidak tersedia.",400);
let text=String(b.text||"").slice(0,20000);
const images=(Array.isArray(b.images)?b.images:[]).slice(0,3);
for(const i of images)if(!OK_IMG.includes(i.mime)||typeof i.data!=="string"||i.data.length>4_000_000)return err("Gambar tidak valid atau terlalu besar.",400);
const a=b.audio;if(a&&(typeof a.data!=="string"||a.data.length>4_000_000))return err("Audio terlalu besar.",400);
const sql=await db();
let cid=await ensureConv(sql,uid,b.conversationId,text||(a?"Pesan suara":"Gambar"));
if(!cid)return err("Percakapan tidak ditemukan.",404);
let att:string[]=[];
if(b.conversationId&&b.truncateFrom){
const o=await sql`SELECT id,content,att FROM messages WHERE id=${Number(b.truncateFrom)} AND conv_id=${cid} AND role='user'`;
if(!o.length)return err("Pesan tidak ditemukan.",404);
await sql`DELETE FROM messages WHERE conv_id=${cid} AND id>=${o[0].id}`;
if(!text)text=o[0].content;if(!images.length&&!a&&o[0].att)att=JSON.parse(o[0].att)}
if(!text&&!images.length&&!a&&!att.length)return err("Pesan kosong.",400);
for(const [k,i] of images.entries())att.push(await saveFile(sql,uid,cid,"upload",`gambar-${k+1}`,i.mime,i.data));
if(a)att.push(await saveFile(sql,uid,cid,"upload","vn",String(a.mime||"audio/webm"),a.data));
const files=await loadFiles(sql,uid,att);
const parts:any[]=files.map(f=>({inlineData:{mimeType:f.mime.split(";")[0],data:f.data}}));
const hasAudio=files.some(f=>f.mime.startsWith("audio"));
parts.push({text:text||(hasAudio?"Pahami dan jawab pesan suara ini.":"Jelaskan gambar ini.")});
const um=await sql`INSERT INTO messages(conv_id,role,content,mode,att) VALUES(${cid},'user',${text},${String(b.model||"MEDIUM")},${att.length?JSON.stringify(att):null}) RETURNING id`;
const umid=um[0].id as number;
const hist=(await sql`SELECT role,content FROM messages WHERE conv_id=${cid} AND id<${umid} ORDER BY id DESC LIMIT 30`).reverse();
const me=await sql`SELECT instructions,answer_length FROM users WHERE id=${uid}`;
const sys=`Kamu KEY AI ASISTEN. Jawab dalam bahasa pengguna (default Indonesia). ${LEN[me[0]?.answer_length]||""} ${me[0]?.instructions||""}`;
const contents=[...hist.map((h:any)=>({role:h.role==="user"?"user":"model",parts:[{text:h.content}]})),{role:"user",parts}];
const enc=new TextEncoder();const conv=cid;
const stream=new ReadableStream({async start(c){
const send=(o:any)=>{try{c.enqueue(enc.encode(JSON.stringify(o)+"\n"))}catch{}};
let full="";
try{send({t:"meta",cid:conv,umid});
const it=await ai().models.generateContentStream({model,contents,config:{systemInstruction:sys,abortSignal:r.signal} as any});
for await(const ch of it){const x=ch.text||"";if(x){full+=x;send({t:"d",x})}}
}catch(e){if(!r.signal.aborted){console.error("gemini",String((e as any)?.message).slice(0,200));send({t:"err",m:friendly(e).msg})}}
finally{let amid:number|undefined;
if(full){try{amid=(await sql`INSERT INTO messages(conv_id,role,content,mode) VALUES(${conv},'ai',${full},${String(b.model||"MEDIUM")}) RETURNING id`)[0].id}catch{}}
send({t:"done",amid});try{c.close()}catch{}}}});
return new Response(stream,{headers:{"Content-Type":"application/x-ndjson","Cache-Control":"no-store"}})}
