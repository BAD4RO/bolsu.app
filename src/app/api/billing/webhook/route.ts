import {billingContext,processBillingEvent,recordEvent} from '@/lib/billing/server';
import {BILLING_EVENTS,assertMode} from '@/lib/billing/domain';
import {json,apiFailure,ApiError} from '@/lib/server/api';
export const runtime='nodejs';
export const maxDuration=120;
export async function POST(request:Request){try{
 const c=billingContext();const signature=request.headers.get('stripe-signature');if(!signature)throw new ApiError(400,'Assinatura do evento ausente.');
 const reader=request.body?.getReader();if(!reader)throw new ApiError(400,'Evento vazio.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>262144){await reader.cancel();throw new ApiError(413,'Evento muito grande.');}chunks.push(value);}
 let event;try{event=c.stripe.webhooks.constructEvent(Buffer.concat(chunks),signature,c.config.webhook);assertMode(event,c.config.livemode);}catch{throw new ApiError(400,'Evento inválido.');}
 if(!BILLING_EVENTS.has(event.type))return json({received:true});
 if(!('id' in event.data.object))throw new ApiError(400,'Recurso do evento ausente.');
 const queued={id:event.id,topic:event.type,resource_id:event.data.object.id,processed_at:null,attempts:0};
 const pending=await recordEvent(c,queued,'enqueue');
 // Falhas retornam 503 para a Stripe repetir; a fila também permite reconciliação.
 if(pending)await processBillingEvent(queued);
 return json({received:true});
}catch(e){return apiFailure(e);}}
