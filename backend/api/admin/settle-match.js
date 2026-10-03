import {cors,json,method} from '../../lib/http.js';
import {settleMatch} from '../../lib/result-engine.js';

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
  try{
    const result=await settleMatch({matchKey:match_key,homeTeam:home_team,awayTeam:away_team,homeScore:hs,awayScore:as});
    return json(res,200,{ok:true,match:{match_key,home_team,away_team,home_score:hs,away_score:as},...result});
  }catch(error){return json(res,500,{ok:false,error:error.message});}
}
