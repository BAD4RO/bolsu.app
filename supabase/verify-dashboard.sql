-- Homologação no banco hospedado, revertida ao final.
begin;
insert into auth.users(id,raw_user_meta_data) values('bbd09b73-6695-4803-8000-000000000005','{"nome":"Teste início A"}'),('bbd09b73-6695-4803-8000-000000000006','{"nome":"Teste início B"}');
set local role authenticated;
set local request.jwt.claim.sub='bbd09b73-6695-4803-8000-000000000005';
do $$ declare a uuid;cat uuid;inc uuid;g uuid;t uuid;d date:=(now() at time zone 'America/Sao_Paulo')::date;s jsonb;payload jsonb;begin
 a:=(public.bolsu_daily('account.save','{"nome":"Principal","tipo":"corrente","saldo_inicial":"2000","data_saldo_inicial":"2020-01-01","incluir_no_disponivel":true}',gen_random_uuid())->>'id')::uuid;
 select id into cat from public.categorias where tipo='despesa' limit 1;
 select id into inc from public.categorias where tipo='receita' limit 1;
 payload:=jsonb_build_object('descricao','Conta teste','tipo','despesa','valor','700','categoria_id',cat,'conta_id',a,'data_competencia',d,'data_vencimento',d,'status','previsto','data_realizacao',null);
 t:=(public.bolsu_daily('transaction.save',payload,gen_random_uuid())->>'id')::uuid;
 perform public.bolsu_daily('transaction.save',payload||jsonb_build_object('tipo','receita','categoria_id',inc,'valor','1000'),gen_random_uuid());
 g:=(public.bolsu_planning('goal.save','{"titulo":"Meta teste","valor_alvo":"1000","prazo":null}',gen_random_uuid())->>'id')::uuid;
 perform public.bolsu_planning('goal.entry',jsonb_build_object('meta_id',g,'conta_id',a,'tipo','aporte','valor','300','data',d),gen_random_uuid());
 perform public.bolsu_home_preferences(jsonb_build_object('introducao_oculta',true,'meta_prioritaria_id',g));
 s:=public.bolsu_home_snapshot(0);
 if (s#>>'{projection,available}')::numeric<>2000 or (s#>>'{projection,cash}')::numeric<>2000 or (s#>>'{projection,withoutIncome}')::numeric<>1000 then raise exception 'Projeção incorreta';end if;
 if (s#>>'{priorityGoal,id}')::uuid<>g or not (s#>>'{preferences,introducao_oculta}')::boolean then raise exception 'Preferências não persistiram';end if;
 perform public.bolsu_daily('transaction.save',payload||jsonb_build_object('id',t,'status','realizado','data_realizacao',d),gen_random_uuid());
 s:=public.bolsu_home_snapshot(0);
 if (s#>>'{projection,available}')::numeric<>2000 or (s#>>'{projection,cash}')::numeric<>1300 then raise exception 'Pagamento alterou projeção';end if;
 perform set_config('request.jwt.claim.sub','bbd09b73-6695-4803-8000-000000000006',true);
 s:=public.bolsu_home_snapshot(0);
 if jsonb_array_length(s->'accounts')<>0 or (s#>>'{projection,available}')::numeric<>0 then raise exception 'Falha isolamento';end if;
 begin perform public.bolsu_home_preferences(jsonb_build_object('meta_prioritaria_id',g));raise exception 'Prioridade cruzada aceita';exception when invalid_parameter_value then null;end;
end $$;
reset role;
select 'Dashboard: projeção, saldo realizado, reservas, preferências e isolamento OK' resultado;
rollback;
