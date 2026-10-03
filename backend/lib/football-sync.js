import {supabaseAdmin} from './supabase.js';
import {fetchFixturesByDate,apiFootball} from './api-football.js';

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

export async function syncFootball({
  date=footballToday(),
  fixture='',
  auto=false,
  limit=5
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
      .upsert(fixtures,{onConflict:'match_key'});

    if(error) throw error;
  }

  let oddsSaved=0;
  let oddsRemaining=null;

  const checkedFixtures=[];
  const fixturesWithOdds=[];

  if(fixture){
    const {
      body,
      remaining:remainingOdds
    }=await apiFootball('odds',{fixture});

    oddsRemaining=remainingOdds;

    const oddsRows=(body?.response||[])
      .flatMap(extractFootballOdds);

    checkedFixtures.push(String(fixture));

    if(oddsRows.length){
      const {error}=await db
        .from('provider_odds')
        .upsert(oddsRows,{
          onConflict:
            'provider,provider_fixture_id,bookmaker_id,market_id,selection_key'
        });

      if(error) throw error;

      oddsSaved+=oddsRows.length;
      fixturesWithOdds.push(String(fixture));
    }
  }

  if(auto && !fixture){
    const now=Date.now();

    const futureFixtures=fixtures
      .filter(item=>{
        const start=new Date(item.start_time).getTime();

        return (
          item.status==='scheduled' &&
          item.provider_status==='NS' &&
          Number.isFinite(start) &&
          start>now &&
          item.provider_fixture_id
        );
      })
      .sort(
        (a,b)=>
          new Date(a.start_time).getTime()-
          new Date(b.start_time).getTime()
      );

    const fixtureIds=futureFixtures
      .map(item=>String(item.provider_fixture_id));

    const completeFixtures=new Set();

    if(fixtureIds.length){
      const {
        data:storedOdds,
        error:storedOddsError
      }=await db
        .from('provider_odds')
        .select('provider_fixture_id,selection_key')
        .eq('provider','api-football')
        .eq('bookmaker_id',8)
        .in('provider_fixture_id',fixtureIds);

      if(storedOddsError) throw storedOddsError;

      const selectionsByFixture=new Map();

      for(const row of storedOdds||[]){
        const id=String(row.provider_fixture_id);

        if(!selectionsByFixture.has(id)){
          selectionsByFixture.set(id,new Set());
        }

        selectionsByFixture
          .get(id)
          .add(String(row.selection_key));
      }

      const required=[
        'Home',
        'Draw',
        'Away',
        'Over 2.5',
        'Under 2.5'
      ];

      for(const [id,selections] of selectionsByFixture){
        if(required.every(key=>selections.has(key))){
          completeFixtures.add(id);
        }
      }
    }

    const candidates=futureFixtures
      .filter(
        item=>
          !completeFixtures.has(
            String(item.provider_fixture_id)
          )
      )
      .slice(
        0,
        clampFootballLimit(limit,1,10)
      );

    for(const candidate of candidates){
      const fixtureId=String(
        candidate.provider_fixture_id
      );

      checkedFixtures.push(fixtureId);

      const {
        body,
        remaining:remainingOdds
      }=await apiFootball('odds',{
        fixture:fixtureId
      });

      oddsRemaining=remainingOdds;

      const oddsRows=(body?.response||[])
        .flatMap(extractFootballOdds);

      if(!oddsRows.length) continue;

      const {error}=await db
        .from('provider_odds')
        .upsert(oddsRows,{
          onConflict:
            'provider,provider_fixture_id,bookmaker_id,market_id,selection_key'
        });

      if(error) throw error;

      oddsSaved+=oddsRows.length;
      fixturesWithOdds.push(fixtureId);
    }
  }

  return {
    ok:true,
    date,
    received:results,
    saved:fixtures.length,

    mode:fixture
      ? 'manual'
      : auto
        ? 'automatic'
        : 'fixtures-only',

    fixture:fixture||null,

    checked_fixtures:checkedFixtures,
    fixtures_with_odds:fixturesWithOdds,

    odds_saved:oddsSaved,

    remaining_requests:
      oddsRemaining??remaining
  };
}
