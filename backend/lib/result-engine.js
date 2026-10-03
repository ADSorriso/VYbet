import { supabaseAdmin } from './supabase.js';

const norm=v=>String(v||'').trim().toLocaleLowerCase('pt-BR');

export function evaluateSelection(selection,market,home,away,homeScore,awayScore){
  const m=norm(market), s=norm(selection), h=norm(home), a=norm(away);
  const total=Number(homeScore)+Number(awayScore);

  if(m.includes('resultado final')){
    if(s===h) return Number(homeScore)>Number(awayScore)?'won':'lost';
    if(s===a) return Number(awayScore)>Number(homeScore)?'won':'lost';
    if(['x','empate'].includes(s)) return Number(homeScore)===Number(awayScore)?'won':'lost';
  }
  if(m.includes('total de gols')){
    if(s.includes('mais de 2.5')||s.includes('mais de 2,5')) return total>2.5?'won':'lost';
    if(s.includes('menos de 2.5')||s.includes('menos de 2,5')) return total<2.5?'won':'lost';
  }
  return null;
}

export async function settleMatch({matchKey,homeTeam,awayTeam,homeScore,awayScore}){
  const db=supabaseAdmin();
  const {data:selections,error}=await db.from('demo_bet_selections')
    .select('id,bet_id,market,selection,result').eq('match_key',String(matchKey)).eq('result','pending');
  if(error) throw error;
  if(!selections?.length) return {updated:0,selections:[],settled:[]};

  const evaluated=[];
  for(const sel of selections){
    const result=evaluateSelection(sel.selection,sel.market,homeTeam,awayTeam,homeScore,awayScore);
    if(!result) continue;
    const {error:updateError}=await db.from('demo_bet_selections').update({result}).eq('id',sel.id).eq('result','pending');
    if(updateError) throw updateError;
    evaluated.push({...sel,result});
  }

  const settled=[];
  for(const betId of [...new Set(evaluated.map(x=>x.bet_id))]){
    const {data:bet,error:betError}=await db.from('demo_bets').select('id,status').eq('id',betId).single();
    if(betError||!bet||bet.status!=='open') continue;
    const {data:all,error:allError}=await db.from('demo_bet_selections').select('result').eq('bet_id',betId);
    if(allError) throw allError;
    let final=null;
    if(all.some(x=>x.result==='lost')) final='lost';
    else if(all.length&&all.every(x=>x.result==='won')) final='won';
    if(!final) continue;
    const {data:settledBet,error:settleError}=await db.rpc('settle_demo_bet',{p_bet_id:betId,p_result:final});
    if(settleError && !/já foi encerrada/i.test(settleError.message)) throw settleError;
    settled.push({bet_id:betId,result:final,bet:Array.isArray(settledBet)?settledBet[0]:settledBet});
  }
  return {updated:evaluated.length,selections:evaluated,settled};
}
