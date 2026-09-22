import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
let db,A,B,token,order;
async function service(){await db.exec('reset role;set role service_role');}
async function who(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function acquire(user=A,key=token,cycle='monthly'){return (await db.query('select bolsu_billing_acquire($1,$2,$3,1990,$4) r',[user,key,cycle,'price_test'])).rows[0].r;}
async function write(op,data={},r=order,key=token){return db.query('select bolsu_billing_write($1,$2,$3,$4::jsonb)',[r.id,key,op,JSON.stringify(data)]);}
async function apply(payments=[],status='active',cancel=false){return write('apply',{id:'sub_'+order.id,status,cancel,payments});}
async function snapshot(){await who(A);const r=(await db.query('select bolsu_plan_snapshot() r')).rows[0].r;await service();return r;}
function payment(extra={}){return {id:'pi_'+order.id,invoice_id:'in_test',status:'approved',amount_cents:1990,paid_until:new Date(Date.now()+86400000*30).toISOString(),...extra};}
before(async()=>{
 db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated,anon;`);
 for(const n of ['202609220001_foundation.sql','202609220002_daily_control.sql','202609220003_planning.sql','202609220004_planning_end_boundary.sql','202609220005_dashboard.sql','202609220006_plans.sql','202609220007_billing.sql','202609220008_stripe_subscription_sync.sql','202609220009_billing_reliability.sql'])await db.exec(readFileSync(new URL('../../supabase/migrations/'+n,import.meta.url),'utf8'));
});
after(async()=>db?.close());
beforeEach(async()=>{await db.exec('reset role');A=randomUUID();B=randomUUID();token=randomUUID();await db.query('insert into auth.users(id) values($1),($2)',[A,B]);await service();order=await acquire();await write('customer',{id:'cus_'+order.id});await write('checkout',{id:'cs_'+order.id,url:'https://checkout.stripe.com/test'});});
test('somente servidor acessa tabelas e funções de concessão; resumo é isolado',async()=>{
 await who(A);assert.equal((await db.query('select bolsu_billing_status() r')).rows[0].r.status,'pending');
 await assert.rejects(acquire(),/permission denied/);await assert.rejects(write('apply',{}),/permission denied/);await assert.rejects(db.query('select * from billing_orders'),/permission denied/);
 await who(B);assert.equal((await db.query('select bolsu_billing_status() r')).rows[0].r,null);
 await db.exec('reset role;set role anon');await assert.rejects(db.query('select bolsu_billing_status()'),/permission denied/);
});
test('checkout e status ativo sem pagamento não concedem Plus',async()=>{
 assert.equal((await snapshot()).hasPlus,false);await apply();assert.equal((await snapshot()).hasPlus,false);
 await apply([payment({status:'rejected',paid_until:null})],'past_due');const s=await snapshot();assert.equal(s.hasPlus,false);assert.equal(s.subscription.status,'past_due');
});
test('confirmação repetida é idempotente e nunca soma períodos',async()=>{
 const p=payment();await apply([p]);await apply([p]);const s=await snapshot();assert.equal(s.hasPlus,true);assert.equal(new Date(s.subscription.current_period_end).getTime(),new Date(p.paid_until).getTime());
 assert.equal((await db.query('select count(*)::int n from billing_payments where order_id=$1',[order.id])).rows[0].n,1);
});
test('cancelar renovação preserva período pago e expiração retorna ao Free',async()=>{
 await apply([payment()],'active',true);let s=await snapshot();assert.equal(s.hasPlus,true);assert.equal(s.subscription.cancel_at_period_end,true);
 await apply([payment({paid_until:new Date(Date.now()-1000).toISOString()})],'canceled',true);s=await snapshot();assert.equal(s.hasPlus,false);
});
test('reembolso e disputa removem acesso sem apagar pagamentos históricos',async()=>{
 await apply([payment()]);assert.equal((await snapshot()).hasPlus,true);await apply([payment({status:'refunded'})]);assert.equal((await snapshot()).hasPlus,false);
 assert.equal((await db.query('select status from billing_payments where order_id=$1',[order.id])).rows[0].status,'refunded');
});
test('duas requisições compartilham checkout e lease vencida não sobrescreve estado atual',async()=>{
 await assert.rejects(acquire(A,randomUUID()),/atualização/);
 await write('release');const second=await acquire(A,randomUUID());assert.equal(second.id,order.id);assert.equal(second.checkout_id,'cs_'+order.id);
 await assert.rejects(write('apply',{status:'pending',payments:[]}),/Lease/);
 await db.exec('reset role');await db.query("update billing_orders set lease_until=now()-interval '1 second' where id=$1",[order.id]);await service();await assert.rejects(write('release',{},order,second.lease_token),/Lease/);
 const third=await acquire(A,randomUUID());assert.equal(third.id,order.id);
});
test('duplicatas da fila têm um recibo; falha continua recuperável até concluir',async()=>{
 const id='evt_'+randomUUID();const event=op=>db.query("select bolsu_billing_event($1,'invoice.paid','in_test',$2) r",[id,op]);
 assert.equal((await event('enqueue')).rows[0].r,true);await event('enqueue');await event('failed');assert.equal((await event('enqueue')).rows[0].r,true);await event('done');assert.equal((await event('enqueue')).rows[0].r,false);
 assert.equal((await db.query('select count(*)::int n from billing_events where id=$1',[id])).rows[0].n,1);
});
test('assinatura e pagamento não podem ser vinculados a duas tentativas',async()=>{
 await apply([payment()]);await assert.rejects(write('apply',{id:'sub_other',status:'active',payments:[]}),/divergente/);
 const other=await acquire(B,randomUUID());await assert.rejects(write('apply',{id:'sub_other',status:'active',payments:[payment()]},other,other.lease_token),/vinculado/);
 await assert.rejects(apply([payment({amount_cents:1})]),/Valor divergente/);
});
test('cancelamento pago impede checkout duplicado e fim do período permite nova tentativa',async()=>{
 await apply([payment()],'canceled',true);await write('release');await assert.rejects(acquire(),/Já existe/);
 order=await acquire(A,token,null);await apply([],'canceled',true);await write('release');const next=await acquire();assert.notEqual(next.id,order.id);
});

test('banco impede misturar teste e produção',async()=>{
 await db.query('select bolsu_billing_assert_mode(false)');
 await assert.rejects(db.query('select bolsu_billing_assert_mode(true)'),/divergente/);
 await who(A);await assert.rejects(db.query('select bolsu_billing_assert_mode(false)'),/permission denied/);
});
test('sincroniza IDs, estado Stripe e período sem estender acesso pago por renovação falha',async()=>{
 const p=payment();const next=new Date(Date.now()+86400000*60).toISOString();
 await write('apply',{id:'sub_'+order.id,status:'past_due',cancel:false,current_period_end:next,payments:[p]});
 await who(A);const s=(await db.query('select * from subscriptions where usuario_id=$1',[A])).rows[0];await service();
 assert.equal(s.stripe_customer_id,'cus_'+order.id);assert.equal(s.stripe_subscription_id,'sub_'+order.id);assert.equal(s.stripe_price_id,'price_test');assert.equal(s.subscription_status,'past_due');assert.equal(s.plan,'premium');
 assert.equal(new Date(s.current_period_end).getTime(),new Date(next).getTime());assert.equal(new Date(s.stripe_access_until).getTime(),new Date(p.paid_until).getTime());
 await apply([p],'unpaid');assert.equal((await snapshot()).hasPlus,false);
 await apply([p],'incomplete');assert.equal((await snapshot()).hasPlus,false);
});
test('trialing sincroniza trial verificado e revoga ao expirar; cancelamento não inventa flag',async()=>{
 const end=new Date(Date.now()+86400000).toISOString();
 await write('apply',{id:'sub_'+order.id,status:'trialing',cancel:false,trial_end:end,current_period_end:end,payments:[]});assert.equal((await snapshot()).hasPlus,true);
 await write('apply',{id:'sub_'+order.id,status:'trialing',cancel:false,trial_end:new Date(Date.now()-1000).toISOString(),payments:[]});assert.equal((await snapshot()).hasPlus,false);
 await apply([],'canceled',false);assert.equal((await snapshot()).subscription.cancel_at_period_end,false);
});

test('falha após sucesso concorrente não reabre evento; retry usa espera progressiva',async()=>{
 const id='evt_'+randomUUID();const event=op=>db.query("select bolsu_billing_event($1,'invoice.payment_failed','in_test',$2)",[id,op]);
 await event('enqueue');await event('failed');let e=(await db.query('select * from billing_events where id=$1',[id])).rows[0];const first=new Date(e.next_attempt_at);assert.ok(first>Date.now());
 await event('failed');e=(await db.query('select * from billing_events where id=$1',[id])).rows[0];assert.ok(new Date(e.next_attempt_at)>first);
 await event('done');await event('failed');e=(await db.query('select * from billing_events where id=$1',[id])).rows[0];assert.ok(e.processed_at);assert.equal(e.last_error,null);assert.equal(e.attempts,3);
 await assert.rejects(db.query("select bolsu_billing_event($1,'invoice.paid','in_other','enqueue')",[id]),/divergente/);
});
test('lote não sobrepõe outro e só o dono libera; lease expirada pode ser retomada',async()=>{
 const a=randomUUID(),b=randomUUID();const lock=async(t,release=false)=>(await db.query('select bolsu_billing_batch_lock($1,$2) ok',[t,release])).rows[0].ok;
 assert.equal(await lock(a),true);assert.equal(await lock(b),false);assert.equal(await lock(b,true),false);assert.equal(await lock(a,true),true);assert.equal(await lock(b),true);
 await db.exec('reset role');await db.exec("update billing_batch_lease set lease_until=now()-interval '1 second'");await service();assert.equal(await lock(a),true);assert.equal(await lock(b,true),false);await lock(a,true);
 await who(A);await assert.rejects(lock(a),/permission denied/);
});
test('consulta falha não monopoliza a fila de assinaturas',async()=>{
 await write('release');const r=await acquire(B,randomUUID());await write('release',{},r,r.lease_token);
 const again=await acquire(A,token,null);await write('release',{},again);
 const due=(await db.query('select usuario_id from bolsu_billing_due($1)',[[A,B]])).rows;
 assert.equal(due[0].usuario_id,B);assert.equal(due[1].usuario_id,A);
});
test('past_due sem período pago bloqueia; recuperação restaura sem duplicar',async()=>{
 await apply([],'past_due');assert.equal((await snapshot()).hasPlus,false);
 const p=payment();await apply([p],'active');await apply([p],'active');assert.equal((await snapshot()).hasPlus,true);
 await apply([],'unpaid');assert.equal((await snapshot()).hasPlus,false);
 await apply([p],'active');assert.equal((await snapshot()).hasPlus,true);
 assert.equal((await db.query('select count(*)::int n from billing_payments where order_id=$1',[order.id])).rows[0].n,1);
});
