import {cors,json,method} from '../../lib/http.js';
import {requireUser,supabaseAdmin} from '../../lib/supabase.js';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['GET','POST']))return;
  const auth=await requireUser(req);
  if(auth.error)return json(res,401,{ok:false,error:auth.error});
  const db=supabaseAdmin();

  if(req.method==='GET'){
    const {data,error}=await db
      .from('demo_bets')
      .select('*,demo_bet_selections(*)')
      .eq('user_id',auth.user.id)
      .order('created_at',{ascending:false})
      .limit(50);
    if(error)return json(res,500,{ok:false,error:error.message});
    return json(res,200,{ok:true,bets:data});
  }

  const {stake=0,selections=[]}=req.body||{};
  if(!Array.isArray(selections)||!selections.length)
    return json(res,400,{ok:false,error:'Selecione pelo menos uma opção.'});
  if(Number(stake)<=0)
    return json(res,400,{ok:false,error:'Informe um valor de demonstração maior que zero.'});

  const normalized=selections.map(s=>({
    match_id:UUID_RE.test(String(s.match_id||''))?s.match_id:null,
    market:String(s.market||'Mercado').slice(0,120),
    selection:String(s.selection||'Seleção').slice(0,160),
    odd:Number(s.odd)
  }));
  if(normalized.some(s=>!Number.isFinite(s.odd)||s.odd<1))
    return json(res,400,{ok:false,error:'Uma ou mais cotações são inválidas.'});

  const total=normalized.reduce((p,s)=>p*s.odd,1);
  const {data:bet,error}=await db.from('demo_bets').insert({
    user_id:auth.user.id,
    stake:Number(stake),
    total_odd:Number(total.toFixed(2)),
    potential_return:Number((Number(stake)*total).toFixed(2)),
    status:'open'
  }).select().single();
  if(error)return json(res,400,{ok:false,error:error.message});

  const rows=normalized.map(s=>({...s,bet_id:bet.id}));
  const {error:selErr}=await db.from('demo_bet_selections').insert(rows);
  if(selErr){
    await db.from('demo_bets').delete().eq('id',bet.id).eq('user_id',auth.user.id);
    return json(res,400,{ok:false,error:selErr.message});
  }
  return json(res,201,{ok:true,bet});
}
