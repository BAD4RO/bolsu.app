begin;
alter table public.billing_orders add column last_attempt_at timestamptz;
alter table public.billing_events add column next_attempt_at timestamptz not null default now();
create index billing_retry_due on public.billing_events(next_attempt_at) where processed_at is null;
create or replace function public.bolsu_billing_acquire(p_user uuid,p_token uuid,p_cycle text default null,p_amount integer default null,p_price text default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
 update public.billing_orders set last_attempt_at=clock_timestamp(),lease_token=p_token,lease_until=clock_timestamp()+interval '120 seconds' where id=r.id returning * into r;
 return to_jsonb(r);
end$$;


create or replace function public.bolsu_billing_event(p_id text,p_topic text,p_resource text,p_operation text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_operation='enqueue' then
  insert into public.billing_events(id,topic,resource_id) values(p_id,p_topic,p_resource) on conflict(id) do nothing;
  if exists(select 1 from public.billing_events where id=p_id and (topic<>p_topic or resource_id<>p_resource)) then raise exception 'Evento divergente.' using errcode='22023';end if;
  return not exists(select 1 from public.billing_events where id=p_id and processed_at is not null);
 elsif p_operation='done' then
  update public.billing_events set processed_at=now(),attempts=attempts+1,last_error=null where id=p_id and processed_at is null;
 elsif p_operation='failed' then
  -- A late failing worker must not undo a successful concurrent delivery.
  update public.billing_events set attempts=attempts+1,last_error='reconciliation_failed',next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts,7)))::integer) where id=p_id and processed_at is null;
 else raise exception 'Operação inválida.' using errcode='22023';end if;
 return true;
end$$;
create or replace function public.bolsu_billing_due(p_users uuid[]) returns setof public.billing_orders language sql stable security definer set search_path='' as $$
 select r.* from (select distinct on(usuario_id) * from public.billing_orders where p_users is null or usuario_id=any(p_users) order by usuario_id,created_at desc,id desc) r
 where r.lease_until is null or r.lease_until<=now()
 order by coalesce(r.last_attempt_at,r.last_synced_at,r.created_at),r.id limit 20
$$;
create table public.billing_batch_lease(singleton boolean primary key default true check(singleton),token uuid,lease_until timestamptz);
insert into public.billing_batch_lease(singleton) values(true);
alter table public.billing_batch_lease enable row level security;
revoke all on public.billing_batch_lease from public,anon,authenticated,service_role;
create function public.bolsu_billing_batch_lock(p_token uuid,p_release boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_token is null then raise exception 'Token obrigatório.' using errcode='22023';end if;
 if p_release then
  update public.billing_batch_lease set token=null,lease_until=null where singleton=true and token=p_token;
 else
  update public.billing_batch_lease set token=p_token,lease_until=clock_timestamp()+interval '10 minutes' where singleton=true and (lease_until is null or lease_until<=clock_timestamp());
 end if;
 return found;
end$$;
revoke all on function public.bolsu_billing_batch_lock(uuid,boolean) from public,anon,authenticated;
grant execute on function public.bolsu_billing_batch_lock(uuid,boolean) to service_role;
commit;
