import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
const migration=readFileSync(new URL('../../supabase/migrations/202609220001_foundation.sql',import.meta.url),'utf8');
const bootstrap=`create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth,public to anon,authenticated;
grant execute on function auth.uid() to anon,authenticated;`;
const A='00000000-0000-4000-8000-000000000001', B='00000000-0000-4000-8000-000000000002';
let db,accountA,accountA2,accountB,categoryA,categoryB,cardA,invoiceA;
async function asUser(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function owner(){await db.exec('reset role');}
async function account(name,balance='0') {const r=await db.query("select * from public.bolsu_create_account($1,'corrente',$2,'2020-01-01',true)",[name,balance]);return r.rows[0].id;}
before(async()=>{
  db=new PGlite(); await db.exec(bootstrap); await db.exec(migration);
  await db.query("insert into auth.users(id,raw_user_meta_data) values ($1,'{\"nome\":\"Ana\",\"is_admin\":true,\"plano\":\"plus\"}'),($2,'{\"nome\":\"Bruno\"}')",[A,B]);
  await asUser(A); accountA=await account('Conta A','1000');accountA2=await account('Conta A2');
  categoryA=(await db.query("select id from categorias where tipo='despesa' limit 1")).rows[0].id;
  await asUser(B);accountB=await account('Conta B','500');categoryB=(await db.query("select id from categorias where tipo='despesa' limit 1")).rows[0].id;
  await owner();
});
after(async()=>{await db?.close();});
test('signup cria um perfil, dez categorias e plano gratuito ignorando privilégios dos metadados',async()=>{
  await asUser(A);
  assert.equal((await db.query('select * from profiles')).rows.length,1);
  assert.equal((await db.query('select count(*)::int as n from categorias')).rows[0].n,10);
  assert.equal((await db.query('select plano from subscriptions')).rows[0].plano,'free');
});
test('duas identidades veem somente suas contas, perfis, assinatura e view de saldos',async()=>{
  for(const id of [A,B]) {
    await asUser(id);
    for(const table of ['profiles','subscriptions','contas','categorias','saldos_contas']) {
      const rows=(await db.query(`select * from ${table}`)).rows;
      assert.ok(rows.length>0);
      assert.ok(rows.every(row=>(table==='profiles'?row.id:row.usuario_id)===id),table);
    }
  }
});
test('anônimo não pode consultar dados nem criar contas',async()=>{
  await owner();await db.exec('set role anon');
  for(const table of ['profiles','subscriptions','contas','categorias','saldos_contas']) await assert.rejects(db.query(`select * from ${table}`),/permission denied/);
  await assert.rejects(account('Invasor'),/permission denied/);
});
test('usuário não consegue conceder plano, alterar dono nem apagar perfil; nome próprio é editável',async()=>{
  await asUser(A);
  await assert.rejects(db.query("update subscriptions set plano='plus' where usuario_id=$1",[A]),/permission denied/);
  await assert.rejects(db.query('update profiles set id=$1 where id=$2',[B,A]),/permission denied/);
  await assert.rejects(db.query('delete from profiles where id=$1',[A]),/permission denied/);
  await db.query("update profiles set nome='Ana editada' where id=$1",[A]);
  const changed=await db.query("update profiles set nome='Invadido' where id=$1 returning id",[B]);assert.equal(changed.rows.length,0);
  await asUser(B);assert.equal((await db.query('select nome from profiles')).rows[0].nome,'Bruno');
});
test('RPC rejeita precisão extra, saldo não finito, nome vazio e data futura',async()=>{
  await asUser(A);
  await assert.rejects(account('Inválida','1.001'),/Saldo inválido/);
  await assert.rejects(account('Inválida','NaN'),/Saldo inválido/);
  await assert.rejects(account(' '),/check constraint/);
  await assert.rejects(db.query("select * from bolsu_create_account('Futura','corrente',0,'2999-01-01',true)"),/Data de saldo inválida/);
});
test('relações compostas impedem transferência e despesa com recursos de outro usuário',async()=>{
  await owner();
  await assert.rejects(db.query("insert into transferencias(usuario_id,conta_origem_id,conta_destino_id,valor,data) values($1,$2,$3,10,'2020-01-02')",[A,accountA,accountB]),/foreign key/);
  await assert.rejects(db.query("insert into transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento) values($1,'Inválida','despesa',10,$2,$3,'2020-01-02','2020-01-02')",[A,categoryB,accountA]),/foreign key/);
  await assert.rejects(db.query("insert into transferencias(usuario_id,conta_origem_id,conta_destino_id,valor,data) values($1,$2,$2,10,'2020-01-02')",[A,accountA]),/check constraint/);
});
test('dinheiro não é duplicado por transferência, compra no cartão, pagamento ou reserva de meta',async()=>{
  await owner();
  const income=(await db.query("select id from categorias where usuario_id=$1 and tipo='receita' limit 1",[A])).rows[0].id;
  await db.query("insert into transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento,status,data_realizacao) values ($1,'Receita','receita',200,$2,$3,'2020-01-02','2020-01-02','realizado','2020-01-02'),($1,'Despesa','despesa',80,$4,$3,'2020-01-02','2020-01-02','realizado','2020-01-02')",[A,income,accountA,categoryA]);
  await db.query("insert into transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento) values($1,'Prevista','receita',999,$2,$3,'2020-01-03','2020-01-03')",[A,income,accountA]);
  await db.query("insert into transferencias(usuario_id,conta_origem_id,conta_destino_id,valor,data) values($1,$2,$3,100,'2020-01-02')",[A,accountA,accountA2]);
  cardA=(await db.query("insert into cartoes(usuario_id,nome,limite,dia_fechamento,dia_vencimento) values($1,'Cartão',1000,1,10) returning id",[A])).rows[0].id;
  invoiceA=(await db.query("insert into faturas(usuario_id,cartao_id,competencia,fechamento,vencimento) values($1,$2,'2020-01-01','2020-01-01','2020-01-10') returning id",[A,cardA])).rows[0].id;
  await db.query("insert into transacoes(usuario_id,descricao,tipo,valor,categoria_id,cartao_id,fatura_id,data_competencia,data_vencimento) values($1,'Compra no cartão','despesa',50,$2,$3,$4,'2020-01-01','2020-01-10')",[A,categoryA,cardA,invoiceA]);
  await db.query("insert into pagamentos_fatura(usuario_id,conta_id,fatura_id,valor,data) values($1,$2,$3,50,'2020-01-10')",[A,accountA,invoiceA]);
  const goal=(await db.query("insert into metas(usuario_id,titulo,valor_alvo) values($1,'Reserva',1000) returning id",[A])).rows[0].id;
  await db.query("insert into aportes_metas(usuario_id,meta_id,conta_id,tipo,valor,data) values($1,$2,$3,'aporte',25,'2020-01-02')",[A,goal,accountA]);
  await asUser(A);const balances=(await db.query('select id,saldo_atual from saldos_contas')).rows;
  assert.equal(Number(balances.find(x=>x.id===accountA).saldo_atual),970);
  assert.equal(Number(balances.find(x=>x.id===accountA2).saldo_atual),100);
  await asUser(B);assert.equal((await db.query('select * from transacoes')).rows.length,0);
  assert.equal((await db.query('select * from aportes_metas')).rows.length,0);
});
test('base só libera operações implementadas, não escrita direta no livro financeiro',async()=>{
  await asUser(A);
  await assert.rejects(db.query("insert into contas(usuario_id,nome,tipo,data_saldo_inicial) values($1,'Direta','corrente','2020-01-01')",[A]),/permission denied/);
  await assert.rejects(db.query('delete from transacoes'),/permission denied/);
  await assert.rejects(db.query('update contas set saldo_inicial=9000'),/permission denied/);
});
test('recorrência duplicada falha, valores negativos e liquidação inconsistente falham',async()=>{
  await owner();
  const rec=(await db.query("insert into recorrencias(usuario_id,descricao,tipo,valor,conta_id,categoria_id,dia,data_inicio) values($1,'Internet','despesa',90,$2,$3,31,'2020-01-01') returning id",[A,accountA,categoryA])).rows[0].id;
  const sql="insert into transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento,recorrencia_id,ocorrencia) values($1,'Internet','despesa',90,$2,$3,'2020-01-31','2020-01-31',$4,'2020-01-31')";
  await db.query(sql,[A,categoryA,accountA,rec]);await assert.rejects(db.query(sql,[A,categoryA,accountA,rec]),/unique constraint/);
  await assert.rejects(db.query("update transacoes set valor=-1"),/check constraint/);
  await assert.rejects(db.query("update transacoes set status='realizado',data_realizacao=null"),/check constraint/);
  await assert.rejects(db.query('delete from contas where id=$1',[accountA]),/foreign key/);
});
test('todas as tabelas têm RLS; nova migração se recusa a sobrescrever banco existente',async()=>{
  await owner();
  const tables=(await db.query("select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r'")).rows;
  assert.equal(tables.length,13); assert.ok(tables.every(t=>t.relrowsecurity));
  const other=new PGlite();try{await other.exec(bootstrap);await other.exec("create table public.users(id int);insert into public.users values(7)");await assert.rejects(other.exec(migration),/Base existente detectada/);await other.exec('rollback');assert.equal((await other.query('select id from public.users')).rows[0].id,7);assert.equal((await other.query("select to_regclass('public.profiles') as name")).rows[0].name,null);}finally{await other.close();}
});

test('usuários de Auth existentes em projeto novo recebem backfill sem recriar identidade',async()=>{
  const existing=new PGlite();
  try {
    await existing.exec(bootstrap);
    await existing.query("insert into auth.users(id,raw_user_meta_data) values ($1,'{\"nome\":\"Existente\"}')",[A]);
    await existing.exec(migration);
    assert.equal((await existing.query('select count(*)::int as n from auth.users')).rows[0].n,1);
    assert.equal((await existing.query('select nome from profiles')).rows[0].nome,'Existente');
    assert.equal((await existing.query('select count(*)::int as n from categorias')).rows[0].n,10);
    assert.equal((await existing.query('select plano from subscriptions')).rows[0].plano,'free');
  } finally { await existing.close(); }
});
