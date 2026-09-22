import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callbackDestination } from '@/lib/domain/access';
import { callbackErrorCode } from '@/lib/domain/auth-callback';
export async function GET(request: NextRequest) {
 const params=request.nextUrl.searchParams,code=params.get('code'),hash=params.get('token_hash'),type=params.get('type');
 const recovery=type==='recovery'||params.get('next')==='/redefinir-senha';
 let target=callbackDestination(params.get('next')),failure:'browser'|'1'='1';
 const redirect=(path:string)=>{const response=NextResponse.redirect(new URL(path,request.url));response.headers.set('Cache-Control','private, no-store');return response;};
 try {
  const client=await createClient();
  if(hash&&(type==='signup'||type==='email'||type==='recovery')){
   const {error}=await client.auth.verifyOtp({token_hash:hash,type});
   if(!error){target=type==='recovery'?'/redefinir-senha':'/dashboard';return redirect(target);}
  }else if(code){
   const {error}=await client.auth.exchangeCodeForSession(code);
   if(!error)return redirect(target);
   failure=callbackErrorCode(error);
  }
 }catch{/* Tokens and provider details must never appear in logs or redirects. */}
 return redirect(`/login?auth_error=${failure}${recovery?'&recovery=1':''}`);
}
