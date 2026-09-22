export type BillingCycle = 'monthly' | 'yearly';
export type BillingOrder = {
 id:string; usuario_id:string; ciclo:BillingCycle; amount_cents:number;
 provider_id:string|null; provider_status:string; checkout_url:string|null;
 checkout_id:string|null; customer_id:string|null; price_id:string; cancel_at_period_end:boolean;
 attempted:boolean; lease_token:string|null; lease_until:string|null;
 paid_until:string|null; last_synced_at:string|null; created_at:string;
};
export type BillingEvent = {id:string; topic:string; resource_id:string; processed_at:string|null; attempts:number};
export type BillingPayment = {id:string; invoice_id:string; status:string; amount_cents:number; paid_until:string|null};
export type BillingView = {
 enabled:boolean; mode:'test'|'live'; prices:{monthly:number;yearly:number};
 order:{cycle:BillingCycle;status:string;paidUntil:string|null;lastSyncedAt:string|null;hasCheckout:boolean;cancelAtPeriodEnd:boolean;hasCustomer:boolean}|null;
};
