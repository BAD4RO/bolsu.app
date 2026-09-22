import { z } from 'zod';
import { dateSchema,moneySchema,toCents,todayBR } from './validation';
const cents=(v:string)=>moneySchema.safeParse(v).success?toCents(v):Number.NaN;
const uuid=z.string().uuid('Identificador inválido.');
const id={id:uuid.optional()};
const date=dateSchema.refine(v=>v>='1900-01-01'&&v<='2200-12-31','Data fora do período permitido.');
const past=date.refine(v=>v<=todayBR(),'Use uma data até hoje.');
const amount=moneySchema.refine(v=>cents(v)>0,'Informe um valor maior que zero.');
const text=z.string().trim().min(1,'Preencha a descrição.').max(160);
const erase=z.object({id:uuid}).strict();
export const dailySchemas={
 'account.save':z.object({...id,nome:text.max(80),tipo:z.enum(['corrente','poupanca','carteira','investimento']),saldo_inicial:moneySchema.optional(),data_saldo_inicial:past.optional(),incluir_no_disponivel:z.boolean(),arquivada:z.boolean().optional()}).strict().refine(v=>!!v.id||(v.saldo_inicial!==undefined&&!!v.data_saldo_inicial),'Informe saldo e data de abertura.'),
 'adjustment.save':z.object({conta_id:uuid,valor:moneySchema.refine(v=>Number.isFinite(cents(v))&&cents(v)!==0,'Informe um ajuste diferente de zero.'),data:past,motivo:text}).strict(),
 'adjustment.delete':erase,
 'transaction.save':z.object({...id,descricao:text,tipo:z.enum(['receita','despesa']),valor:amount,categoria_id:uuid,conta_id:uuid,data_competencia:date,data_vencimento:date,data_realizacao:past.nullable(),status:z.enum(['previsto','realizado']),observacoes:z.string().max(2000).optional()}).strict().refine(v=>(v.status==='realizado')===!!v.data_realizacao,'Confira a data de realização.'),
 'transaction.delete':erase,
 'transfer.save':z.object({...id,conta_origem_id:uuid,conta_destino_id:uuid,valor:amount,data:past}).strict().refine(v=>v.conta_origem_id!==v.conta_destino_id,'Escolha contas diferentes.'),
 'transfer.delete':erase,
 'card.save':z.object({...id,nome:text.max(80),limite:moneySchema.refine(v=>cents(v)>=0,'Limite inválido.'),dia_fechamento:z.number().int().min(1).max(31),dia_vencimento:z.number().int().min(1).max(31),bandeira:z.enum(['Mastercard','Visa','Elo','Outra']),arquivado:z.boolean().optional()}).strict(),
 'purchase.save':z.object({...id,cartao_id:uuid,descricao:text,valor:amount,categoria_id:uuid,data_compra:past,parcelas:z.number().int().min(1).max(360)}).strict().refine(v=>cents(v.valor)>=v.parcelas,'Cada parcela precisa ter pelo menos um centavo.'),
 'purchase.delete':erase,
 'payment.save':z.object({conta_id:uuid,fatura_id:uuid,valor:amount,data:past}).strict(),
 'payment.delete':erase,
};
export type DailyOperation=keyof typeof dailySchemas;
export const operationSchema=z.object({operation:z.enum(Object.keys(dailySchemas) as [DailyOperation,...DailyOperation[]]),requestId:uuid,data:z.unknown()}).strict();
