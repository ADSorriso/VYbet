import {cors,json} from '../lib/http.js';
export default async function handler(req,res){if(cors(req,res))return;return json(res,200,{ok:true,service:'VYBET API',mode:'demo'});}
