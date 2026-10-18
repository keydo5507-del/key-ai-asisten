import {NextResponse} from "next/server";import bcrypt from "bcryptjs";
import {db} from "@/lib/db";import {setSession} from "@/lib/auth";import {hit,ip} from "@/lib/rate";
export async function POST(r:Request){
const b=await r.json();const name=String(b.name||"").trim().toLowerCase();
if(!hit("li:"+ip(r),10,600_000)||!hit("liu:"+name,5,600_000))return NextResponse.json({error:"Terlalu banyak percobaan login. Tunggu beberapa menit."},{status:429});
const sql=await db();const u=await sql`SELECT id,pass_hash FROM users WHERE name=${name}`;
const ok=u.length&&await bcrypt.compare(String(b.password||""),u[0].pass_hash);
if(!ok)return NextResponse.json({error:"Nama atau sandi salah."},{status:401});
await setSession(u[0].id);return NextResponse.json({ok:true});}
