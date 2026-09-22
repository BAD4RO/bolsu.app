import {z} from 'zod';
import type {Overview} from '../overview.types';
export const homePreferencesSchema=z.object({introducao_oculta:z.boolean().optional(),meta_prioritaria_id:z.string().uuid().nullable().optional()}).strict();
export function nextHomeAction(data:Overview):{label:string;reason:string;href?:string;quick?:'account'|'transaction'}{
 if(!data.accounts.length)return {label:'Cadastrar primeira conta',reason:'Informe o saldo de abertura para começar com números reais.',quick:'account'};
 if(!data.accounts.some(a=>a.incluir_no_disponivel))return {label:'Revisar contas incluídas',reason:'Nenhuma conta participa do saldo disponível.',href:'/contas'};
 if(data.projection.overdue>0)return {label:'Conferir vencidos',reason:'Há obrigações vencidas ainda registradas como pendentes.',href:'#compromissos'};
 if(data.projection.firstShortfallDate)return {label:'Revisar compromissos e entradas',reason:'Pode faltar saldo antes de uma entrada, mesmo que o mês termine positivo.',href:'#projecao'};
 if(!data.counts.manualTransactions)return {label:'Registrar primeiro lançamento',reason:'Uma receita ou despesa já ajuda a organizar seu mês.',quick:'transaction'};
 if(data.upcoming.length)return {label:'Conferir próximos vencimentos',reason:'Veja o que ainda precisa ser pago neste mês.',href:'#compromissos'};
 if(!data.budgetCount)return {label:'Definir orçamento do mês',reason:'Escolha um valor por categoria para acompanhar seus gastos.',href:'/limites'};
 if(!data.priorityGoal)return {label:'Criar uma meta',reason:'Dê um objetivo ao dinheiro que deseja reservar.',href:'/metas'};
 return {label:'Atualizar meus lançamentos',reason:'Mantenha receitas e despesas em dia para melhorar a estimativa.',quick:'transaction'};
}
