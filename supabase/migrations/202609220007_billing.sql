begin;
create table public.billing_orders(
 id uuid primary key default gen_random_uuid(),usuario_id uuid not null references public.profiles(id),
 ciclo text not null check(ciclo in ('monthly','yearly')),amount_cents integer not null check(amount_cents>0),price_id text not null,
 provider_id text unique,checkout_id text unique,customer_id text unique,
 provider_status text not null default 'creating' check(provider_status in ('creating','pending','active','past_due','unpaid','incomplete','incomplete_expired','trialing','paused','canceled','expired')),
 checkout_url text,attempted boolean not null default false,lease_token uuid,lease_until timestamptz,
 paid_until timestamptz,cancel_at_period_end boolean not null default false,last_synced_at timestamptz,created_at timestamptz not null default now()
);
create unique index billing_one_open_per_user on public.billing_orders(usuario_id) where provider_status not in ('canceled','expired','incomplete_expired');
create table public.billing_events(
 id text primary key check(length(id)<=200),topic text not null,resource_id text not null,
 created_at timestamptz not null default now(),processed_at timestamptz,attempts integer not null default 0,last_error text
);
create index billing_pending_events on public.billing_events(created_at) where processed_at is null;
create table public.billing_payments(
 id text primary key,order_id uuid not null references public.billing_orders(id),invoice_id text not null,
 status text not null,amount_cents integer not null check(amount_cents>=0),paid_until timestamptz,updated_at timestamptz not null default now()
);
do $$declare t text;begin foreach t in array array['billing_orders','billing_events','billing_payments'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to service_role',t);
end loop;end$$;
create function public.bolsu_billing_status() returns jsonb language sql stable security definer set search_path='' as $$
 select (select jsonb_build_object('cycle',ciclo,'status',provider_status,'paidUntil',paid_until,'lastSyncedAt',last_synced_at,'hasCheckout',checkout_id is not null and provider_status='pending','cancelAtPeriodEnd',cancel_at_period_end,'hasCustomer',customer_id is not null) from public.billing_orders where usuario_id=auth.uid() order by created_at desc,id desc limit 1)
$$;
revoke all on function public.bolsu_billing_status() from public,anon;
grant execute on function public.bolsu_billing_status() to authenticated;

-- Adquirir antes do GET na Stripe; respostas de trabalhadores com lease vencida não podem substituir estado novo.
create function public.bolsu_billing_acquire(p_user uuid,p_token uuid,p_cycle text default null,p_amount integer default null,p_price text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.billing_orders;begin
 if p_user is null or p_token is null then raise exception 'Identificação obrigatória.' using errcode='22023';end if;
 perform 1 from public.profiles where id=p_user for update;if not found then raise exception 'Perfil inexistente.' using errcode='22023';end if;
 select * into r from public.billing_orders where usuario_id=p_user order by created_at desc,id desc limit 1 for update;
 if r.lease_until>clock_timestamp() then raise exception 'Pagamento em atualização. Tente novamente em instantes.' using errcode='55P03';end if;
 if p_cycle is not null and (r.id is null or (r.provider_status in ('canceled','expired','incomplete_expired') and coalesce(r.paid_until,now())<=now())) then
  if p_cycle not in ('monthly','yearly') or p_amount is null or p_amount<=0 or p_price is null then raise exception 'Oferta inválida.' using errcode='22023';end if;
  if public.bolsu_plan_for(p_user)='plus' then raise exception 'Já existe um período Plus ativo.' using errcode='P0003';end if;
  insert into public.billing_orders(usuario_id,ciclo,amount_cents,price_id) values(p_user,p_cycle,p_amount,p_price) returning * into r;
 end if;
 if r.id is null then return null;end if;
 if p_cycle is not null and (p_cycle<>r.ciclo or r.provider_status not in ('creating','pending')) then raise exception 'Já existe um checkout ou assinatura. Gerencie-o antes de iniciar outro ciclo.' using errcode='P0003';end if;
 update public.billing_orders set lease_token=p_token,lease_until=clock_timestamp()+interval '120 seconds' where id=r.id returning * into r;
 return to_jsonb(r);
end$$;

create function public.bolsu_billing_write(p_order uuid,p_token uuid,p_operation text,p_data jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
declare r public.billing_orders;p jsonb;paid timestamptz;st text;stopped boolean;begin
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
  stopped:=coalesce((p_data->>'cancel')::boolean,false) or p_data->>'status' in ('canceled','paused');
  st:=case when stopped then 'canceled' when paid>now() then 'active' when p_data->>'status' in ('past_due','unpaid') then 'past_due' else 'inactive' end;
  update public.subscriptions set plano=case when paid>now() then 'plus' else 'free' end,status=st,ciclo=r.ciclo,trial_ends_at=null,current_period_end=paid,cancel_at_period_end=stopped where usuario_id=r.usuario_id;
  update public.billing_orders set provider_id=p_data->>'id',provider_status=p_data->>'status',paid_until=paid,cancel_at_period_end=stopped,last_synced_at=now() where id=r.id;
 elsif p_operation<>'release' then raise exception 'Operação inválida.' using errcode='22023';end if;
 if p_operation='release' then update public.billing_orders set lease_token=null,lease_until=null where id=r.id;end if;
end$$;
create function public.bolsu_billing_event(p_id text,p_topic text,p_resource text,p_operation text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_operation='enqueue' then
  insert into public.billing_events(id,topic,resource_id) values(p_id,p_topic,p_resource) on conflict(id) do nothing;
  return not exists(select 1 from public.billing_events where id=p_id and processed_at is not null);
 elsif p_operation='done' then update public.billing_events set processed_at=now(),attempts=attempts+1,last_error=null where id=p_id;
 elsif p_operation='failed' then update public.billing_events set attempts=attempts+1,last_error='reconciliation_failed' where id=p_id;
 else raise exception 'Operação inválida.' using errcode='22023';end if;
 return true;
end$$;
create function public.bolsu_billing_due(p_users uuid[]) returns setof public.billing_orders language sql stable security definer set search_path='' as $$
 select r.* from (select distinct on(usuario_id) * from public.billing_orders where usuario_id=any(p_users) order by usuario_id,created_at desc,id desc) r order by r.last_synced_at asc nulls first limit 20
$$;
revoke all on function public.bolsu_billing_due(uuid[]) from public,anon,authenticated;
grant execute on function public.bolsu_billing_due(uuid[]) to service_role;
revoke all on function public.bolsu_billing_acquire(uuid,uuid,text,integer,text),public.bolsu_billing_write(uuid,uuid,text,jsonb),public.bolsu_billing_event(text,text,text,text) from public,anon,authenticated;
grant execute on function public.bolsu_billing_acquire(uuid,uuid,text,integer,text),public.bolsu_billing_write(uuid,uuid,text,jsonb),public.bolsu_billing_event(text,text,text,text) to service_role;
commit;
