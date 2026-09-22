import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planningSchemas,reserveSummary} from '../src/lib/domain/planning';
test('reservas de contas excluídas não são descontadas duas vezes',()=>{
 assert.deepEqual(reserveSummary([{saldo_atual:700,reservado:100,incluir_no_disponivel:true},{saldo_atual:300,reservado:300,incluir_no_disponivel:false}]),{cash:700,reserved:100,available:600});
 assert.equal(reserveSummary([{saldo_atual:10.01,reservado:20.02,incluir_no_disponivel:true}]).available,-10.01);
});
test('planejamento rejeita precisão excessiva, campos de privilégio e datas inválidas',()=>{
 const goal={titulo:'Meta',valor_alvo:'10.01',prazo:null};assert.equal(planningSchemas['goal.save'].safeParse(goal).success,true);
 for(const change of [{valor_alvo:'0'},{valor_alvo:'1.001'},{usuario_id:'outro'},{prazo:'2025-02-29'}])assert.equal(planningSchemas['goal.save'].safeParse({...goal,...change}).success,false);
});
test('ocorrência realizada exige data válida e não futura',()=>{
 const t={id:'11111111-1111-4111-8111-111111111111',descricao:'Conta',valor:'10',data_vencimento:'2024-01-01',status:'realizado',data_realizacao:null};
 assert.equal(planningSchemas['occurrence.save'].safeParse(t).success,false);
 assert.equal(planningSchemas['occurrence.save'].safeParse({...t,data_realizacao:'2199-01-01'}).success,false);
 assert.equal(planningSchemas['occurrence.save'].safeParse({...t,data_realizacao:'2024-01-01'}).success,true);
});
