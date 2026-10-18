import {NextResponse} from "next/server";import crypto from "crypto";import {db} from "@/lib/db";import {hit,ip} from "@/lib/rate";
export async function POST(r:Request){
if(!hit("fg:"+ip(r),5,600_000))return NextResponse.json({error:"Terlalu banyak percobaan."},{status:429});
if(!process.env.RESEND_API_KEY||!process.env.APP_URL)return NextResponse.json({error:"Reset sandi via email belum dikonfigurasi (RESEND_API_KEY & APP_URL)."},{status:501});
const email=String((await r.json()).email||"").trim().toLowerCase();
const sql=await db();const u=await sql`SELECT id FROM users WHERE email=${email}`;
if(u.length){const token=crypto.randomBytes(32).toString("hex");const h=crypto.createHash("sha256").update(token).digest("hex");
await sql`DELETE FROM reset_tokens WHERE user_id=${u[0].id}`;
await sql`INSERT INTO reset_tokens(token_hash,user_id,expires_at) VALUES(${h},${u[0].id},now()+interval '30 minutes')`;
const link=`${process.env.APP_URL.replace(/\/$/,"")}/reset?token=${token}`;
const res=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json"},
body:JSON.stringify({from:process.env.RESEND_FROM||"KEY AI <onboarding@resend.dev>",to:[email],subject:"Reset sandi KEY AI ASISTEN",html:`<p>Klik untuk reset sandi (berlaku 30 menit):</p><p><a href="${link}">${link}</a></p><p>Abaikan jika bukan Anda.</p>`})});
if(!res.ok)console.error("resend",res.status)}
return NextResponse.json({ok:true})}
