begin;
-- One database per environment. Existing databases are test databases.
create table public.billing_environment(singleton boolean primary key default true check(singleton),livemode boolean not null);
insert into public.billing_environment values(true,false);
alter table public.billing_environment enable row level security;
revoke all on public.billing_environment from public,anon,authenticated,service_role;
create function public.bolsu_billing_assert_mode(p_live boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.billing_environment where livemode=p_live) then raise exception 'Ambiente Stripe divergente do banco.' using errcode='22023';end if;
end$$;
revoke all on function public.bolsu_billing_assert_mode(boolean) from public,anon,authenticated;
grant execute on function public.bolsu_billing_assert_mode(boolean) to service_role;
alter table public.subscriptions
 add column stripe_customer_id text,
 add column stripe_subscription_id text unique,
 add column stripe_price_id text,
 add column subscription_status text,
 add column stripe_access_until timestamptz,
 add column plan text generated always as (case when plano='plus' then 'premium' else 'free' end) stored;
-- Preserve existing paid access while migrating.
update public.subscriptions s set stripe_customer_id=r.customer_id,stripe_subscription_id=r.provider_id,stripe_price_id=r.price_id,subscription_status=r.provider_status,stripe_access_until=r.paid_until
from (select distinct on(usuario_id) * from public.billing_orders order by usuario_id,created_at desc,id desc) r where s.usuario_id=r.usuario_id;
create or replace function public.bolsu_plan_for(u uuid) returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.subscriptions where usuario_id=u and plano='plus' and
 ((stripe_subscription_id is not null and stripe_access_until>now()) or
 (stripe_subscription_id is null and ((status='trialing' and trial_ends_at>now()) or (status in ('active','canceled') and current_period_end>now()))))) then 'plus' else 'free' end
$$;
create or replace function public.bolsu_billing_write(p_order uuid,p_token uuid,p_operation text,p_data jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
declare r public.billing_orders;p jsonb;paid timestamptz;st text;stopped boolean;trial_until timestamptz;period_end timestamptz;eligible boolean;begin
 perform 1 from public.profiles where id=(select usuario_id from public.billing_orders where id=p_order) for update;
 select * into r from public.billing_orders where id=p_order for update;
 if r.id is null or r.lease_token is distinct from p_token or p_token is null or r.lease_until<=clock_timestamp() then raise exception 'Lease inválida ou expirada.' using errcode='55P03';end if;
 if p_operation='attempt' then update public.billing_orders set attempted=true where id=r.id;
 elsif p_operation='customer' then
  if r.customer_id is not null and r.customer_id is distinct from p_data->>'id' then raise exception 'Cliente divergente.' using errcode='22023';end if;
  if p_data->>'id' is null then raise exception 'Cliente obrigatório.' using errcode='22023';end if;
  update public.billing_orders set customer_id=p_data->>'id' where id=r.id;
 elsif p_operation='checkout' then
  if r.checkout_id is not null and r.checkout_id is distinct from p_data->>'id' then raise exception 'Checkout divergente.' using errcode='22023';end if;
  if p_data->>'id' is null then raise exception 'Checkout obrigatório.' using errcode='22023';end if;
  update public.billing_orders set checkout_id=p_data->>'id',checkout_url=p_data->>'url',provider_status='pending' where id=r.id;
 elsif p_operation='apply' then
  if r.provider_id is not null and r.provider_id is distinct from p_data->>'id' then raise exception 'Assinatura divergente.' using errcode='22023';end if;
  if jsonb_typeof(p_data->'payments') is distinct from 'array' or p_data->>'status' is null then raise exception 'Snapshot inválido.' using errcode='22023';end if;
  for p in select * from jsonb_array_elements(p_data->'payments') loop
   if exists(select 1 from public.billing_payments where id=p->>'id' and order_id<>r.id) then raise exception 'Pagamento já vinculado.' using errcode='22023';end if;
   if (p->>'amount_cents')::int<>r.amount_cents then raise exception 'Valor divergente.' using errcode='22023';end if;
   insert into public.billing_payments(id,order_id,invoice_id,status,amount_cents,paid_until) values(p->>'id',r.id,p->>'invoice_id',p->>'status',(p->>'amount_cents')::int,(p->>'paid_until')::timestamptz)
   on conflict(id) do update set status=excluded.status,paid_until=excluded.paid_until,updated_at=now();
  end loop;
  select max((v->>'paid_until')::timestamptz) into paid from jsonb_array_elements(p_data->'payments') v where v->>'status'='approved';
  trial_until:=case when p_data->>'status'='trialing' then (p_data->>'trial_end')::timestamptz else null end;
  period_end:=coalesce((p_data->>'current_period_end')::timestamptz,paid,trial_until);
  eligible:=(coalesce(paid>now(),false) and p_data->>'status' in ('active','past_due','canceled')) or coalesce(trial_until>now(),false);
  stopped:=coalesce((p_data->>'cancel')::boolean,false) or p_data->>'status' in ('canceled','paused');
  st:=case when trial_until>now() then 'trialing' when stopped then 'canceled' when eligible then 'active' when p_data->>'status' in ('past_due','unpaid') then 'past_due' else 'inactive' end;
  update public.subscriptions set plano=case when eligible then 'plus' else 'free' end,status=st,ciclo=r.ciclo,trial_ends_at=trial_until,current_period_end=period_end,cancel_at_period_end=coalesce((p_data->>'cancel')::boolean,false),stripe_customer_id=r.customer_id,stripe_subscription_id=p_data->>'id',stripe_price_id=r.price_id,subscription_status=p_data->>'status',stripe_access_until=case when eligible then coalesce(trial_until,paid) else null end where usuario_id=r.usuario_id;
  update public.billing_orders set provider_id=p_data->>'id',provider_status=p_data->>'status',paid_until=paid,cancel_at_period_end=coalesce((p_data->>'cancel')::boolean,false),last_synced_at=now() where id=r.id;
 elsif p_operation<>'release' then raise exception 'Operação inválida.' using errcode='22023';end if;
 if p_operation='release' then update public.billing_orders set lease_token=null,lease_until=null where id=r.id;end if;
end$$;

create or replace function public.bolsu_billing_due(p_users uuid[]) returns setof public.billing_orders language sql stable security definer set search_path='' as $$
 select r.* from (select distinct on(usuario_id) * from public.billing_orders where p_users is null or usuario_id=any(p_users) order by usuario_id,created_at desc,id desc) r order by r.last_synced_at asc nulls first limit 20
$$;

commit;
