import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCents,isDateOnly,todayBR,accountSchema,profileSchema,hasPlus,signupSchema } from '../src/lib/domain/validation';
import { callbackDestination,isProtectedPath,isSameOrigin } from '../src/lib/domain/access';
test('valores monetários têm precisão de centavos e rejeitam formatos ambíguos',()=>{
  assert.equal(toCents('0,10')+toCents('0,20'),30);assert.equal(toCents('-1234.56'),-123456);
  for(const v of ['1.001','1,234.56','NaN','Infinity','1e3',''])assert.throws(()=>toCents(v));
});
test('datas preservam calendário e fuso brasileiro',()=>{
  assert.ok(isDateOnly('2024-02-29'));assert.equal(isDateOnly('2025-02-29'),false);assert.equal(isDateOnly('2026-13-01'),false);
  assert.equal(todayBR(new Date('2026-09-23T01:00:00Z')),'2026-09-22');
});
test('entrada de conta e perfil não aceita proprietário nem plano do navegador',()=>{
  const account={nome:'Conta',tipo:'corrente',saldo_inicial:'12,30',data_saldo_inicial:'2020-01-01',incluir_no_disponivel:true};
  assert.ok(accountSchema.safeParse(account).success);
  assert.equal(accountSchema.safeParse({...account,usuario_id:'outro'}).success,false);
  assert.equal(accountSchema.safeParse({...account,data_saldo_inicial:'2999-01-01'}).success,false);
  assert.equal(profileSchema.safeParse({nome:'Ana',plano:'plus'}).success,false);
  assert.equal(profileSchema.safeParse({nome:'  '}).success,false);
});
test('cadastro padroniza e-mail e exige nome e senha válidos',()=>{
  assert.equal(signupSchema.parse({nome:' Ana ',email:'ANA@EXAMPLE.COM ',password:'abcdefgh'}).email,'ana@example.com');
  assert.equal(signupSchema.safeParse({nome:'Ana',email:'a@example.com',password:'1234567'}).success,false);
});
test('acesso Plus expira e não aceita data ausente ou cobrança pendente',()=>{
  const now=new Date('2026-09-22T12:00:00Z');
  const sub={plano:'plus',status:'active',trial_ends_at:null,current_period_end:'2026-10-01T00:00:00Z'};
  assert.ok(hasPlus(sub,now));assert.ok(hasPlus({...sub,status:'canceled'},now));
  assert.equal(hasPlus({...sub,current_period_end:null},now),false);
  assert.equal(hasPlus({...sub,status:'past_due'},now),false);
  assert.equal(hasPlus({...sub,current_period_end:now.toISOString()},now),false);
  assert.equal(hasPlus({...sub,plano:'free'},now),false);
});
test('autenticação cobre rotas financeiras e callback não redireciona para terceiros',()=>{
  for(const path of ['/contas','/cartoes','/metas','/limites','/notificacoes','/seguranca','/dashboard/item'])assert.ok(isProtectedPath(path));
  assert.equal(isProtectedPath('/dashboard-falso'),false);
  for(const next of ['https://evil.test','//evil.test','/api/create-admin',null])assert.equal(callbackDestination(next),'/dashboard');
  assert.equal(callbackDestination('/redefinir-senha'),'/redefinir-senha');
  assert.ok(isSameOrigin('https://app.test/api/profile','https://app.test'));
  assert.equal(isSameOrigin('https://app.test/api/profile','https://evil.test'),false);
  assert.equal(isSameOrigin('https://app.test/api/profile',null),false);
});
