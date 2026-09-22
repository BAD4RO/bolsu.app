import type { AccountBalance,Category,Card,Invoice,Transaction,Transfer,InvoicePayment } from './database.types';
export type DailyCard=Card & {bandeira:string;utilizado:number};
export type DailyInvoice=Invoice & {total:number;pago:number;pendente:number};
export type DailyTransaction=Transaction & {compra_id:string|null;data_compra:string|null;excluida:boolean};
export type Adjustment={id:string;conta_id:string;valor:number;data:string;motivo:string};
export type DailySnapshot={accounts:AccountBalance[];categories:Category[];cards:DailyCard[];invoices:DailyInvoice[];transactions:DailyTransaction[];transfers:Transfer[];payments:InvoicePayment[];adjustments:Adjustment[];counts:{transactions:number;transfers:number;payments:number;adjustments:number};totals:{income:number;expenses:number}};
