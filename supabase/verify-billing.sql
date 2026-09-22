-- Homologação estrutural de cobrança no Supabase de desenvolvimento. Não chama Stripe.
-- Todos os registros e a identidade temporária são revertidos ao final.
begin;
select set_config('bolsu.qa_user',gen_random_uuid()::text,true);
insert into auth.users(id,raw_user_meta_data) values(current_setting('bolsu.qa_user')::uuid,'{"nome":"QA temporário cobrança"}');
set local role service_role;
do $$declare u uuid:=current_setting('bolsu.qa_user')::uuid;t uuid:=gen_random_uuid();r jsonb;p jsonb;begin
 r:=public.bolsu_billing_acquire(u,t,'monthly',1990,'price_qa');
 perform public.bolsu_billing_write((r->>'id')::uuid,t,'customer','{"id":"cus_qa_rollback"}');
 perform public.bolsu_billing_write((r->>'id')::uuid,t,'checkout','{"id":"cs_qa_rollback","url":"https://checkout.stripe.com/test"}');
 p:=jsonb_build_object('id','pi_qa_rollback','invoice_id','in_qa_rollback','status','approved','amount_cents',1990,'paid_until',now()+interval '1 month');
 perform public.bolsu_billing_write((r->>'id')::uuid,t,'apply',jsonb_build_object('id','sub_qa_rollback','status','active','cancel',false,'payments',jsonb_build_array(p)));
 perform public.bolsu_billing_write((r->>'id')::uuid,t,'apply',jsonb_build_object('id','sub_qa_rollback','status','active','cancel',true,'payments',jsonb_build_array(p)));
 if (select count(*) from public.billing_payments where order_id=(r->>'id')::uuid)<>1 then raise exception 'Duplicação de pagamento';end if;
 begin perform public.bolsu_billing_acquire(u,gen_random_uuid());raise exception 'Lease concorrente aceita';exception when lock_not_available then null;end;
 perform public.bolsu_billing_write((r->>'id')::uuid,t,'release');
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('bolsu.qa_user'),true);
set local role authenticated;
do $$begin
 if not (public.bolsu_plan_snapshot()->>'hasPlus')::boolean then raise exception 'Período pago não reconhecido';end if;
 if not (public.bolsu_billing_status()->>'cancelAtPeriodEnd')::boolean then raise exception 'Cancelamento não preservado';end if;
 begin perform public.bolsu_billing_acquire(auth.uid(),gen_random_uuid());raise exception 'Concessão pública aceita';exception when insufficient_privilege then null;end;
end$$;
reset role;
select 'Cobrança: pagamento idempotente, cancelamento, lease e concessão privada OK' resultado;
rollback;
