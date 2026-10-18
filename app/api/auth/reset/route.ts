import {NextResponse} from "next/server";import crypto from "crypto";import bcrypt from "bcryptjs";import {db} from "@/lib/db";import {hit,ip} from "@/lib/rate";
export async function POST(r:Request){
if(!hit("rs:"+ip(r),10,600_000))return NextResponse.json({error:"Terlalu banyak percobaan."},{status:429});
const b=await r.json();const pw=String(b.password||"");
if(pw.length<6)return NextResponse.json({error:"Sandi minimal 6 karakter."},{status:400});
if(pw!==b.confirm)return NextResponse.json({error:"Ulangi sandi tidak sama."},{status:400});
const h=crypto.createHash("sha256").update(String(b.token||"")).digest("hex");
const sql=await db();const t=await sql`SELECT user_id FROM reset_tokens WHERE token_hash=${h} AND expires_at>now()`;
if(!t.length)return NextResponse.json({error:"Link reset tidak valid atau kedaluwarsa."},{status:400});
await sql`UPDATE users SET pass_hash=${await bcrypt.hash(pw,12)} WHERE id=${t[0].user_id}`;
await sql`DELETE FROM reset_tokens WHERE user_id=${t[0].user_id}`;return NextResponse.json({ok:true})}
