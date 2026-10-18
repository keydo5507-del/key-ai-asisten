import {NextRequest,NextResponse} from "next/server";
import {jwtVerify} from "jose";
export const config={matcher:["/((?!_next|favicon.ico|login|signup|forgot|reset|api/auth).*)"]};
export async function middleware(r:NextRequest){
const c=r.cookies.get("key_session")?.value;let ok=false;
if(c){try{await jwtVerify(c,new TextEncoder().encode(process.env.AUTH_SECRET!));ok=true}catch{}}
if(ok)return NextResponse.next();
if(r.nextUrl.pathname.startsWith("/api"))return NextResponse.json({error:"Belum login"},{status:401});
return NextResponse.redirect(new URL("/login",r.url));}
