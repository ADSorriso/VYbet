import {cors,json,method} from '../../lib/http.js';
import {requireUser,supabaseAdmin} from '../../lib/supabase.js';

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['POST'])) return;
  const auth=await requireUser(req);
  if(auth.error) return json(res,401,{ok:false,error:auth.error});
  const {error}=await supabaseAdmin().auth.admin.signOut(auth.token,'local');
  if(error) return json(res,400,{ok:false,error:'Não foi possível encerrar a sessão.'});
  return json(res,200,{ok:true});
}
