import {authenticatedClient,apiFailure,json,readBody,ApiError} from '@/lib/server/api';
import {emptyBillingSchema} from '@/lib/billing/domain';
import {synchronizeBilling} from '@/lib/billing/server';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const {user}=await authenticatedClient(request);if(!emptyBillingSchema.safeParse(await readBody(request)).success)throw new ApiError(400,'Campos inválidos.');
 await synchronizeBilling(user.id);return json({updated:true});
}catch(e){return apiFailure(e);}}
