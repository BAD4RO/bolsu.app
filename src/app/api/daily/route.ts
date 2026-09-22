import { authenticatedClient,json,apiFailure,readBody,ApiError } from '@/lib/server/api';
import { dailySchemas,operationSchema } from '@/lib/domain/daily';
import { isDateOnly } from '@/lib/domain/validation';
export async function GET(request:Request){try{
 const {client,user}=await authenticatedClient();const url=new URL(request.url);const purchase=url.searchParams.get('purchase');
 if(purchase){if(!/^[a-f0-9-]{36}$/i.test(purchase))throw new ApiError(400,'Compra inválida.');const {data,error}=await client.from('transacoes').select('*').eq('usuario_id',user.id).eq('compra_id',purchase).eq('excluida',false).order('parcela').range(0,359);if(error)throw error;return json({purchase:data});}
 const month=url.searchParams.get('month')||'';const page=Number(url.searchParams.get('page')||'0');
 if(!/^\d{4}-\d{2}$/.test(month)||!isDateOnly(month+'-01')||month<'1900-01'||month>'2200-12'||!Number.isInteger(page)||page<0||page>100000)throw new ApiError(400,'Período inválido.');
 const type=url.searchParams.get('type')||'all',status=url.searchParams.get('status')||'all',category=url.searchParams.get('category')||undefined,search=(url.searchParams.get('search')||'').slice(0,160);
 if(!['all','receita','despesa'].includes(type)||!['all','previsto','realizado'].includes(status)||(category&&!/^[a-f0-9-]{36}$/i.test(category)))throw new ApiError(400,'Filtro inválido.');
 const {data,error}=await client.rpc('bolsu_daily_snapshot',{p_month:month+'-01',p_page:page,p_search:search,p_type:type,p_status:status,p_category:category});if(error)throw error;return json(data);
}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{
 const {client}=await authenticatedClient(request);const envelope=operationSchema.safeParse(await readBody(request));if(!envelope.success)throw new ApiError(400,envelope.error.issues[0].message);
 const {operation,requestId}=envelope.data;const parsed=dailySchemas[operation].safeParse(envelope.data.data);if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
 const {data,error}=await client.rpc('bolsu_daily',{p_operation:operation,p_data:parsed.data,p_request_id:requestId});
 if(error){if(error.code==='22023')throw new ApiError(400,error.message);if(['23514','23502','22P02','22007','22008','22003'].includes(error.code))throw new ApiError(400,'Confira os campos, valores e datas informados.');throw error;}
 return json(data);
}catch(e){return apiFailure(e);}}
