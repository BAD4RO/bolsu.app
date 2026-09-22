import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.BOLSU_TEST_URL||'http://localhost:3000';

test('páginas e APIs aplicam proteções e não carregam o bridge do protótipo',async()=>{
 for(const path of ['/login','/api/billing']){
  const response=await fetch(base+path,{redirect:'manual'});
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
  assert.equal(response.headers.get('x-powered-by'),null);
  assert.doesNotMatch(await response.text(),/lasy-bridge/);
 }
 assert.equal((await fetch(base+'/lasy-bridge.js')).status,404);
});

test('otimizador de imagens rejeita origens remotas e localhost',async()=>{
 for(const url of ['http://localhost:3000/login','https://images.unsplash.com/test.jpg']){
  const response=await fetch(base+'/_next/image?'+new URLSearchParams({url,w:'640',q:'75'}));
  assert.equal(response.status,400);
 }
});
test('callback sem verificador orienta login sem conceder sessão',async()=>{
 const response=await fetch(base+'/auth/callback?code=teste-sem-verificador',{redirect:'manual'});
 assert.equal(response.status,307);
 const location=new URL(response.headers.get('location'),base);
 assert.equal(location.pathname,'/login');assert.equal(location.searchParams.get('auth_error'),'browser');
 assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(location.searchParams.has('code'),false);
});
test('áreas privadas redirecionam sem sessão, mesmo com antiga variável de prévia',async()=>{
  for(const path of ['/recorrencias','/dashboard','/contas','/cartoes','/metas','/limites','/perfil','/assinatura','/mais','/notificacoes','/seguranca']){
    const response=await fetch(base+path,{redirect:'manual'});
    assert.equal(response.status,307,path);assert.equal(new URL(response.headers.get('location'),base).pathname,'/login');
  }
});
test('APIs recusam dados sem sessão e não retornam registros',async()=>{
  for(const path of ['/api/planning?month=2026-09','/api/profile','/api/accounts','/api/categories','/api/overview','/api/subscription','/api/comparisons','/api/export?kind=transacoes','/api/billing']){
    const response=await fetch(base+path);assert.equal(response.status,401,path);
    const body=await response.json();assert.deepEqual(Object.keys(body),['error']);
    assert.match(response.headers.get('cache-control'),/no-store/);
  }
});
test('checkout, consulta, portal e cancelamento exigem sessão e mesma origem',async()=>{
 for(const path of ['checkout','sync','portal','cancel'])for(const [origin,status] of [[base,401],['https://outro.test',403]]){
  const r=await fetch(base+'/api/billing/'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,status,path);
 }
});
test('reconciliação não aceita chamada pública nem token incorreto',async()=>{
 for(const headers of [{},{Authorization:'Bearer invalido'}]){const r=await fetch(base+'/api/billing/reconcile',{method:'POST',headers});assert.equal(r.status,401);}
});
test('webhook sem assinatura não confirma evento nem concede plano',async()=>{
 const r=await fetch(base+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'invoice.paid',livemode:false,data:{object:{id:'in_forged'}}})});assert.ok([400,503].includes(r.status));assert.deepEqual(Object.keys(await r.json()),['error']);
});
test('preferências de plano exigem sessão e mesma origem',async()=>{
 for(const [origin,status] of [[base,401],['https://outro.test',403]]){
  const r=await fetch(base+'/api/subscription',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({operation:'alerts',data:{antecedencia:7,limiar:80}})});assert.equal(r.status,status);
 }
});
test('escrita por outra origem é bloqueada antes de consultar banco',async()=>{
  const response=await fetch(base+'/api/profile',{method:'PATCH',headers:{Origin:'https://outro.test','Content-Type':'application/json'},body:JSON.stringify({nome:'Não deve gravar'})});assert.equal(response.status,403);
});
test('callback inválido volta ao login e rota administrativa não cria contas',async()=>{
  const callback=await fetch(base+'/auth/callback?next=https://outro.test',{redirect:'manual'});
  assert.equal(callback.status,307);assert.equal(new URL(callback.headers.get('location'),base).pathname,'/login');
  const admin=await fetch(base+'/api/create-admin',{method:'POST'});assert.equal(admin.status,410);
});
test('controle diário exige sessão também para gravação',async()=>{
 const r=await fetch(base+'/api/daily',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({operation:'transaction.delete',requestId:'00000000-0000-4000-8000-000000000001',data:{id:'00000000-0000-4000-8000-000000000001'}})});assert.equal(r.status,401);
 const read=await fetch(base+'/api/daily?month=2026-09');assert.equal(read.status,401);
});
test('operações diárias rejeitam origem externa antes de qualquer mutação',async()=>{
 const r=await fetch(base+'/api/daily',{method:'POST',headers:{Origin:'https://outro.test','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,403);
});
test('planejamento exige sessão e rejeita gravação de outra origem',async()=>{
 const own=await fetch(base+'/api/planning',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(own.status,401);
 const external=await fetch(base+'/api/planning',{method:'POST',headers:{Origin:'https://outro.test','Content-Type':'application/json'},body:'{}'});assert.equal(external.status,403);
});
test('introdução, meta prioritária e sincronização do início exigem sessão e mesma origem',async()=>{
 for(const method of ['PATCH','POST']){
  const r=await fetch(base+'/api/overview',{method,headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,401);
  const external=await fetch(base+'/api/overview',{method,headers:{Origin:'https://outro.test','Content-Type':'application/json'},body:'{}'});assert.equal(external.status,403);
 }
});
