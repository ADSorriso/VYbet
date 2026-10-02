import {cors,json,method} from '../../lib/http.js';
import {requireUser,supabaseAdmin,supabaseUser} from '../../lib/supabase.js';

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
    match_key:String(s.match_id||'').slice(0,120)||null,
    market:String(s.market||'Mercado').slice(0,120),
    selection:String(s.selection||'Seleção').slice(0,160),
    odd:Number(s.odd)
  }));
  if(normalized.some(s=>!Number.isFinite(s.odd)||s.odd<1))
    return json(res,400,{ok:false,error:'Uma ou mais cotações são inválidas.'});

  const total=Number(normalized.reduce((p,s)=>p*s.odd,1).toFixed(2));

  // A RPC roda com o JWT do usuário. No banco, ela verifica o saldo,
  // desconta o valor e cria a aposta na mesma transação.
  const userDb=supabaseUser(auth.token);
  const {data:rpcData,error}=await userDb.rpc('place_demo_bet',{
    p_stake:Number(stake),
    p_total_odd:total
  });
  if(error){
    const msg=/Saldo demo insuficiente/i.test(error.message)
      ? 'Saldo demo insuficiente.'
      : error.message;
    return json(res,400,{ok:false,error:msg});
  }

  const bet=Array.isArray(rpcData)?rpcData[0]:rpcData;
  if(!bet?.id)return json(res,500,{ok:false,error:'Não foi possível criar a aposta de demonstração.'});

  const rows=normalized.map(s=>({...s,bet_id:bet.id}));
  const {error:selErr}=await db.from('demo_bet_selections').insert(rows);
  if(selErr){
    // A aposta já foi criada/descontada pela transação do banco.
    // Não tentamos "devolver" saldo aqui para evitar uma correção parcial insegura.
    return json(res,500,{ok:false,error:'A aposta foi criada, mas houve erro ao salvar as seleções. Contate o suporte do protótipo.'});
  }

  const {data:profile}=await db
    .from('profiles')
    .select('demo_balance')
    .eq('id',auth.user.id)
    .single();

  return json(res,201,{ok:true,bet,demo_balance:Number(profile?.demo_balance ?? 0)});
}
