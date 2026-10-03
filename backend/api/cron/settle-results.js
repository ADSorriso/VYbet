import {json,method} from '../../lib/http.js';
import {supabaseAdmin} from '../../lib/supabase.js';
import {settleMatch} from '../../lib/result-engine.js';

import {
  syncFootballFixtures,
  syncFootballOdds,
  footballToday
} from '../../lib/football-sync.js';

const SETTLEMENT_LIMIT=5;
const FOOTBALL_SYNC_INTERVAL_MS=30*60*1000;

function oddsWindow(){
  const now=new Date();

  return (
    now.getUTCMinutes()<15 &&
    now.getUTCHours()%3===0
  );
}

export default async function handler(req,res){
  if(!method(req,res,['GET'])) return;

  const secret=process.env.CRON_SECRET;

  if(
    !secret ||
    req.headers.authorization!==`Bearer ${secret}`
  ){
    return json(res,401,{
      ok:false,
      error:'Cron não autorizado.'
    });
  }

  const db=supabaseAdmin();

  const {
    data:matches,
    error
  }=await db
    .from('demo_match_results')
    .select(
      'match_key,home_team,away_team,home_score,away_score,status,settled_at'
    )
    .eq('status','finished')
    .is('settled_at',null)
    .limit(SETTLEMENT_LIMIT);

  if(error){
    return json(res,500,{
      ok:false,
      error:error.message
    });
  }

  const processed=[];

  for(const m of matches||[]){
    try{
      const result=await settleMatch({
        matchKey:m.match_key,
        homeTeam:m.home_team,
        awayTeam:m.away_team,
        homeScore:m.home_score,
        awayScore:m.away_score
      });

      const {
        error:updateError
      }=await db
        .from('demo_match_results')
        .update({
          settled_at:new Date().toISOString()
        })
        .eq('match_key',m.match_key);

      if(updateError){
        throw updateError;
      }

      processed.push({
        match_key:m.match_key,
        ok:true,
        ...result
      });

    }catch(e){
      processed.push({
        match_key:m.match_key,
        ok:false,
        error:e.message
      });
    }
  }

  let fixturesSync={
    ok:true,
    skipped:true,
    reason:'not_due'
  };

  try{
    const {
      data:lastFixture,
      error:lastFixtureError
    }=await db
      .from('demo_match_results')
      .select('updated_at')
      .eq('provider','api-football')
      .order('updated_at',{
        ascending:false
      })
      .limit(1)
      .maybeSingle();

    if(lastFixtureError){
      throw lastFixtureError;
    }

    const lastUpdate=
      lastFixture?.updated_at
        ? new Date(
            lastFixture.updated_at
          ).getTime()
        : 0;

    const age=
      Date.now()-lastUpdate;

    const syncDue=
      !lastUpdate ||
      age>=FOOTBALL_SYNC_INTERVAL_MS;

    if(syncDue){
      fixturesSync=
        await syncFootballFixtures({
          date:footballToday()
        });
    }else{
      fixturesSync={
        ok:true,
        skipped:true,
        reason:'fixtures_recent',

        next_sync_in_ms:
          Math.max(
            0,
            FOOTBALL_SYNC_INTERVAL_MS-age
          )
      };
    }

  }catch(e){
    fixturesSync={
      ok:false,
      error:e.message
    };
  }

  let oddsSync={
    ok:true,
    skipped:true,
    reason:'outside_odds_window'
  };

  if(oddsWindow()){
    try{
      oddsSync=
        await syncFootballOdds({
          limit:1
        });

    }catch(e){
      oddsSync={
        ok:false,
        error:e.message
      };
    }
  }

  return json(res,200,{
    ok:true,

    settlement:{
      checked:(matches||[]).length,
      processed
    },

    football_sync:{
      fixtures:fixturesSync,
      odds:oddsSync
    }
  });
}
