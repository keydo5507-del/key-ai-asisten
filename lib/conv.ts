export async function ensureConv(sql:any,uid:number,cid:string|undefined,title:string):Promise<string|null>{
if(cid){const c=await sql`SELECT id FROM conversations WHERE id=${cid} AND user_id=${uid}`;return c.length?cid:null}
return (await sql`INSERT INTO conversations(user_id,title) VALUES(${uid},${title.slice(0,50)||"Percakapan baru"}) RETURNING id`)[0].id}
export async function saveFile(sql:any,uid:number,cid:string,kind:string,name:string,mime:string,data:string,meta?:any):Promise<string>{
return (await sql`INSERT INTO files(user_id,conv_id,kind,name,mime,data,meta) VALUES(${uid},${cid},${kind},${name},${mime},${data},${meta?JSON.stringify(meta):null}) RETURNING id`)[0].id}
export async function loadFiles(sql:any,uid:number,ids:string[]):Promise<{id:string;mime:string;data:string}[]>{
if(!ids.length)return [];return await sql`SELECT id::text AS id,mime,data FROM files WHERE user_id=${uid} AND id::text = ANY(${ids})`}
