import {z} from 'zod';
import {dateSchema,moneySchema,toCents,todayBR} from './validation';
const uuid=z.string().uuid('Identificador inválido.');
const date=dateSchema.refine(d=>d>='1900-01-01'&&d<='2200-12-31','Data fora do período permitido.');
const month=date.refine(d=>d.endsWith('-01'),'Use o primeiro dia do mês.');
const amount=moneySchema.refine(v=>moneySchema.safeParse(v).success&&toCents(v)>0,'Informe um valor maior que zero.');
const text=z.string().trim().min(1,'Preencha o nome ou descrição.').max(160);
export const planningSchemas={
 'recurrence.save':z.object({id:uuid.optional(),descricao:text,tipo:z.enum(['receita','despesa']),valor:amount,conta_id:uuid,categoria_id:uuid,dia:z.number().int().min(1).max(31),data_inicio:date.optional(),data_fim:date.nullable().optional(),desde:month.optional()}).strict().refine(v=>v.id?!!v.desde:!!v.data_inicio,'Informe o início ou o mês da alteração.'),
 'recurrence.end':z.object({id:uuid,data_fim:date}).strict(),
 'recurrence.generate':z.object({mes:month}).strict(),
 'occurrence.save':z.object({id:uuid,descricao:text,valor:amount,data_vencimento:date,status:z.enum(['previsto','realizado']),data_realizacao:date.nullable()}).strict().refine(v=>(v.status==='realizado')===!!v.data_realizacao,'Confira a data de realização.').refine(v=>!v.data_realizacao||v.data_realizacao<=todayBR(),'A realização não pode ser futura.'),
 'occurrence.delete':z.object({id:uuid}).strict(),
 'budget.save':z.object({categoria_id:uuid,mes:month,valor:amount}).strict(),
 'budget.delete':z.object({id:uuid}).strict(),
 'goal.save':z.object({id:uuid.optional(),titulo:text.max(80),valor_alvo:amount,prazo:date.nullable(),arquivada:z.boolean().optional()}).strict(),
 'goal.entry':z.object({meta_id:uuid,conta_id:uuid,tipo:z.enum(['aporte','retirada']),valor:amount,data:date.refine(d=>d<=todayBR(),'Use uma data até hoje.'),origem_id:uuid.optional()}).strict(),
 'alert.read':z.object({chave:z.string().min(1).max(240),lido:z.boolean()}).strict(),
};
export type PlanningOperation=keyof typeof planningSchemas;
export const planningEnvelope=z.object({operation:z.enum(Object.keys(planningSchemas) as [PlanningOperation,...PlanningOperation[]]),requestId:uuid,data:z.unknown()}).strict();
export function reserveSummary(accounts:{saldo_atual:number;reservado:number;incluir_no_disponivel:boolean}[]){
 const included=accounts.filter(a=>a.incluir_no_disponivel);
 const cash=included.reduce((s,a)=>s+toCents(String(a.saldo_atual)),0);
 const reserved=included.reduce((s,a)=>s+toCents(String(a.reservado)),0);
 return {cash:cash/100,reserved:reserved/100,available:(cash-reserved)/100};
}
