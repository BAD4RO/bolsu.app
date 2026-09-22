import { authenticatedClient, json, apiFailure, readBody, ApiError } from '@/lib/server/api';
import { accountSchema, toCents } from '@/lib/domain/validation';
export async function GET() {
  try {
    const {client,user} = await authenticatedClient();
    const {data,error} = await client.from('saldos_contas').select('*').eq('usuario_id',user.id).order('created_at');
    if(error) throw error;
    return json({accounts:data});
  } catch(error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try {
    const {client} = await authenticatedClient(request);
    const parsed = accountSchema.safeParse(await readBody(request));
    if(!parsed.success) throw new ApiError(400,parsed.error.issues[0].message);
    const v=parsed.data;
    const {data,error} = await client.rpc('bolsu_create_account',{p_nome:v.nome,p_tipo:v.tipo,p_saldo:toCents(v.saldo_inicial)/100,p_data:v.data_saldo_inicial,p_incluir:v.incluir_no_disponivel});
    if(error) throw error;
    return json({account:data},201);
  } catch(error) { return apiFailure(error); }
}
