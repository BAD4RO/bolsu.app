// Tipos do BOLSU - App de Organização Financeira

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  criadoEm: Date;
}

export interface Conta {
  id: string;
  usuarioId: string;
  nome: string;
  tipo: 'corrente' | 'poupanca' | 'investimento';
  saldo: number;
  cor: string;
  ativa: boolean;
}

export interface CartaoCredito {
  id: string;
  usuarioId: string;
  nome: string;
  bandeira: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  cor: string;
  ativo: boolean;
}

export interface Categoria {
  id: string;
  usuarioId: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  icone: string;
  limiteMensal?: number;
  ativa: boolean;
}

export type PeriodoRecorrencia = 'diario' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';

export interface Assinatura {
  id: string;
  usuarioId: string;
  descricao: string;
  valor: number;
  categoriaId: string;
  contaId?: string;
  cartaoId?: string;
  periodoRecorrencia: PeriodoRecorrencia;
  diaCobranca: number;
  dataInicio: Date;
  dataFim?: Date;
  ativa: boolean;
  proximaCobranca: Date;
}

export interface Transacao {
  id: string;
  usuarioId: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoriaId: string;
  contaId?: string;
  cartaoId?: string;
  data: Date;
  paga: boolean;
  recorrente: boolean;
  assinaturaId?: string;
  observacoes?: string;
}

export interface GastosPorCategoria {
  categoria: string;
  valor: number;
  cor: string;
  percentual: number;
}

export interface VencimentoProximo {
  id: string;
  descricao: string;
  valor: number;
  data: Date;
  tipo: 'conta' | 'cartao';
  pago: boolean;
}
