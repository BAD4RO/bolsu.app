import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/domain/access';
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function authenticatedClient(request?: Request) {
  if (request && !['GET','HEAD'].includes(request.method) && !isSameOrigin(request.url,request.headers.get('origin'))) throw new ApiError(403,'Origem da solicitação inválida.');
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new ApiError(401,'Entre na sua conta para continuar.');
  return { client, user: data.user };
}
export function json(data: unknown, status = 200) { return NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}}); }
export function apiFailure(error: unknown) {
  if(error&&typeof error==='object'&&'code' in error&&error.code==='P0002')return json({error:'message' in error?String(error.message):'Recurso do plano indisponível.',code:'PLAN_LIMIT',planUrl:'/assinatura'},403);
  if (error instanceof ApiError) return json({error:error.message},error.status);
  return json({error:'Não foi possível carregar ou salvar os dados. Tente novamente. Se persistir, a conexão com a base precisa ser verificada.'},503);
}
export async function readBody(request: Request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new ApiError(415,'Envie os dados em JSON.');
  const body = await request.text();
  if (body.length > 8192) throw new ApiError(413,'Solicitação muito grande.');
  try { return JSON.parse(body); } catch { throw new ApiError(400,'Dados inválidos.'); }
}
