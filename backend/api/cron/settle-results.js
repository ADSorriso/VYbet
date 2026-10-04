import {json,method} from '../../lib/http.js';
import {supabaseAdmin} from '../../lib/supabase.js';
import {settleMatch} from '../../lib/result-engine.js';

const SETTLEMENT_LIMIT=5;

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

  return json(res,200,{
    ok:true,

    settlement:{
      checked:(matches||[]).length,
      processed
    },

    football_sync:{
      ok:true,
      skipped:true,
      reason:'moved_to_fly'
    }
  });
}
