import {authenticatedClient,apiFailure,json,readBody,ApiError} from '@/lib/server/api';
import {checkoutSchema} from '@/lib/billing/domain';
import {startCheckout} from '@/lib/billing/server';
export const runtime='nodejs';
export async function POST(request:Request){try{
 const {user}=await authenticatedClient(request);const p=checkoutSchema.safeParse(await readBody(request));if(!p.success)throw new ApiError(400,'Selecione mensal ou anual.');
 return json(await startCheckout(user.id,p.data.cycle));
}catch(e){return apiFailure(e);}}
