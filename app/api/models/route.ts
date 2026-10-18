import {NextResponse} from "next/server";import {MODEL_IDS,IMAGE_DEFAULT,listModels} from "@/lib/models";import {userId} from "@/lib/auth";
export async function GET(){if(!await userId())return NextResponse.json({error:"Belum login"},{status:401});
const l=await listModels();
return NextResponse.json({provider:"Google Gemini API",modes:MODEL_IDS,imageDefault:IMAGE_DEFAULT,chat:l.filter(m=>m.kind==="chat"),image:l.filter(m=>m.kind!=="chat"),live:l.length>0})}
