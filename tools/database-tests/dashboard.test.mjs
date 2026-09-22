import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
let db,A,B,a,b,expense,income,today,month,end;
async function who(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function op(operation,data){return (await db.query('select bolsu_daily($1,$2::jsonb,$3) result',[operation,JSON.stringify(data),randomUUID()])).rows[0].result;}
async function plan(operation,data){return (await db.query('select bolsu_planning($1,$2::jsonb,$3) result',[operation,JSON.stringify(data),randomUUID()])).rows[0].result;}
async function snapshot(page=0){return (await db.query('select bolsu_home_snapshot($1) result',[page])).rows[0].result;}
async function preferences(data){await db.query('select bolsu_home_preferences($1::jsonb)',[JSON.stringify(data)]);}
const tx=(extra={})=>({descricao:'Conta',tipo:'despesa',valor:'700',categoria_id:expense,conta_id:a,data_competencia:today,data_vencimento:today,data_realizacao:null,status:'previsto',...extra});
async function goal(amount='300',account=a){const g=await plan('goal.save',{titulo:'Meta',valor_alvo:'1000',prazo:null});await plan('goal.entry',{meta_id:g.id,conta_id:account,tipo:'aporte',valor:amount,data:today});return g;}
before(async()=>{
 db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const name of ['202609220001_foundation.sql','202609220002_daily_control.sql','202609220003_planning.sql','202609220004_planning_end_boundary.sql','202609220005_dashboard.sql'])await db.exec(readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));
 const d=(await db.query("select (now() at time zone 'America/Sao_Paulo')::date::text today,date_trunc('month',now() at time zone 'America/Sao_Paulo')::date::text month_start,(date_trunc('month',now() at time zone 'America/Sao_Paulo')+interval '1 month - 1 day')::date::text last")).rows[0];today=d.today;month=d.month_start;end=d.last;
});
after(async()=>db?.close());
beforeEach(async()=>{A=randomUUID();B=randomUUID();await db.exec('reset role');await db.query('insert into auth.users(id) values($1),($2)',[A,B]);await who(A);
 a=(await op('account.save',{nome:'Incluída',tipo:'corrente',saldo_inicial:'2000',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:true})).id;
 b=(await op('account.save',{nome:'Excluída',tipo:'poupanca',saldo_inicial:'500',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:false})).id;
 const cats=(await snapshot()).categories;expense=cats.find(c=>c.tipo==='despesa').id;income=cats.find(c=>c.tipo==='receita').id;
});
test('exemplo 2000+1000-700-500-300=1500 e pagamento da fatura preserva projeção',async()=>{
 await op('transaction.save',tx());await op('transaction.save',tx({tipo:'receita',categoria_id:income,valor:'1000',data_vencimento:end}));await goal();
 const card=await op('card.save',{nome:'Cartão',limite:'5000',dia_fechamento:2,dia_vencimento:3,bandeira:'Visa'});
 await op('purchase.save',{cartao_id:card.id,descricao:'Compra',valor:'500',categoria_id:expense,data_compra:month,parcelas:1});
 let s=await snapshot();assert.equal(s.projection.available,1500);assert.equal(s.projection.withoutIncome,500);assert.equal(s.projection.cash,2000);assert.equal(s.projection.invoices,500);assert.equal(s.monthly.despesas,500);
 const f=(await db.query('select id from faturas where cartao_id=$1',[card.id])).rows[0];await op('payment.save',{conta_id:a,fatura_id:f.id,valor:'500',data:today});
 s=await snapshot();assert.equal(s.projection.available,1500);assert.equal(s.projection.cash,1500);assert.equal(s.projection.invoices,0);assert.equal(s.monthly.despesas,500);
});
test('reservas e previsões de contas excluídas não duplicam descontos',async()=>{
 await goal('300',b);await op('transaction.save',tx({conta_id:b,valor:'100'}));await op('transaction.save',tx({conta_id:b,tipo:'receita',categoria_id:income,valor:'50'}));
 const s=await snapshot();assert.equal(s.projection.available,2000);assert.equal(s.projection.reserved,0);assert.equal(s.projection.excludedCash,500);assert.equal(s.projection.excludedItemCount,2);assert.ok(s.items.every(i=>!i.incluido));
});
test('pagamento e recebimento manuais preservam projeção, previsão nunca infla saldo',async()=>{
 const expensePayload=tx(),incomePayload=tx({tipo:'receita',categoria_id:income,valor:'1000'});
 const t=await op('transaction.save',expensePayload),i=await op('transaction.save',incomePayload);
 let s=await snapshot();assert.equal(s.projection.cash,2000);assert.equal(s.projection.available,2300);
 await op('transaction.save',{...expensePayload,id:t.id,status:'realizado',data_realizacao:today});await op('transaction.save',{...incomePayload,id:i.id,status:'realizado',data_realizacao:today});
 s=await snapshot();assert.equal(s.projection.cash,2300);assert.equal(s.projection.available,2300);assert.equal(s.projection.committed,0);assert.equal(s.projection.income,0);
});
test('saldo negativo e falta antes de recebimento continuam visíveis mesmo com fim positivo',async()=>{
 await op('transaction.save',tx({valor:'2500'}));await op('transaction.save',tx({tipo:'receita',categoria_id:income,valor:'3000',data_vencimento:end}));
 const s=await snapshot();assert.equal(s.projection.available,2500);assert.equal(s.projection.withoutIncome,-500);assert.equal(s.projection.beforeNextIncome,-500);assert.equal(s.projection.lowestBalance,-500);assert.equal(s.projection.firstShortfallDate,today);
});
test('vencidos entram, além do mês não entra, lista paginada não reduz totais',async()=>{
 for(let i=0;i<55;i++)await op('transaction.save',tx({valor:'1',data_vencimento:'2020-01-01'}));await op('transaction.save',tx({valor:'999',data_vencimento:'2199-01-01'}));
 const s=await snapshot();assert.equal(s.items.length,50);assert.equal(s.itemCount,55);assert.equal(s.projection.committed,55);assert.equal(s.projection.overdue,55);assert.equal((await snapshot(1)).items.length,5);
});
test('preferência de introdução e meta persistem, repetição é segura e arquivada usa fallback',async()=>{
 const g=await plan('goal.save',{titulo:'Escolhida',valor_alvo:'100',prazo:null});const other=await plan('goal.save',{titulo:'Outra',valor_alvo:'100',prazo:null});
 await preferences({introducao_oculta:true,meta_prioritaria_id:g.id});await preferences({introducao_oculta:true});assert.equal((await snapshot()).preferences.introducao_oculta,true);assert.equal((await snapshot()).priorityGoal.id,g.id);
 await plan('goal.save',{id:g.id,titulo:'Escolhida',valor_alvo:'100',prazo:null,arquivada:true});assert.equal((await snapshot()).priorityGoal.id,other.id);
 await preferences({introducao_oculta:false,meta_prioritaria_id:null});assert.equal((await snapshot()).preferences.introducao_oculta,false);
});
test('isolamento no snapshot, prioridades, escrita direta e acesso anônimo',async()=>{
 const g=await goal();await preferences({introducao_oculta:true});await who(B);const s=await snapshot();assert.equal(s.accounts.length,0);assert.equal(s.projection.available,0);assert.equal(s.priorityGoal,null);assert.equal(s.preferences.introducao_oculta,false);
 await assert.rejects(preferences({meta_prioritaria_id:g.id}),/meta ativa/);await assert.rejects(preferences({usuario_id:A,introducao_oculta:true}),/Campos/);
 await assert.rejects(db.query('update preferencias_inicio set introducao_oculta=false'),/permission denied/);await assert.rejects(snapshot(-1),/Página/);
 await db.exec('reset role;set role anon');await assert.rejects(snapshot(),/permission denied/);await assert.rejects(preferences({introducao_oculta:true}),/permission denied/);
});
test('transferência entre incluídas não altera o total; contas excluídas têm efeito explícito',async()=>{
 await op('account.save',{id:b,nome:'Incluída B',tipo:'poupanca',incluir_no_disponivel:true});await op('transfer.save',{conta_origem_id:a,conta_destino_id:b,valor:'300',data:today});assert.equal((await snapshot()).projection.cash,2500);
 await op('account.save',{id:b,nome:'Excluída',tipo:'poupanca',incluir_no_disponivel:false});assert.equal((await snapshot()).projection.cash,1700);assert.equal((await snapshot()).projection.excludedCash,800);
});
test('recorrência entra como previsão e geração repetida mantém o mesmo total',async()=>{
 await plan('recurrence.save',{descricao:'Mensal',tipo:'despesa',valor:'100',conta_id:a,categoria_id:expense,dia:31,data_inicio:month,data_fim:null});
 await plan('recurrence.generate',{mes:month});await plan('recurrence.generate',{mes:month});const s=await snapshot();assert.equal(s.projection.committed,100);assert.equal(s.projection.cash,2000);assert.equal(s.counts.manualTransactions,0);
});
test('recorrências antigas sem ocorrências sinalizam projeção incompleta',async()=>{
 await plan('recurrence.save',{descricao:'Antiga',tipo:'despesa',valor:'10',conta_id:a,categoria_id:expense,dia:31,data_inicio:'2020-01-01',data_fim:null});
 await plan('recurrence.generate',{mes:month});assert.equal((await snapshot()).recurrenceGapMonth,'2021-01-01');
 await plan('recurrence.generate',{mes:'2021-01-01'});assert.equal((await snapshot()).recurrenceGapMonth,'2022-01-01');
});
