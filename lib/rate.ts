// Rate limit in-memory (per instance serverless). Untuk produksi ketat, ganti ke Upstash/Redis.
const m=new Map<string,number[]>();
export function hit(k:string,max:number,winMs:number){const n=Date.now();const a=(m.get(k)||[]).filter(t=>n-t<winMs);a.push(n);m.set(k,a);return a.length<=max}
export function ip(r:Request){return r.headers.get("x-forwarded-for")?.split(",")[0]||"local"}
