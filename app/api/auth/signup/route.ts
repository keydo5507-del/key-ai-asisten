import {NextResponse} from "next/server";import bcrypt from "bcryptjs";
import {db} from "@/lib/db";import {setSession} from "@/lib/auth";import {hit,ip} from "@/lib/rate";
export async function POST(r:Request){
if(!hit("su:"+ip(r),5,600_000))return NextResponse.json({error:"Terlalu banyak percobaan, coba lagi nanti."},{status:429});
const b=await r.json();const display=String(b.name||"").trim();const email=String(b.email||"").trim().toLowerCase();
const pw=String(b.password||"");
if(!display||display.length>40)return NextResponse.json({error:"Nama wajib diisi (maks 40 karakter)."},{status:400});
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"Format email tidak valid."},{status:400});
if(pw.length<6)return NextResponse.json({error:"Sandi minimal 6 karakter."},{status:400});
if(pw!==b.confirm)return NextResponse.json({error:"Ulangi sandi tidak sama."},{status:400});
const sql=await db();const name=display.toLowerCase();
const ex=await sql`SELECT 1 FROM users WHERE name=${name} OR email=${email}`;
if(ex.length)return NextResponse.json({error:"Nama atau email sudah terdaftar."},{status:409});
const h=await bcrypt.hash(pw,12);
const u=await sql`INSERT INTO users(name,display,email,pass_hash) VALUES(${name},${display},${email},${h}) RETURNING id`;
await setSession(u[0].id);return NextResponse.json({ok:true});}
