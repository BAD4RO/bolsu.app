import { z } from 'zod';
export const profileSchema = z.object({ nome: z.string().trim().min(1, 'Informe seu nome.').max(80) }).strict();
export function todayBR(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
}
export const dateSchema = z.string().refine(isDateOnly, 'Informe uma data válida.');
// Decimal input never accepts ambiguous thousand separators or silent rounding.
export const moneySchema = z.string().trim().regex(/^-?\d{1,12}([.,]\d{1,2})?$/, 'Use um valor como 1234,56, com até duas casas decimais.');
export function toCents(value: string): number {
  const parsed = moneySchema.parse(value).replace(',', '.');
  const negative = parsed.startsWith('-');
  const [whole, fraction = ''] = parsed.replace('-', '').split('.');
  return (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) * (negative ? -1 : 1);
}
export const accountSchema = z.object({
  nome: z.string().trim().min(1,'Informe o nome da conta.').max(80),
  tipo: z.enum(['corrente','poupanca','carteira','investimento']),
  saldo_inicial: moneySchema,
  data_saldo_inicial: dateSchema.refine(v => v >= '1900-01-01' && v <= todayBR(), 'Use uma data entre 1900 e hoje.'),
  incluir_no_disponivel: z.boolean(),
}).strict();
export const signupSchema = z.object({ nome: z.string().trim().min(3,'Informe pelo menos 3 letras no nome.').max(80), email: z.string().trim().email('E-mail inválido.').transform(v=>v.toLowerCase()), password: z.string().min(8,'Use pelo menos 8 caracteres.').max(128) });
export function hasPlus(subscription: { plano: string; status: string; trial_ends_at: string|null; current_period_end: string|null }, now = new Date()): boolean {
  if (subscription.plano !== 'plus') return false;
  const end = subscription.status === 'trialing' ? subscription.trial_ends_at : ['active','canceled'].includes(subscription.status) ? subscription.current_period_end : null;
  return !!end && new Date(end).getTime() > now.getTime();
}
