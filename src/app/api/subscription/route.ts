import { authenticatedClient, json, apiFailure,readBody,ApiError } from '@/lib/server/api';
import {planSchemas,planEnvelope} from '@/lib/domain/plans';
export async function GET() {
  try {
    const {client} = await authenticatedClient();
    const {data,error} = await client.rpc('bolsu_plan_snapshot',{});
    if(error) throw error;
    return json(data);
  } catch(error) { return apiFailure(error); }
}
export async function POST(request:Request){try{
 const {client}=await authenticatedClient(request);const envelope=planEnvelope.safeParse(await readBody(request));if(!envelope.success)throw new ApiError(400,'Operação inválida.');
 const {operation}=envelope.data;const parsed=planSchemas[operation].safeParse(envelope.data.data);if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
 const {data,error}=await client.rpc('bolsu_plan_manage',{p_operation:operation,p_data:parsed.data});
 if(error){if(['22023','23514','23502','22P02'].includes(error.code))throw new ApiError(400,error.message);if(error.code==='23505')throw new ApiError(400,'Já existe uma categoria com esse nome e tipo.');throw error;}return json(data);
}catch(e){return apiFailure(e);}}
