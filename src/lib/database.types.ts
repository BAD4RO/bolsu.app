import type {BillingOrder,BillingEvent,BillingPayment,BillingView} from './billing/types';
import type { PlanSnapshot } from './plans.types';
import type { Overview } from './overview.types';
import type { PlanningSnapshot } from './planning.types';
import type { DailySnapshot } from './daily.types';
// Contract of 202609220001_foundation.sql. Regenerate against the new project after deployment.
export type Profile = { id: string; nome: string; moeda: 'BRL'; fuso_horario: 'America/Sao_Paulo'; created_at: string; updated_at: string };
export type Account = { id: string; usuario_id: string; nome: string; tipo: 'corrente'|'poupanca'|'carteira'|'investimento'; moeda: 'BRL'; saldo_inicial: number; data_saldo_inicial: string; incluir_no_disponivel: boolean; arquivada: boolean; created_at: string; updated_at: string };
export type AccountBalance = Account & { saldo_atual: number };
export type Category = { id: string; usuario_id: string; nome: string; tipo: 'receita'|'despesa'; padrao: boolean; arquivada: boolean; created_at: string };
export type Subscription = { stripe_access_until?:string|null; stripe_customer_id?:string|null; stripe_subscription_id?:string|null; stripe_price_id?:string|null; subscription_status?:string|null; plan?:'free'|'premium'; usuario_id: string; plano: 'free'|'plus'; status: 'inactive'|'trialing'|'active'|'past_due'|'canceled'; ciclo: 'monthly'|'yearly'|null; trial_ends_at: string|null; current_period_end: string|null; cancel_at_period_end: boolean; updated_at: string };
type Owned = { id: string; usuario_id: string; created_at: string };
export type Card = Owned & { nome: string; limite: number; dia_fechamento: number; dia_vencimento: number; arquivado: boolean };
export type Invoice = Owned & { cartao_id: string; competencia: string; fechamento: string; vencimento: string };
export type Recurrence = Owned & { descricao: string; tipo: 'receita'|'despesa'; valor: number; conta_id: string; categoria_id: string; periodicidade: 'mensal'; dia: number; data_inicio: string; data_fim: string|null; ativa: boolean };
export type Transaction = Owned & { excluida:boolean; compra_id:string|null; data_compra:string|null; descricao: string; tipo: 'receita'|'despesa'; valor: number; categoria_id: string; conta_id: string|null; cartao_id: string|null; fatura_id: string|null; data_competencia: string; data_vencimento: string; data_realizacao: string|null; status: 'previsto'|'realizado'; recorrencia_id: string|null; ocorrencia: string|null; grupo_parcelamento: string|null; parcela: number|null; total_parcelas: number|null; observacoes: string|null; updated_at: string };
export type Transfer = Owned & { conta_origem_id: string; conta_destino_id: string; valor: number; data: string };
export type InvoicePayment = Owned & { conta_id: string; fatura_id: string; valor: number; data: string };
export type Budget = Owned & { categoria_id: string; mes: string; valor: number };
export type Goal = Owned & { titulo: string; valor_alvo: number; prazo: string|null; arquivada: boolean };
export type GoalEntry = Owned & { meta_id: string; conta_id: string; tipo: 'aporte'|'retirada'; valor: number; data: string; transferencia_id: string|null };
type Table<Row> = { Row: Row; Insert: never; Update: never; Relationships: [] };
export type Database = { public: {
  Tables: {
    billing_orders:Table<BillingOrder>; billing_events:Table<BillingEvent>; billing_payments:Table<BillingPayment & {order_id:string}>;
    profiles: Omit<Table<Profile>, 'Update'> & { Update: { nome?: string } };
    subscriptions: Table<Subscription>; contas: Table<Account>; categorias: Table<Category>;
    cartoes: Table<Card>; faturas: Table<Invoice>; recorrencias: Table<Recurrence>; transacoes: Table<Transaction>;
    transferencias: Table<Transfer>; pagamentos_fatura: Table<InvoicePayment>;
    orcamentos: Table<Budget>; metas: Table<Goal>; aportes_metas: Table<GoalEntry>;
  };
  Views: { saldos_contas: { Row: AccountBalance; Relationships: [] } };
  Functions: {
    bolsu_billing_batch_lock:{Args:{p_token:string;p_release?:boolean};Returns:boolean};
    bolsu_billing_assert_mode:{Args:{p_live:boolean};Returns:undefined};
    bolsu_billing_status:{Args:Record<string,never>;Returns:BillingView["order"]};
    bolsu_billing_due:{Args:{p_users:string[]|null};Returns:BillingOrder[]};
    bolsu_billing_acquire:{Args:{p_user:string;p_token:string;p_cycle?:string;p_amount?:number;p_price?:string};Returns:BillingOrder|null};
    bolsu_billing_write:{Args:{p_order:string;p_token:string;p_operation:string;p_data?:unknown};Returns:undefined};
    bolsu_billing_event:{Args:{p_id:string;p_topic:string;p_resource:string;p_operation:string};Returns:boolean};
 bolsu_plan_snapshot:{Args:Record<string,never>;Returns:PlanSnapshot}; bolsu_plan_manage:{Args:{p_operation:string;p_data:unknown};Returns:{saved:boolean}}; bolsu_comparisons:{Args:Record<string,never>;Returns:{mes:string;receitas:number;despesas:number}[]}; bolsu_export:{Args:{p_kind:string;p_page:number};Returns:Record<string,unknown>[]}; bolsu_home_snapshot: { Args: {p_page:number}; Returns:Overview }; bolsu_home_preferences: { Args:{p_data:unknown}; Returns:undefined }; bolsu_planning: { Args: {p_operation:string;p_data:unknown;p_request_id:string}; Returns:{id:string|null} }; bolsu_planning_snapshot: { Args:{p_month:string;p_page:number}; Returns:PlanningSnapshot }; bolsu_daily: { Args: {p_operation:string;p_data:unknown;p_request_id:string}; Returns:{id:string} }; bolsu_daily_snapshot: { Args: {p_month:string;p_page:number;p_search?:string;p_type?:string;p_status?:string;p_category?:string}; Returns:DailySnapshot }; bolsu_create_account: { Args: { p_nome: string; p_tipo: string; p_saldo: number; p_data: string; p_incluir: boolean }; Returns: Account } };
  Enums: Record<string, never>; CompositeTypes: Record<string, never>;
} };
