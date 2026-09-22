import {authenticatedClient,json,apiFailure,readBody,ApiError} from '@/lib/server/api';
import {planningEnvelope,planningSchemas} from '@/lib/domain/planning';
import {isDateOnly} from '@/lib/domain/validation';
export async function GET(request:Request){try{
 const {client}=await authenticatedClient();const url=new URL(request.url);const month=url.searchParams.get('month')||'';const page=Number(url.searchParams.get('page')||0);
 if(!/^\d{4}-\d{2}$/.test(month)||!isDateOnly(month+'-01')||month<'1900-01'||month>'2200-12'||!Number.isInteger(page)||page<0||page>100000)throw new ApiError(400,'Período inválido.');
 const {data,error}=await client.rpc('bolsu_planning_snapshot',{p_month:month+'-01',p_page:page});if(error)throw error;return json(data);
}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{
 const {client}=await authenticatedClient(request);const envelope=planningEnvelope.safeParse(await readBody(request));
 if(!envelope.success)throw new ApiError(400,envelope.error.issues[0].message);
 const {operation,requestId}=envelope.data;const parsed=planningSchemas[operation].safeParse(envelope.data.data);
 if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
 const {data,error}=await client.rpc('bolsu_planning',{p_operation:operation,p_data:parsed.data,p_request_id:requestId});
 if(error){if(error.code==='22023')throw new ApiError(400,error.message);if(['23514','23502','22P02','22007','22008','22003'].includes(error.code))throw new ApiError(400,'Confira os campos, valores e datas.');throw error;}return json(data);
}catch(e){return apiFailure(e);}}
