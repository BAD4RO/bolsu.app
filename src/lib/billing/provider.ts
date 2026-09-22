import Stripe from 'stripe';
import {assertMode,objectId,validatePrice,safeStripeURL} from './domain';
import type {BillingConfig} from './config';
import type {BillingOrder,BillingPayment} from './types';

export function stripeClient(config:BillingConfig){return new Stripe(config.secret,{apiVersion:'2026-08-26.dahlia',maxNetworkRetries:1,timeout:12000});}
export function assertSubscription(s:Stripe.Subscription,order:BillingOrder,livemode=false){
 assertMode(s,livemode);const item=s.items.data[0];
 if((s.metadata.supabase_user_id&&s.metadata.supabase_user_id!==order.usuario_id)||s.metadata.bolsu_order!==order.id||objectId(s.customer)!==order.customer_id||s.items.has_more||s.items.data.length!==1||!item||item.quantity!==1||item.price.id!==order.price_id)throw new Error('Subscription mismatch');
 validatePrice(item.price,order.ciclo,false,livemode);
}
export function checkoutParameters(order:BillingOrder,config:BillingConfig):Stripe.Checkout.SessionCreateParams{
 return {mode:'subscription',customer:order.customer_id!,client_reference_id:order.id,line_items:[{price:order.price_id,quantity:1}],payment_method_types:['card'],allow_promotion_codes:false,
  metadata:{bolsu_order:order.id,supabase_user_id:order.usuario_id},subscription_data:{metadata:{bolsu_order:order.id,supabase_user_id:order.usuario_id}},
  success_url:config.appURL+'/assinatura?checkout=returned',cancel_url:config.appURL+'/assinatura?checkout=canceled',
  expires_at:Math.floor(new Date(order.created_at).getTime()/1000)+60*60,
 };
}
export async function recoverCheckout(stripe:Stripe,order:BillingOrder){
 const sessions=await stripe.checkout.sessions.list({customer:order.customer_id!,limit:100});
 if(sessions.has_more)throw new Error('Checkout recovery requires review');
 const matches=sessions.data.filter(s=>s.client_reference_id===order.id);
 if(matches.length!==1)throw new Error('Checkout creation is uncertain; operator reconciliation required');
 return matches[0];
}
export function assertCheckout(s:Stripe.Checkout.Session,order:BillingOrder,livemode=false){
 assertMode(s,livemode);if((s.metadata?.supabase_user_id&&s.metadata.supabase_user_id!==order.usuario_id)||s.client_reference_id!==order.id||s.metadata?.bolsu_order!==order.id||s.mode!=='subscription'||objectId(s.customer)!==order.customer_id)throw new Error('Checkout mismatch');
 if(s.url)safeStripeURL(s.url,'checkout');
}
// Só faturas integralmente pagas por cartão e sem reembolso/disputa concedem um período.
// O Checkout não oferece trial, cupom, rateio ou mudança de preço.
export async function confirmedPayments(stripe:Stripe,order:BillingOrder,subscription:Stripe.Subscription,now=Date.now(),livemode=false):Promise<BillingPayment[]>{
 const result:BillingPayment[]=[];let cursor:string|undefined;let count=0;
 do{
  const invoices=await stripe.invoices.list({subscription:subscription.id,limit:100,...(cursor?{starting_after:cursor}:{})});
  for(const invoice of invoices.data){
   if(++count>500)throw new Error('Invoice reconciliation limit exceeded');
   assertMode(invoice,livemode);
   if(objectId(invoice.customer)!==order.customer_id||objectId(invoice.parent?.subscription_details?.subscription)!==subscription.id)throw new Error('Invoice ownership mismatch');
   if(invoice.status!=='paid'||invoice.total===0)continue;
   const lines=invoice.lines.data;
   // Old paid invoices cannot extend access and must not block recovery of current payments.
   if(!invoice.lines.has_more&&lines.length>0&&lines.every(line=>line.period.end<=now/1000))continue;
   if(invoice.lines.has_more||lines.length!==1)throw new Error('Unsupported invoice composition');
   const line=lines[0];
   if(line.pricing?.price_details?.price!==order.price_id||line.quantity!==1||line.amount!==order.amount_cents||invoice.currency!=='brl'||invoice.total!==order.amount_cents||invoice.amount_paid!==order.amount_cents)throw new Error('Invoice price mismatch');
   if(line.parent?.subscription_item_details?.proration||line.period.start>now/1000+300)throw new Error('Unsupported invoice period');
   // Períodos já encerrados não dão acesso nem exigem consulta de cobrança.
   if(line.period.end<=now/1000)continue;
   const payments=await stripe.invoicePayments.list({invoice:invoice.id,status:'paid',limit:100});
   if(payments.has_more||payments.data.length!==1)throw new Error('Unsupported invoice payments');
   const entry=payments.data[0];assertMode(entry,livemode);
   if(entry.amount_paid!==order.amount_cents||entry.currency!=='brl'||entry.payment.type!=='payment_intent')throw new Error('Unsupported payment');
   const intentId=objectId(entry.payment.payment_intent);if(!intentId)throw new Error('Missing payment intent');
   const intent=await stripe.paymentIntents.retrieve(intentId,{expand:['latest_charge']});assertMode(intent,livemode);
   const charge=intent.latest_charge;
   if(!charge||typeof charge==='string')throw new Error('Missing charge');assertMode(charge,livemode);
   if(objectId(intent.customer)!==order.customer_id||intent.currency!=='brl'||intent.amount_received!==order.amount_cents||intent.status!=='succeeded'||charge.amount!==order.amount_cents||!charge.paid)throw new Error('Payment mismatch');
   result.push({id:intent.id,invoice_id:invoice.id,status:charge.disputed?'disputed':charge.amount_refunded>0?'refunded':'approved',amount_cents:order.amount_cents,paid_until:new Date(line.period.end*1000).toISOString()});
  }
  cursor=invoices.has_more?invoices.data.at(-1)?.id:undefined;
  if(invoices.has_more&&!cursor)throw new Error('Invalid invoice pagination');
 }while(cursor);
 return result;
}
