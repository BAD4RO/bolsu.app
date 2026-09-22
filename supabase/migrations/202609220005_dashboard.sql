begin;
create table public.preferencias_inicio (
 usuario_id uuid primary key references public.profiles(id),
 introducao_oculta boolean not null default false,
 meta_prioritaria_id uuid,
 updated_at timestamptz not null default now(),
 foreign key(meta_prioritaria_id,usuario_id) references public.metas(id,usuario_id)
);
alter table public.preferencias_inicio enable row level security;
create policy owner_read on public.preferencias_inicio for select to authenticated using(usuario_id=(select auth.uid()));
revoke all on public.preferencias_inicio from public,anon,authenticated;
grant select on public.preferencias_inicio to authenticated;

create function public.bolsu_home_preferences(p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();g uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('introducao_oculta','meta_prioritaria_id')) then raise exception 'Campos inválidos.' using errcode='22023';end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'Perfil não encontrado.' using errcode='42501';end if;
 if p_data ? 'introducao_oculta' and jsonb_typeof(p_data->'introducao_oculta')<>'boolean' then raise exception 'Preferência inválida.' using errcode='22023';end if;
 if p_data ? 'meta_prioritaria_id' then
  g:=(p_data->>'meta_prioritaria_id')::uuid;
  if g is not null and not exists(select 1 from public.metas where id=g and usuario_id=u and not arquivada) then raise exception 'Selecione uma meta ativa.' using errcode='22023';end if;
 end if;
 insert into public.preferencias_inicio(usuario_id) values(u) on conflict do nothing;
 update public.preferencias_inicio set
 introducao_oculta=case when p_data ? 'introducao_oculta' then (p_data->>'introducao_oculta')::boolean else introducao_oculta end,
 meta_prioritaria_id=case when p_data ? 'meta_prioritaria_id' then g else meta_prioritaria_id end,updated_at=now() where usuario_id=u;
end $$;
revoke all on function public.bolsu_home_preferences(jsonb) from public,anon;
grant execute on function public.bolsu_home_preferences(jsonb) to authenticated;

-- One obligation per invoice, never per purchase and invoice together.
create view public.itens_projecao with(security_invoker=true) as
select t.usuario_id,t.id,case when t.tipo='receita' then 'income' else 'expense' end tipo,
 t.descricao,t.valor,t.data_vencimento vencimento,t.data_competencia competencia,c.nome origem,c.incluir_no_disponivel incluido,
 case when t.recorrencia_id is not null then '/recorrencias' else '/lancamentos' end destino
from public.transacoes t join public.contas c on c.id=t.conta_id and c.usuario_id=t.usuario_id
where not t.excluida and t.status='previsto'
union all
select f.usuario_id,f.id,'invoice','Fatura · '||c.nome,f.pendente,f.vencimento,f.competencia,c.nome,true,'/cartoes'
from public.resumos_faturas f join public.cartoes c on c.id=f.cartao_id and c.usuario_id=f.usuario_id where f.pendente>0;
revoke all on public.itens_projecao from public,anon,authenticated;
grant select on public.itens_projecao to authenticated;

create function public.bolsu_home_snapshot(p_page integer default 0) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid();hoje date:=(now() at time zone 'America/Sao_Paulo')::date;result jsonb;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_page is null or p_page<0 or p_page>100000 then raise exception 'Página inválida.' using errcode='22023';end if;
 with
 period as (select date_trunc('month',hoje)::date inicio,(date_trunc('month',hoje)+interval '1 month - 1 day')::date fim),
 accounts as (
  select a.*,coalesce(r.total,0) reservado from public.saldos_contas a
  left join lateral(select sum(reservado) total from public.reservas_metas where conta_id=a.id and usuario_id=u) r on true
  where a.usuario_id=u and not a.arquivada
 ),
 cash as (select coalesce(sum(saldo_atual) filter(where incluir_no_disponivel),0) saldo,
  coalesce(sum(reservado) filter(where incluir_no_disponivel),0) reserva,
  coalesce(sum(saldo_atual) filter(where not incluir_no_disponivel),0) excluido,
  count(*) filter(where reservado>saldo_atual and reservado>0) insuficientes from accounts),
 items as (select i.* from public.itens_projecao i cross join period p where i.usuario_id=u and i.vencimento<=p.fim),
 totals as (select coalesce(sum(valor) filter(where incluido and tipo='income'),0) entradas,
  coalesce(sum(valor) filter(where incluido and tipo='expense'),0) despesas,
  coalesce(sum(valor) filter(where incluido and tipo='invoice'),0) faturas,
  coalesce(sum(valor) filter(where incluido and tipo<>'income' and vencimento<hoje),0) vencido,
  count(*) filter(where incluido and tipo='income' and vencimento<hoje) entradas_atrasadas,
  count(*) filter(where not incluido) excluidos,
  min(vencimento) filter(where incluido and tipo='income' and vencimento>=hoje) proxima_entrada from items),
 flows as (select greatest(i.vencimento,hoje) dia,
  coalesce(sum(valor) filter(where tipo='income'),0) entradas,
  coalesce(sum(valor) filter(where tipo<>'income'),0) saidas from items i where incluido group by greatest(i.vencimento,hoje)),
 timeline as (select dia,
  (select saldo-reserva from cash)+coalesce(sum(entradas) over(order by dia rows between unbounded preceding and 1 preceding),0)-sum(saidas) over(order by dia) piso
  from flows),
 gaps as (
  select min(m.dia::date) mes from public.recorrencias r
  cross join lateral generate_series(date_trunc('month',r.data_inicio),least(coalesce(r.data_fim,hoje),hoje),interval '1 month') m(dia)
  join lateral(select * from public.versoes_recorrencia where recorrencia_id=r.id and usuario_id=u and desde<=m.dia::date order by desde desc limit 1) v on true
  where r.usuario_id=u and r.ativa and m.dia::date<date_trunc('month',hoje)::date
   and (m.dia::date+least(v.dia,extract(day from (m.dia+interval '1 month - 1 day'))::int)-1)>=r.data_inicio
   and (r.data_fim is null or (m.dia::date+least(v.dia,extract(day from (m.dia+interval '1 month - 1 day'))::int)-1)<=r.data_fim)
   and exists(select 1 from public.contas where id=v.conta_id and usuario_id=u and not arquivada)
   and not exists(select 1 from public.transacoes where usuario_id=u and recorrencia_id=r.id and ocorrencia=m.dia::date)
 ),
 prefs as (select introducao_oculta,meta_prioritaria_id from public.preferencias_inicio where usuario_id=u),
 goals as (select * from public.resumos_metas where usuario_id=u and not arquivada),
 monthly as (select coalesce(sum(valor) filter(where tipo='receita' and status='realizado'),0) receitas,
  coalesce(sum(valor) filter(where tipo='despesa' and (status='realizado' or cartao_id is not null)),0) despesas
  from public.transacoes t cross join period p where usuario_id=u and not excluida and data_competencia between p.inicio and p.fim)
 select jsonb_build_object(
 'today',hoje,'monthEnd',(select fim from period),'recurrenceGapMonth',(select mes from gaps),'profile',(select to_jsonb(p) from public.profiles p where id=u),
 'accounts',coalesce((select jsonb_agg(a order by a.nome,a.id) from accounts a),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(c order by c.nome) from public.categorias c where usuario_id=u and not arquivada),'[]'::jsonb),
 'counts',jsonb_build_object('transactions',(select count(*) from public.transacoes where usuario_id=u and not excluida),
 'manualTransactions',(select count(*) from public.transacoes where usuario_id=u and not excluida and recorrencia_id is null),
 'cards',(select count(*) from public.cartoes where usuario_id=u and not arquivado),'goals',(select count(*) from goals)),
 'preferences',jsonb_build_object('introducao_oculta',coalesce((select introducao_oculta from prefs),false),'meta_prioritaria_id',(select meta_prioritaria_id from prefs)),
 'projection',(select jsonb_build_object('cash',c.saldo,'reserved',c.reserva,'excludedCash',c.excluido,
 'income',t.entradas,'expenses',t.despesas,'invoices',t.faturas,'committed',t.despesas+t.faturas,
 'available',c.saldo+t.entradas-t.despesas-t.faturas-c.reserva,'withoutIncome',c.saldo-t.despesas-t.faturas-c.reserva,
 'overdue',t.vencido,'overdueIncomeCount',t.entradas_atrasadas,'excludedItemCount',t.excluidos,'underfundedAccounts',c.insuficientes,
 'nextIncomeDate',t.proxima_entrada,'beforeNextIncome',c.saldo-c.reserva-coalesce((select sum(valor) from items where incluido and tipo<>'income' and vencimento<=coalesce(t.proxima_entrada,(select fim from period))),0),
 'lowestBalance',least(c.saldo-c.reserva,coalesce((select min(piso) from timeline),c.saldo-c.reserva)),
 'firstShortfallDate',case when c.saldo-c.reserva<0 then hoje else (select min(dia) from timeline where piso<0) end) from cash c cross join totals t),
 'monthly',(select to_jsonb(m) from monthly m),
 'upcoming',coalesce((select jsonb_agg(x order by x.vencimento,x.id) from (select * from items where tipo<>'income' order by vencimento,id limit 6) x),'[]'::jsonb),
 'items',coalesce((select jsonb_agg(x order by x.vencimento,x.tipo,x.id) from (select * from items order by vencimento,tipo,id limit 50 offset p_page*50) x),'[]'::jsonb),
 'itemCount',(select count(*) from items),
 'budgets',coalesce((select jsonb_agg(b order by b.percentual desc,b.id) from (select * from public.resumos_orcamentos where usuario_id=u and mes=(select inicio from period) order by percentual desc,id limit 5) b),'[]'::jsonb),
 'budgetCount',(select count(*) from public.orcamentos where usuario_id=u and mes=(select inicio from period)),
 'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'titulo',g.titulo) order by g.titulo,g.id) from goals g),'[]'::jsonb),
 'priorityGoal',(select to_jsonb(g) from goals g order by (g.id=coalesce((select meta_prioritaria_id from prefs),'00000000-0000-0000-0000-000000000000'::uuid)) desc,g.prazo nulls last,g.created_at,g.id limit 1),
 'unreadAlerts',(select count(*) from public.avisos_planejamento where usuario_id=u and not lido)
 ) into result;
 return result;
end $$;
revoke all on function public.bolsu_home_snapshot(integer) from public,anon;
grant execute on function public.bolsu_home_snapshot(integer) to authenticated;
commit;
