import {supabaseAdmin} from './supabase.js';
import {
  fetchFixturesByDate,
  apiFootball
} from './api-football.js';

export const validFootballDate=v=>
  /^\d{4}-\d{2}-\d{2}$/.test(String(v||''));

export const footballToday=()=>new Intl.DateTimeFormat('en-CA',{
  timeZone:'America/Cuiaba',
  year:'numeric',
  month:'2-digit',
  day:'2-digit'
}).format(new Date());

export const clampFootballLimit=(value,min=1,max=10)=>{
  const n=Number(value);

  if(!Number.isFinite(n)) return min;

  return Math.min(
    max,
    Math.max(min,Math.floor(n))
  );
};

export function extractFootballOdds(item){
  const fixtureId=String(item?.fixture?.id||'');

  if(!fixtureId) return [];

  const bookmaker=(item?.bookmakers||[]).find(
    b=>Number(b?.id)===8
  );

  if(!bookmaker) return [];

  const allowed=new Set([
    'Home',
    'Draw',
    'Away',
    'Over 2.5',
    'Under 2.5'
  ]);

  const rows=[];

  for(const market of bookmaker.bets||[]){
    const marketId=Number(market?.id);

    if(marketId!==1 && marketId!==5) continue;

    for(const value of market.values||[]){
      const label=String(value?.value||'');

      if(!allowed.has(label)) continue;

      const odd=Number(value?.odd);

      if(!Number.isFinite(odd)||odd<1) continue;

      rows.push({
        match_key:`api-football-${fixtureId}`,
        provider:'api-football',
        provider_fixture_id:fixtureId,

        bookmaker_id:8,
        bookmaker_name:'Bet365',

        market_id:marketId,
        market_name:String(market?.name||''),

        selection_key:label,
        selection_label:label,
        odd,

        updated_at:new Date().toISOString()
      });
    }
  }

  return rows;
}

async function saveOdds(db,fixtureId,body){
  const oddsRows=(body?.response||[])
    .flatMap(extractFootballOdds);

  if(!oddsRows.length){
    return 0;
  }

  const {error}=await db
    .from('provider_odds')
    .upsert(oddsRows,{
      onConflict:
        'provider,provider_fixture_id,bookmaker_id,market_id,selection_key'
    });

  if(error) throw error;

  return oddsRows.length;
}

/*
 * Atualiza somente partidas/resultados.
 * Consome uma chamada de fixtures da API-Football.
 */
export async function syncFootballFixtures({
  date=footballToday()
}={}){
  const db=supabaseAdmin();

  const {
    fixtures,
    remaining,
    results
  }=await fetchFixturesByDate(date);

  if(fixtures.length){
    const {error}=await db
      .from('demo_match_results')
      .upsert(fixtures,{
        onConflict:'match_key'
      });

    if(error) throw error;
  }

  return {
    ok:true,
    date,
    received:results,
    saved:fixtures.length,
    mode:'fixtures-only',
    remaining_requests:remaining
  };
}

/*
 * Atualiza odds de uma partida específica.
 * Usado pelo modo manual.
 */
export async function syncFootballFixtureOdds({
  fixture
}={}){
  const fixtureId=String(fixture||'').trim();

  if(!fixtureId){
    throw new Error('Fixture não informado.');
  }

  const db=supabaseAdmin();

  const {
    body,
    remaining
  }=await apiFootball('odds',{
    fixture:fixtureId
  });

  const oddsSaved=await saveOdds(
    db,
    fixtureId,
    body
  );

  return {
    ok:true,
    mode:'manual-odds',
    fixture:fixtureId,
    checked_fixtures:[fixtureId],
    fixtures_with_odds:
      oddsSaved>0
        ? [fixtureId]
        : [],
    odds_saved:oddsSaved,
    remaining_requests:remaining
  };
}

/*
 * Busca odds automaticamente usando partidas
 * que já estão armazenadas no Supabase.
 *
 * Portanto NÃO faz uma nova chamada de fixtures.
 */
export async function syncFootballOdds({
  limit=1
}={}){
  const db=supabaseAdmin();
  const nowIso=new Date().toISOString();

  const {
    data:fixtures,
    error:fixturesError
  }=await db
    .from('demo_match_results')
    .select(
      'provider_fixture_id,start_time,status,provider_status'
    )
    .eq('provider','api-football')
    .eq('status','scheduled')
    .eq('provider_status','NS')
    .gt('start_time',nowIso)
    .not('provider_fixture_id','is',null)
    .order('start_time',{
      ascending:true
    })
    .limit(200);

  if(fixturesError) throw fixturesError;

  const fixtureIds=(fixtures||[])
    .map(item=>
      String(item.provider_fixture_id||'')
    )
    .filter(Boolean);

  const completeFixtures=new Set();

  if(fixtureIds.length){
    const {
      data:storedOdds,
      error:storedOddsError
    }=await db
      .from('provider_odds')
      .select(
        'provider_fixture_id,selection_key'
      )
      .eq('provider','api-football')
      .eq('bookmaker_id',8)
      .in('provider_fixture_id',fixtureIds);

    if(storedOddsError){
      throw storedOddsError;
    }

    const selectionsByFixture=new Map();

    for(const row of storedOdds||[]){
      const id=String(
        row.provider_fixture_id
      );

      if(!selectionsByFixture.has(id)){
        selectionsByFixture.set(
          id,
          new Set()
        );
      }

      selectionsByFixture
        .get(id)
        .add(
          String(row.selection_key)
        );
    }

    const required=[
      'Home',
      'Draw',
      'Away',
      'Over 2.5',
      'Under 2.5'
    ];

    for(
      const [id,selections]
      of selectionsByFixture
    ){
      if(
        required.every(
          key=>selections.has(key)
        )
      ){
        completeFixtures.add(id);
      }
    }
  }

  const candidates=(fixtures||[])
    .filter(item=>
      !completeFixtures.has(
        String(item.provider_fixture_id)
      )
    )
    .slice(
      0,
      clampFootballLimit(limit,1,10)
    );

  let oddsSaved=0;
  let remaining=null;

  const checkedFixtures=[];
  const fixturesWithOdds=[];

  for(const candidate of candidates){
    const fixtureId=String(
      candidate.provider_fixture_id
    );

    checkedFixtures.push(fixtureId);

    const result=await apiFootball(
      'odds',
      {
        fixture:fixtureId
      }
    );

    remaining=result.remaining;

    const saved=await saveOdds(
      db,
      fixtureId,
      result.body
    );

    oddsSaved+=saved;

    if(saved>0){
      fixturesWithOdds.push(
        fixtureId
      );
    }
  }

  return {
    ok:true,
    mode:'odds-only',

    checked_fixtures:checkedFixtures,
    fixtures_with_odds:fixturesWithOdds,

    odds_saved:oddsSaved,
    remaining_requests:remaining
  };
}

/*
 * Wrapper mantido para compatibilidade
 * com o endpoint administrativo existente.
 */
export async function syncFootball({
  date=footballToday(),
  fixture='',
  auto=false,
  limit=5
}={}){
  const fixturesResult=
    await syncFootballFixtures({
      date
    });

  let oddsResult=null;

  if(fixture){
    oddsResult=
      await syncFootballFixtureOdds({
        fixture
      });
  }else if(auto){
    oddsResult=
      await syncFootballOdds({
        limit
      });
  }

  return {
    ok:true,
    date,

    received:
      fixturesResult.received,

    saved:
      fixturesResult.saved,

    mode:fixture
      ? 'manual'
      : auto
        ? 'automatic'
        : 'fixtures-only',

    fixture:fixture||null,

    checked_fixtures:
      oddsResult?.checked_fixtures||[],

    fixtures_with_odds:
      oddsResult?.fixtures_with_odds||[],

    odds_saved:
      oddsResult?.odds_saved||0,

    remaining_requests:
      oddsResult?.remaining_requests ??
      fixturesResult.remaining_requests
  };
}