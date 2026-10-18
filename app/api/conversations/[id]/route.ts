import {NextResponse} from "next/server";import {db} from "@/lib/db";import {userId} from "@/lib/auth";
type C={params:{id:string}};
const ID=/^[0-9a-f-]{36}$/i;
export async function GET(_:Request,{params}:C){const uid=await userId();if(!uid||!ID.test(params.id))return NextResponse.json({error:"Tidak valid"},{status:401});
const sql=await db();const c=await sql`SELECT id FROM conversations WHERE id=${params.id} AND user_id=${uid}`;
if(!c.length)return NextResponse.json({error:"Tidak ditemukan"},{status:404});
const rows=await sql`SELECT m.id,m.role,m.content,m.mode,m.att,f.id::text AS fid,f.kind,f.name,f.meta FROM messages m LEFT JOIN files f ON f.id=m.file_id WHERE m.conv_id=${params.id} ORDER BY m.id`;
const ids:string[]=rows.flatMap((x:any)=>x.att?JSON.parse(x.att):[]);
const mimes:Record<string,string>={};
if(ids.length)for(const f of await sql`SELECT id::text AS id,mime FROM files WHERE user_id=${uid} AND id::text = ANY(${ids})`)mimes[f.id]=f.mime;
return NextResponse.json(rows.map((x:any)=>{const m=x.meta?JSON.parse(x.meta):{};return{id:x.id,role:x.role,content:x.content,mode:x.mode,
att:(x.att?JSON.parse(x.att):[]).map((i:string)=>({id:i,mime:mimes[i]||""})),
file:x.fid?{id:x.fid,kind:x.kind,name:x.name,size:m.size,files:m.files}:undefined}}))}
export async function PATCH(r:Request,{params}:C){const uid=await userId();if(!uid||!ID.test(params.id))return NextResponse.json({error:"Tidak valid"},{status:401});
const b=await r.json();const sql=await db();
await sql`UPDATE conversations SET title=${String(b.title||"").slice(0,80)||"Percakapan"} WHERE id=${params.id} AND user_id=${uid}`;return NextResponse.json({ok:true})}
export async function DELETE(_:Request,{params}:C){const uid=await userId();if(!uid||!ID.test(params.id))return NextResponse.json({error:"Tidak valid"},{status:401});
const sql=await db();await sql`DELETE FROM conversations WHERE id=${params.id} AND user_id=${uid}`;return NextResponse.json({ok:true})}
