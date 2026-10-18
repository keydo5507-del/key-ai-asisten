import {SignJWT,jwtVerify} from "jose";
import {cookies} from "next/headers";
const key=()=>new TextEncoder().encode(process.env.AUTH_SECRET!);
export async function setSession(uid:number){
const t=await new SignJWT({uid}).setProtectedHeader({alg:"HS256"}).setExpirationTime("7d").sign(key());
cookies().set("key_session",t,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:604800});}
export async function userId():Promise<number|null>{
const c=cookies().get("key_session")?.value;if(!c)return null;
try{const {payload}=await jwtVerify(c,key());return payload.uid as number}catch{return null}}
