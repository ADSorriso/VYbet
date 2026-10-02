export function cors(req,res){
 const allowed=process.env.ALLOWED_ORIGIN||'*';
 res.setHeader('Access-Control-Allow-Origin',allowed);
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
 res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS');
 if(req.method==='OPTIONS'){res.status(204).end();return true} return false;
}
export function json(res,status,data){return res.status(status).json(data)}
export function method(req,res,allowed){if(!allowed.includes(req.method)){json(res,405,{ok:false,error:'Método não permitido'});return false}return true}
