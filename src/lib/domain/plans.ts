import {z} from 'zod';
export const planSchemas={
 selection:z.object({accounts:z.array(z.string().uuid()),cards:z.array(z.string().uuid()),goals:z.array(z.string().uuid())}).strict(),
 'category.save':z.object({id:z.string().uuid().optional(),nome:z.string().trim().min(1).max(60),tipo:z.enum(['receita','despesa']),arquivada:z.boolean().optional()}).strict(),
 alerts:z.object({antecedencia:z.number().int().min(1).max(30),limiar:z.number().int().min(50).max(100)}).strict(),
};
export const planEnvelope=z.object({operation:z.enum(['selection','category.save','alerts']),data:z.unknown()}).strict();
export const exportKinds=['contas','categorias','transacoes','cartoes','faturas','transferencias','pagamentos_fatura','recorrencias','versoes_recorrencia','orcamentos','metas','aportes_metas','ajustes_conta'] as const;
export function csvCell(value:unknown){
 if(value===null||value===undefined)return '""';
 let text=typeof value==='object'?JSON.stringify(value):String(value);
 if(typeof value==='string'&&(/^[\s]*[=+@-]/.test(text)||/^[\t\r\n]/.test(text)))text="'"+text;
 return '"'+text.replaceAll('"','""')+'"';
}
