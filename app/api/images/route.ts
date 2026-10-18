import {NextResponse} from "next/server";import {db} from "@/lib/db";import {userId} from "@/lib/auth";
import {IMAGE_DEFAULT,resolveModel,listModels} from "@/lib/models";import {ai,friendly,OK_IMG} from "@/lib/gemini";import {hit} from "@/lib/rate";
import {ensureConv,saveFile} from "@/lib/conv";
export const maxDuration=60;
const err=(m:string,s:number)=>NextResponse.json({error:m},{status:s});
export async function POST(r:Request){
const uid=await userId();if(!uid)return err("Belum login",401);
if(!hit("img:"+uid,6,60_000))return err("Terlalu cepat.",429);
const b=await r.json();const prompt=String(b.prompt||"").trim().slice(0,2000);
if(!prompt)return err("Prompt kosong.",400);
const ar=["1:1","16:9","9:16","4:3"].includes(b.aspect)?b.aspect:"1:1";
const input=(Array.isArray(b.images)?b.images:[]).slice(0,3);
for(const i of input)if(!OK_IMG.includes(i.mime)||typeof i.data!=="string"||i.data.length>4_000_000)return err("Gambar tidak valid.",400);
const model=await resolveModel(b.model,["image","imagen"],IMAGE_DEFAULT);if(!model)return err("Model gambar tidak tersedia.",400);
const isImagen=/^imagen/.test(model)||(await listModels()).some(m=>m.id===model&&m.kind==="imagen");
if(isImagen&&input.length)return err("Model Imagen tidak mendukung edit gambar. Pilih model Gemini image.",400);
let data="",mime="image/png";
try{
if(isImagen){const res:any=await ai().models.generateImages({model,prompt,config:{numberOfImages:1,aspectRatio:ar}});
data=res.generatedImages?.[0]?.image?.imageBytes||"";mime=res.generatedImages?.[0]?.image?.mimeType||mime}
else{const parts:any[]=[...input.map((i:any)=>({inlineData:{mimeType:i.mime,data:i.data}})),{text:`${prompt}\n\nAspect ratio: ${ar}`}];
const res=await ai().models.generateContent({model,contents:[{role:"user",parts}],config:{responseModalities:["TEXT","IMAGE"],imageConfig:{aspectRatio:ar}} as any});
const p:any=res.candidates?.[0]?.content?.parts?.find((x:any)=>x.inlineData);data=p?.inlineData?.data||"";mime=p?.inlineData?.mimeType||mime}
}catch(e){const f=friendly(e);return err(f.msg,f.status)}
if(!data)return err("Model tidak mengembalikan gambar (mungkin diblokir kebijakan). Ubah prompt.",422);
const sql=await db();const cid=await ensureConv(sql,uid,b.conversationId,prompt);if(!cid)return err("Percakapan tidak ditemukan.",404);
const att:string[]=[];for(const [k,i] of input.entries())att.push(await saveFile(sql,uid,cid,"upload",`input-${k+1}`,i.mime,i.data));
const fid=await saveFile(sql,uid,cid,"image","key-ai.png",mime,data);
const um=await sql`INSERT INTO messages(conv_id,role,content,mode,att) VALUES(${cid},'user',${"🎨 "+prompt},'IMAGE',${att.length?JSON.stringify(att):null}) RETURNING id`;
const am=await sql`INSERT INTO messages(conv_id,role,content,mode,file_id) VALUES(${cid},'ai',${input.length?"Gambar diedit:":"Gambar dibuat:"},'IMAGE',${fid}) RETURNING id`;
return NextResponse.json({conversationId:cid,fileId:fid,umid:um[0].id,amid:am[0].id})}
