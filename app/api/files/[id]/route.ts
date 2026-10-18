import {db} from "@/lib/db";import {userId} from "@/lib/auth";
export async function GET(r:Request,{params}:{params:{id:string}}){
const uid=await userId();if(!uid||!/^[0-9a-f-]{36}$/i.test(params.id))return new Response("Tidak valid",{status:401});
const sql=await db();const f=await sql`SELECT name,mime,data,kind FROM files WHERE id=${params.id} AND user_id=${uid}`;
if(!f.length)return new Response("Tidak ditemukan",{status:404});
const dl=new URL(r.url).searchParams.get("dl")==="1"||f[0].kind==="zip";
return new Response(new Uint8Array(Buffer.from(f[0].data,"base64")),{headers:{"Content-Type":f[0].mime,"Content-Disposition":`${dl?"attachment":"inline"}; filename="${String(f[0].name).replace(/[^\w.\-]/g,"_")}"`,"Cache-Control":"private, max-age=3600","X-Content-Type-Options":"nosniff"}})}
