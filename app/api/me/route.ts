import {NextResponse} from "next/server";import {db} from "@/lib/db";import {userId} from "@/lib/auth";
export async function GET(){const uid=await userId();if(!uid)return NextResponse.json({error:"Belum login"},{status:401});
const sql=await db();const u=await sql`SELECT display,email,default_mode,instructions,answer_length FROM users WHERE id=${uid}`;return NextResponse.json(u[0]||{})}
export async function PATCH(r:Request){const uid=await userId();if(!uid)return NextResponse.json({error:"Belum login"},{status:401});
const b=await r.json();const sql=await db();
const m=typeof b.default_mode==="string"&&/^(MAX|MEDIUM|CEPAT|m:[\w.\-]+)$/.test(b.default_mode)?b.default_mode:"MEDIUM";
const l=["pendek","sedang","panjang"].includes(b.answer_length)?b.answer_length:"sedang";
await sql`UPDATE users SET default_mode=${m},instructions=${String(b.instructions||"").slice(0,2000)},answer_length=${l} WHERE id=${uid}`;return NextResponse.json({ok:true})}
export async function DELETE(){const uid=await userId();if(!uid)return NextResponse.json({error:"Belum login"},{status:401});
const sql=await db();await sql`DELETE FROM users WHERE id=${uid}`;return NextResponse.json({ok:true})}
