import {NextResponse} from "next/server";import {db} from "@/lib/db";import {userId} from "@/lib/auth";
export async function GET(){const uid=await userId();if(!uid)return NextResponse.json({error:"Belum login"},{status:401});
const sql=await db();return NextResponse.json(await sql`SELECT id,title FROM conversations WHERE user_id=${uid} ORDER BY created_at DESC LIMIT 100`)}
export async function DELETE(){const uid=await userId();if(!uid)return NextResponse.json({error:"Belum login"},{status:401});
const sql=await db();await sql`DELETE FROM conversations WHERE user_id=${uid}`;return NextResponse.json({ok:true})}
