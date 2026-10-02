import {cors,json,method} from '../../lib/http.js';
import {supabaseAdmin} from '../../lib/supabase.js';

const norm=v=>String(v||'').trim().toLocaleLowerCase('pt-BR');

function evaluate(selection,market,home,away,homeScore,awayScore){
  const m=norm(market), s=norm(selection), h=norm(home), a=norm(away);
  const total=homeScore+awayScore;

  if(m.includes('resultado final')){
    if(s===h) return homeScore>awayScore?'won':'lost';
    if(s===a) return awayScore>homeScore?'won':'lost';
    if(['x','empate'].includes(s)) return homeScore===awayScore?'won':'lost';
    return null;
  }

  if(m.includes('total de gols')){
    if(s.includes('mais de 2.5')||s.includes('mais de 2,5')) return total>2.5?'won':'lost';
    if(s.includes('menos de 2.5')||s.includes('menos de 2,5')) return total<2.5?'won':'lost';
    return null;
  }

  return null;
}

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['POST']))return;

  const expected=process.env.VYBET_ADMIN_KEY;
  const received=req.headers['x-admin-key'];
  if(!expected)return json(res,500,{ok:false,error:'VYBET_ADMIN_KEY não configurada.'});
  if(!received||received!==expected)return json(res,401,{ok:false,error:'Acesso administrativo negado.'});

  const {match_key,home_team,away_team,home_score,away_score}=req.body||{};
  const hs=Number(home_score), as=Number(away_score);
  if(!match_key||!home_team||!away_team||!Number.isInteger(hs)||!Number.isInteger(as)||hs<0||as<0)
    return json(res,400,{ok:false,error:'Informe match_key, home_team, away_team, home_score e away_score.'});

  const db=supabaseAdmin();
  const {data:selections,error}=await db
    .from('demo_bet_selections')
    .select('id,bet_id,market,selection,result')
    .eq('match_key',String(match_key))
    .eq('result','pending');

  if(error)return json(res,500,{ok:false,error:error.message});
  if(!selections?.length)return json(res,200,{ok:true,updated:0,settled:[],message:'Nenhuma seleção pendente para esta partida.'});

  const evaluated=[];
  for(const sel of selections){
    const result=evaluate(sel.selection,sel.market,home_team,away_team,hs,as);
    if(!result)continue;
    const {error:updateError}=await db.from('demo_bet_selections').update({result}).eq('id',sel.id).eq('result','pending');
    if(updateError)return json(res,500,{ok:false,error:updateError.message});
    evaluated.push({...sel,result});
  }

  const betIds=[...new Set(evaluated.map(x=>x.bet_id))];
  const settled=[];
  for(const betId of betIds){
    const {data:bet}=await db.from('demo_bets').select('id,status').eq('id',betId).single();
    if(!bet||bet.status!=='open')continue;

    const {data:all,error:allError}=await db
      .from('demo_bet_selections')
      .select('result')
      .eq('bet_id',betId);
    if(allError)return json(res,500,{ok:false,error:allError.message});

    let final=null;
    if(all.some(x=>x.result==='lost')) final='lost';
    else if(all.length&&all.every(x=>x.result==='won')) final='won';

    if(final){
      const {data:settledBet,error:settleError}=await db.rpc('settle_demo_bet',{p_bet_id:betId,p_result:final});
      if(settleError && !/já foi encerrada/i.test(settleError.message))
        return json(res,500,{ok:false,error:settleError.message});
      settled.push({bet_id:betId,result:final,bet:Array.isArray(settledBet)?settledBet[0]:settledBet});
    }
  }

  return json(res,200,{
    ok:true,
    match:{match_key,home_team,away_team,home_score:hs,away_score:as},
    updated:evaluated.length,
    selections:evaluated.map(x=>({id:x.id,bet_id:x.bet_id,selection:x.selection,market:x.market,result:x.result})),
    settled
  });
}
