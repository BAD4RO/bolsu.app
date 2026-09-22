import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {test,before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
let db,A,B,a,expense,income,today;
async function who(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
async function daily(operation,data,key=randomUUID()){return (await db.query('select bolsu_daily($1,$2::jsonb,$3) result',[operation,JSON.stringify(data),key])).rows[0].result;}
async function planning(operation,data,key=randomUUID()){return (await db.query('select bolsu_planning($1,$2::jsonb,$3) result',[operation,JSON.stringify(data),key])).rows[0].result;}
async function manage(operation,data){return (await db.query('select bolsu_plan_manage($1,$2::jsonb) result',[operation,JSON.stringify(data)])).rows[0].result;}
async function snapshot(){return (await db.query('select bolsu_plan_snapshot() result')).rows[0].result;}
async function home(){return (await db.query('select bolsu_home_snapshot(0) result')).rows[0].result;}
async function plus(status='active',future=true,cycle='monthly'){
 await db.exec('reset role');await db.query("update subscriptions set plano='plus',status=$2,ciclo=$3,current_period_end=now()+case when $4 then interval '1 day' else interval '-1 day' end,trial_ends_at=now()+case when $4 then interval '1 day' else interval '-1 day' end where usuario_id=$1",[A,status,cycle,future]);await who(A);
}
const account=(name='Conta')=>daily('account.save',{nome:name,tipo:'corrente',saldo_inicial:'1000',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:true});
const card=()=>daily('card.save',{nome:'Cartão',limite:'1000',dia_fechamento:10,dia_vencimento:20,bandeira:'Visa'});
const goal=()=>planning('goal.save',{titulo:'Meta',valor_alvo:'1000',prazo:'2199-01-01'});
const tx=(extra={})=>({descricao:'Despesa',tipo:'despesa',valor:'10',conta_id:a,categoria_id:expense,data_competencia:today,data_vencimento:today,status:'previsto',data_realizacao:null,...extra});
before(async()=>{db=new PGlite();await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);for(const name of ['202609220001_foundation.sql','202609220002_daily_control.sql','202609220003_planning.sql','202609220004_planning_end_boundary.sql','202609220005_dashboard.sql','202609220006_plans.sql'])await db.exec(readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8'));today=(await db.query("select (now() at time zone 'America/Sao_Paulo')::date::text d")).rows[0].d;});
after(async()=>db?.close());
beforeEach(async()=>{A=randomUUID();B=randomUUID();await db.exec('reset role');await db.query('insert into auth.users(id) values($1),($2)',[A,B]);await who(A);a=(await account()).id;const cats=(await home()).categories;expense=cats.find(c=>c.tipo==='despesa').id;income=cats.find(c=>c.tipo==='receita').id;});
test('matriz gratuita aplica limites também na RPC legada e reativação',async()=>{
 const b=await account('Segunda');await assert.rejects(account('Terceira'),/Limite/);
 await assert.rejects(db.query("select bolsu_create_account('Legada','corrente',0,'2020-01-01',true)"),/Limite/);
 await card();await assert.rejects(card(),/Limite/);await goal();await assert.rejects(goal(),/Limite/);
 const s=await snapshot();assert.equal(s.limits.accounts,2);assert.equal(s.hasPlus,false);assert.equal(s.accounts.length,2);
 await daily('adjustment.save',{conta_id:b.id,valor:'-1000',data:today,motivo:'Zerar'});await daily('account.save',{id:b.id,nome:'Segunda',tipo:'corrente',incluir_no_disponivel:true,arquivada:true});await account('Nova');
 await assert.rejects(daily('account.save',{id:b.id,nome:'Segunda',tipo:'corrente',incluir_no_disponivel:true,arquivada:false}),/Limite/);
});
test('Plus mensal/anual equivalentes; expiração, inadimplência, cancelamento e trial',async()=>{
 for(const cycle of ['monthly','yearly']){await plus('active',true,cycle);assert.equal((await snapshot()).limits.accounts,null);await account();}
 await plus('canceled',true);assert.equal((await snapshot()).hasPlus,true);
 await plus('canceled',false);assert.equal((await snapshot()).hasPlus,false);
 await plus('past_due',true);assert.equal((await snapshot()).hasPlus,false);
 await plus('trialing',true);assert.equal((await snapshot()).hasPlus,true);
 await plus('trialing',false);assert.equal((await snapshot()).hasPlus,false);
});
test('lançamentos manuais e transferências não têm franquia',async()=>{
 const b=await account('Outra');for(let i=0;i<110;i++)await daily('transaction.save',tx({valor:'1'}));
 for(let i=0;i<5;i++)await daily('transfer.save',{conta_origem_id:a,conta_destino_id:b.id,valor:'1',data:today});
 assert.equal((await home()).counts.manualTransactions,110);
});
test('downgrade preserva dados, exige escolha em grupos excedentes e bloqueia nova compra',async()=>{
 await plus();const b=await account('B'),c=await account('C');const ca=await card(),cb=await card();const ga=await goal(),gb=await goal();
 await plus('active',false);let s=await snapshot();assert.equal(s.accounts.filter(x=>x.allowed).length,0);assert.equal((await home()).accounts.length,3);
 await assert.rejects(daily('transaction.save',tx()),/Recurso indisponível/);
 await assert.rejects(manage('selection',{accounts:[a,b.id,c.id],cards:[],goals:[]}),/limites/);
 await manage('selection',{accounts:[a,b.id],cards:[ca.id],goals:[ga.id]});s=await snapshot();assert.equal(s.accounts.filter(x=>x.allowed).length,2);assert.equal(s.cards.find(x=>x.id===cb.id).allowed,false);assert.equal(s.goals.find(x=>x.id===gb.id).allowed,false);
 await daily('transaction.save',tx());await assert.rejects(daily('transaction.save',tx({conta_id:c.id})),/Recurso/);
 await assert.rejects(daily('purchase.save',{cartao_id:cb.id,descricao:'Nova',valor:'1',categoria_id:expense,data_compra:today,parcelas:1}),/Recurso/);
});
test('excedentes podem quitar previsões/faturas e retirar reservas sem novas despesas',async()=>{
 await plus();await account('B');const c=await account('C');await card();const blockedCard=await card();await goal();const g=await goal();
 const t=await daily('transaction.save',tx({conta_id:c.id}));await planning('goal.entry',{meta_id:g.id,conta_id:c.id,tipo:'aporte',valor:'100',data:today});
 await daily('purchase.save',{cartao_id:blockedCard.id,descricao:'Anterior',valor:'100',categoria_id:expense,data_compra:'2026-01-01',parcelas:1});const f=(await db.query('select id from faturas where cartao_id=$1',[blockedCard.id])).rows[0];
 await plus('active',false);
 await daily('transaction.save',tx({id:t.id,conta_id:c.id,status:'realizado',data_realizacao:today}));
 await daily('payment.save',{conta_id:c.id,fatura_id:f.id,valor:'100',data:today});
 await planning('goal.entry',{meta_id:g.id,conta_id:c.id,tipo:'retirada',valor:'100',data:today});
 await assert.rejects(planning('goal.entry',{meta_id:g.id,conta_id:c.id,tipo:'aporte',valor:'1',data:today}),/Recurso/);
 assert.equal((await db.query('select pendente from resumos_faturas where id=$1',[f.id])).rows[0].pendente,'0.00');
});
test('recorrências incompatíveis não geram novas ocorrências após expiração',async()=>{
 await plus();await account('B');const c=await account('C');await planning('recurrence.save',{descricao:'Mensal',tipo:'despesa',valor:'10',conta_id:c.id,categoria_id:expense,dia:5,data_inicio:'2026-01-01',data_fim:null});
 await plus('active',false);await planning('recurrence.generate',{mes:'2199-01-01'});assert.equal((await db.query("select count(*)::int n from transacoes where usuario_id=$1 and ocorrencia='2199-01-01'",[A])).rows[0].n,0);assert.equal((await snapshot()).pausedRecurrences,1);
 await manage('selection',{accounts:[a,c.id],cards:[],goals:[]});await planning('recurrence.generate',{mes:'2199-01-01'});assert.equal((await db.query("select count(*)::int n from transacoes where usuario_id=$1 and ocorrencia='2199-01-01'",[A])).rows[0].n,1);
});
test('categorias customizadas preservam histórico; nova atribuição exige Plus',async()=>{
 await assert.rejects(manage('category.save',{nome:'Custom',tipo:'despesa'}),/Plus/);await plus();const cat=await manage('category.save',{nome:'Custom',tipo:'despesa'});
 const t=await daily('transaction.save',tx({categoria_id:cat.id}));await plus('active',false);
 await assert.rejects(daily('transaction.save',tx({categoria_id:cat.id})),/Plus/);
 await daily('transaction.save',tx({id:t.id,categoria_id:cat.id,status:'realizado',data_realizacao:today}));assert.ok((await home()).categories.some(c=>c.id===cat.id));
 await assert.rejects(planning('budget.save',{categoria_id:cat.id,mes:today.slice(0,7)+'-01',valor:'100'}),/Plus/);
});
test('projeção, estimativa e comparativo não vazam pelas RPCs nem por implementações internas',async()=>{
 await goal();let h=await home();assert.equal('available' in h.projection,false);assert.equal(h.priorityGoal.mensal_necessario,null);
 assert.equal((await db.query('select mensal_necessario from resumos_metas')).rows[0].mensal_necessario,null);
 await assert.rejects(db.query('select bolsu_comparisons()'),/Plus/);
 await assert.rejects(db.query('select bolsu_home_snapshot_base(0)'),/permission denied/);
 await assert.rejects(db.query("select bolsu_daily_base('account.save','{}',gen_random_uuid())"),/permission denied/);
 await assert.rejects(db.query("select bolsu_create_account_base('X','corrente',0,'2020-01-01',true)"),/permission denied/);
 await plus();h=await home();assert.equal(h.hasPlus,true);assert.equal(h.projection.available,1000);assert.notEqual(h.priorityGoal.mensal_necessario,null);assert.equal((await db.query('select bolsu_comparisons() r')).rows[0].r.length,12);
});
test('alertas customizados atuam no banco e voltam ao padrão no Free',async()=>{
 await plus();await manage('alerts',{antecedencia:30,limiar:50});assert.equal((await snapshot()).alerts.antecedencia,30);
 await planning('budget.save',{categoria_id:expense,mes:today.slice(0,7)+'-01',valor:'100'});await daily('transaction.save',tx({valor:'60',status:'realizado',data_realizacao:today}));
 assert.equal((await db.query("select count(*)::int n from avisos_planejamento where chave like 'o:%'")).rows[0].n,1);
 await plus('active',false);assert.equal((await snapshot()).alerts.limiar,80);assert.equal((await db.query("select count(*)::int n from avisos_planejamento where chave like 'o:%'")).rows[0].n,0);await assert.rejects(manage('alerts',{antecedencia:30,limiar:50}),/Plus/);
});
test('exportação inclui histórico excedente e exclusões, com paginação e isolamento',async()=>{
 const t=await daily('transaction.save',tx());await daily('transaction.delete',{id:t.id});const rows=(await db.query("select bolsu_export('transacoes',0) r")).rows[0].r;assert.equal(rows[0].excluida,true);assert.equal('usuario_id' in rows[0],false);
 await assert.rejects(db.query("select bolsu_export('subscriptions',0)"),/inválida/);await who(B);assert.deepEqual((await db.query("select bolsu_export('transacoes',0) r")).rows[0].r,[]);await assert.rejects(manage('selection',{accounts:[a],cards:[],goals:[]}),/inválido/);
 await assert.rejects(db.query("update subscriptions set plano='plus'"),/permission denied/);await db.exec('reset role;set role anon');await assert.rejects(snapshot(),/permission denied/);
});
test('repetição de uma mutação concluída não falha após downgrade nem duplica recursos',async()=>{
 await plus();const key=randomUUID(),payload={nome:'Repetida',tipo:'corrente',saldo_inicial:'0',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:true};const first=await daily('account.save',payload,key);await account('Terceira');await plus('active',false);
 assert.deepEqual(await daily('account.save',payload,key),first);assert.equal((await snapshot()).accounts.length,3);
});
test('paginação CSV exporta mais de mil registros sem repetir ou omitir linhas',async()=>{
 await db.exec('reset role');
 await db.query("insert into transacoes(usuario_id,descricao,tipo,valor,categoria_id,conta_id,data_competencia,data_vencimento,status) select $1,'Exportação '||n,'despesa',1,$2,$3,$4::date,$4::date,'previsto' from generate_series(1,1001) n",[A,expense,a,today]);
 await who(A);const first=(await db.query("select bolsu_export('transacoes',0) r")).rows[0].r,second=(await db.query("select bolsu_export('transacoes',1) r")).rows[0].r;
 assert.equal(first.length,1000);assert.equal(second.length,1);assert.equal(new Set([...first,...second].map(r=>r.id)).size,1001);
});
test('reativar cartão ou meta também respeita a franquia',async()=>{
 const c=await card(),g=await goal();
 const cp={id:c.id,nome:'Cartão',limite:'1000',dia_fechamento:10,dia_vencimento:20,bandeira:'Visa'};
 const gp={id:g.id,titulo:'Meta',valor_alvo:'1000',prazo:'2199-01-01'};
 await daily('card.save',{...cp,arquivado:true});await card();await assert.rejects(daily('card.save',{...cp,arquivado:false}),/Limite/);
 await planning('goal.save',{...gp,arquivada:true});await goal();await assert.rejects(planning('goal.save',{...gp,arquivada:false}),/Limite/);
});
