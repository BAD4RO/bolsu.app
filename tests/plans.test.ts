import {test} from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,planEnvelope,planSchemas,exportKinds} from '../src/lib/domain/plans';

test('CSV preserva números e escapa fórmulas, delimitadores e aspas',()=>{
 assert.equal(csvCell(-12.5),'"-12.5"');
 for(const value of ['=1+1',' +cmd','@SUM(A1)','-1','\tformula','\nformula'])assert.equal(csvCell(value),`"'${value}"`);
 assert.equal(csvCell('Café; "especial"'),'"Café; ""especial"""');
 assert.equal(csvCell(null),'""');assert.equal(csvCell('normal'),'"normal"');
});
test('preferências de plano não aceitam concessão de assinatura ou proprietário',()=>{
 assert.equal(planEnvelope.safeParse({operation:'activate',data:{}}).success,false);
 assert.equal(planEnvelope.safeParse({operation:'alerts',data:{},plano:'plus'}).success,false);
 assert.equal(planSchemas.alerts.safeParse({antecedencia:7,limiar:80,usuario_id:'outro'}).success,false);
 for(const antecedencia of [0,31,1.5])assert.equal(planSchemas.alerts.safeParse({antecedencia,limiar:80}).success,false);
 assert.equal(planSchemas.alerts.safeParse({antecedencia:30,limiar:100}).success,true);
 assert.equal(planSchemas.selection.safeParse({accounts:['inválido'],cards:[],goals:[]}).success,false);
 assert.equal(planSchemas['category.save'].safeParse({nome:'  ',tipo:'despesa'}).success,false);
 assert.equal(exportKinds.includes('subscriptions' as typeof exportKinds[number]),false);
});
