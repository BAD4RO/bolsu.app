import {authenticatedClient,apiFailure,json} from '@/lib/server/api';
import {billingEnabledFor} from '@/lib/billing/server';
import {billingConfig} from '@/lib/billing/config';
import {TEST_PRICES} from '@/lib/billing/domain';
export const runtime='nodejs';
export async function GET(){try{
 const {client,user}=await authenticatedClient();const {data,error}=await client.rpc('bolsu_billing_status',{});if(error)throw error;
 return json({enabled:billingEnabledFor(user.id),mode:billingConfig()?.mode||'test',prices:TEST_PRICES,order:data});
}catch(e){return apiFailure(e);}}
