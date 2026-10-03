import {cors,json,method} from '../../lib/http.js';
import {supabaseAdmin} from '../../lib/supabase.js';

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['GET'])) return;

  // Lista partidas armazenadas no Supabase.
  // Esta parte NAO consome requisicoes da API-Football.
  const db=supabaseAdmin();
  const status=String(req.query?.status||'scheduled');
  const fixture=String(req.query?.fixture||'').trim();

  let q=db
    .from('demo_match_results')
    .select(
      'match_key,provider_fixture_id,home_team,away_team,home_score,away_score,status,league_name,league_country,start_time,provider_status'
    )
    .eq('provider','api-football')
    .order('start_time',{ascending:true})
    .limit(100);

  if(fixture){
    q=q.eq('provider_fixture_id',fixture);

  }else if(status==='scheduled'){
    q=q
      .eq('status','scheduled')
      .eq('provider_status','NS')
      .gt('start_time',new Date().toISOString());

  }else if(['live','finished','cancelled'].includes(status)){
    q=q.eq('status',status);
  }

  const {data:matches,error}=await q;

  if(error){
    return json(res,500,{
      ok:false,
      error:error.message
    });
  }

  if(!matches?.length){
    return json(res,200,{
      ok:true,
      matches:[]
    });
  }

  // Busca apenas odds que ja estao armazenadas no nosso banco.
  const matchKeys=matches.map(m=>m.match_key);

  const {data:oddsRows,error:oddsError}=await db
    .from('provider_odds')
    .select(
      'match_key,bookmaker_id,bookmaker_name,market_id,market_name,selection_key,odd,updated_at'
    )
    .in('match_key',matchKeys)
    .eq('provider','api-football')
    .eq('bookmaker_id',8);

  if(oddsError){
    return json(res,500,{
      ok:false,
      error:oddsError.message
    });
  }

  const oddsByMatch=new Map();

  for(const row of oddsRows||[]){
    if(!oddsByMatch.has(row.match_key)){
      oddsByMatch.set(row.match_key,{
        bookmaker:row.bookmaker_name,
        home:null,
        draw:null,
        away:null,
        over_2_5:null,
        under_2_5:null
      });
    }

    const odds=oddsByMatch.get(row.match_key);
    const key=String(row.selection_key||'');
    const value=Number(row.odd);

    if(row.market_id===1 && key==='Home'){
      odds.home=value;
    }

    if(row.market_id===1 && key==='Draw'){
      odds.draw=value;
    }

    if(row.market_id===1 && key==='Away'){
      odds.away=value;
    }

    if(row.market_id===5 && key==='Over 2.5'){
      odds.over_2_5=value;
    }

    if(row.market_id===5 && key==='Under 2.5'){
      odds.under_2_5=value;
    }
  }

  const output=matches.map(match=>({
    ...match,
    odds:oddsByMatch.get(match.match_key)||null
  }));

  return json(res,200,{
    ok:true,
    matches:output
  });
}


