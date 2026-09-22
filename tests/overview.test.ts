import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextHomeAction,homePreferencesSchema} from '../src/lib/domain/overview';
import type {Overview} from '../src/lib/overview.types';
const base={accounts:[],counts:{manualTransactions:0},projection:{overdue:0,firstShortfallDate:null},upcoming:[],budgetCount:0,priorityGoal:null} as unknown as Overview;
test('primeira ação segue os dados reais e prioriza pendências antes de novos recursos',()=>{
 assert.equal(nextHomeAction(base).quick,'account');
 const started={...base,accounts:[{incluir_no_disponivel:true}]} as Overview;
 assert.equal(nextHomeAction(started).quick,'transaction');
 assert.equal(nextHomeAction({...started,projection:{...started.projection,overdue:1}}).href,'#compromissos');
 assert.equal(nextHomeAction({...started,projection:{...started.projection,firstShortfallDate:'2026-09-22'}}).href,'#projecao');
 assert.equal(nextHomeAction({...started,accounts:[{incluir_no_disponivel:false}]} as Overview).href,'/contas');
});
test('preferências não permitem alterar proprietário ou privilégios',()=>{
 assert.equal(homePreferencesSchema.safeParse({introducao_oculta:true}).success,true);
 assert.equal(homePreferencesSchema.safeParse({meta_prioritaria_id:null}).success,true);
 for(const v of [{introducao_oculta:'true'},{usuario_id:'outro'},{plano:'plus'},{meta_prioritaria_id:'errado'}])assert.equal(homePreferencesSchema.safeParse(v).success,false);
});
