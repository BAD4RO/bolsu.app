import {authenticatedClient,apiFailure,ApiError} from '@/lib/server/api';
import {csvCell,exportKinds} from '@/lib/domain/plans';
export async function GET(request:Request){try{
 const {client}=await authenticatedClient();const kind=new URL(request.url).searchParams.get('kind')||'transacoes';
 if(!exportKinds.includes(kind as typeof exportKinds[number]))throw new ApiError(400,'Tipo de exportação inválido.');
 const first=await client.rpc('bolsu_export',{p_kind:kind,p_page:0});if(first.error)throw first.error;
 const encoder=new TextEncoder();let page=0,rows=first.data as Record<string,unknown>[],headers=Object.keys(rows[0]||{}),started=false;
 const body=new ReadableStream<Uint8Array>({async pull(controller){try{
  if(!started){controller.enqueue(encoder.encode('\uFEFF'+(headers.length?headers.map(csvCell).join(';'):'sem_registros')+'\r\n'));started=true;}
  if(!rows.length){controller.close();return;}
  controller.enqueue(encoder.encode(rows.map(r=>headers.map(h=>csvCell(r[h])).join(';')).join('\r\n')+'\r\n'));
  if(rows.length<1000){controller.close();return;}
  const next=await client.rpc('bolsu_export',{p_kind:kind,p_page:++page});if(next.error)throw next.error;rows=next.data as Record<string,unknown>[];
 }catch(e){controller.error(e);}}});
 return new Response(body,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="bolsu-${kind}.csv"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return apiFailure(e);}}
