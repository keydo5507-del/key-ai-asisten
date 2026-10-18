import {ai} from "./gemini";
// Default berdasarkan dokumentasi Google (Okt 2026). Gemini 2.5 dijadwalkan shutdown Okt 2026. Override lewat env.
export const MODEL_IDS:Record<string,string>={
MAX:process.env.MODEL_MAX||"gemini-4-argon",
MEDIUM:process.env.MODEL_MEDIUM||"gemini-3.8-flash",
CEPAT:process.env.MODEL_CEPAT||"gemini-3.1-flash-lite"};
export const IMAGE_DEFAULT=process.env.IMAGE_MODEL||"gemini-nano-banana-2.1";
export type MI={id:string;name:string;kind:"chat"|"image"|"imagen"};
let cache:{t:number;list:MI[]}|null=null;
// Daftar SEMUA model dari akun/API key Anda (live), di-cache 10 menit.
export async function listModels():Promise<MI[]>{
if(cache&&Date.now()-cache.t<600_000)return cache.list;
const out:MI[]=[];
try{const pager:any=await ai().models.list({config:{pageSize:100}});
for await(const m of pager){const id=String(m.name||"").replace(/^models\//,"");const acts:string[]=m.supportedActions||[];const name=m.displayName||id;
if(/^imagen/.test(id)&&acts.includes("predict")){out.push({id,name,kind:"imagen"});continue}
if(!acts.includes("generateContent")||/tts|embed|aqa|live|native-audio|veo|lyria|robotics|computer-use|omni/.test(id))continue;
out.push({id,name,kind:/image|nano-banana/.test(id)?"image":"chat"})}
if(out.length)cache={t:Date.now(),list:out}}catch(e){console.error("listModels",String((e as any)?.message).slice(0,150))}
return out;}
export async function resolveModel(sel:any,kinds:string[],def:string):Promise<string|null>{
if(typeof sel!=="string"||!sel)return def;
if(MODEL_IDS[sel]&&kinds.includes("chat"))return MODEL_IDS[sel];
if(sel.startsWith("m:")){const id=sel.slice(2);const l=await listModels();
if(!l.length)return /^[\w.\-]+$/.test(id)?id:null;
return l.find(m=>m.id===id&&kinds.includes(m.kind))?id:null}
return def;}
