import {z} from 'zod';
import type Stripe from 'stripe';
import type {BillingCycle,BillingPayment} from './types';
export const checkoutSchema=z.object({cycle:z.enum(['monthly','yearly'])}).strict();
export const emptyBillingSchema=z.object({}).strict();
export const TEST_PRICES={monthly:1990,yearly:19990} as const;
export const BILLING_EVENTS=new Set(['checkout.session.completed','checkout.session.expired','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','customer.subscription.resumed','invoice.paid','invoice.payment_failed','invoice.payment_action_required','invoice.finalization_failed','invoice.voided','invoice.marked_uncollectible','charge.refunded','charge.dispute.created','charge.dispute.closed']);
export function objectId(value:string|{id:string}|null|undefined){return typeof value==='string'?value:value?.id||null;}
export function assertMode(value:{livemode:boolean},livemode=false){if(value.livemode!==livemode)throw new Error('Stripe environment mismatch');}
export function validatePrice(price:Stripe.Price,cycle:BillingCycle,requireActive=true,livemode=false){
 assertMode(price,livemode);
 if((requireActive&&!price.active)||price.currency!=='brl'||price.unit_amount!==TEST_PRICES[cycle]||price.type!=='recurring'||price.recurring?.interval!==(cycle==='monthly'?'month':'year')||price.recurring.interval_count!==1||price.recurring.usage_type!=='licensed'||price.billing_scheme!=='per_unit'||price.transform_quantity)throw new Error('Price does not match the test offer');
}
export function entitlement(status:string,cancel:boolean,payments:BillingPayment[],now=new Date()){
 const paidUntil=payments.filter(p=>p.status==='approved'&&p.paid_until).map(p=>p.paid_until!).sort().at(-1)||null;
 const paid=paidUntil!==null&&new Date(paidUntil)>now&&['active','past_due','canceled'].includes(status);
 const stopped=cancel||['canceled','paused'].includes(status);
 return {paidUntil,status:stopped?'canceled':paid?'active':['past_due','unpaid'].includes(status)?'past_due':'inactive',plan:paid?'plus':'free',cancelAtPeriodEnd:stopped} as const;
}
export function safeStripeURL(raw:string,kind:'checkout'|'portal'){
 const url=new URL(raw);if(url.protocol!=='https:'||url.hostname!==(kind==='checkout'?'checkout.stripe.com':'billing.stripe.com')||url.username||url.password||url.port)throw new Error('Invalid Stripe URL');return url.toString();
}
