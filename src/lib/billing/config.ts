import {z} from 'zod';
const schema=z.object({
 mode:z.enum(['test','live']),secret:z.string().regex(/^sk_(test|live)_[A-Za-z0-9]+$/),webhook:z.string().regex(/^whsec_[A-Za-z0-9]+$/),
 monthly:z.string().regex(/^price_[A-Za-z0-9]+$/),yearly:z.string().regex(/^price_[A-Za-z0-9]+$/),
 appURL:z.string().url(),serviceKey:z.string().min(20),users:z.array(z.string().uuid()),
});
export function billingConfig(env:Record<string,string|undefined>=process.env){
 const parsed=schema.safeParse({mode:env.BOLSU_BILLING_MODE,secret:env.STRIPE_SECRET_KEY,webhook:env.STRIPE_WEBHOOK_SECRET,monthly:env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,yearly:env.STRIPE_PREMIUM_YEARLY_PRICE_ID,appURL:env.BOLSU_APP_URL,serviceKey:env.SUPABASE_SERVICE_ROLE_KEY,users:(env.BOLSU_BILLING_TEST_USER_IDS||'').split(',').map(s=>s.trim()).filter(Boolean)});
 if(!parsed.success)return null;const c=parsed.data,url=new URL(c.appURL),livemode=c.mode==='live';
 if(!c.secret.startsWith('sk_'+c.mode+'_')||c.monthly===c.yearly)return null;
 const pk=env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
 if(pk&&(!pk.startsWith('pk_'+c.mode+'_')||pk.includes('...')))return null;
 if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||(url.protocol!=='https:'&&!(c.mode==='test'&&url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))return null;
 return {...c,livemode,appURL:url.origin};
}
export type BillingConfig=NonNullable<ReturnType<typeof billingConfig>>;
