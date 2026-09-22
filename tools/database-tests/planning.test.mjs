import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
let db,A,B,a,b,expense,income;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const month=today.slice(0,7)+'-01';
async function who(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function op(operation,data,key=randomUUID()){return (await db.query('select bolsu_planning($1,$2::jsonb,$3) result',[operation,JSON.stringify(data),key])).rows[0].result;}
async function daily(operation,data){return (await db.query('select bolsu_daily($1,$2::jsonb,$3) result',[operation,JSON.stringify(data),randomUUID()])).rows[0].result;}
async function snapshot(m=month,page=0){return (await db.query('select bolsu_planning_snapshot($1,$2) result',[m,page])).rows[0].result;}
const recurrence=(extra={})=>({descricao:'Aluguel',tipo:'despesa',valor:'100',conta_id:a,categoria_id:expense,dia:31,data_inicio:'2024-01-01',data_fim:null,...extra});
async function goal(extra={}){return op('goal.save',{titulo:'Viagem',valor_alvo:'1200',prazo:null,...extra});}
const entry=(g,extra={})=>({meta_id:g,conta_id:a,tipo:'aporte',valor:'100',data:today,...extra});
before(async()=>{db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);for(const name of ['202609220001_foundation.sql','202609220002_daily_control.sql','202609220003_planning.sql','202609220004_planning_end_boundary.sql'])await db.exec(readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));});
after(async()=>db?.close());
beforeEach(async()=>{A=randomUUID();B=randomUUID();await db.exec('reset role');await db.query('insert into auth.users(id) values($1),($2)',[A,B]);await who(A);a=(await daily('account.save',{nome:'Principal',tipo:'corrente',saldo_inicial:'1000',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:true})).id;b=(await daily('account.save',{nome:'Excluída',tipo:'poupanca',saldo_inicial:'0',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:false})).id;const cats=(await snapshot()).categories;expense=cats.find(c=>c.tipo==='despesa').id;income=cats.find(c=>c.tipo==='receita').id;});
test('dia 31, fevereiro bissexto, virada do ano e repetição não duplicam',async()=>{
 await op('recurrence.save',recurrence());await op('recurrence.generate',{mes:'2024-01-01'});
 let rows=(await db.query('select data_vencimento::text from transacoes where usuario_id=$1 order by ocorrencia',[A])).rows;
 assert.equal(rows.length,12);assert.deepEqual(rows.slice(0,3).map(r=>r.data_vencimento),['2024-01-31','2024-02-29','2024-03-31']);
 await op('recurrence.generate',{mes:'2024-12-01'});assert.equal((await snapshot('2025-02-01')).occurrences[0].data_vencimento,'2025-02-28');
 assert.equal((await snapshot()).accounts.find(x=>x.id===a).saldo_atual,1000);
});
test('uma ocorrência editada ou excluída não é sobrescrita nem recriada',async()=>{
 await op('recurrence.save',recurrence());const t=(await snapshot('2024-02-01')).occurrences[0];
 await op('occurrence.save',{id:t.id,descricao:'Exceção',valor:'80',data_vencimento:'2024-02-20',status:'realizado',data_realizacao:'2024-02-20'});
 await op('recurrence.generate',{mes:'2024-01-01'});assert.equal((await snapshot()).accounts.find(x=>x.id===a).saldo_atual,920);
 await op('occurrence.delete',{id:t.id});await op('recurrence.generate',{mes:'2024-01-01'});assert.equal((await snapshot('2024-02-01')).occurrences.length,0);assert.equal((await snapshot()).accounts.find(x=>x.id===a).saldo_atual,1000);
});
test('editar futuras preserva passado e exceções, inclusive após regenerar',async()=>{
 const r=await op('recurrence.save',recurrence());await op('recurrence.generate',{mes:'2198-01-01'});
 const special=(await snapshot('2198-03-01')).occurrences[0];await op('occurrence.save',{id:special.id,descricao:'Especial',valor:'75',data_vencimento:'2198-03-12',status:'previsto',data_realizacao:null});
 const payload={...recurrence(),id:r.id,desde:'2198-02-01',valor:'200',dia:28};delete payload.data_inicio;delete payload.data_fim;
 await op('recurrence.save',payload);await op('recurrence.generate',{mes:'2198-01-01'});
 assert.equal((await snapshot('2024-01-01')).occurrences[0].valor,100);assert.equal((await snapshot('2198-01-01')).occurrences[0].valor,100);assert.equal((await snapshot('2198-02-01')).occurrences[0].valor,200);assert.equal((await snapshot('2198-03-01')).occurrences[0].valor,75);
 const historical={...payload,desde:'2024-01-01'};await assert.rejects(op('recurrence.save',historical),/futuro/);
});
test('encerrar remove previsões posteriores sem recriar e preserva pagamentos',async()=>{
 const r=await op('recurrence.save',recurrence());const t=(await snapshot('2024-01-01')).occurrences[0];await op('occurrence.save',{id:t.id,descricao:t.descricao,valor:'100',data_vencimento:t.data_vencimento,status:'realizado',data_realizacao:'2024-01-31'});
 await op('recurrence.generate',{mes:'2198-01-01'});await op('recurrence.end',{id:r.id,data_fim:today});await op('recurrence.generate',{mes:'2198-01-01'});
 assert.equal((await snapshot('2198-01-01')).occurrences.length,0);assert.equal((await snapshot('2024-01-01')).occurrences[0].status,'realizado');
});
test('mudar dia respeita o fim inclusive no último mês e encerramento não reabre',async()=>{
 const r=await op('recurrence.save',recurrence({data_inicio:'2198-01-01',data_fim:'2198-03-15',dia:5}));
 const p={...recurrence(),id:r.id,desde:'2198-02-01',dia:28};delete p.data_inicio;delete p.data_fim;
 await op('recurrence.save',p);assert.equal((await snapshot('2198-03-01')).occurrences.length,0);
 await assert.rejects(op('recurrence.end',{id:r.id,data_fim:'2198-04-15'}),/Confira/);
});
test('orçamento agrega realizado, previsão e cartão sem duplicar pagamento',async()=>{
 await op('budget.save',{categoria_id:expense,mes:'2026-01-01',valor:'100'});
 const tx={descricao:'Despesa',tipo:'despesa',valor:'20',conta_id:a,categoria_id:expense,data_competencia:'2026-01-01',data_vencimento:'2026-01-01',status:'realizado',data_realizacao:'2026-01-01'};
 await daily('transaction.save',tx);await daily('transaction.save',{...tx,status:'previsto',data_realizacao:null,valor:'10'});
 const c=await daily('card.save',{nome:'Cartão',limite:'1000',dia_fechamento:10,dia_vencimento:20,bandeira:'Visa'});
 await daily('purchase.save',{cartao_id:c.id,descricao:'Compra',valor:'30',categoria_id:expense,data_compra:'2026-01-01',parcelas:1});
 const f=(await db.query('select id from faturas where cartao_id=$1',[c.id])).rows[0];await daily('payment.save',{conta_id:a,fatura_id:f.id,valor:'30',data:'2026-01-20'});
 const budget=(await snapshot('2026-01-01')).budgets[0];assert.deepEqual([budget.gasto,budget.previsto,budget.restante,budget.percentual],[50,10,50,50]);
 await op('budget.save',{categoria_id:expense,mes:'2026-01-01',valor:'40'});assert.equal((await snapshot('2026-01-01')).budgets[0].restante,-10);
});
test('aportes e retiradas preservam caixa e recusam reserva duplicada ou excessiva',async()=>{
 const g=await goal();const key=randomUUID(),payload=entry(g.id,{valor:'700'});await op('goal.entry',payload,key);await op('goal.entry',payload,key);
 let s=await snapshot();assert.equal(s.goals[0].reservado,700);assert.equal(s.accounts.find(x=>x.id===a).saldo_atual,1000);
 const other=await goal({titulo:'Outra'});await assert.rejects(op('goal.entry',entry(other.id,{valor:'301'})),/insuficiente/);
 await assert.rejects(op('goal.entry',entry(g.id,{tipo:'retirada',conta_id:b,valor:'1'})),/excede/);
 await assert.rejects(op('goal.entry',entry(g.id,{tipo:'retirada',valor:'701'})),/excede/);
 await op('goal.entry',entry(g.id,{tipo:'retirada',valor:'200'}));s=await snapshot();assert.equal(s.goals.find(x=>x.id===g.id).reservado,500);assert.equal(s.accounts.find(x=>x.id===a).saldo_atual,1000);
 await assert.rejects(op('goal.save',{id:g.id,titulo:'Meta',valor_alvo:'1200',prazo:null,arquivada:true}),/Retire/);
});
test('transferência vinculada ao aporte move caixa uma única vez e falhas são atômicas',async()=>{
 const g=await goal();await op('goal.entry',entry(g.id,{conta_id:b,origem_id:a,valor:'300'}));
 const s=await snapshot();assert.equal(s.accounts.find(x=>x.id===a).saldo_atual,700);assert.equal(s.accounts.find(x=>x.id===b).saldo_atual,300);assert.equal(s.accounts.find(x=>x.id===a).reservado,0);assert.equal(s.accounts.find(x=>x.id===b).reservado,300);
 await assert.rejects(daily('transfer.delete',{id:s.entries[0].transferencia_id}),/reserva/);
 await assert.rejects(op('goal.entry',entry(g.id,{conta_id:b,origem_id:a,valor:'701'})),/insuficiente/);assert.equal((await snapshot()).accounts.find(x=>x.id===a).saldo_atual,700);
});
test('metas têm estimativa arredondada para cima, prazo opcional e vencido',async()=>{
 await goal({prazo:today,valor_alvo:'100.01'});await goal({prazo:'2020-01-01',valor_alvo:'50'});await goal();
 const s=await snapshot();assert.equal(s.goals.find(x=>x.prazo===today).mensal_necessario,100.01);assert.equal(s.goals.find(x=>x.prazo==='2020-01-01').mensal_necessario,50);assert.equal(s.goals.find(x=>x.prazo===null).mensal_necessario,null);
});
test('avisos reais, leitura persistente, resolução e limiar 80/100',async()=>{
 await op('budget.save',{categoria_id:expense,mes:month,valor:'100'});
 const base={descricao:'Teste',tipo:'despesa',valor:'80',categoria_id:expense,conta_id:a,data_competencia:today,data_vencimento:today,data_realizacao:today,status:'realizado'};
 await daily('transaction.save',base);let s=await snapshot();const alert=s.alerts.find(x=>x.chave.startsWith('o:'));assert.ok(alert);await op('alert.read',{chave:alert.chave,lido:true});assert.equal((await snapshot()).alerts[0].lido,true);
 await daily('transaction.save',{...base,valor:'20'});assert.equal((await snapshot()).alerts[0].lido,false);
 const t=await daily('transaction.save',{...base,status:'previsto',data_realizacao:null});assert.ok((await snapshot()).alerts.some(x=>x.chave.startsWith('t:')));
 await daily('transaction.save',{...base,id:t.id});assert.equal((await snapshot()).alerts.some(x=>x.chave.startsWith('t:')),false);
});
test('isolamento, proteção de helpers e escrita direta, campos extras e precisão',async()=>{
 const g=await goal();const r=await op('recurrence.save',recurrence());await who(B);
 assert.equal((await snapshot()).goals.length,0);assert.equal((await snapshot()).recurrences.length,0);
 await assert.rejects(op('goal.save',{id:g.id,titulo:'Invasão',valor_alvo:'5',prazo:null}),/não encontrada/);
 await assert.rejects(op('recurrence.end',{id:r.id,data_fim:today}),/recorrência/);
 await assert.rejects(op('goal.entry',entry(g.id)),/meta ativa/);await who(A);
 await assert.rejects(op('goal.save',{titulo:'Erro',valor_alvo:'1.001',prazo:null}),/monetário/);
 await assert.rejects(op('goal.save',{titulo:'Erro',valor_alvo:'1',prazo:null,usuario_id:B}),/campos inválidos/);
 await assert.rejects(db.query('update metas set valor_alvo=1'),/permission denied/);
 await assert.rejects(db.query('select bolsu_generate($1,$2,$3)',[A,month,month]),/permission denied/);
 await db.exec('reset role;set role anon');await assert.rejects(snapshot(),/permission denied/);
});
test('saldo insuficiente entre metas, ordem histórica e payload idempotente alterado são recusados',async()=>{
 const g=await goal();const key=randomUUID();await op('goal.entry',entry(g.id),key);
 await assert.rejects(op('goal.entry',entry(g.id,{valor:'101'}),key),/outros dados/);
 await assert.rejects(op('goal.entry',entry(g.id,{data:'2024-01-01'})),/último movimento/);
 await assert.rejects(op('recurrence.save',recurrence({categoria_id:income})),/incompatível/);
});
