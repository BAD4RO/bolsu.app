import {test} from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {billingConfig} from '../src/lib/billing/config';
import {hasScheduledCancellation,TEST_PRICES,checkoutSchema,emptyBillingSchema,entitlement,safeStripeURL,validatePrice} from '../src/lib/billing/domain';
import {checkoutParameters,assertCheckout,confirmedPayments,assertSubscription} from '../src/lib/billing/provider';
import type {BillingOrder,BillingPayment} from '../src/lib/billing/types';

const env={BOLSU_BILLING_MODE:'test',STRIPE_SECRET_KEY:'sk_test_fake',STRIPE_WEBHOOK_SECRET:'whsec_fake',STRIPE_PREMIUM_MONTHLY_PRICE_ID:'price_month',STRIPE_PREMIUM_YEARLY_PRICE_ID:'price_year',BOLSU_APP_URL:'http://localhost:3000',SUPABASE_SERVICE_ROLE_KEY:'x'.repeat(40),BOLSU_BILLING_TEST_USER_IDS:'00000000-0000-4000-8000-000000000001'};
const order={id:'00000000-0000-4000-8000-000000000002',usuario_id:env.BOLSU_BILLING_TEST_USER_IDS,ciclo:'monthly',amount_cents:1990,price_id:'price_month',customer_id:'cus_test',created_at:'2026-09-22T00:00:00Z'} as BillingOrder;
const now=new Date('2026-09-22T10:00:00Z');
const price={id:'price_month',livemode:false,active:true,currency:'brl',unit_amount:1990,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},billing_scheme:'per_unit'} as Stripe.Price;
const sub={id:'sub_test',livemode:false,metadata:{bolsu_order:order.id},customer:'cus_test',items:{data:[{price,quantity:1}],has_more:false},trial_start:null,trial_end:null,status:'active',cancel_at_period_end:false} as unknown as Stripe.Subscription;
const paid:BillingPayment={id:'pi_test',invoice_id:'in_test',status:'approved',amount_cents:1990,paid_until:'2026-10-22T00:00:00.000Z'};
function fixture(change:{refund?:number;dispute?:boolean;invoiceStatus?:string;amount?:number;owner?:string}={}){
 const invoice={id:'in_test',livemode:false,customer:change.owner||'cus_test',parent:{subscription_details:{subscription:'sub_test'}},status:change.invoiceStatus||'paid',currency:'brl',total:change.amount??1990,amount_paid:1990,lines:{has_more:false,data:[{pricing:{price_details:{price:'price_month'}},quantity:1,amount:1990,period:{start:now.getTime()/1000-3600,end:new Date(paid.paid_until!).getTime()/1000},parent:{subscription_item_details:{proration:false}}}]}};
 return {invoices:{list:async()=>({data:[invoice],has_more:false})},invoicePayments:{list:async()=>({data:[{id:'inpay_test',livemode:false,amount_paid:1990,currency:'brl',payment:{type:'payment_intent',payment_intent:'pi_test'}}],has_more:false})},paymentIntents:{retrieve:async()=>({id:'pi_test',livemode:false,customer:'cus_test',currency:'brl',amount_received:1990,status:'succeeded',latest_charge:{id:'ch_test',livemode:false,amount:1990,paid:true,amount_refunded:change.refund||0,disputed:change.dispute||false}})}} as unknown as Stripe;
}
test('configuração recusa mistura de ambientes e URL de retorno não segura',()=>{
 assert.ok(billingConfig(env));
 for(const patch of [{STRIPE_SECRET_KEY:'sk_live_fake'},{BOLSU_BILLING_MODE:'live'},{BOLSU_APP_URL:'http://externo.test'},{BOLSU_APP_URL:'https://user:pass@site.test'}])assert.equal(billingConfig({...env,...patch}),null);
});
test('checkout só aceita ciclo: preço, usuário, cupom e trial não vêm do navegador',()=>{
 assert.equal(checkoutSchema.safeParse({cycle:'monthly',amount:1}).success,false);
 assert.equal(emptyBillingSchema.safeParse({usuario_id:'outro'}).success,false);
 const p=checkoutParameters(order,billingConfig(env)!);assert.equal(p.mode,'subscription');assert.deepEqual(p.line_items,[{price:'price_month',quantity:1}]);assert.equal(p.allow_promotion_codes,false);assert.equal(p.subscription_data?.trial_period_days,undefined);assert.equal(p.success_url,'http://localhost:3000/assinatura?checkout=returned');
});
test('mensal/anual validam preços de teste exatos e periodicidade',()=>{
 validatePrice(price,'monthly');assert.equal(TEST_PRICES.yearly,19990);
 validatePrice({...price,active:false},'monthly',false);
 for(const patch of [{livemode:true},{currency:'usd'},{unit_amount:1},{active:false}])assert.throws(()=>validatePrice({...price,...patch},'monthly'));
 assert.throws(()=>validatePrice(price,'yearly'));
});
test('retorno, cliente e metadados divergentes não vinculam uma assinatura',()=>{
 assertSubscription(sub,order);assert.throws(()=>assertSubscription({...sub,customer:'cus_other'},order));assert.throws(()=>assertSubscription({...sub,livemode:true},order));
 assert.throws(()=>assertCheckout({livemode:false,customer:'cus_other',mode:'subscription',client_reference_id:order.id,metadata:{bolsu_order:order.id}} as unknown as Stripe.Checkout.Session,order));
 assert.throws(()=>safeStripeURL('https://checkout.stripe.com.evil.test/','checkout'));assert.throws(()=>safeStripeURL('javascript:alert(1)','portal'));
});
test('pagamento confirmado concede apenas o período pago; falho ou pendente não concede',async()=>{
 assert.deepEqual(await confirmedPayments(fixture(),order,sub,now.getTime()),[paid]);
 assert.deepEqual(await confirmedPayments(fixture({invoiceStatus:'open'}),order,sub,now.getTime()),[]);
 await assert.rejects(confirmedPayments(fixture({amount:1}),order,sub,now.getTime()),/price mismatch/);
 await assert.rejects(confirmedPayments(fixture({owner:'cus_other'}),order,sub,now.getTime()),/ownership mismatch/);
 assert.equal(entitlement('active',false,[],now).plan,'free');assert.equal(entitlement('past_due',false,[],now).status,'past_due');
});
test('cancelamento preserva período pago, expiração retira acesso e repetição não estende data',()=>{
 assert.equal(entitlement('active',true,[paid],now).status,'canceled');assert.equal(entitlement('canceled',true,[paid],now).plan,'plus');
 assert.equal(entitlement('active',false,[paid],new Date('2026-11-01')).plan,'free');
 assert.equal(entitlement('active',false,[paid,paid],now).paidUntil,paid.paid_until);
});
test('reembolso ou disputa não concede o período daquela cobrança',async()=>{
 for(const change of [{refund:1990},{refund:1},{dispute:true}]){const payments=await confirmedPayments(fixture(change),order,sub,now.getTime());assert.equal(entitlement('active',false,payments,now).plan,'free');}
});
test('assinatura Stripe verifica corpo bruto, segredo e timestamp; corpo adulterado é rejeitado',()=>{
 const stripe=new Stripe('sk_test_fake');const payload=JSON.stringify({id:'evt_test',object:'event',type:'invoice.paid',livemode:false,data:{object:{id:'in_test'}}});
 const header=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_fake'});
 assert.equal(stripe.webhooks.constructEvent(payload,header,'whsec_fake').id,'evt_test');
 assert.throws(()=>stripe.webhooks.constructEvent(payload+' ',header,'whsec_fake'));assert.throws(()=>stripe.webhooks.constructEvent(payload,header,'whsec_other'));
 const old=stripe.webhooks.generateTestHeaderString({payload,secret:'whsec_fake',timestamp:1});assert.throws(()=>stripe.webhooks.constructEvent(payload,old,'whsec_fake'));
});

test('produção exige chaves e preços do mesmo ambiente e HTTPS',()=>{
 const live={...env,BOLSU_BILLING_MODE:'live',STRIPE_SECRET_KEY:'sk_live_fake',BOLSU_APP_URL:'https://bolsu.example',NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_live_fake'};
 assert.ok(billingConfig(live));
 assert.equal(billingConfig({...live,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:'pk_test_fake'}),null);
 assert.equal(billingConfig({...live,BOLSU_APP_URL:'http://localhost:3000'}),null);
 assert.equal(billingConfig({...env,STRIPE_SECRET_KEY:'sk_test_...'}),null);
 validatePrice({...price,livemode:true},'monthly',true,true);
 assert.throws(()=>validatePrice(price,'monthly',true,true));
 assertCheckout({livemode:true,customer:order.customer_id,mode:'subscription',client_reference_id:order.id,metadata:{bolsu_order:order.id}} as unknown as Stripe.Checkout.Session,order,true);
});
test('metadata associa checkout e assinatura ao usuário autenticado',()=>{
 const params=checkoutParameters(order,billingConfig(env)!);
 assert.equal(params.metadata?.supabase_user_id,order.usuario_id);
 assert.equal(params.subscription_data?.metadata?.supabase_user_id,order.usuario_id);
 assert.throws(()=>assertSubscription({...sub,metadata:{...sub.metadata,supabase_user_id:'outro'}},order));
 assertSubscription({...sub,status:'trialing',trial_end:1900000000},order);
});
test('unpaid e incomplete não concedem acesso mesmo com pagamento anterior',()=>{
 for(const status of ['unpaid','incomplete','incomplete_expired','paused'])assert.equal(entitlement(status,false,[paid],now).plan,'free');
});

test('aquisição repete só conflito de lease, sem repetir erros permanentes',async()=>{
 const {acquireWithRetry}=await import('../src/lib/billing/retry');let calls=0;const delays:number[]=[];
 const result=await acquireWithRetry(async()=>++calls<3?{error:{code:'55P03'}}:{error:null},async ms=>{delays.push(ms);});
 assert.equal(result.error,null);assert.equal(calls,3);assert.equal(delays.length,2);
 calls=0;await acquireWithRetry(async()=>{calls++;return {error:{code:'P0003'}};},async()=>{});assert.equal(calls,1);
 calls=0;const conflict=await acquireWithRetry(async()=>{calls++;return {error:{code:'55P03'}};},async()=>{});assert.equal(calls,5);assert.equal(conflict.error?.code,'55P03');
});
test('estados sem acesso não dependem de consulta de faturas antigas para revogar',async()=>{
 const {needsPaymentVerification}=await import('../src/lib/billing/retry');
 for(const status of ['unpaid','incomplete','incomplete_expired','paused'])assert.equal(needsPaymentVerification(status),false);
 for(const status of ['active','past_due','canceled','trialing'])assert.equal(needsPaymentVerification(status),true);
});
test('recusa não concede, pagamento posterior recupera e evento atrasado não inventa período',async()=>{
 const payments=await confirmedPayments(fixture({invoiceStatus:'open'}),order,sub,now.getTime());assert.equal(entitlement('past_due',false,payments,now).plan,'free');
 const recovered=await confirmedPayments(fixture(),order,sub,now.getTime());assert.equal(entitlement('active',false,recovered,now).plan,'plus');
 assert.equal(entitlement('past_due',false,recovered,now).paidUntil,paid.paid_until);
});
test('fatura antiga fora da oferta não impede conferência do pagamento atual',async()=>{
 const stripe=fixture();const list=stripe.invoices.list.bind(stripe.invoices);
 stripe.invoices.list=(async()=>{const r=await list();const old=structuredClone(r.data[0]);old.id='in_old';old.total=1;old.lines.data[0].period.end=now.getTime()/1000-1;return {...r,data:[old,...r.data]};}) as typeof stripe.invoices.list;
 assert.deepEqual(await confirmedPayments(stripe,order,sub,now.getTime()),[paid]);
});

 test('cancelamento por data preserva acesso pago e pode ser desfeito',()=>{
 for(const state of [{cancel_at_period_end:true,cancel_at:null},{cancel_at_period_end:false,cancel_at:1821628742}]){
 const cancel=hasScheduledCancellation(state);
 assert.equal(cancel,true);
 assert.equal(entitlement('active',cancel,[paid],now).cancelAtPeriodEnd,true);
 assert.equal(entitlement('active',cancel,[paid],now).plan,'plus');
 }
 const resumed=hasScheduledCancellation({cancel_at_period_end:false,cancel_at:null});
 assert.equal(resumed,false);
 assert.equal(entitlement('active',resumed,[paid],now).status,'active');
 });