import type {AccountBalance,Category,Profile} from './database.types';
import type {PlanningSnapshot} from './planning.types';
export type ProjectionItem={id:string;tipo:'income'|'expense'|'invoice';descricao:string;valor:number;vencimento:string;competencia:string;origem:string;incluido:boolean;destino:string};
export type Overview={
 hasPlus:boolean;today:string;monthEnd:string;recurrenceGapMonth:string|null;profile:Profile;email:string;
 accounts:(AccountBalance&{reservado:number})[];categories:Category[];
 counts:{transactions:number;manualTransactions:number;cards:number;goals:number};
 preferences:{introducao_oculta:boolean;meta_prioritaria_id:string|null};
 projection:{cash:number;reserved:number;excludedCash:number;income:number;expenses:number;invoices:number;committed:number;available:number;withoutIncome:number;overdue:number;overdueIncomeCount:number;excludedItemCount:number;underfundedAccounts:number;nextIncomeDate:string|null;beforeNextIncome:number;lowestBalance:number;firstShortfallDate:string|null};
 monthly:{receitas:number;despesas:number};upcoming:ProjectionItem[];items:ProjectionItem[];itemCount:number;
 budgets:PlanningSnapshot['budgets'];budgetCount:number;goals:{id:string;titulo:string}[];
 priorityGoal:PlanningSnapshot['goals'][number]|null;unreadAlerts:number;
};
