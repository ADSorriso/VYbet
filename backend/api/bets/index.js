import {cors,json,method} from '../../lib/http.js';
import {requireUser,supabaseAdmin,supabaseUser} from '../../lib/supabase.js';

const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function providerSelection(s){
  const market=String(s.market||'');
  const selection=String(s.selection||'');

  if(market==='Resultado Final'){
    if(selection==='Empate'){
      return {marketId:1,selectionKey:'Draw'};
    }

    return {
      marketId:1,
      selectionKey:null
    };
  }

  if(market==='Total de Gols'){
    if(selection==='Mais de 2.5'){
      return {marketId:5,selectionKey:'Over 2.5'};
    }

    if(selection==='Menos de 2.5'){
      return {marketId:5,selectionKey:'Under 2.5'};
    }
  }

  return null;
}

async function validateProviderSelection(db,s){
  if(!String(s.match_key||'').startsWith('api-football-')){
    return {ok:true};
  }

  const {data:match,error:matchError}=await db
    .from('demo_match_results')
    .select('match_key,home_team,away_team,status,provider_status,start_time')
    .eq('match_key',s.match_key)
    .eq('provider','api-football')
    .maybeSingle();

  if(matchError){
    return {
      ok:false,
      error:'Não foi possível validar a partida.'
    };
  }

  if(!match){
    return {
      ok:false,
      error:'Partida não encontrada.'
    };
  }

  if(
    match.status!=='scheduled' ||
    match.provider_status!=='NS'
  ){
    return {
      ok:false,
      error:`${match.home_team} x ${match.away_team} não está disponível para apostas.`
    };
  }

  const startTime=new Date(match.start_time);

  if(
    !Number.isFinite(startTime.getTime()) ||
    startTime.getTime()<=Date.now()
  ){
    return {
      ok:false,
      error:`${match.home_team} x ${match.away_team} já começou ou foi encerrada.`
    };
  }

  const mapped=providerSelection(s);

  if(!mapped){
    return {
      ok:false,
      error:'Mercado não disponível para esta partida.'
    };
  }

  if(mapped.marketId===1 && mapped.selectionKey===null){
    if(s.selection===match.home_team){
      mapped.selectionKey='Home';
    }else if(s.selection===match.away_team){
      mapped.selectionKey='Away';
    }else{
      return {
        ok:false,
        error:'Seleção inválida para Resultado Final.'
      };
    }
  }

  const {data:providerOdd,error:oddError}=await db
    .from('provider_odds')
    .select('odd,bookmaker_name')
    .eq('match_key',s.match_key)
    .eq('provider','api-football')
    .eq('bookmaker_id',8)
    .eq('market_id',mapped.marketId)
    .eq('selection_key',mapped.selectionKey)
    .maybeSingle();

  if(oddError){
    return {
      ok:false,
      error:'Não foi possível validar a cotação.'
    };
  }

  if(!providerOdd){
    return {
      ok:false,
      error:'Cotação não disponível.'
    };
  }

  const storedOdd=Number(providerOdd.odd);
  const sentOdd=Number(s.odd);

  if(
    !Number.isFinite(storedOdd) ||
    Math.abs(storedOdd-sentOdd)>0.001
  ){
    return {
      ok:false,
      error:'A cotação foi alterada. Atualize a página antes de apostar.'
    };
  }

  return {
    ok:true,
    odd:storedOdd
  };
}

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['GET','POST']))return;

  const auth=await requireUser(req);

  if(auth.error){
    return json(res,401,{
      ok:false,
      error:auth.error
    });
  }

  const db=supabaseAdmin();

  if(req.method==='GET'){
    const {data,error}=await db
      .from('demo_bets')
      .select('*,demo_bet_selections(*)')
      .eq('user_id',auth.user.id)
      .order('created_at',{ascending:false})
      .limit(50);

    if(error){
      return json(res,500,{
        ok:false,
        error:error.message
      });
    }

    return json(res,200,{
      ok:true,
      bets:data
    });
  }

  const {stake=0,selections=[]}=req.body||{};

  if(!Array.isArray(selections)||!selections.length){
    return json(res,400,{
      ok:false,
      error:'Selecione pelo menos uma opção.'
    });
  }

  if(Number(stake)<=0){
    return json(res,400,{
      ok:false,
      error:'Informe um valor de demonstração maior que zero.'
    });
  }

  const normalized=selections.map(s=>({
    match_id:UUID_RE.test(String(s.match_id||''))?s.match_id:null,
    match_key:String(s.match_id||'').slice(0,120)||null,
    market:String(s.market||'Mercado').slice(0,120),
    selection:String(s.selection||'Seleção').slice(0,160),
    odd:Number(s.odd)
  }));

  if(normalized.some(s=>!Number.isFinite(s.odd)||s.odd<1)){
    return json(res,400,{
      ok:false,
      error:'Uma ou mais cotações são inválidas.'
    });
  }

  /*
   * IMPORTANTE:
   * valida as partidas e odds do provedor ANTES
   * de criar a aposta e descontar o saldo demo.
   */
  for(const selection of normalized){
    const validation=await validateProviderSelection(
      db,
      selection
    );

    if(!validation.ok){
      return json(res,400,{
        ok:false,
        error:validation.error
      });
    }

    if(validation.odd){
      selection.odd=validation.odd;
    }
  }

  const total=Number(
    normalized.reduce(
      (product,s)=>product*s.odd,
      1
    ).toFixed(2)
  );

  const userDb=supabaseUser(auth.token);

  const {data:rpcData,error}=await userDb.rpc(
    'place_demo_bet',
    {
      p_stake:Number(stake),
      p_total_odd:total
    }
  );

  if(error){
    const msg=/Saldo demo insuficiente/i.test(error.message)
      ? 'Saldo demo insuficiente.'
      : error.message;

    return json(res,400,{
      ok:false,
      error:msg
    });
  }

  const bet=Array.isArray(rpcData)
    ? rpcData[0]
    : rpcData;

  if(!bet?.id){
    return json(res,500,{
      ok:false,
      error:'Não foi possível criar a aposta de demonstração.'
    });
  }

  const rows=normalized.map(s=>({
    ...s,
    bet_id:bet.id
  }));

  const {error:selErr}=await db
    .from('demo_bet_selections')
    .insert(rows);

  if(selErr){
    return json(res,500,{
      ok:false,
      error:'A aposta foi criada, mas houve erro ao salvar as seleções. Contate o suporte do protótipo.'
    });
  }

  const {data:profile}=await db
    .from('profiles')
    .select('demo_balance')
    .eq('id',auth.user.id)
    .single();

  return json(res,201,{
    ok:true,
    bet,
    demo_balance:Number(profile?.demo_balance ?? 0)
  });
}
