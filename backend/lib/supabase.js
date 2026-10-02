import { createClient } from '@supabase/supabase-js';
const url=process.env.SUPABASE_URL;
const anon=process.env.SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!anon) console.warn('Configure SUPABASE_URL e SUPABASE_ANON_KEY.');
export const supabaseAnon=()=>createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
export const supabaseAdmin=()=>createClient(url,service||anon,{auth:{persistSession:false,autoRefreshToken:false}});
export async function requireUser(req){
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!token) return {error:'Token ausente'};
 const {data,error}=await supabaseAnon().auth.getUser(token);
 if(error||!data.user) return {error:'Sessão inválida'};
 return {user:data.user,token};
}
