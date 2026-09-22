begin;
alter table public.transacoes add column excluida boolean not null default false, add column compra_id uuid, add column data_compra date;
alter table public.transferencias add column excluida boolean not null default false;
alter table public.pagamentos_fatura add column excluida boolean not null default false;
alter table public.cartoes add column bandeira text not null default 'Mastercard' check (bandeira in ('Mastercard','Visa','Elo','Outra'));
create table public.ajustes_conta (
 id uuid primary key default gen_random_uuid(), usuario_id uuid not null default auth.uid() references public.profiles(id),
 conta_id uuid not null, valor numeric(14,2) not null check(valor <> 0 and valor <> 'NaN'::numeric),
 data date not null, motivo text not null check(char_length(btrim(motivo)) between 1 and 160),
 excluida boolean not null default false, created_at timestamptz not null default now(),
 foreign key(conta_id,usuario_id) references public.contas(id,usuario_id)
);
alter table public.ajustes_conta enable row level security;
create policy owner_read on public.ajustes_conta for select to authenticated using (usuario_id=(select auth.uid()));
revoke all on public.ajustes_conta from public,anon,authenticated;
grant select on public.ajustes_conta to authenticated;
create index on public.ajustes_conta(usuario_id,conta_id);
-- Idempotência: recibo da operação, sem expor payloads ou aceitar dono pelo cliente.
create table public.operacoes_diarias (
 usuario_id uuid not null references public.profiles(id), chave uuid not null, operacao text not null,
 dados jsonb not null, resultado jsonb not null, created_at timestamptz not null default now(),primary key(usuario_id,chave)
);
alter table public.operacoes_diarias enable row level security;
revoke all on public.operacoes_diarias from public,anon,authenticated;
create index on public.transacoes(usuario_id,compra_id);
create or replace view public.saldos_contas with(security_invoker=true) as
select c.*,(c.saldo_inicial
 +coalesce((select sum(case when t.tipo='receita' then t.valor else -t.valor end) from public.transacoes t where t.conta_id=c.id and t.usuario_id=c.usuario_id and not t.excluida and t.status='realizado' and t.data_realizacao between c.data_saldo_inicial and (now() at time zone 'America/Sao_Paulo')::date),0)
 +coalesce((select sum(case when t.conta_destino_id=c.id then t.valor else -t.valor end) from public.transferencias t where t.usuario_id=c.usuario_id and not t.excluida and (t.conta_destino_id=c.id or t.conta_origem_id=c.id) and t.data between c.data_saldo_inicial and (now() at time zone 'America/Sao_Paulo')::date),0)
 -coalesce((select sum(p.valor) from public.pagamentos_fatura p where p.conta_id=c.id and p.usuario_id=c.usuario_id and not p.excluida and p.data between c.data_saldo_inicial and (now() at time zone 'America/Sao_Paulo')::date),0)
 +coalesce((select sum(a.valor) from public.ajustes_conta a where a.conta_id=c.id and a.usuario_id=c.usuario_id and not a.excluida and a.data between c.data_saldo_inicial and (now() at time zone 'America/Sao_Paulo')::date),0)
)::numeric(14,2) saldo_atual from public.contas c;
create view public.resumos_faturas with(security_invoker=true) as
select f.*,coalesce(t.total,0)::numeric(14,2) total,coalesce(p.pago,0)::numeric(14,2) pago,
 (coalesce(t.total,0)-coalesce(p.pago,0))::numeric(14,2) pendente
from public.faturas f
left join lateral(select sum(valor) total from public.transacoes where fatura_id=f.id and usuario_id=f.usuario_id and not excluida) t on true
left join lateral(select sum(valor) pago from public.pagamentos_fatura where fatura_id=f.id and usuario_id=f.usuario_id and not excluida) p on true;
create view public.resumos_cartoes with(security_invoker=true) as
select c.*,coalesce((select sum(f.pendente) from public.resumos_faturas f where f.cartao_id=c.id and f.usuario_id=c.usuario_id),0)::numeric(14,2) utilizado from public.cartoes c;
revoke all on public.resumos_faturas,public.resumos_cartoes from public,anon,authenticated;
grant select on public.resumos_faturas,public.resumos_cartoes to authenticated;
-- Helpers privados: validações também se aplicam a chamadas diretas de RPC.
create function public.bolsu_decimal(v text, positivo boolean default true) returns numeric language plpgsql set search_path='' as $$
declare n numeric;begin
 if v is null or v !~ '^-?[0-9]{1,12}([.,][0-9]{1,2})?$' then raise exception 'Valor monetário inválido.' using errcode='22023'; end if;
 n:=replace(v,',','.')::numeric;
 if positivo and n<=0 then raise exception 'O valor precisa ser maior que zero.' using errcode='22023';end if;return n;
end $$;
create function public.bolsu_data(v text) returns date language plpgsql set search_path='' as $$
declare d date; begin
 if v is null or v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Data inválida.' using errcode='22023';end if;
 d:=v::date; if d<date '1900-01-01' or d>date '2200-12-31' then raise exception 'Data fora do período permitido.' using errcode='22023';end if;return d;
end $$;
create function public.bolsu_dia(m date,d integer) returns date language sql immutable set search_path='' as $$
 select (date_trunc('month',m)::date + (least(d,extract(day from (date_trunc('month',m)+interval '1 month - 1 day'))::int)-1))::date
$$;
revoke all on function public.bolsu_decimal(text,boolean),public.bolsu_data(text),public.bolsu_dia(date,integer) from public,anon,authenticated;
create function public.bolsu_daily(p_operation text,p_data jsonb,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); hoje date:=(now() at time zone 'America/Sao_Paulo')::date;
 ident uuid; aid uuid; bid uuid; cat uuid; cid uuid; fid uuid; purchase uuid; grp uuid;
 amount numeric; dt date; competence date; due date; realized date; m date; closing date;
 a public.contas; b public.contas; c public.cartoes; tr public.transacoes;
 prior public.operacoes_diarias; result jsonb; keys text[]; n integer; i integer; cents bigint; part numeric; paid numeric; total numeric;
begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_request_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Solicitação inválida.' using errcode='22023';end if;
 -- Um lock por proprietário serializa pagamento, compra e edição. Não há corrida entre saldo de fatura e pagamento.
 perform 1 from public.profiles where id=u for update;
 if not found then raise exception 'Perfil não encontrado.' using errcode='42501';end if;
 select * into prior from public.operacoes_diarias where usuario_id=u and chave=p_request_id;
 if found then
  if prior.operacao<>p_operation or prior.dados<>p_data then raise exception 'Esta solicitação já foi usada com outros dados.' using errcode='22023';end if;
  return prior.resultado;
 end if;
 keys:=case p_operation
 when 'account.save' then array['id','nome','tipo','saldo_inicial','data_saldo_inicial','incluir_no_disponivel','arquivada']
 when 'adjustment.save' then array['conta_id','valor','data','motivo']
 when 'adjustment.delete' then array['id']
 when 'transaction.save' then array['id','descricao','tipo','valor','categoria_id','conta_id','data_competencia','data_vencimento','data_realizacao','status','observacoes']
 when 'transaction.delete' then array['id']
 when 'transfer.save' then array['id','conta_origem_id','conta_destino_id','valor','data']
 when 'transfer.delete' then array['id']
 when 'card.save' then array['id','nome','limite','dia_fechamento','dia_vencimento','bandeira','arquivado']
 when 'purchase.save' then array['id','cartao_id','descricao','valor','categoria_id','data_compra','parcelas']
 when 'purchase.delete' then array['id']
 when 'payment.save' then array['conta_id','fatura_id','valor','data']
 when 'payment.delete' then array['id'] else null end;
 if keys is null or exists(select 1 from jsonb_object_keys(p_data) k where not(k=any(keys))) then raise exception 'Operação ou campos inválidos.' using errcode='22023';end if;
 ident:=nullif(p_data->>'id','')::uuid;
 if p_operation in ('transaction.delete','transfer.delete','purchase.delete','payment.delete','adjustment.delete') and ident is null then raise exception 'Registro obrigatório.' using errcode='22023';end if;

 -- Edições não podem reabrir silenciosamente o saldo de contas arquivadas.
 if ident is not null and p_operation in ('transaction.save','transaction.delete','transfer.save','transfer.delete','payment.delete','adjustment.delete') then
  if exists(select 1 from public.contas ac where ac.usuario_id=u and ac.arquivada and (
   ac.id in(select conta_id from public.transacoes where id=ident and usuario_id=u) or
   ac.id in(select conta_origem_id from public.transferencias where id=ident and usuario_id=u) or
   ac.id in(select conta_destino_id from public.transferencias where id=ident and usuario_id=u) or
   ac.id in(select conta_id from public.pagamentos_fatura where id=ident and usuario_id=u) or
   ac.id in(select conta_id from public.ajustes_conta where id=ident and usuario_id=u)
  )) then raise exception 'Reative a conta antes de alterar seu histórico.' using errcode='22023';end if;
  if p_operation in ('transfer.save','transfer.delete') and exists(select 1 from public.aportes_metas where transferencia_id=ident and usuario_id=u) then raise exception 'Transferência vinculada a uma reserva.' using errcode='22023';end if;
 end if;
 if p_operation='account.save' then
  if ident is null then
   a:=public.bolsu_create_account(p_data->>'nome',p_data->>'tipo',public.bolsu_decimal(p_data->>'saldo_inicial',false),public.bolsu_data(p_data->>'data_saldo_inicial'),coalesce((p_data->>'incluir_no_disponivel')::boolean,true));ident:=a.id;
  else
   select * into a from public.contas where id=ident and usuario_id=u;
   if not found then raise exception 'Conta não encontrada.' using errcode='22023';end if;
   if p_data ? 'saldo_inicial' or p_data ? 'data_saldo_inicial' then raise exception 'Use um ajuste identificado para corrigir o saldo.' using errcode='22023';end if;
   if coalesce((p_data->>'arquivada')::boolean,false) and not a.arquivada then
    if (select saldo_atual from public.saldos_contas where id=ident)<>0 or exists(select 1 from public.transacoes where conta_id=ident and not excluida and status='previsto') or exists(select 1 from public.aportes_metas where conta_id=ident) then raise exception 'Zere o saldo e resolva pendências e reservas antes de arquivar.' using errcode='22023';end if;
   end if;
   update public.contas set nome=btrim(p_data->>'nome'),tipo=p_data->>'tipo',incluir_no_disponivel=(p_data->>'incluir_no_disponivel')::boolean,arquivada=coalesce((p_data->>'arquivada')::boolean,false) where id=ident and usuario_id=u;
  end if;
 elsif p_operation='transaction.save' then
  if ident is not null then
   select * into tr from public.transacoes where id=ident and usuario_id=u and not excluida and conta_id is not null and recorrencia_id is null;
   if not found then raise exception 'Lançamento manual não encontrado.' using errcode='22023';end if;
  end if;
  aid:=(p_data->>'conta_id')::uuid;cat:=(p_data->>'categoria_id')::uuid;
  select * into a from public.contas where id=aid and usuario_id=u;
  if not found or a.arquivada then raise exception 'Selecione uma conta ativa.' using errcode='22023';end if;
  if not exists(select 1 from public.categorias where id=cat and usuario_id=u and tipo=p_data->>'tipo' and not arquivada) then raise exception 'Categoria incompatível com o lançamento.' using errcode='22023';end if;
  amount:=public.bolsu_decimal(p_data->>'valor');competence:=public.bolsu_data(p_data->>'data_competencia');due:=public.bolsu_data(p_data->>'data_vencimento');
  if p_data->>'status' not in ('previsto','realizado') or p_data->>'status' is null then raise exception 'Situação inválida.' using errcode='22023';end if;
  realized:=case when p_data->>'status'='realizado' then public.bolsu_data(p_data->>'data_realizacao') else null end;
  if (p_data->>'status'='previsto' and p_data->>'data_realizacao' is not null) or realized>hoje or coalesce(realized,due)<a.data_saldo_inicial then raise exception 'Confira a realização e a data de abertura da conta.' using errcode='22023';end if;
  if ident is null then
   insert into public.transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento,data_realizacao,status,observacoes)
   values(u,btrim(p_data->>'descricao'),p_data->>'tipo',amount,cat,aid,competence,due,realized,p_data->>'status',p_data->>'observacoes') returning id into ident;
  else
   update public.transacoes set descricao=btrim(p_data->>'descricao'),tipo=p_data->>'tipo',valor=amount,categoria_id=cat,conta_id=aid,data_competencia=competence,data_vencimento=due,data_realizacao=realized,status=p_data->>'status',observacoes=p_data->>'observacoes' where id=ident and usuario_id=u;
  end if;
 elsif p_operation='transaction.delete' then
  update public.transacoes set excluida=true where id=ident and usuario_id=u and not excluida and conta_id is not null and recorrencia_id is null;
  if not found then raise exception 'Lançamento manual não encontrado.' using errcode='22023';end if;
 elsif p_operation='transfer.save' then
  aid:=(p_data->>'conta_origem_id')::uuid;bid:=(p_data->>'conta_destino_id')::uuid;dt:=public.bolsu_data(p_data->>'data');amount:=public.bolsu_decimal(p_data->>'valor');
  select * into a from public.contas where id=aid and usuario_id=u and not arquivada;
  select * into b from public.contas where id=bid and usuario_id=u and not arquivada;
  if a.id is null or b.id is null or aid=bid or dt>hoje or dt<a.data_saldo_inicial or dt<b.data_saldo_inicial then raise exception 'Use contas ativas diferentes e uma data entre a abertura de ambas e hoje.' using errcode='22023';end if;
  if ident is null then insert into public.transferencias(usuario_id,conta_origem_id,conta_destino_id,valor,data) values(u,aid,bid,amount,dt) returning id into ident;
  else update public.transferencias set conta_origem_id=aid,conta_destino_id=bid,valor=amount,data=dt where id=ident and usuario_id=u and not excluida;
   if not found then raise exception 'Transferência não encontrada.' using errcode='22023';end if;
  end if;
 elsif p_operation='transfer.delete' then
  if exists(select 1 from public.aportes_metas where transferencia_id=ident and usuario_id=u) then raise exception 'Transferência vinculada a uma reserva.' using errcode='22023';end if;
  update public.transferencias set excluida=true where id=ident and usuario_id=u and not excluida;
  if not found then raise exception 'Transferência não encontrada.' using errcode='22023';end if;
 elsif p_operation='card.save' then
  amount:=public.bolsu_decimal(p_data->>'limite',false);
  if ident is not null then
   select * into c from public.cartoes where id=ident and usuario_id=u;
   if not found then raise exception 'Cartão não encontrado.' using errcode='22023';end if;
   if exists(select 1 from public.faturas where cartao_id=ident) and (c.dia_fechamento<>(p_data->>'dia_fechamento')::integer or c.dia_vencimento<>(p_data->>'dia_vencimento')::integer) then raise exception 'As datas de um cartão com faturas devem ser preservadas.' using errcode='22023';end if;
   update public.cartoes set nome=btrim(p_data->>'nome'),limite=amount,dia_fechamento=(p_data->>'dia_fechamento')::smallint,dia_vencimento=(p_data->>'dia_vencimento')::smallint,bandeira=p_data->>'bandeira',arquivado=coalesce((p_data->>'arquivado')::boolean,false) where id=ident and usuario_id=u;
  else insert into public.cartoes(usuario_id,nome,limite,dia_fechamento,dia_vencimento,bandeira) values(u,btrim(p_data->>'nome'),amount,(p_data->>'dia_fechamento')::smallint,(p_data->>'dia_vencimento')::smallint,p_data->>'bandeira') returning id into ident;
  end if;
 elsif p_operation in ('purchase.save','purchase.delete') then
  if ident is not null then
   if not exists(select 1 from public.transacoes where compra_id=ident and usuario_id=u and not excluida) then raise exception 'Compra não encontrada.' using errcode='22023';end if;
   if exists(select 1 from public.pagamentos_fatura p where p.usuario_id=u and not p.excluida and p.fatura_id in(select fatura_id from public.transacoes where compra_id=ident and usuario_id=u and not excluida)) then raise exception 'A compra possui fatura com pagamento. Corrija os pagamentos antes de alterar a compra inteira.' using errcode='22023';end if;
   update public.transacoes set excluida=true where compra_id=ident and usuario_id=u and not excluida;
  end if;
  if p_operation='purchase.save' then
   cid:=(p_data->>'cartao_id')::uuid;cat:=(p_data->>'categoria_id')::uuid;amount:=public.bolsu_decimal(p_data->>'valor');dt:=public.bolsu_data(p_data->>'data_compra');n:=(p_data->>'parcelas')::integer;
   select * into c from public.cartoes where id=cid and usuario_id=u and not arquivado;
   if not found then raise exception 'Selecione um cartão ativo.' using errcode='22023';end if;
   if n is null or n<1 or n>360 or dt>hoje or amount*100<n then raise exception 'Confira a data e a quantidade de parcelas (1 a 360).' using errcode='22023';end if;
   if not exists(select 1 from public.categorias where id=cat and usuario_id=u and tipo='despesa' and not arquivada) then raise exception 'Selecione uma categoria de despesa.' using errcode='22023';end if;
   ident:=coalesce(ident,gen_random_uuid());purchase:=ident;grp:=case when n>1 then gen_random_uuid() else null end;cents:=(amount*100)::bigint;
   m:=date_trunc('month',dt)::date;
   if dt>=public.bolsu_dia(m,c.dia_fechamento) then m:=(m+interval '1 month')::date;end if;
   for i in 1..n loop
    closing:=public.bolsu_dia(m,c.dia_fechamento);
    due:=public.bolsu_dia(case when c.dia_vencimento<=c.dia_fechamento then (m+interval '1 month')::date else m end,c.dia_vencimento);
    -- Competência representa o mês de vencimento; o calendário permanece estável nas faturas já existentes.
    insert into public.faturas(usuario_id,cartao_id,competencia,fechamento,vencimento) values(u,cid,date_trunc('month',due)::date,closing,due) on conflict(cartao_id,competencia) do nothing;
    select id,vencimento into fid,due from public.faturas where cartao_id=cid and competencia=date_trunc('month',due)::date and usuario_id=u;
    part:=((cents/n)+case when i<=cents%n then 1 else 0 end)::numeric/100;
    insert into public.transacoes(usuario_id,descricao,tipo,valor,categoria_id,cartao_id,fatura_id,data_competencia,data_vencimento,status,grupo_parcelamento,parcela,total_parcelas,compra_id,data_compra)
    values(u,btrim(p_data->>'descricao'),'despesa',part,cat,cid,fid,date_trunc('month',due)::date,due,'previsto',grp,case when n>1 then i else null end,case when n>1 then n else null end,purchase,dt);
    m:=(m+interval '1 month')::date;
   end loop;
  end if;
 elsif p_operation in ('payment.save','adjustment.save') then
  aid:=(p_data->>'conta_id')::uuid;dt:=public.bolsu_data(p_data->>'data');amount:=public.bolsu_decimal(p_data->>'valor',p_operation='payment.save');
  select * into a from public.contas where id=aid and usuario_id=u and not arquivada;
  if not found or dt>hoje or dt<a.data_saldo_inicial then raise exception 'Selecione conta ativa e uma data entre a abertura e hoje.' using errcode='22023';end if;
  if p_operation='payment.save' then
   fid:=(p_data->>'fatura_id')::uuid;
   if not exists(select 1 from public.faturas where id=fid and usuario_id=u) then raise exception 'Fatura não encontrada.' using errcode='22023';end if;
   select coalesce(sum(valor),0) into total from public.transacoes where fatura_id=fid and usuario_id=u and not excluida;
   select coalesce(sum(valor),0) into paid from public.pagamentos_fatura where fatura_id=fid and usuario_id=u and not excluida;
   if amount>total-paid then raise exception 'O pagamento excede o saldo pendente da fatura.' using errcode='22023';end if;
   insert into public.pagamentos_fatura(usuario_id,conta_id,fatura_id,valor,data) values(u,aid,fid,amount,dt) returning id into ident;
  else insert into public.ajustes_conta(usuario_id,conta_id,valor,data,motivo) values(u,aid,amount,dt,btrim(p_data->>'motivo')) returning id into ident;
  end if;
 elsif p_operation='payment.delete' then
  update public.pagamentos_fatura set excluida=true where id=ident and usuario_id=u and not excluida;
  if not found then raise exception 'Pagamento não encontrado.' using errcode='22023';end if;
 elsif p_operation='adjustment.delete' then
  update public.ajustes_conta set excluida=true where id=ident and usuario_id=u and not excluida;
  if not found then raise exception 'Ajuste não encontrado.' using errcode='22023';end if;
 end if;
 result:=jsonb_build_object('id',ident);
 insert into public.operacoes_diarias(usuario_id,chave,operacao,dados,resultado) values(u,p_request_id,p_operation,p_data,result);
 return result;
end $$;
revoke all on function public.bolsu_daily(text,jsonb,uuid) from public,anon;
grant execute on function public.bolsu_daily(text,jsonb,uuid) to authenticated;
commit;
-- Leitura mensal atômica; totais completos independem da página exibida.
create function public.bolsu_daily_snapshot(p_month date,p_page integer default 0,p_search text default '',p_type text default 'all',p_status text default 'all',p_category uuid default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare u uuid:=auth.uid(); finish date;begin
 if u is null then raise exception 'Autenticação necessária.' using errcode='42501';end if;
 if p_month is null or extract(day from p_month)<>1 or p_page<0 or p_page>100000 then raise exception 'Período inválido.' using errcode='22023';end if;
 finish:=(p_month+interval '1 month')::date;
 return (with filtered as (select t.* from public.transacoes t where t.usuario_id=u and not t.excluida and t.data_competencia>=p_month and t.data_competencia<finish
 and (p_search='' or position(lower(p_search) in lower(t.descricao))>0)
 and (p_type='all' or t.tipo=p_type) and (p_category is null or t.categoria_id=p_category)
 and (p_status='all' or (t.conta_id is not null and t.status=p_status) or (t.cartao_id is not null and exists(select 1 from public.resumos_faturas f where f.id=t.fatura_id and ((p_status='realizado' and f.pendente=0) or (p_status='previsto' and f.pendente>0)))))
 ) select jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(x order by x.created_at,x.id) from public.saldos_contas x where usuario_id=u),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(x order by x.nome,x.id) from public.categorias x where usuario_id=u),'[]'::jsonb),
 'cards',coalesce((select jsonb_agg(x order by x.created_at,x.id) from public.resumos_cartoes x where usuario_id=u),'[]'::jsonb),
 'invoices',coalesce((select jsonb_agg(x order by x.vencimento,x.id) from public.resumos_faturas x where usuario_id=u and competencia=p_month),'[]'::jsonb),
 'transactions',coalesce((select jsonb_agg(x) from(select * from filtered order by data_competencia desc,created_at desc,id limit 100 offset p_page*100)x),'[]'::jsonb),
 'transfers',coalesce((select jsonb_agg(x) from(select * from public.transferencias where usuario_id=u and not excluida and data>=p_month and data<finish order by data desc,created_at desc,id limit 100 offset p_page*100)x),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(x) from(select * from public.pagamentos_fatura where usuario_id=u and not excluida and data>=p_month and data<finish order by data desc,created_at desc,id limit 100 offset p_page*100)x),'[]'::jsonb),
 'adjustments',coalesce((select jsonb_agg(x) from(select * from public.ajustes_conta where usuario_id=u and not excluida and data>=p_month and data<finish order by data desc,created_at desc,id limit 100 offset p_page*100)x),'[]'::jsonb),
 'counts',jsonb_build_object(
 'transactions',(select count(*) from filtered),
 'transfers',(select count(*) from public.transferencias where usuario_id=u and not excluida and data>=p_month and data<finish),
 'payments',(select count(*) from public.pagamentos_fatura where usuario_id=u and not excluida and data>=p_month and data<finish),
 'adjustments',(select count(*) from public.ajustes_conta where usuario_id=u and not excluida and data>=p_month and data<finish)),
 'totals',jsonb_build_object(
 'income',coalesce((select sum(valor) from filtered where tipo='receita'),0),
 'expenses',coalesce((select sum(valor) from filtered where tipo='despesa'),0))));
end $$;
revoke all on function public.bolsu_daily_snapshot(date,integer,text,text,text,uuid) from public,anon;
grant execute on function public.bolsu_daily_snapshot(date,integer,text,text,text,uuid) to authenticated;

commit;
