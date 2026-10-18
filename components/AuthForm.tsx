"use client";
import {useState} from "react";import Link from "next/link";
type K="login"|"signup"|"forgot"|"reset";
export default function AuthForm({kind}:{kind:K}){
const [f,setF]=useState({name:"",email:"",password:"",confirm:""});const [err,setErr]=useState("");const [ok,setOk]=useState("");const [busy,setBusy]=useState(false);
async function go(e:React.FormEvent){e.preventDefault();if(busy)return;setErr("");setOk("");setBusy(true);
try{const token=new URLSearchParams(location.search).get("token")||"";
const r=await fetch(`/api/auth/${kind}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...f,token})});
const d=await r.json();if(!r.ok)setErr(d.error||"Gagal");
else if(kind==="forgot")setOk("Jika email terdaftar, link reset sudah dikirim.");
else if(kind==="reset"){setOk("Sandi diubah. Mengarahkan ke login…");setTimeout(()=>location.href="/login",1200)}
else location.href="/"}catch{setErr("Koneksi gagal")}setBusy(false)}
const inp="w-full rounded-xl bg-[#0b1220] border border-[#16233d] px-4 py-3 outline-none focus:border-neon";
const t={login:"LOGIN",signup:"SIGN UP",forgot:"KIRIM LINK RESET",reset:"UBAH SANDI"}[kind];
return <main className="min-h-screen grid place-items-center p-4"><form onSubmit={go} className="w-full max-w-sm space-y-3 rounded-2xl border border-[#16233d] bg-[#070b14] p-6 glow">
<h1 className="text-2xl font-bold text-center text-neon">KEY AI ASISTEN</h1>
{(kind==="login"||kind==="signup")&&<input className={inp} placeholder="Nama (unik)" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>}
{(kind==="signup"||kind==="forgot")&&<input className={inp} type="email" placeholder="Akun Google / email Gmail" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>}
{kind!=="forgot"&&<input className={inp} type="password" placeholder="Sandi KEY AI (min 6)" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/>}
{(kind==="signup"||kind==="reset")&&<input className={inp} type="password" placeholder="Ulangi sandi" value={f.confirm} onChange={e=>setF({...f,confirm:e.target.value})}/>}
{kind==="signup"&&<p className="text-xs text-slate-500">Jangan masukkan sandi Google. Sandi ini khusus KEY AI ASISTEN.</p>}
{err&&<p className="text-sm text-red-400">{err}</p>}{ok&&<p className="text-sm text-green-400">{ok}</p>}
<button disabled={busy} className="w-full rounded-xl bg-neon py-3 font-semibold disabled:opacity-50">{busy?"Memproses…":t}</button>
<p className="text-center text-sm text-slate-400 space-x-3">{kind==="login"&&<><Link className="text-neon" href="/signup">Sign Up</Link><Link className="text-neon" href="/forgot">Lupa sandi?</Link></>}
{kind==="signup"&&<>Sudah punya akun? <Link className="text-neon" href="/login">Login</Link></>}
{(kind==="forgot"||kind==="reset")&&<Link className="text-neon" href="/login">Kembali ke login</Link>}</p>
</form></main>}
