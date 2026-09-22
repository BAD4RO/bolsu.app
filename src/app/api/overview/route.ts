import {authenticatedClient,json,apiFailure,ApiError,readBody} from '@/lib/server/api';
import {homePreferencesSchema} from '@/lib/domain/overview';
import {todayBR} from '@/lib/domain/validation';
export async function GET(request:Request){try{
 const {client,user}=await authenticatedClient();const page=Number(new URL(request.url).searchParams.get('page')||0);
 if(!Number.isInteger(page)||page<0||page>100000)throw new ApiError(400,'Página inválida.');
 const {data,error}=await client.rpc('bolsu_home_snapshot',{p_page:page});if(error)throw error;
 return json({...data,email:user.email??''});
}catch(e){return apiFailure(e);}}
export async function POST(request:Request){try{
 const {client}=await authenticatedClient(request);
 const {error}=await client.rpc('bolsu_planning',{p_operation:'recurrence.generate',p_data:{mes:todayBR().slice(0,7)+'-01'},p_request_id:crypto.randomUUID()});
 if(error)throw error;return json({synced:true});
}catch(e){return apiFailure(e);}}
export async function PATCH(request:Request){try{
 const {client}=await authenticatedClient(request);const parsed=homePreferencesSchema.safeParse(await readBody(request));
 if(!parsed.success)throw new ApiError(400,parsed.error.issues[0].message);
 const {error}=await client.rpc('bolsu_home_preferences',{p_data:parsed.data});
 if(error){if(error.code==='22023')throw new ApiError(400,error.message);throw error;}return json({saved:true});
}catch(e){return apiFailure(e);}}
