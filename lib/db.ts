import {neon} from "@neondatabase/serverless";
let ready:Promise<unknown>|null=null;
// DATABASE_URL = connection string Neon (pooled, sslmode=require)
export async function db(){
const sql=neon(process.env.DATABASE_URL!);
if(!ready)ready=(async()=>{
await sql`CREATE TABLE IF NOT EXISTS users(id SERIAL PRIMARY KEY,name TEXT UNIQUE NOT NULL,display TEXT NOT NULL,email TEXT UNIQUE NOT NULL,pass_hash TEXT NOT NULL,default_mode TEXT NOT NULL DEFAULT 'MEDIUM',instructions TEXT NOT NULL DEFAULT '',created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS answer_length TEXT NOT NULL DEFAULT 'sedang'`;
await sql`CREATE TABLE IF NOT EXISTS conversations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,title TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
await sql`CREATE TABLE IF NOT EXISTS messages(id SERIAL PRIMARY KEY,conv_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,role TEXT NOT NULL,content TEXT NOT NULL,mode TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_id UUID`;
await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS att TEXT`;
await sql`CREATE TABLE IF NOT EXISTS files(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,conv_id UUID REFERENCES conversations(id) ON DELETE CASCADE,kind TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,data TEXT NOT NULL,meta TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
await sql`CREATE TABLE IF NOT EXISTS reset_tokens(token_hash TEXT PRIMARY KEY,user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL)`;
})().catch(e=>{ready=null;throw e});
await ready;return sql;}
