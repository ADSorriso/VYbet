const BASE_URL='https://v3.football.api-sports.io';

const FINISHED=new Set(['FT','AET','PEN']);
const LIVE=new Set(['1H','HT','2H','ET','BT','P','SUSP','INT','LIVE']);
const CANCELLED=new Set(['CANC','ABD','AWD','WO']);

export function mapFixtureStatus(short){
  const s=String(short||'').toUpperCase();
  if(FINISHED.has(s)) return 'finished';
  if(LIVE.has(s)) return 'live';
  if(CANCELLED.has(s)) return 'cancelled';
  return 'scheduled';
}

export async function apiFootball(path,params={}){
  const key=process.env.API_FOOTBALL_KEY;
  if(!key) throw new Error('API_FOOTBALL_KEY não configurada.');
  const url=new URL(`${BASE_URL}/${String(path).replace(/^\//,'')}`);
  for(const [k,v] of Object.entries(params)) if(v!==undefined&&v!==null&&v!=='') url.searchParams.set(k,String(v));
  const response=await fetch(url,{headers:{'x-apisports-key':key,'accept':'application/json'}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(`API-Football HTTP ${response.status}`);
  const errors=body?.errors;
  if(errors && (Array.isArray(errors)?errors.length:Object.keys(errors).length)){
    throw new Error(`API-Football: ${JSON.stringify(errors)}`);
  }
  return {body,remaining:response.headers.get('x-ratelimit-requests-remaining')};
}

export function fixtureToRow(item){
  const id=String(item?.fixture?.id||'');
  if(!id) return null;
  const status=mapFixtureStatus(item?.fixture?.status?.short);
  return {
    match_key:`api-football-${id}`,
    provider:'api-football',
    provider_fixture_id:id,
    home_team:String(item?.teams?.home?.name||''),
    away_team:String(item?.teams?.away?.name||''),
    home_score:Number.isFinite(Number(item?.goals?.home))?Number(item.goals.home):null,
    away_score:Number.isFinite(Number(item?.goals?.away))?Number(item.goals.away):null,
    status,
    league_name:String(item?.league?.name||''),
    league_country:String(item?.league?.country||''),
    start_time:item?.fixture?.date||null,
    provider_status:String(item?.fixture?.status?.short||''),
    updated_at:new Date().toISOString(),
    ...(status==='finished'?{}:{settled_at:null})
  };
}

export async function fetchFixturesByDate(date){
  const {body,remaining}=await apiFootball('fixtures',{date,timezone:'America/Cuiaba'});
  return {fixtures:(body?.response||[]).map(fixtureToRow).filter(Boolean),remaining,results:Number(body?.results||0)};
}
