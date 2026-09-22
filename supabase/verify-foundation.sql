-- Homologação transacional: identidades e registros de teste são revertidos.
begin;
insert into auth.users(id,raw_user_meta_data) values
 ('79a65ec2-b4e2-4ef5-a264-3ca50fd63d01','{"nome":"Teste transacional A"}'),
 ('79a65ec2-b4e2-4ef5-a264-3ca50fd63d02','{"nome":"Teste transacional B"}');
set local role authenticated;
set local request.jwt.claim.sub = '79a65ec2-b4e2-4ef5-a264-3ca50fd63d01';
select public.bolsu_create_account('Teste A','corrente',1000,'2026-01-01',true);
do $$ begin
 if (select count(*) from public.profiles) <> 1 then raise exception 'Falha RLS perfil'; end if;
 if (select count(*) from public.categorias) <> 10 then raise exception 'Falha categorias'; end if;
 if (select count(*) from public.contas) <> 1 then raise exception 'Falha RLS contas'; end if;
 if (select saldo_atual from public.saldos_contas) <> 1000 then raise exception 'Falha saldo'; end if;
 begin update public.subscriptions set plano='plus'; raise exception 'Falha: plano editável'; exception when insufficient_privilege then null; end;
 begin delete from public.contas; raise exception 'Falha: escrita direta liberada'; exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub = '79a65ec2-b4e2-4ef5-a264-3ca50fd63d02';
do $$ begin
 if (select count(*) from public.contas) <> 0 then raise exception 'Falha isolamento de contas'; end if;
 if (select count(*) from public.saldos_contas) <> 0 then raise exception 'Falha isolamento de saldos'; end if;
 if (select count(*) from public.profiles) <> 1 then raise exception 'Falha isolamento de perfil'; end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public' and tablename in ('profiles','subscriptions','contas','categorias','cartoes','faturas','recorrencias','transacoes','transferencias','pagamentos_fatura','orcamentos','metas','aportes_metas') and not rowsecurity) then raise exception 'Tabela sem RLS'; end if;
end $$;
rollback;
select 'OK: criação atômica, categorias, saldo, RLS entre duas identidades, privilégios e escrita direta. Testes revertidos.' as resultado;
