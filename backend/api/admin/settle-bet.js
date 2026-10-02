import {cors,json,method} from '../../lib/http.js';
import {supabaseAdmin} from '../../lib/supabase.js';

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['POST']))return;

  const expected=process.env.VYBET_ADMIN_KEY;
  const received=req.headers['x-admin-key'];

  if(!expected)return json(res,500,{ok:false,error:'VYBET_ADMIN_KEY não configurada.'});
  if(!received||received!==expected)return json(res,401,{ok:false,error:'Acesso administrativo negado.'});

  const {bet_id,result}=req.body||{};
  if(!bet_id||!['won','lost'].includes(result))
    return json(res,400,{ok:false,error:'Informe bet_id e result (won ou lost).'});

  const db=supabaseAdmin();
  const {data,error}=await db.rpc('settle_demo_bet',{
    p_bet_id:bet_id,
    p_result:result
  });

  if(error)return json(res,400,{ok:false,error:error.message});

  const bet=Array.isArray(data)?data[0]:data;
  const {data:profile,error:profileError}=await db
    .from('profiles')
    .select('demo_balance')
    .eq('id',bet.user_id)
    .single();

  if(profileError)return json(res,500,{ok:false,error:profileError.message});

  return json(res,200,{
    ok:true,
    bet,
    demo_balance:Number(profile.demo_balance)
  });
}
