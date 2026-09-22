-- Base para projeto NOVO. Não executar sobre o banco legado da Lasy.
-- Falha integralmente se houver qualquer tabela com os mesmos nomes.
begin;

do $$
declare existing text;
begin
  select string_agg(c.relname, ', ') into existing
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = any(array[
    'profiles','users','subscriptions','contas','categorias','cartoes','faturas',
    'recorrencias','transacoes','transferencias','pagamentos_fatura','orcamentos','metas','aportes_metas'
  ]);
  if existing is not null then
    raise exception 'Base existente detectada (%). Faça inventário e migração de adoção; nenhum dado foi alterado.', existing;
  end if;
end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  moeda text not null default 'BRL' check (moeda = 'BRL'),
  fuso_horario text not null default 'America/Sao_Paulo' check (fuso_horario = 'America/Sao_Paulo'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.subscriptions (
  usuario_id uuid primary key references public.profiles(id) on delete restrict,
  plano text not null default 'free' check (plano in ('free','plus')),
  status text not null default 'inactive' check (status in ('inactive','trialing','active','past_due','canceled')),
  ciclo text check (ciclo in ('monthly','yearly')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  check (plano <> 'plus' or coalesce(current_period_end, trial_ends_at) is not null)
);
create table public.contas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  tipo text not null check (tipo in ('corrente','poupanca','carteira','investimento')),
  moeda text not null default 'BRL' check (moeda = 'BRL'),
  saldo_inicial numeric(14,2) not null check (saldo_inicial <> 'NaN'::numeric) default 0,
  data_saldo_inicial date not null,
  incluir_no_disponivel boolean not null default true,
  arquivada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, usuario_id)
);
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  tipo text not null check (tipo in ('receita','despesa')),
  padrao boolean not null default false,
  arquivada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (usuario_id, tipo, nome), unique (id, usuario_id)
);
create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  limite numeric(14,2) not null check (limite <> 'NaN'::numeric) check (limite >= 0),
  dia_fechamento smallint not null check (dia_fechamento between 1 and 31),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 31),
  arquivado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, usuario_id)
);
create table public.faturas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  cartao_id uuid not null,
  competencia date not null check (extract(day from competencia) = 1),
  fechamento date not null,
  vencimento date not null check (vencimento >= fechamento),
  created_at timestamptz not null default now(),
  unique (cartao_id, competencia), unique (id, usuario_id), unique (id, cartao_id, usuario_id),
  foreign key (cartao_id, usuario_id) references public.cartoes(id, usuario_id) on delete restrict
);
create table public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  descricao text not null check (char_length(btrim(descricao)) between 1 and 160),
  tipo text not null check (tipo in ('receita','despesa')),
  valor numeric(14,2) not null check (valor <> 'NaN'::numeric) check (valor > 0),
  conta_id uuid not null,
  categoria_id uuid not null,
  periodicidade text not null default 'mensal' check (periodicidade = 'mensal'),
  dia smallint not null check (dia between 1 and 31),
  data_inicio date not null,
  data_fim date check (data_fim >= data_inicio),
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, usuario_id),
  foreign key (conta_id, usuario_id) references public.contas(id, usuario_id) on delete restrict,
  foreign key (categoria_id, usuario_id) references public.categorias(id, usuario_id) on delete restrict
);
create table public.transacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  descricao text not null check (char_length(btrim(descricao)) between 1 and 160),
  tipo text not null check (tipo in ('receita','despesa')),
  valor numeric(14,2) not null check (valor <> 'NaN'::numeric) check (valor > 0),
  categoria_id uuid not null,
  conta_id uuid,
  cartao_id uuid,
  fatura_id uuid,
  data_competencia date not null,
  data_vencimento date not null,
  data_realizacao date,
  status text not null default 'previsto' check (status in ('previsto','realizado')),
  recorrencia_id uuid,
  ocorrencia date,
  grupo_parcelamento uuid,
  parcela smallint,
  total_parcelas smallint,
  observacoes text check (char_length(observacoes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, usuario_id), unique (recorrencia_id, ocorrencia), unique (grupo_parcelamento, parcela),
  check ((status = 'realizado') = (data_realizacao is not null)),
  check ((conta_id is not null and cartao_id is null and fatura_id is null) or
    (conta_id is null and cartao_id is not null and fatura_id is not null and tipo = 'despesa')),
  check ((recorrencia_id is null) = (ocorrencia is null)),
  check ((grupo_parcelamento is null and parcela is null and total_parcelas is null) or
    (grupo_parcelamento is not null and parcela is not null and total_parcelas is not null and
     cartao_id is not null and parcela between 1 and total_parcelas and total_parcelas between 2 and 360)),
  foreign key (categoria_id, usuario_id) references public.categorias(id, usuario_id) on delete restrict,
  foreign key (conta_id, usuario_id) references public.contas(id, usuario_id) on delete restrict,
  foreign key (fatura_id, cartao_id, usuario_id) references public.faturas(id, cartao_id, usuario_id) on delete restrict,
  foreign key (recorrencia_id, usuario_id) references public.recorrencias(id, usuario_id) on delete restrict
);
create table public.transferencias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  conta_origem_id uuid not null,
  conta_destino_id uuid not null,
  valor numeric(14,2) not null check (valor <> 'NaN'::numeric) check (valor > 0),
  data date not null,
  created_at timestamptz not null default now(),
  unique (id, usuario_id),
  check (conta_origem_id <> conta_destino_id),
  foreign key (conta_origem_id, usuario_id) references public.contas(id, usuario_id) on delete restrict,
  foreign key (conta_destino_id, usuario_id) references public.contas(id, usuario_id) on delete restrict
);
create table public.pagamentos_fatura (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  conta_id uuid not null,
  fatura_id uuid not null,
  valor numeric(14,2) not null check (valor <> 'NaN'::numeric) check (valor > 0),
  data date not null,
  created_at timestamptz not null default now(),
  foreign key (conta_id, usuario_id) references public.contas(id, usuario_id) on delete restrict,
  foreign key (fatura_id, usuario_id) references public.faturas(id, usuario_id) on delete restrict
);
create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  categoria_id uuid not null,
  mes date not null check (extract(day from mes) = 1),
  valor numeric(14,2) not null check (valor <> 'NaN'::numeric) check (valor > 0),
  created_at timestamptz not null default now(),
  unique (usuario_id, categoria_id, mes),
  foreign key (categoria_id, usuario_id) references public.categorias(id, usuario_id) on delete restrict
);
create table public.metas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 80),
  valor_alvo numeric(14,2) not null check (valor_alvo <> 'NaN'::numeric) check (valor_alvo > 0),
  prazo date,
  arquivada boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, usuario_id)
);
create table public.aportes_metas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  meta_id uuid not null,
  conta_id uuid not null,
  tipo text not null check (tipo in ('aporte','retirada')),
  valor numeric(14,2) not null check (valor <> 'NaN'::numeric) check (valor > 0),
  data date not null,
  transferencia_id uuid unique,
  created_at timestamptz not null default now(),
  foreign key (meta_id, usuario_id) references public.metas(id, usuario_id) on delete restrict,
  foreign key (conta_id, usuario_id) references public.contas(id, usuario_id) on delete restrict,
  foreign key (transferencia_id, usuario_id) references public.transferencias(id, usuario_id) on delete restrict
);

create function public.bolsu_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.bolsu_updated_at();
create trigger contas_updated before update on public.contas for each row execute function public.bolsu_updated_at();
create trigger transacoes_updated before update on public.transacoes for each row execute function public.bolsu_updated_at();
create trigger subscriptions_updated before update on public.subscriptions for each row execute function public.bolsu_updated_at();

-- Perfil + categorias + plano são criados atomicamente. Metadados nunca concedem privilégios.
create function public.bolsu_initialize_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, nome)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''), 'Usuário'), 80));
  insert into public.subscriptions(usuario_id) values (new.id);
  insert into public.categorias(usuario_id, nome, tipo, padrao)
  values (new.id,'Alimentação','despesa',true),(new.id,'Transporte','despesa',true),
    (new.id,'Moradia','despesa',true),(new.id,'Saúde','despesa',true),
    (new.id,'Educação','despesa',true),(new.id,'Lazer','despesa',true),
    (new.id,'Outros','despesa',true),(new.id,'Salário','receita',true),
    (new.id,'Freelance','receita',true),(new.id,'Outras receitas','receita',true);
  return new;
end $$;
revoke all on function public.bolsu_initialize_user() from public, anon, authenticated;
create trigger bolsu_auth_user_created after insert on auth.users for each row execute function public.bolsu_initialize_user();

-- Preserva usuários já cadastrados em um projeto novo sem tabelas financeiras.
insert into public.profiles(id, nome)
select id, left(coalesce(nullif(btrim(raw_user_meta_data ->> 'nome'), ''), 'Usuário'), 80) from auth.users;
insert into public.subscriptions(usuario_id) select id from public.profiles;
insert into public.categorias(usuario_id,nome,tipo,padrao)
select p.id, c.nome, c.tipo, true from public.profiles p cross join (values
  ('Alimentação','despesa'),('Transporte','despesa'),('Moradia','despesa'),('Saúde','despesa'),
  ('Educação','despesa'),('Lazer','despesa'),('Outros','despesa'),('Salário','receita'),
  ('Freelance','receita'),('Outras receitas','receita')) c(nome,tipo);

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update(nome) on public.profiles to authenticated;

-- RLS em TODAS as tabelas. Etapa 2 só libera escrita de nome e criação de conta via RPC.
-- Demais mutações serão expostas por operações transacionais nas etapas 3 e 4.
do $$ declare t text; begin
  foreach t in array array['subscriptions','contas','categorias','cartoes','faturas','recorrencias',
    'transacoes','transferencias','pagamentos_fatura','orcamentos','metas','aportes_metas'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy owner_read on public.%I for select to authenticated using (usuario_id = (select auth.uid()))', t);
    execute format('create index on public.%I (usuario_id)', t);
  end loop;
end $$;
create index transacoes_usuario_competencia on public.transacoes(usuario_id, data_competencia);
create index transacoes_usuario_vencimento on public.transacoes(usuario_id, data_vencimento) where status = 'previsto';

-- Operação pequena e validada no banco; o cliente não fornece o proprietário.
create function public.bolsu_create_account(p_nome text, p_tipo text, p_saldo numeric,
  p_data date, p_incluir boolean default true) returns public.contas
language plpgsql security definer set search_path = '' as $$
declare result public.contas; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  if p_saldo is null or p_saldo::text in ('NaN','Infinity','-Infinity') or p_saldo <> round(p_saldo,2) then
    raise exception 'Saldo inválido' using errcode = '22023';
  end if;
  if p_data is null or p_data > (now() at time zone 'America/Sao_Paulo')::date or p_data < date '1900-01-01' then
    raise exception 'Data de saldo inválida' using errcode = '22023';
  end if;
  insert into public.contas(usuario_id,nome,tipo,saldo_inicial,data_saldo_inicial,incluir_no_disponivel)
  values(uid,btrim(p_nome),p_tipo,p_saldo,p_data,p_incluir) returning * into result;
  return result;
end $$;
revoke all on function public.bolsu_create_account(text,text,numeric,date,boolean) from public, anon;
grant execute on function public.bolsu_create_account(text,text,numeric,date,boolean) to authenticated;

-- Cada movimento de caixa aparece uma vez. Reservar em meta não movimenta saldo.
create view public.saldos_contas with (security_invoker = true) as
select c.*,
 (c.saldo_inicial
  + coalesce((select sum(case when t.tipo='receita' then t.valor else -t.valor end)
      from public.transacoes t where t.conta_id=c.id and t.usuario_id=c.usuario_id
      and t.status='realizado' and t.data_realizacao >= c.data_saldo_inicial
      and t.data_realizacao <= (now() at time zone 'America/Sao_Paulo')::date),0)
  + coalesce((select sum(case when t.conta_destino_id=c.id then t.valor else -t.valor end)
      from public.transferencias t where t.usuario_id=c.usuario_id and (t.conta_destino_id=c.id or t.conta_origem_id=c.id)
      and t.data >= c.data_saldo_inicial and t.data <= (now() at time zone 'America/Sao_Paulo')::date),0)
  - coalesce((select sum(p.valor) from public.pagamentos_fatura p where p.conta_id=c.id and p.usuario_id=c.usuario_id
      and p.data >= c.data_saldo_inicial and p.data <= (now() at time zone 'America/Sao_Paulo')::date),0)
 )::numeric(14,2) as saldo_atual
from public.contas c;
revoke all on public.saldos_contas from public, anon, authenticated;
grant select on public.saldos_contas to authenticated;

comment on column public.contas.data_saldo_inicial is 'Saldo de abertura no início deste dia; movimentos realizados a partir do dia entram no saldo.';
comment on table public.aportes_metas is 'Reservas dentro de contas; não constituem despesa nem movimentação de caixa.';
comment on table public.subscriptions is 'Somente processos autorizados no servidor poderão conceder planos. Sem escrita por authenticated.';
commit;
