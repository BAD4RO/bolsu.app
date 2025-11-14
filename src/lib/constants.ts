// Constantes do BOLSU

export const CORES_BOLSU = {
  background: '#0f0f16',
  gradientStart: '#252531',
  gradientEnd: '#16161f',
  border: '#262633',
  primary: '#ffa506',
  text: '#ffffff',
  textMuted: '#9ca3af',
  success: '#10b981',
  danger: '#ef4444',
} as const;

export const CATEGORIAS_PADRAO = [
  { nome: 'Alimentação', icone: 'UtensilsCrossed', cor: '#ef4444', tipo: 'despesa' },
  { nome: 'Transporte', icone: 'Car', cor: '#3b82f6', tipo: 'despesa' },
  { nome: 'Moradia', icone: 'Home', cor: '#8b5cf6', tipo: 'despesa' },
  { nome: 'Saúde', icone: 'Heart', cor: '#ec4899', tipo: 'despesa' },
  { nome: 'Educação', icone: 'GraduationCap', cor: '#14b8a6', tipo: 'despesa' },
  { nome: 'Lazer', icone: 'Gamepad2', cor: '#f59e0b', tipo: 'despesa' },
  { nome: 'Compras', icone: 'ShoppingBag', cor: '#06b6d4', tipo: 'despesa' },
  { nome: 'Salário', icone: 'Wallet', cor: '#10b981', tipo: 'receita' },
  { nome: 'Freelance', icone: 'Briefcase', cor: '#22c55e', tipo: 'receita' },
  { nome: 'Investimentos', icone: 'TrendingUp', cor: '#84cc16', tipo: 'receita' },
] as const;

export const BANDEIRAS_CARTAO = [
  'Visa',
  'Mastercard',
  'Elo',
  'American Express',
  'Hipercard',
  'Outros',
] as const;

export const TIPOS_CONTA = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
] as const;
