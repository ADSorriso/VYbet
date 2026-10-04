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

  if(!key){
    throw new Error('API_FOOTBALL_KEY não configurada.');
  }

  const url=new URL(
    `${BASE_URL}/${String(path).replace(/^\//,'')}`
  );

  for(const [k,v] of Object.entries(params)){
    if(
      v!==undefined &&
      v!==null &&
      v!==''
    ){
      url.searchParams.set(k,String(v));
    }
  }

  const response=await fetch(url,{
    headers:{
      'x-apisports-key':key,
      'accept':'application/json'
    }
  });

  const body=await response
    .json()
    .catch(()=>({}));

  if(!response.ok){
    throw new Error(
      `API-Football HTTP ${response.status}`
    );
  }

  const errors=body?.errors;

  if(
    errors &&
    (
      Array.isArray(errors)
        ? errors.length
        : Object.keys(errors).length
    )
  ){
    throw new Error(
      `API-Football: ${JSON.stringify(errors)}`
    );
  }

  return {
    body,
    remaining:
      response.headers.get(
        'x-ratelimit-requests-remaining'
      )
  };
}

export function fixtureToRow(item){
  const id=String(item?.fixture?.id||'');

  if(!id) return null;

  const status=mapFixtureStatus(
    item?.fixture?.status?.short
  );

  return {
    match_key:`api-football-${id}`,
    provider:'api-football',
    provider_fixture_id:id,

    home_team_id:
      item?.teams?.home?.id != null
        ? Number(item.teams.home.id)
        : null,

    home_team_logo:String(
      item?.teams?.home?.logo||''
    ),

    away_team_id:
      item?.teams?.away?.id != null
        ? Number(item.teams.away.id)
        : null,

    away_team_logo:String(
      item?.teams?.away?.logo||''
    ),

    league_id:
      item?.league?.id != null
        ? Number(item.league.id)
        : null,

    league_logo:String(
      item?.league?.logo||''
    ),

    league_flag:String(
      item?.league?.flag||''
    ),

    home_team:String(
      item?.teams?.home?.name||''
    ),

    away_team:String(
      item?.teams?.away?.name||''
    ),

    home_score:
      item?.goals?.home != null &&
      Number.isFinite(Number(item.goals.home))
        ? Number(item.goals.home)
        : null,

    away_score:
      item?.goals?.away != null &&
      Number.isFinite(Number(item.goals.away))
        ? Number(item.goals.away)
        : null,

    status,

    league_name:String(
      item?.league?.name||''
    ),

    league_country:String(
      item?.league?.country||''
    ),

    start_time:item?.fixture?.date||null,

    provider_status:String(
      item?.fixture?.status?.short||''
    ),

    elapsed:
      item?.fixture?.status?.elapsed != null &&
      Number.isFinite(
        Number(item.fixture.status.elapsed)
      )
        ? Number(item.fixture.status.elapsed)
        : null,

    updated_at:new Date().toISOString(),

    ...(status==='finished'
      ? {}
      : {settled_at:null})
  };
}

export async function fetchFixturesByDate(date){
  const {
    body,
    remaining
  }=await apiFootball('fixtures',{
    date,
    timezone:'America/Cuiaba'
  });

  const rawFirst=body?.response?.[0]||null;

  const debug_first_fixture={
    fixture_id:
      rawFirst?.fixture?.id ?? null,

    home:{
      id:
        rawFirst?.teams?.home?.id ?? null,

      name:
        rawFirst?.teams?.home?.name ?? null,

      logo:
        rawFirst?.teams?.home?.logo ?? null
    },

    away:{
      id:
        rawFirst?.teams?.away?.id ?? null,

      name:
        rawFirst?.teams?.away?.name ?? null,

      logo:
        rawFirst?.teams?.away?.logo ?? null
    },

    league:{
      id:
        rawFirst?.league?.id ?? null,

      name:
        rawFirst?.league?.name ?? null,

      logo:
        rawFirst?.league?.logo ?? null,

      flag:
        rawFirst?.league?.flag ?? null
    }
  };

  return {
    fixtures:(body?.response||[])
      .map(fixtureToRow)
      .filter(Boolean),

    remaining,

    results:Number(body?.results||0),

    debug_first_fixture
  };
}