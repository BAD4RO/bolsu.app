import { authenticatedClient, json, apiFailure } from '@/lib/server/api';
export async function GET(request:Request) {
  try {
    const {client,user} = await authenticatedClient();
    let query=client.from('categorias').select('*').eq('usuario_id',user.id).order('nome');
    if(new URL(request.url).searchParams.get('all')!=='true')query=query.eq('arquivada',false);
    const {data,error}=await query;
    if(error) throw error;
    return json({categories:data});
  } catch(error) { return apiFailure(error); }
}
