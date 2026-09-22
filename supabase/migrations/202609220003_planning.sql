begin;
alter table public.transacoes add column personalizada boolean not null default false;
create table public.versoes_recorrencia (
 id uuid primary key default gen_random_uuid(), usuario_id uuid not null references public.profiles(id),
 recorrencia_id uuid not null, desde date not null check(extract(day from desde)=1),
 descricao text not null check(length(btrim(descricao)) between 1 and 160), tipo text not null check(tipo in ('receita','despesa')),
 valor numeric(14,2) not null check(valor>0 and valor<>'NaN'::numeric), conta_id uuid not null, categoria_id uuid not null,
 dia integer not null check(dia between 1 and 31), unique(recorrencia_id,desde),
 foreign key(recorrencia_id,usuario_id) references public.recorrencias(id,usuario_id),
 foreign key(conta_id,usuario_id) references public.contas(id,usuario_id),
 foreign key(categoria_id,usuario_id) references public.categorias(id,usuario_id)
);
insert into public.versoes_recorrencia(usuario_id,recorrencia_id,desde,descricao,tipo,valor,conta_id,categoria_id,dia)
select usuario_id,id,date_trunc('month',data_inicio)::date,descricao,tipo,valor,conta_id,categoria_id,dia from public.recorrencias;
create table public.avisos_lidos(usuario_id uuid not null references public.profiles(id), chave text not null check(length(chave)<=240), lido_em timestamptz not null default now(), primary key(usuario_id,chave));
do $$ declare t text; begin foreach t in array array['versoes_recorrencia','avisos_lidos'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(usuario_id=(select auth.uid()))',t);
end loop; end $$;

create view public.reservas_metas with(security_invoker=true) as
select usuario_id,meta_id,conta_id,sum(case when tipo='aporte' then valor else -valor end)::numeric(14,2) reservado
from public.aportes_metas group by usuario_id,meta_id,conta_id;
create view public.resumos_orcamentos with(security_invoker=true) as
select o.*,c.nome categoria,coalesce(t.gasto,0)::numeric(14,2) gasto,coalesce(t.previsto,0)::numeric(14,2) previsto,
 (o.valor-coalesce(t.gasto,0))::numeric(14,2) restante,round(coalesce(t.gasto,0)/o.valor*100,2) percentual
from public.orcamentos o join public.categorias c on c.id=o.categoria_id and c.usuario_id=o.usuario_id
left join lateral(select sum(valor) filter(where status='realizado' or cartao_id is not null) gasto,
 sum(valor) filter(where status='previsto' and cartao_id is null) previsto from public.transacoes
 where usuario_id=o.usuario_id and categoria_id=o.categoria_id and tipo='despesa' and not excluida
 and data_competencia>=o.mes and data_competencia<(o.mes+interval '1 month')) t on true;
create view public.resumos_metas with(security_invoker=true) as
select m.*,coalesce(r.reservado,0)::numeric(14,2) reservado,
 case when prazo is null then null else
 ceil(greatest(0,m.valor_alvo-coalesce(r.reservado,0))*100/greatest(1,
 (extract(year from prazo)-extract(year from (now() at time zone 'America/Sao_Paulo')::date))*12+
 extract(month from prazo)-extract(month from (now() at time zone 'America/Sao_Paulo')::date)+1))/100 end mensal_necessario
from public.metas m left join lateral(select sum(reservado) reservado from public.reservas_metas where meta_id=m.id and usuario_id=m.usuario_id) r on true;
create view public.avisos_planejamento with(security_invoker=true) as
select a.*,exists(select 1 from public.avisos_lidos l where l.usuario_id=a.usuario_id and l.chave=a.chave) lido
from (
 select t.usuario_id,'t:'||t.id||':'||t.data_vencimento||':'||t.valor||':'||case when t.data_vencimento<(now() at time zone 'America/Sao_Paulo')::date then 'atrasado' else 'proximo' end chave,
 t.descricao titulo,case when t.data_vencimento<(now() at time zone 'America/Sao_Paulo')::date then 'Vencido' else 'Vence em até 7 dias' end detalhe,
 t.valor,t.data_vencimento data,'/lancamentos'::text destino
 from public.transacoes t where not t.excluida and t.status='previsto' and t.conta_id is not null and t.tipo='despesa' and t.data_vencimento<=(now() at time zone 'America/Sao_Paulo')::date+7
 union all
 select f.usuario_id,'f:'||f.id||':'||f.pendente||':'||case when f.vencimento<(now() at time zone 'America/Sao_Paulo')::date then 'atrasado' else 'proximo' end,
 'Fatura · '||c.nome,'Vencimento de fatura',f.pendente,f.vencimento,'/cartoes' from public.resumos_faturas f join public.cartoes c on c.id=f.cartao_id
 where f.pendente>0 and f.vencimento<=(now() at time zone 'America/Sao_Paulo')::date+7
 union all
 select o.usuario_id,'o:'||o.id||':'||case when o.percentual>=100 then '100' else '80' end,
 'Orçamento · '||o.categoria,case when o.percentual>=100 then 'Limite atingido ou ultrapassado' else '80% do orçamento utilizado' end,o.gasto,o.mes,'/limites'
 from public.resumos_orcamentos o where o.mes=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date and o.percentual>=80
) a;
revoke all on public.reservas_metas,public.resumos_orcamentos,public.resumos_metas,public.avisos_planejamento from public,anon,authenticated;
grant select on public.reservas_metas,public.resumos_orcamentos,public.resumos_metas,public.avisos_planejamento to authenticated;

-- Only called while holding the owner's profile lock. Occurrence uniqueness also protects retries.
create function public.bolsu_generate(u uuid,inicio date,fim date) returns void language plpgsql set search_path='' as $$
declare r record; v public.versoes_recorrencia; m date; d date;
begin
 for r in select * from public.recorrencias where usuario_id=u and ativa loop
  m:=date_trunc('month',greatest(inicio,r.data_inicio))::date;
  while m<=fim loop
   select * into v from public.versoes_recorrencia where recorrencia_id=r.id and usuario_id=u and desde<=m order by desde desc limit 1;
   if found then
    d:=public.bolsu_dia(m,v.dia);
    if d>=r.data_inicio and (r.data_fim is null or d<=r.data_fim) and exists(select 1 from public.contas where id=v.conta_id and usuario_id=u and not arquivada and data_saldo_inicial<=d) then
     insert into public.transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento,status,recorrencia_id,ocorrencia)
     values(u,v.descricao,v.tipo,v.valor,v.categoria_id,v.conta_id,d,d,'previsto',r.id,m) on conflict(recorrencia_id,ocorrencia) do nothing;
    end if;
   end if;
   m:=(m+interval '1 month')::date;
  end loop;
 end loop;
end $$;
revoke all on function public.bolsu_generate(uuid,date,date) from public,anon,authenticated;

create function public.bolsu_planning(p_operation text,p_data jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); hoje date:=(now() at time zone 'America/Sao_Paulo')::date;
 ident uuid; aid uuid; cat uuid; source uuid; transfer_id uuid; rid uuid; amount numeric; balance numeric; reserved numeric;
 d date; m date; finish date; start_date date; n integer; allowed text[]; result jsonb; prior public.operacoes_diarias;
 r public.recorrencias; t public.transacoes; a public.contas;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Solicitação inválida.' using errcode='22023';end if;
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'Perfil não encontrado.' using errcode='42501';end if;
 select * into prior from public.operacoes_diarias where usuario_id=u and chave=p_request_id;
 if found then
  if prior.operacao<>p_operation or prior.dados<>p_data then raise exception 'Solicitação já usada com outros dados.' using errcode='22023';end if;
  return prior.resultado;
 end if;
 allowed:=case p_operation
 when 'recurrence.save' then array['id','descricao','tipo','valor','conta_id','categoria_id','dia','data_inicio','data_fim','desde']
 when 'recurrence.end' then array['id','data_fim']
 when 'recurrence.generate' then array['mes']
 when 'occurrence.save' then array['id','descricao','valor','data_vencimento','status','data_realizacao']
 when 'occurrence.delete' then array['id']
 when 'budget.save' then array['categoria_id','mes','valor']
 when 'budget.delete' then array['id']
 when 'goal.save' then array['id','titulo','valor_alvo','prazo','arquivada']
 when 'goal.entry' then array['meta_id','conta_id','tipo','valor','data','origem_id']
 when 'alert.read' then array['chave','lido'] end;
 if allowed is null or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(allowed))) then raise exception 'Operação ou campos inválidos.' using errcode='22023';end if;
 ident:=nullif(p_data->>'id','')::uuid;
 if p_operation in ('recurrence.end','occurrence.save','occurrence.delete','budget.delete') and ident is null then raise exception 'Registro obrigatório.' using errcode='22023';end if;
 if p_operation='recurrence.save' then
  aid:=(p_data->>'conta_id')::uuid;cat:=(p_data->>'categoria_id')::uuid;amount:=public.bolsu_decimal(p_data->>'valor');n:=(p_data->>'dia')::integer;
  select * into a from public.contas where id=aid and usuario_id=u and not arquivada;
  if not found then raise exception 'Selecione uma conta ativa.' using errcode='22023';end if;
  if not exists(select 1 from public.categorias where id=cat and usuario_id=u and not arquivada and tipo=p_data->>'tipo') then raise exception 'Categoria incompatível.' using errcode='22023';end if;
  if n is null or n not between 1 and 31 then raise exception 'Dia inválido.' using errcode='22023';end if;
  if ident is null then
   start_date:=public.bolsu_data(p_data->>'data_inicio');m:=date_trunc('month',start_date)::date;
   finish:=case when p_data->>'data_fim' is not null then public.bolsu_data(p_data->>'data_fim') end;
   if start_date<a.data_saldo_inicial then raise exception 'Início anterior à abertura da conta.' using errcode='22023';end if;
   insert into public.recorrencias(usuario_id,descricao,tipo,valor,conta_id,categoria_id,dia,data_inicio,data_fim)
   values(u,btrim(p_data->>'descricao'),p_data->>'tipo',amount,aid,cat,n,start_date,finish) returning id into ident;
  else
   select * into r from public.recorrencias where id=ident and usuario_id=u and ativa;
   if not found then raise exception 'Recorrência ativa não encontrada.' using errcode='22023';end if;
   if p_data ? 'data_inicio' or p_data ? 'data_fim' then raise exception 'Use o encerramento para alterar o fim.' using errcode='22023';end if;
   m:=public.bolsu_data(p_data->>'desde');
   if extract(day from m)<>1 or m<date_trunc('month',hoje)::date or m<date_trunc('month',r.data_inicio)::date or public.bolsu_dia(m,n)<greatest(hoje,a.data_saldo_inicial) then raise exception 'Escolha um mês futuro compatível com a conta e o dia.' using errcode='22023';end if;
   if r.data_fim is not null and public.bolsu_dia(m,n)>r.data_fim then raise exception 'Período posterior ao encerramento.' using errcode='22023';end if;
   if exists(select 1 from public.versoes_recorrencia where recorrencia_id=ident and desde>m) then raise exception 'Edite a partir da última alteração programada.' using errcode='22023';end if;
   update public.recorrencias set descricao=btrim(p_data->>'descricao'),tipo=p_data->>'tipo',valor=amount,conta_id=aid,categoria_id=cat,dia=n where id=ident and usuario_id=u;
   update public.transacoes set descricao=btrim(p_data->>'descricao'),tipo=p_data->>'tipo',valor=amount,conta_id=aid,categoria_id=cat,
    data_competencia=public.bolsu_dia(ocorrencia,n),data_vencimento=public.bolsu_dia(ocorrencia,n)
    where usuario_id=u and recorrencia_id=ident and ocorrencia>=m and status='previsto' and not excluida and not personalizada and data_vencimento>=hoje;
  end if;
  insert into public.versoes_recorrencia(usuario_id,recorrencia_id,desde,descricao,tipo,valor,conta_id,categoria_id,dia)
  values(u,ident,m,btrim(p_data->>'descricao'),p_data->>'tipo',amount,aid,cat,n)
  on conflict(recorrencia_id,desde) do update set descricao=excluded.descricao,tipo=excluded.tipo,valor=excluded.valor,conta_id=excluded.conta_id,categoria_id=excluded.categoria_id,dia=excluded.dia;
  perform public.bolsu_generate(u,m,least(date '2200-12-31',(m+interval '11 months')::date));
 elsif p_operation='recurrence.end' then
  finish:=public.bolsu_data(p_data->>'data_fim');
  select * into r from public.recorrencias where id=ident and usuario_id=u and ativa;
  if not found or finish<greatest(hoje,r.data_inicio) then raise exception 'Confira a recorrência e a data final (a partir de hoje).' using errcode='22023';end if;
  update public.recorrencias set data_fim=finish where id=ident and usuario_id=u;
  update public.transacoes set excluida=true where usuario_id=u and recorrencia_id=ident and status='previsto' and data_vencimento>finish;
 elsif p_operation='recurrence.generate' then
  m:=public.bolsu_data(p_data->>'mes');
  if extract(day from m)<>1 then raise exception 'Use o primeiro dia do mês.' using errcode='22023';end if;
  perform public.bolsu_generate(u,m,least(date '2200-12-31',(m+interval '11 months')::date));
 elsif p_operation in ('occurrence.save','occurrence.delete') then
  select * into t from public.transacoes where id=ident and usuario_id=u and recorrencia_id is not null and not excluida;
  if not found then raise exception 'Ocorrência não encontrada.' using errcode='22023';end if;
  select * into a from public.contas where id=t.conta_id and usuario_id=u and not arquivada;
  if not found then raise exception 'Reative a conta para alterar o histórico.' using errcode='22023';end if;
  if p_operation='occurrence.delete' then update public.transacoes set excluida=true,personalizada=true where id=ident and usuario_id=u;
  else
   amount:=public.bolsu_decimal(p_data->>'valor');d:=public.bolsu_data(p_data->>'data_vencimento');
   finish:=case when p_data->>'data_realizacao' is not null then public.bolsu_data(p_data->>'data_realizacao') end;
   if p_data->>'status' is null or p_data->>'status' not in ('previsto','realizado') or ((p_data->>'status'='realizado')<>(finish is not null)) or finish>hoje or coalesce(finish,d)<a.data_saldo_inicial then raise exception 'Confira a situação e as datas.' using errcode='22023';end if;
   update public.transacoes set descricao=btrim(p_data->>'descricao'),valor=amount,data_vencimento=d,status=p_data->>'status',data_realizacao=finish,personalizada=true where id=ident and usuario_id=u;
  end if;
 elsif p_operation='budget.save' then
  cat:=(p_data->>'categoria_id')::uuid;m:=public.bolsu_data(p_data->>'mes');amount:=public.bolsu_decimal(p_data->>'valor');
  if not exists(select 1 from public.categorias where id=cat and usuario_id=u and tipo='despesa' and not arquivada) then raise exception 'Selecione uma categoria de despesa.' using errcode='22023';end if;
  insert into public.orcamentos(usuario_id,categoria_id,mes,valor) values(u,cat,m,amount)
  on conflict(usuario_id,categoria_id,mes) do update set valor=excluded.valor returning id into ident;
 elsif p_operation='budget.delete' then
  delete from public.orcamentos where id=ident and usuario_id=u;
  if not found then raise exception 'Orçamento não encontrado.' using errcode='22023';end if;
 elsif p_operation='goal.save' then
  amount:=public.bolsu_decimal(p_data->>'valor_alvo');finish:=case when p_data->>'prazo' is not null then public.bolsu_data(p_data->>'prazo') end;
  if ident is null then
   insert into public.metas(usuario_id,titulo,valor_alvo,prazo) values(u,btrim(p_data->>'titulo'),amount,finish) returning id into ident;
  else
   if coalesce((p_data->>'arquivada')::boolean,false) and exists(select 1 from public.reservas_metas where meta_id=ident and usuario_id=u and reservado<>0) then raise exception 'Retire as reservas antes de arquivar a meta.' using errcode='22023';end if;
   update public.metas set titulo=btrim(p_data->>'titulo'),valor_alvo=amount,prazo=finish,arquivada=coalesce((p_data->>'arquivada')::boolean,false) where id=ident and usuario_id=u;
   if not found then raise exception 'Meta não encontrada.' using errcode='22023';end if;
  end if;
 elsif p_operation='goal.entry' then
  rid:=(p_data->>'meta_id')::uuid;aid:=(p_data->>'conta_id')::uuid;source:=nullif(p_data->>'origem_id','')::uuid;
  amount:=public.bolsu_decimal(p_data->>'valor');d:=public.bolsu_data(p_data->>'data');
  if not exists(select 1 from public.metas where id=rid and usuario_id=u and not arquivada) then raise exception 'Selecione uma meta ativa.' using errcode='22023';end if;
  select * into a from public.contas where id=aid and usuario_id=u and not arquivada;
  if not found or d>hoje or d<a.data_saldo_inicial then raise exception 'Confira a conta e a data.' using errcode='22023';end if;
  if p_data->>'tipo' is null or p_data->>'tipo' not in ('aporte','retirada') then raise exception 'Tipo inválido.' using errcode='22023';end if;
  if exists(select 1 from public.aportes_metas where meta_id=rid and conta_id=aid and usuario_id=u and data>d) then raise exception 'Use uma data a partir do último movimento desta reserva.' using errcode='22023';end if;
  select coalesce(sum(reservado),0) into reserved from public.reservas_metas where usuario_id=u and meta_id=rid and conta_id=aid;
  if p_data->>'tipo'='retirada' and amount>reserved then raise exception 'Retirada excede a reserva desta meta na conta.' using errcode='22023';end if;
  if source is not null then
   if source=aid or p_data->>'tipo'<>'aporte' or not exists(select 1 from public.contas where id=source and usuario_id=u and not arquivada and data_saldo_inicial<=d) then raise exception 'Origem inválida para transferência de aporte.' using errcode='22023';end if;
   select saldo_atual into balance from public.saldos_contas where id=source and usuario_id=u;
   select coalesce(sum(reservado),0) into reserved from public.reservas_metas where usuario_id=u and conta_id=source;
   if amount>balance-reserved then raise exception 'Saldo sem reservas insuficiente na origem.' using errcode='22023';end if;
   insert into public.transferencias(usuario_id,conta_origem_id,conta_destino_id,valor,data) values(u,source,aid,amount,d) returning id into transfer_id;
  end if;
  if p_data->>'tipo'='aporte' then
   select saldo_atual into balance from public.saldos_contas where id=aid and usuario_id=u;
   select coalesce(sum(reservado),0) into reserved from public.reservas_metas where usuario_id=u and conta_id=aid;
   if amount>balance-reserved then raise exception 'Saldo sem reservas insuficiente nesta conta.' using errcode='22023';end if;
  end if;
  insert into public.aportes_metas(usuario_id,meta_id,conta_id,tipo,valor,data,transferencia_id) values(u,rid,aid,p_data->>'tipo',amount,d,transfer_id) returning id into ident;
 elsif p_operation='alert.read' then
  if not exists(select 1 from public.avisos_planejamento where usuario_id=u and chave=p_data->>'chave') then raise exception 'Aviso não encontrado.' using errcode='22023';end if;
  if (p_data->>'lido')::boolean then insert into public.avisos_lidos(usuario_id,chave) values(u,p_data->>'chave') on conflict do nothing;
  else delete from public.avisos_lidos where usuario_id=u and chave=p_data->>'chave';end if;
 end if;
 result:=jsonb_build_object('id',ident);
 insert into public.operacoes_diarias(usuario_id,chave,operacao,dados,resultado) values(u,p_request_id,p_operation,p_data,result);
 return result;
end $$;
revoke all on function public.bolsu_planning(text,jsonb,uuid) from public,anon;
grant execute on function public.bolsu_planning(text,jsonb,uuid) to authenticated;

create function public.bolsu_planning_snapshot(p_month date,p_page integer default 0) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_month is null or extract(day from p_month)<>1 or p_month<date '1900-01-01' or p_month>date '2200-12-01' or p_page is null or p_page<0 or p_page>100000 then raise exception 'Período inválido.' using errcode='22023';end if;
 select jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('reservado',coalesce(r.reservado,0))) from public.saldos_contas a left join lateral(select sum(reservado) reservado from public.reservas_metas where conta_id=a.id and usuario_id=u) r on true where a.usuario_id=u),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(c order by c.nome) from public.categorias c where usuario_id=u),'[]'::jsonb),
 'recurrences',coalesce((select jsonb_agg(r order by r.created_at desc) from public.recorrencias r where usuario_id=u),'[]'::jsonb),
 'versions',coalesce((select jsonb_agg(v order by v.desde) from public.versoes_recorrencia v where usuario_id=u),'[]'::jsonb),
 'occurrences',coalesce((select jsonb_agg(t order by t.data_vencimento,t.id) from (select * from public.transacoes where usuario_id=u and recorrencia_id is not null and not excluida and ocorrencia=p_month order by data_vencimento,id limit 100 offset p_page*100) t),'[]'::jsonb),
 'occurrenceCount',(select count(*) from public.transacoes where usuario_id=u and recorrencia_id is not null and not excluida and ocorrencia=p_month),
 'budgets',coalesce((select jsonb_agg(b order by b.categoria) from public.resumos_orcamentos b where usuario_id=u and mes=p_month),'[]'::jsonb),
 'goals',coalesce((select jsonb_agg(g order by g.created_at desc) from public.resumos_metas g where usuario_id=u),'[]'::jsonb),
 'reserves',coalesce((select jsonb_agg(r) from public.reservas_metas r where usuario_id=u),'[]'::jsonb),
 'entries',coalesce((select jsonb_agg(e order by e.data desc,e.id) from (select * from public.aportes_metas where usuario_id=u and data>=p_month and data<(p_month+interval '1 month') order by data desc,id limit 100 offset p_page*100) e),'[]'::jsonb),
 'entryCount',(select count(*) from public.aportes_metas where usuario_id=u and data>=p_month and data<(p_month+interval '1 month')),
 'alerts',coalesce((select jsonb_agg(a order by a.data,a.chave) from (select * from public.avisos_planejamento where usuario_id=u order by data,chave limit 100 offset p_page*100) a),'[]'::jsonb),
 'alertCount',(select count(*) from public.avisos_planejamento where usuario_id=u)
 ) into result;
 return result;
end $$;
revoke all on function public.bolsu_planning_snapshot(date,integer) from public,anon;
grant execute on function public.bolsu_planning_snapshot(date,integer) to authenticated;
commit;
