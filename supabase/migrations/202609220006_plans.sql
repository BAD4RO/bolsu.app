begin;
-- Matriz única usada tanto pelas verificações como pela oferta na interface.
create function public.bolsu_plan_rules() returns jsonb language sql immutable set search_path='' as $$
 select '{"free":{"name":"Gratuito","accounts":2,"cards":1,"goals":1,"projection":false,"comparisons":false,"customCategories":false,"customAlerts":false,"goalEstimate":false},"plus":{"name":"Plus","accounts":null,"cards":null,"goals":null,"projection":true,"comparisons":true,"customCategories":true,"customAlerts":true,"goalEstimate":true}}'::jsonb
$$;
revoke all on function public.bolsu_plan_rules() from public,anon;
grant execute on function public.bolsu_plan_rules() to authenticated;
create function public.bolsu_plan_for(u uuid) returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.subscriptions where usuario_id=u and plano='plus' and
  ((status='trialing' and trial_ends_at>now()) or (status in ('active','canceled') and current_period_end>now()))) then 'plus' else 'free' end
$$;
revoke all on function public.bolsu_plan_for(uuid) from public,anon,authenticated;
create function public.bolsu_my_plan() returns text language sql stable security definer set search_path='' as $$select public.bolsu_plan_for(auth.uid())$$;
revoke all on function public.bolsu_my_plan() from public,anon;
grant execute on function public.bolsu_my_plan() to authenticated;
create table public.selecao_plano (
 usuario_id uuid primary key references public.profiles(id), contas uuid[] not null default '{}',cartoes uuid[] not null default '{}',metas uuid[] not null default '{}',updated_at timestamptz not null default now()
);
create table public.preferencias_avisos (
 usuario_id uuid primary key references public.profiles(id),antecedencia integer not null default 7 check(antecedencia between 1 and 30),limiar integer not null default 80 check(limiar between 50 and 100)
);
do $$ declare t text;begin foreach t in array array['selecao_plano','preferencias_avisos'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('create policy owner_read on public.%I for select to authenticated using(usuario_id=(select auth.uid()))',t);
end loop;end $$;

create function public.bolsu_resource_allowed(u uuid,kind text,rid uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare n integer;cap integer;chosen uuid[];valid boolean;
begin
 if kind='accounts' then select count(*),coalesce(bool_or(id=rid),false) into n,valid from public.contas where usuario_id=u and not arquivada;select contas into chosen from public.selecao_plano where usuario_id=u;
 elsif kind='cards' then select count(*),coalesce(bool_or(id=rid),false) into n,valid from public.cartoes where usuario_id=u and not arquivado;select cartoes into chosen from public.selecao_plano where usuario_id=u;
 elsif kind='goals' then select count(*),coalesce(bool_or(id=rid),false) into n,valid from public.metas where usuario_id=u and not arquivada;select metas into chosen from public.selecao_plano where usuario_id=u;
 else return false;end if;
 if not valid then return false;end if;
 if public.bolsu_plan_for(u)='plus' then return true;end if;
 cap:=(public.bolsu_plan_rules()#>>array['free',kind])::integer;
 return n<=cap or rid=any(coalesce(chosen,'{}'::uuid[]));
end $$;
create function public.bolsu_assert_capacity(u uuid,kind text) returns void language plpgsql set search_path='' as $$
declare n integer;cap integer;begin
 if public.bolsu_plan_for(u)='plus' then return;end if;
 cap:=(public.bolsu_plan_rules()#>>array['free',kind])::integer;
 if kind='accounts' then select count(*) into n from public.contas where usuario_id=u and not arquivada;
 elsif kind='cards' then select count(*) into n from public.cartoes where usuario_id=u and not arquivado;
 elsif kind='goals' then select count(*) into n from public.metas where usuario_id=u and not arquivada;
 else raise exception 'Recurso inválido.' using errcode='22023';end if;
 if n>=cap then raise exception 'Limite do Gratuito atingido. Gerencie os recursos em Plano e assinatura.' using errcode='P0002';end if;
end $$;
create function public.bolsu_assert_resource(u uuid,kind text,rid uuid) returns void language plpgsql set search_path='' as $$begin
 if not public.bolsu_resource_allowed(u,kind,rid) then raise exception 'Recurso indisponível para novas operações. Escolha seus recursos em Plano e assinatura.' using errcode='P0002';end if;
end $$;
create function public.bolsu_assert_category(u uuid,cat uuid,old_cat uuid default null) returns void language plpgsql set search_path='' as $$begin
 if cat is distinct from old_cat and public.bolsu_plan_for(u)<>'plus' and exists(select 1 from public.categorias where id=cat and usuario_id=u and not padrao) then
  raise exception 'Novas atribuições de categorias personalizadas exigem Plus. Seu histórico permanece disponível.' using errcode='P0002';end if;
end $$;
revoke all on function public.bolsu_resource_allowed(uuid,text,uuid),public.bolsu_assert_capacity(uuid,text),public.bolsu_assert_resource(uuid,text,uuid),public.bolsu_assert_category(uuid,uuid,uuid) from public,anon,authenticated;

-- Fecha também a entrada de criação de conta usada pela fundação.
alter function public.bolsu_create_account(text,text,numeric,date,boolean) rename to bolsu_create_account_base;
revoke all on function public.bolsu_create_account_base(text,text,numeric,date,boolean) from public,anon,authenticated;
create function public.bolsu_create_account(p_nome text,p_tipo text,p_saldo numeric,p_data date,p_incluir boolean default true) returns public.contas
language plpgsql security definer set search_path='' as $$declare u uuid:=auth.uid();begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 perform 1 from public.profiles where id=u for update;
 perform public.bolsu_assert_capacity(u,'accounts');
 return public.bolsu_create_account_base(p_nome,p_tipo,p_saldo,p_data,p_incluir);
end $$;
revoke all on function public.bolsu_create_account(text,text,numeric,date,boolean) from public,anon;
grant execute on function public.bolsu_create_account(text,text,numeric,date,boolean) to authenticated;

alter function public.bolsu_daily(text,jsonb,uuid) rename to bolsu_daily_base;
revoke all on function public.bolsu_daily_base(text,jsonb,uuid) from public,anon,authenticated;
create function public.bolsu_daily(p_operation text,p_data jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();ident uuid;tr public.transacoes;cat uuid;rid uuid;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 perform 1 from public.profiles where id=u for update;
 -- Uma repetição já concluída continua retornando seu recibo, mesmo após expiração.
 if exists(select 1 from public.operacoes_diarias where usuario_id=u and chave=p_request_id) then return public.bolsu_daily_base(p_operation,p_data,p_request_id);end if;
 ident:=(p_data->>'id')::uuid;
 if p_operation='account.save' and ident is not null and not coalesce((p_data->>'arquivada')::boolean,false) and exists(select 1 from public.contas where id=ident and usuario_id=u and arquivada) then perform public.bolsu_assert_capacity(u,'accounts');end if;
 if p_operation='card.save' and (ident is null or (not coalesce((p_data->>'arquivado')::boolean,false) and exists(select 1 from public.cartoes where id=ident and usuario_id=u and arquivado))) then perform public.bolsu_assert_capacity(u,'cards');end if;
 if p_operation='transaction.save' then
  select * into tr from public.transacoes where id=ident and usuario_id=u;
  perform public.bolsu_assert_category(u,(p_data->>'categoria_id')::uuid,tr.categoria_id);
  if tr.id is null or public.bolsu_resource_allowed(u,'accounts',tr.conta_id) then perform public.bolsu_assert_resource(u,'accounts',(p_data->>'conta_id')::uuid);
  else
   -- Excedentes podem liquidar previsões existentes, sem criar uma nova despesa/renda.
   if p_data->>'status'<>'realizado' or (p_data->>'conta_id')::uuid is distinct from tr.conta_id or (p_data->>'categoria_id')::uuid is distinct from tr.categoria_id or
    public.bolsu_decimal(p_data->>'valor')<>tr.valor or p_data->>'descricao' is distinct from tr.descricao or p_data->>'tipo' is distinct from tr.tipo or
    public.bolsu_data(p_data->>'data_competencia')<>tr.data_competencia or public.bolsu_data(p_data->>'data_vencimento')<>tr.data_vencimento then
    raise exception 'Nesta conta, apenas realize uma previsão existente ou gerencie seus recursos no plano.' using errcode='P0002';end if;
  end if;
 elsif p_operation='transaction.delete' then
  select conta_id into rid from public.transacoes where id=ident and usuario_id=u;perform public.bolsu_assert_resource(u,'accounts',rid);
 elsif p_operation='purchase.save' then
  perform public.bolsu_assert_resource(u,'cards',(p_data->>'cartao_id')::uuid);
  select categoria_id,cartao_id into cat,rid from public.transacoes where compra_id=ident and usuario_id=u limit 1;
  if rid is not null then perform public.bolsu_assert_resource(u,'cards',rid);end if;
  perform public.bolsu_assert_category(u,(p_data->>'categoria_id')::uuid,cat);
 elsif p_operation='purchase.delete' then
  select cartao_id into rid from public.transacoes where compra_id=ident and usuario_id=u limit 1;perform public.bolsu_assert_resource(u,'cards',rid);
 end if;
 -- Pagamentos/estornos de fatura, transferências e ajustes continuam disponíveis para conciliar/quitar saldo.
 return public.bolsu_daily_base(p_operation,p_data,p_request_id);
end $$;
revoke all on function public.bolsu_daily(text,jsonb,uuid) from public,anon;
grant execute on function public.bolsu_daily(text,jsonb,uuid) to authenticated;

alter function public.bolsu_planning(text,jsonb,uuid) rename to bolsu_planning_base;
revoke all on function public.bolsu_planning_base(text,jsonb,uuid) from public,anon,authenticated;
create function public.bolsu_planning(p_operation text,p_data jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();ident uuid;tr public.transacoes;cat uuid;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 perform 1 from public.profiles where id=u for update;
 if exists(select 1 from public.operacoes_diarias where usuario_id=u and chave=p_request_id) then return public.bolsu_planning_base(p_operation,p_data,p_request_id);end if;
 ident:=(p_data->>'id')::uuid;
 if p_operation='goal.save' and (ident is null or (not coalesce((p_data->>'arquivada')::boolean,false) and exists(select 1 from public.metas where id=ident and usuario_id=u and arquivada))) then perform public.bolsu_assert_capacity(u,'goals');end if;
 if p_operation='goal.entry' and p_data->>'tipo'='aporte' then
  perform public.bolsu_assert_resource(u,'goals',(p_data->>'meta_id')::uuid);perform public.bolsu_assert_resource(u,'accounts',(p_data->>'conta_id')::uuid);
 elsif p_operation='recurrence.save' then
  perform public.bolsu_assert_resource(u,'accounts',(p_data->>'conta_id')::uuid);
  -- Alteração da regra gera novas atribuições, mesmo mantendo a categoria anterior.
  perform public.bolsu_assert_category(u,(p_data->>'categoria_id')::uuid);
 elsif p_operation='budget.save' then perform public.bolsu_assert_category(u,(p_data->>'categoria_id')::uuid);
 elsif p_operation in ('occurrence.save','occurrence.delete') then
  select * into tr from public.transacoes where id=ident and usuario_id=u;
  if not public.bolsu_resource_allowed(u,'accounts',tr.conta_id) then
   if p_operation='occurrence.delete' or p_data->>'status'<>'realizado' or public.bolsu_decimal(p_data->>'valor')<>tr.valor or p_data->>'descricao' is distinct from tr.descricao or public.bolsu_data(p_data->>'data_vencimento')<>tr.data_vencimento then
    raise exception 'Nesta conta, apenas realize uma ocorrência existente. Para outras operações, escolha os recursos do plano.' using errcode='P0002';end if;
  end if;
 end if;
 return public.bolsu_planning_base(p_operation,p_data,p_request_id);
end $$;
revoke all on function public.bolsu_planning(text,jsonb,uuid) from public,anon;
grant execute on function public.bolsu_planning(text,jsonb,uuid) to authenticated;

create function public.bolsu_plan_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();p text;rules jsonb;result jsonb;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 p:=public.bolsu_plan_for(u);rules:=public.bolsu_plan_rules();
 select jsonb_build_object('subscription',(select to_jsonb(s) from public.subscriptions s where usuario_id=u),'hasPlus',p='plus','plan',p,'matrix',rules,'limits',rules->p,
 'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',nome,'allowed',public.bolsu_resource_allowed(u,'accounts',id)) order by created_at,id) from public.contas where usuario_id=u and not arquivada),'[]'::jsonb),
 'cards',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',nome,'allowed',public.bolsu_resource_allowed(u,'cards',id)) order by created_at,id) from public.cartoes where usuario_id=u and not arquivado),'[]'::jsonb),
 'goals',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',titulo,'allowed',public.bolsu_resource_allowed(u,'goals',id)) order by created_at,id) from public.metas where usuario_id=u and not arquivada),'[]'::jsonb),
 'alerts',jsonb_build_object('antecedencia',case when p='plus' then coalesce((select antecedencia from public.preferencias_avisos where usuario_id=u),7) else 7 end,'limiar',case when p='plus' then coalesce((select limiar from public.preferencias_avisos where usuario_id=u),80) else 80 end),
 'pausedRecurrences',(select count(*) from public.recorrencias r where usuario_id=u and ativa and (not public.bolsu_resource_allowed(u,'accounts',conta_id) or (p='free' and exists(select 1 from public.categorias where id=r.categoria_id and usuario_id=u and not padrao))))
 ) into result;return result;
end $$;
revoke all on function public.bolsu_plan_snapshot() from public,anon;
grant execute on function public.bolsu_plan_snapshot() to authenticated;

create function public.bolsu_plan_manage(p_operation text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();a uuid[];c uuid[];g uuid[];ident uuid;keys text[];begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 perform 1 from public.profiles where id=u for update;
 keys:=case p_operation when 'selection' then array['accounts','cards','goals'] when 'category.save' then array['id','nome','tipo','arquivada'] when 'alerts' then array['antecedencia','limiar'] end;
 if keys is null or p_data is null or jsonb_typeof(p_data)<>'object' or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(keys))) then raise exception 'Campos inválidos.' using errcode='22023';end if;
 if p_operation='selection' then
  if jsonb_typeof(p_data->'accounts') is distinct from 'array' or jsonb_typeof(p_data->'cards') is distinct from 'array' or jsonb_typeof(p_data->'goals') is distinct from 'array' then raise exception 'Selecione contas, cartões e metas.' using errcode='22023';end if;
  select coalesce(array_agg(distinct x::uuid),'{}') into a from jsonb_array_elements_text(p_data->'accounts') x;
  select coalesce(array_agg(distinct x::uuid),'{}') into c from jsonb_array_elements_text(p_data->'cards') x;
  select coalesce(array_agg(distinct x::uuid),'{}') into g from jsonb_array_elements_text(p_data->'goals') x;
  if cardinality(a)>(public.bolsu_plan_rules()#>>'{free,accounts}')::int or cardinality(c)>(public.bolsu_plan_rules()#>>'{free,cards}')::int or cardinality(g)>(public.bolsu_plan_rules()#>>'{free,goals}')::int then raise exception 'Seleção acima dos limites do Gratuito.' using errcode='22023';end if;
  if exists(select 1 from unnest(a) x where not exists(select 1 from public.contas where id=x and usuario_id=u and not arquivada)) or exists(select 1 from unnest(c) x where not exists(select 1 from public.cartoes where id=x and usuario_id=u and not arquivado)) or exists(select 1 from unnest(g) x where not exists(select 1 from public.metas where id=x and usuario_id=u and not arquivada)) then raise exception 'Recurso inválido para a seleção.' using errcode='22023';end if;
  insert into public.selecao_plano(usuario_id,contas,cartoes,metas) values(u,a,c,g) on conflict(usuario_id) do update set contas=excluded.contas,cartoes=excluded.cartoes,metas=excluded.metas,updated_at=now();
 elsif p_operation='alerts' then
  if public.bolsu_plan_for(u)<>'plus' then raise exception 'A configuração de avisos exige Plus.' using errcode='P0002';end if;
  insert into public.preferencias_avisos(usuario_id,antecedencia,limiar) values(u,(p_data->>'antecedencia')::int,(p_data->>'limiar')::int)
  on conflict(usuario_id) do update set antecedencia=excluded.antecedencia,limiar=excluded.limiar;
 elsif p_operation='category.save' then
  if public.bolsu_plan_for(u)<>'plus' then raise exception 'Categorias personalizadas exigem Plus.' using errcode='P0002';end if;
  ident:=(p_data->>'id')::uuid;
  if ident is null then insert into public.categorias(usuario_id,nome,tipo,padrao) values(u,btrim(p_data->>'nome'),p_data->>'tipo',false) returning id into ident;
  else
   if exists(select 1 from public.categorias where id=ident and usuario_id=u and tipo is distinct from p_data->>'tipo') then raise exception 'O tipo da categoria não pode mudar. Crie outra categoria.' using errcode='22023';end if;
   update public.categorias set nome=btrim(p_data->>'nome'),arquivada=coalesce((p_data->>'arquivada')::boolean,false) where id=ident and usuario_id=u and not padrao;
   if not found then raise exception 'Categoria personalizada não encontrada.' using errcode='22023';end if;
  end if;
 end if;
 return jsonb_build_object('id',ident,'saved',true);
end $$;
revoke all on function public.bolsu_plan_manage(text,jsonb) from public,anon;
grant execute on function public.bolsu_plan_manage(text,jsonb) to authenticated;

-- APIs antigas permanecem públicas; implementações internas não podem contornar o plano.
alter function public.bolsu_home_snapshot(integer) rename to bolsu_home_snapshot_base;
revoke all on function public.bolsu_home_snapshot_base(integer) from public,anon,authenticated;
create function public.bolsu_home_snapshot(p_page integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s jsonb;p text;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 s:=public.bolsu_home_snapshot_base(p_page);p:=public.bolsu_plan_for(u);
 if p='free' then
  s:=jsonb_set(s,'{projection}',(s->'projection')-array['available','withoutIncome','nextIncomeDate','beforeNextIncome','lowestBalance','firstShortfallDate']);
  if s->'priorityGoal'<>'null'::jsonb then s:=jsonb_set(s,'{priorityGoal,mensal_necessario}','null');end if;
 end if;
 return s||jsonb_build_object('hasPlus',p='plus');
end $$;
revoke all on function public.bolsu_home_snapshot(integer) from public,anon;
grant execute on function public.bolsu_home_snapshot(integer) to authenticated;
alter function public.bolsu_planning_snapshot(date,integer) rename to bolsu_planning_snapshot_base;
revoke all on function public.bolsu_planning_snapshot_base(date,integer) from public,anon,authenticated;
create function public.bolsu_planning_snapshot(p_month date,p_page integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s jsonb;p text;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 s:=public.bolsu_planning_snapshot_base(p_month,p_page);p:=public.bolsu_plan_for(u);
 if p='free' then s:=jsonb_set(s,'{goals}',coalesce((select jsonb_agg(x||'{"mensal_necessario":null}'::jsonb) from jsonb_array_elements(s->'goals') x),'[]'::jsonb));end if;
 return s||jsonb_build_object('hasPlus',p='plus');
end $$;
revoke all on function public.bolsu_planning_snapshot(date,integer) from public,anon;
grant execute on function public.bolsu_planning_snapshot(date,integer) to authenticated;

create function public.bolsu_comparisons() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();s jsonb;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if public.bolsu_plan_for(u)<>'plus' then raise exception 'Comparativos mensais exigem Plus.' using errcode='P0002';end if;
 select jsonb_agg(x order by x.mes) into s from (
 select m.dia::date mes,coalesce(sum(t.valor) filter(where t.tipo='receita' and t.status='realizado'),0) receitas,
 coalesce(sum(t.valor) filter(where t.tipo='despesa' and (t.status='realizado' or t.cartao_id is not null)),0) despesas
 from generate_series(date_trunc('month',now() at time zone 'America/Sao_Paulo')-interval '11 months',date_trunc('month',now() at time zone 'America/Sao_Paulo'),interval '1 month') m(dia)
 left join public.transacoes t on t.usuario_id=u and not t.excluida and t.data_competencia>=m.dia::date and t.data_competencia<(m.dia+interval '1 month')::date group by m.dia
 ) x;return s;
end $$;
revoke all on function public.bolsu_comparisons() from public,anon;
grant execute on function public.bolsu_comparisons() to authenticated;

create function public.bolsu_export(p_kind text,p_page integer default 0) returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid();s jsonb;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('contas','categorias','transacoes','cartoes','faturas','transferencias','pagamentos_fatura','recorrencias','versoes_recorrencia','orcamentos','metas','aportes_metas','ajustes_conta') or p_page is null or p_page<0 or p_page>100000 then raise exception 'Exportação inválida.' using errcode='22023';end if;
 execute format('select coalesce(jsonb_agg(to_jsonb(x)-''usuario_id''),''[]''::jsonb) from (select * from public.%I where usuario_id=$1 order by id limit 1000 offset $2) x',p_kind) into s using u,p_page*1000;
 return s;
end $$;
revoke all on function public.bolsu_export(text,integer) from public,anon;
grant execute on function public.bolsu_export(text,integer) to authenticated;
create or replace function public.bolsu_generate(u uuid,inicio date,fim date) returns void language plpgsql set search_path='' as $$
declare r record; v public.versoes_recorrencia; m date; d date;
begin
 for r in select * from public.recorrencias where usuario_id=u and ativa loop
  m:=date_trunc('month',greatest(inicio,r.data_inicio))::date;
  while m<=fim loop
   select * into v from public.versoes_recorrencia where recorrencia_id=r.id and usuario_id=u and desde<=m order by desde desc limit 1;
   if found and public.bolsu_resource_allowed(u,'accounts',v.conta_id) and (public.bolsu_plan_for(u)='plus' or exists(select 1 from public.categorias where id=v.categoria_id and usuario_id=u and padrao and not arquivada)) then
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

create function public.bolsu_alert_settings() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('days',case when public.bolsu_plan_for(auth.uid())='plus' then coalesce((select antecedencia from public.preferencias_avisos where usuario_id=auth.uid()),7) else 7 end,'threshold',case when public.bolsu_plan_for(auth.uid())='plus' then coalesce((select limiar from public.preferencias_avisos where usuario_id=auth.uid()),80) else 80 end)
$$;
revoke all on function public.bolsu_alert_settings() from public,anon;
grant execute on function public.bolsu_alert_settings() to authenticated;
create or replace view public.resumos_metas with(security_invoker=true) as
select m.*,coalesce(r.reservado,0)::numeric(14,2) reservado,
 case when prazo is null or public.bolsu_my_plan()<>'plus' then null else
 ceil(greatest(0,m.valor_alvo-coalesce(r.reservado,0))*100/greatest(1,
 (extract(year from prazo)-extract(year from (now() at time zone 'America/Sao_Paulo')::date))*12+
 extract(month from prazo)-extract(month from (now() at time zone 'America/Sao_Paulo')::date)+1))/100 end mensal_necessario
from public.metas m left join lateral(select sum(reservado) reservado from public.reservas_metas where meta_id=m.id and usuario_id=m.usuario_id) r on true;
create or replace view public.avisos_planejamento with(security_invoker=true) as
select a.*,exists(select 1 from public.avisos_lidos l where l.usuario_id=a.usuario_id and l.chave=a.chave) lido
from (
 select t.usuario_id,'t:'||t.id||':'||t.data_vencimento||':'||t.valor||':'||case when t.data_vencimento<(now() at time zone 'America/Sao_Paulo')::date then 'atrasado' else 'proximo' end chave,
 t.descricao titulo,case when t.data_vencimento<(now() at time zone 'America/Sao_Paulo')::date then 'Vencido' else 'Vence em breve' end detalhe,
 t.valor,t.data_vencimento data,'/lancamentos'::text destino
 from public.transacoes t where not t.excluida and t.status='previsto' and t.conta_id is not null and t.tipo='despesa' and t.data_vencimento<=(now() at time zone 'America/Sao_Paulo')::date+((select public.bolsu_alert_settings())->>'days')::int
 union all
 select f.usuario_id,'f:'||f.id||':'||f.pendente||':'||case when f.vencimento<(now() at time zone 'America/Sao_Paulo')::date then 'atrasado' else 'proximo' end,
 'Fatura · '||c.nome,'Vencimento de fatura',f.pendente,f.vencimento,'/cartoes' from public.resumos_faturas f join public.cartoes c on c.id=f.cartao_id
 where f.pendente>0 and f.vencimento<=(now() at time zone 'America/Sao_Paulo')::date+((select public.bolsu_alert_settings())->>'days')::int
 union all
 select o.usuario_id,'o:'||o.id||':'||case when o.percentual>=100 then '100' else (((select public.bolsu_alert_settings())->>'threshold')::int)::text end,
 'Orçamento · '||o.categoria,case when o.percentual>=100 then 'Limite atingido ou ultrapassado' else (((select public.bolsu_alert_settings())->>'threshold')::int)::text||'% do orçamento utilizado' end,o.gasto,o.mes,'/limites'
 from public.resumos_orcamentos o where o.mes=date_trunc('month',now() at time zone 'America/Sao_Paulo')::date and o.percentual>=((select public.bolsu_alert_settings())->>'threshold')::int
) a;

commit;
