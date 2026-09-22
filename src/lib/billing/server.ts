import 'server-only';
import {acquireWithRetry,needsPaymentVerification} from './retry';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import type Stripe from 'stripe';
import type {Database} from '@/lib/database.types';
import {ApiError} from '@/lib/server/api';
import {billingConfig,type BillingConfig} from './config';
import {stripeClient,assertCheckout,assertSubscription,checkoutParameters,recoverCheckout,confirmedPayments} from './provider';
import {hasScheduledCancellation,assertMode,objectId,TEST_PRICES,validatePrice,safeStripeURL} from './domain';
import type {BillingOrder,BillingCycle,BillingEvent} from './types';

export function billingContext(userId?:string){
 const config=billingConfig();if(!config)throw new ApiError(503,'Pagamentos ainda não estão configurados.');
 if(userId&&config.mode==='test'&&config.users.length>0&&!config.users.includes(userId))throw new ApiError(403,'Checkout disponível apenas para participantes do teste.');
 const db=createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!,config.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 return {config,db,stripe:stripeClient(config)};
}
type Context=ReturnType<typeof billingContext>;
function dbError(error:{code?:string;message:string}){if(['55P03','P0003'].includes(error.code||''))return new ApiError(409,error.message);return error;}
async function write(c:Context,r:BillingOrder,operation:string,data:unknown={}){
 const {error}=await c.db.rpc('bolsu_billing_write',{p_order:r.id,p_token:r.lease_token!,p_operation:operation,p_data:data});if(error)throw dbError(error);
}
async function locked<T>(c:Context,user:string,fn:(r:BillingOrder)=>Promise<T>,cycle?:BillingCycle){
 const {error:modeError}=await c.db.rpc('bolsu_billing_assert_mode',{p_live:c.config.livemode});if(modeError)throw modeError;
 const {data:r,error}=await acquireWithRetry(()=>c.db.rpc('bolsu_billing_acquire',{p_user:user,p_token:randomUUID(),...(cycle?{p_cycle:cycle,p_amount:TEST_PRICES[cycle],p_price:c.config[cycle]}:{})}));
 if(error)throw dbError(error);if(!r)throw new ApiError(404,'Nenhuma assinatura para atualizar.');
 try{return await fn(r);}finally{try{await write(c,r,'release');}catch{/* Uma lease vencida será recuperada pela próxima tentativa. */}}
}
async function ensureCustomer(c:Context,r:BillingOrder){
 if(r.customer_id)return;
 if(r.attempted&&Date.now()-new Date(r.created_at).getTime()>23*60*60*1000)throw new ApiError(409,'Criação pendente de conferência. Não iniciaremos outro pagamento.');
 const customer=await c.stripe.customers.create({metadata:{bolsu_order:r.id,supabase_user_id:r.usuario_id}},{idempotencyKey:'bolsu:customer:'+r.id});assertMode(customer,c.config.livemode);
 await write(c,r,'customer',{id:customer.id});r.customer_id=customer.id;
}
async function ensureCheckout(c:Context,r:BillingOrder,allowCreate:boolean){
 if(r.checkout_id){const session=await c.stripe.checkout.sessions.retrieve(r.checkout_id);assertCheckout(session,r,c.config.livemode);return session;}
 if(!allowCreate&&!r.attempted)return null;
 if(!r.attempted){await write(c,r,'attempt');r.attempted=true;}
 await ensureCustomer(c,r);
 let session:Stripe.Checkout.Session;
 // expires_at é persistente e repetível. Após a janela do checkout, só recuperar, jamais criar de novo.
 if(Date.now()-new Date(r.created_at).getTime()>25*60*1000){session=await recoverCheckout(c.stripe,r);}
 else{
  await write(c,r,'attempt');r.attempted=true;
  session=await c.stripe.checkout.sessions.create(checkoutParameters(r,c.config),{idempotencyKey:'bolsu:checkout:'+r.id});
 }
 assertCheckout(session,r,c.config.livemode);await write(c,r,'checkout',{id:session.id,url:session.url});r.checkout_id=session.id;r.checkout_url=session.url;
 return session;
}
async function syncLocked(c:Context,r:BillingOrder){
 const session=r.provider_id?null:await ensureCheckout(c,r,false);if(!session&&!r.provider_id){await write(c,r,'apply',{id:null,status:'creating',payments:[],cancel:false});return;}
 const subId=r.provider_id||objectId(session?.subscription);
 if(!subId){await write(c,r,'apply',{id:null,status:session?.status==='expired'?'expired':'pending',payments:[],cancel:false});return;}
 const sub=await c.stripe.subscriptions.retrieve(subId);assertSubscription(sub,r,c.config.livemode);
 const payments=needsPaymentVerification(sub.status)?await confirmedPayments(c.stripe,r,sub,Date.now(),c.config.livemode):[];
 await write(c,r,'apply',{id:sub.id,status:sub.status,cancel:hasScheduledCancellation(sub),current_period_end:new Date(sub.items.data[0].current_period_end*1000).toISOString(),trial_end:sub.trial_end?new Date(sub.trial_end*1000).toISOString():null,payments});
}
export async function startCheckout(user:string,cycle:BillingCycle){
 const c=billingContext(user);validatePrice(await c.stripe.prices.retrieve(c.config[cycle]),cycle,true,c.config.livemode);
 return locked(c,user,async r=>{
  const session=await ensureCheckout(c,r,true);
  if(!session?.url||session.status!=='open'){await syncLocked(c,r);throw new ApiError(409,'Checkout encerrado. Atualize a assinatura antes de iniciar outro.');}
  return {url:safeStripeURL(session.url,'checkout')};
 },cycle);
}
export async function synchronizeBilling(user:string){const c=billingContext(user);await locked(c,user,r=>syncLocked(c,r));}
export async function cancelBilling(user:string){
 const c=billingContext(user);await locked(c,user,async r=>{
  const session=await ensureCheckout(c,r,false);if(!session)throw new ApiError(409,'Criação ainda não confirmada. Atualize antes de cancelar.');
  const subId=objectId(session.subscription);
  if(subId){const sub=await c.stripe.subscriptions.retrieve(subId);assertSubscription(sub,r,c.config.livemode);if(sub.status!=='canceled')await c.stripe.subscriptions.update(sub.id,{cancel_at_period_end:true},{idempotencyKey:'bolsu:cancel:'+r.id+':'+r.lease_token});}
  else if(session.status==='open')await c.stripe.checkout.sessions.expire(session.id,{}, {idempotencyKey:'bolsu:expire:'+r.id});
  await syncLocked(c,r);
 });
}
export async function portalBilling(user:string){
 const c=billingContext(user);return locked(c,user,async r=>{
  if(!r.customer_id)throw new ApiError(409,'Nenhum cliente de cobrança confirmado.');
  // Portal permite faturas, método de pagamento e cancelamento ao fim do período.
  const configuration=await c.stripe.billingPortal.configurations.create({business_profile:{headline:c.config.livemode?'BOLSU':'BOLSU — ambiente de teste'},features:{invoice_history:{enabled:true},payment_method_update:{enabled:true},customer_update:{enabled:false},subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:false}}},{idempotencyKey:'bolsu:portal-config:'+c.config.mode+':v2'});
  assertMode(configuration,c.config.livemode);
  const session=await c.stripe.billingPortal.sessions.create({customer:r.customer_id,configuration:configuration.id,return_url:c.config.appURL+'/assinatura'});
  return {url:safeStripeURL(session.url,'portal')};
 });
}
export async function recordEvent(c:Context,event:BillingEvent,operation:string){const {error:modeError}=await c.db.rpc('bolsu_billing_assert_mode',{p_live:c.config.livemode});if(modeError)throw modeError;const {data,error}=await c.db.rpc('bolsu_billing_event',{p_id:event.id,p_topic:event.topic,p_resource:event.resource_id,p_operation:operation});if(error)throw error;return data;}
async function eventOrder(c:Context,event:Stripe.Event){
 const obj=event.data.object;
 let orderId:string|null=null,customer:string|null=null;
 if(obj.object==='checkout.session'){orderId=obj.client_reference_id;customer=objectId(obj.customer);}
 else if(obj.object==='subscription'){orderId=obj.metadata.bolsu_order||null;customer=objectId(obj.customer);}
 else if(obj.object==='invoice'){customer=objectId(obj.customer);}
 else if(obj.object==='charge'){customer=objectId(obj.customer);}
 else if(obj.object==='dispute'){
  const charge=await c.stripe.charges.retrieve(objectId(obj.charge)!);assertMode(charge,c.config.livemode);customer=objectId(charge.customer);
 }
 if(!orderId&&!customer)return null;
 let q=c.db.from('billing_orders').select('*');q=orderId?q.eq('id',orderId):q.eq('customer_id',customer!);
 const {data,error}=await q.maybeSingle();if(error)throw error;
 if(data&&customer&&data.customer_id!==customer)throw new Error('Event customer mismatch');return data;
}
export async function processBillingEvent(event:BillingEvent){
 const c=billingContext();try{
  // Consulta atual autenticada: payload de webhook, ordem de entrega e relógio do cliente não concedem privilégios.
  const remote=await c.stripe.events.retrieve(event.id);assertMode(remote,c.config.livemode);
  if(remote.type!==event.topic||!('id' in remote.data.object)||remote.data.object.id!==event.resource_id)throw new Error('Event mismatch');
  const order=await eventOrder(c,remote);
  if(order){if(c.config.mode==='test'&&c.config.users.length>0&&!c.config.users.includes(order.usuario_id))throw new Error('Test user not allowed');await locked(c,order.usuario_id,r=>syncLocked(c,r));}
  await recordEvent(c,event,'done');
 }catch(error){await recordEvent(c,event,'failed');if(error instanceof ApiError&&error.status===409)throw new ApiError(503,'Assinatura em atualização; evento será reprocessado.');throw error;}
}
export async function reconcileBatch(){
 const c=billingContext(),token=randomUUID();let processed=0,failed=0;
 const {error:modeError}=await c.db.rpc('bolsu_billing_assert_mode',{p_live:c.config.livemode});if(modeError)throw modeError;
 const {data:acquired,error:lockError}=await c.db.rpc('bolsu_billing_batch_lock',{p_token:token});if(lockError)throw lockError;
 if(!acquired)return {processed,failed,skipped:true};
 const deadline=Date.now()+180000;
 try{
  const events=await c.db.from('billing_events').select('*').is('processed_at',null).lte('next_attempt_at',new Date().toISOString()).order('next_attempt_at').order('created_at').limit(20);if(events.error)throw events.error;
  for(const e of events.data){if(Date.now()>=deadline)break;try{await processBillingEvent(e);processed++;}catch{failed++;}}
  const orders=await c.db.rpc('bolsu_billing_due',{p_users:c.config.mode==='test'&&c.config.users.length?c.config.users:null});if(orders.error)throw orders.error;
  for(const user of new Set(orders.data.map(r=>r.usuario_id))){if(Date.now()>=deadline)break;try{await synchronizeBilling(user);processed++;}catch{failed++;}}
  const pending=await c.db.from('billing_events').select('id',{count:'exact',head:true}).is('processed_at',null);if(pending.error)throw pending.error;
  return {processed,failed,pending:pending.count??0,skipped:false};
 }finally{
  const {error}=await c.db.rpc('bolsu_billing_batch_lock',{p_token:token,p_release:true});if(error)console.error('billing_batch_release_failed');
 }
}
export function billingEnabledFor(user:string,config:BillingConfig|null=billingConfig()){return !!config&&(config.mode==='live'||config.users.length===0||config.users.includes(user));}
