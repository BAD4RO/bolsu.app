import {authenticatedClient,json,apiFailure} from '@/lib/server/api';
export async function GET(){try{const {client}=await authenticatedClient();const {data,error}=await client.rpc('bolsu_comparisons',{});if(error)throw error;return json({months:data});}catch(e){return apiFailure(e);}}
