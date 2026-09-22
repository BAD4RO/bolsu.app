import {timingSafeEqual} from 'node:crypto';
import {json,apiFailure,ApiError} from '@/lib/server/api';
import {reconcileBatch} from '@/lib/billing/server';
export const runtime='nodejs';
export const maxDuration=300;
export async function POST(request:Request){try{
 const secret=process.env.BOLSU_BILLING_RECONCILE_SECRET,provided=request.headers.get('authorization')||'';
 const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(provided);
 if(!secret||secret.length<32||actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new ApiError(401,'Acesso negado.');
 const result=await reconcileBatch();return json(result,result.failed?503:200);
}catch(e){return apiFailure(e);}}
