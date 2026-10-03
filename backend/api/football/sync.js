import {cors,json,method} from '../../lib/http.js';
import {
  syncFootball,
  validFootballDate,
  footballToday,
  clampFootballLimit
} from '../../lib/football-sync.js';

export default async function handler(req,res){
  if(cors(req,res)||!method(req,res,['GET','POST'])) return;

  const adminKey=process.env.VYBET_ADMIN_KEY;

  if(!adminKey||req.headers['x-admin-key']!==adminKey){
    return json(res,401,{
      ok:false,
      error:'Admin não autorizado.'
    });
  }

  const date=validFootballDate(req.query?.date)
    ? String(req.query.date)
    : footballToday();

  const fixture=String(req.query?.fixture||'').trim();

  const auto=String(req.query?.auto||'')==='1';

  const limit=clampFootballLimit(
    req.query?.limit||5,
    1,
    10
  );

  try{
    const result=await syncFootball({
      date,
      fixture,
      auto,
      limit
    });

    return json(res,200,result);

  }catch(e){
    return json(res,500,{
      ok:false,
      error:e.message
    });
  }
}
