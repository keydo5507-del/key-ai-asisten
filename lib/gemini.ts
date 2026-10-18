import {GoogleGenAI} from "@google/genai";
export const ai=()=>new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
export function friendly(e:any):{msg:string,status:number}{
const s=String(e?.message||e);
if(/429|RESOURCE_EXHAUSTED|quota/i.test(s))return{msg:"Kuota/rate limit Gemini tercapai. Coba lagi nanti.",status:429};
if(/API key|API_KEY|401|403|PERMISSION/i.test(s))return{msg:"API key Gemini tidak valid atau tidak punya izin.",status:502};
if(/404|NOT_FOUND|not found|no longer available|deprecated/i.test(s))return{msg:"Model tidak tersedia/sudah dihentikan. Pilih model lain di menu model.",status:502};
return{msg:"Gagal memproses permintaan AI. Coba lagi.",status:502};}
export const OK_IMG=["image/jpeg","image/png","image/webp"];
