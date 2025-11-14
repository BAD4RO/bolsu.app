'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/custom/bottom-nav';
import { Plus, Search, Filter, TrendingUp, TrendingDown, Calendar, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { PeriodoRecorrencia } from '@/lib/types';

// Dados mockados
const transacoesMock = [
  { id: '1', descricao: 'Supermercado', valor: 250.00, tipo: 'despesa', categoria: 'Alimentação', data: new Date('2025-01-02'), paga: true, recorrente: false },
  { id: '2', descricao: 'Salário', valor: 5000.00, tipo: 'receita', categoria: 'Salário', data: new Date('2025-01-01'), paga: true, recorrente: false },
  { id: '3', descricao: 'Uber', valor: 45.00, tipo: 'despesa', categoria: 'Transporte', data: new Date('2025-01-03'), paga: true, recorrente: false },
  { id: '4', descricao: 'Netflix', valor: 55.90, tipo: 'despesa', categoria: 'Lazer', data: new Date('2025-01-05'), paga: false, recorrente: true },
  { id: '5', descricao: 'Freelance', valor: 1500.00, tipo: 'receita', categoria: 'Freelance', data: new Date('2025-01-04'), paga: true, recorrente: false },
];

const categoriasMock = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Educação',
  'Lazer',
  'Compras',
  'Salário',
  'Freelance',
];

const periodosRecorrencia: { value: PeriodoRecorrencia; label: string }[] = [
  { value: 'diario', label: 'Diário' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
];

export default function LancamentosPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState('');
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [periodoRecorrencia, setPeriodoRecorrencia] = useState<PeriodoRecorrencia>('mensal');
  const [diaCobranca, setDiaCobranca] = useState('');
  const [dataFinalRecorrencia, setDataFinalRecorrencia] = useState('');
  
  // Estados de filtro
  const [filtroTipo, setFiltroTipo] = useState<'todas' | 'receita' | 'despesa'>('todas');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroPago, setFiltroPago] = useState<'todos' | 'pago' | 'pendente'>('todos');

  const handleSubmit = () => {
    // Aqui seria a lógica para salvar a transação ou assinatura
    if (isRecorrente) {
      console.log({ 
        tipo, 
        descricao, 
        valor, 
        categoria, 
        periodoRecorrencia, 
        diaCobranca,
        dataFinalRecorrencia,
        isRecorrente: true 
      });
    } else {
      console.log({ tipo, descricao, valor, categoria, data, isRecorrente: false });
    }
    
    setDialogOpen(false);
    // Reset form
    setDescricao('');
    setValor('');
    setCategoria('');
    setData('');
    setIsRecorrente(false);
    setPeriodoRecorrencia('mensal');
    setDiaCobranca('');
    setDataFinalRecorrencia('');
  };

  // Função de filtro
  const transacoesFiltradas = transacoesMock.filter((transacao) => {
    // Filtro por tipo
    if (filtroTipo !== 'todas' && transacao.tipo !== filtroTipo) {
      return false;
    }

    // Filtro por busca de texto
    if (buscaTexto && !transacao.descricao.toLowerCase().includes(buscaTexto.toLowerCase())) {
      return false;
    }

    // Filtro por categoria
    if (filtroCategoria !== 'todas' && transacao.categoria !== filtroCategoria) {
      return false;
    }

    // Filtro por status de pagamento
    if (filtroPago === 'pago' && !transacao.paga) {
      return false;
    }
    if (filtroPago === 'pendente' && transacao.paga) {
      return false;
    }

    return true;
  });

  // Agrupar transações por data
  const hoje = transacoesFiltradas.filter(t => {
    const diff = new Date().getTime() - t.data.getTime();
    return diff < 24 * 60 * 60 * 1000 && diff >= 0;
  });

  const ontem = transacoesFiltradas.filter(t => {
    const diff = new Date().getTime() - t.data.getTime();
    return diff >= 24 * 60 * 60 * 1000 && diff < 48 * 60 * 60 * 1000;
  });

  const antigas = transacoesFiltradas.filter(t => {
    const diff = new Date().getTime() - t.data.getTime();
    return diff >= 48 * 60 * 60 * 1000;
  });

  const limparFiltros = () => {
    setFiltroTipo('todas');
    setBuscaTexto('');
    setFiltroCategoria('todas');
    setFiltroPago('todos');
    setFilterDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Lançamentos</h1>

        {/* Filtros */}
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
            <Input
              placeholder="Buscar lançamento..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="bg-[#262633] border-[#262633] pl-10 h-12 rounded-xl"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFilterDialogOpen(true)}
            className="bg-[#262633] hover:bg-[#262633]/80 h-12 w-12 rounded-xl"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs Tipo */}
        <div className="flex space-x-3 mt-4">
          <Button
            onClick={() => setFiltroTipo('todas')}
            variant="ghost"
            className={`flex-1 h-10 rounded-xl ${
              filtroTipo === 'todas'
                ? 'bg-[#ffa506] hover:bg-[#ffa506]/80'
                : 'bg-[#262633] hover:bg-[#262633]/80'
            }`}
          >
            Todas
          </Button>
          <Button
            onClick={() => setFiltroTipo('receita')}
            variant="ghost"
            className={`flex-1 h-10 rounded-xl ${
              filtroTipo === 'receita'
                ? 'bg-[#10b981] hover:bg-[#10b981]/80'
                : 'bg-[#262633] hover:bg-[#10b981]/20 text-[#10b981]'
            }`}
          >
            Receitas
          </Button>
          <Button
            onClick={() => setFiltroTipo('despesa')}
            variant="ghost"
            className={`flex-1 h-10 rounded-xl ${
              filtroTipo === 'despesa'
                ? 'bg-[#ef4444] hover:bg-[#ef4444]/80'
                : 'bg-[#262633] hover:bg-[#ef4444]/20 text-[#ef4444]'
            }`}
          >
            Despesas
          </Button>
        </div>
      </div>

      {/* Lista de Transações */}
      <div className="p-6 space-y-4">
        {transacoesFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#9ca3af]">Nenhum lançamento encontrado</p>
            <Button
              onClick={limparFiltros}
              variant="ghost"
              className="mt-4 text-[#ffa506] hover:text-[#ffa506]/80"
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <>
            {/* Hoje */}
            {hoje.length > 0 && (
              <div>
                <p className="text-sm text-[#9ca3af] mb-3">Hoje</p>
                {hoje.map((transacao) => (
                  <div
                    key={transacao.id}
                    className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-xl p-4 border border-[#262633] mb-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          transacao.tipo === 'receita' ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'
                        }`}
                      >
                        {transacao.tipo === 'receita' ? (
                          <TrendingUp className="w-6 h-6 text-[#10b981]" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-[#ef4444]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{transacao.descricao}</p>
                          {transacao.recorrente && (
                            <Repeat className="w-4 h-4 text-[#ffa506]" />
                          )}
                        </div>
                        <p className="text-sm text-[#9ca3af]">{transacao.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transacao.tipo === 'receita' ? 'text-[#10b981]' : 'text-[#ef4444]'
                        }`}
                      >
                        {transacao.tipo === 'receita' ? '+' : '-'} R$ {transacao.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#9ca3af]">
                        {transacao.paga ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ontem */}
            {ontem.length > 0 && (
              <div>
                <p className="text-sm text-[#9ca3af] mb-3">Ontem</p>
                {ontem.map((transacao) => (
                  <div
                    key={transacao.id}
                    className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-xl p-4 border border-[#262633] mb-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          transacao.tipo === 'receita' ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'
                        }`}
                      >
                        {transacao.tipo === 'receita' ? (
                          <TrendingUp className="w-6 h-6 text-[#10b981]" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-[#ef4444]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{transacao.descricao}</p>
                          {transacao.recorrente && (
                            <Repeat className="w-4 h-4 text-[#ffa506]" />
                          )}
                        </div>
                        <p className="text-sm text-[#9ca3af]">{transacao.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transacao.tipo === 'receita' ? 'text-[#10b981]' : 'text-[#ef4444]'
                        }`}
                      >
                        {transacao.tipo === 'receita' ? '+' : '-'} R$ {transacao.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#9ca3af]">
                        {transacao.paga ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Antigas */}
            {antigas.length > 0 && (
              <div>
                <p className="text-sm text-[#9ca3af] mb-3">Anteriores</p>
                {antigas.map((transacao) => (
                  <div
                    key={transacao.id}
                    className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-xl p-4 border border-[#262633] mb-3 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          transacao.tipo === 'receita' ? 'bg-[#10b981]/20' : 'bg-[#ef4444]/20'
                        }`}
                      >
                        {transacao.tipo === 'receita' ? (
                          <TrendingUp className="w-6 h-6 text-[#10b981]" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-[#ef4444]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold">{transacao.descricao}</p>
                          {transacao.recorrente && (
                            <Repeat className="w-4 h-4 text-[#ffa506]" />
                          )}
                        </div>
                        <p className="text-sm text-[#9ca3af]">{transacao.categoria}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transacao.tipo === 'receita' ? 'text-[#10b981]' : 'text-[#ef4444]'
                        }`}
                      >
                        {transacao.tipo === 'receita' ? '+' : '-'} R$ {transacao.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#9ca3af]">
                        {transacao.paga ? 'Pago' : 'Pendente'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog de Filtros Avançados */}
      <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
        <DialogContent className="bg-[#16161f] border-[#262633] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Filtro por Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="bg-[#262633] border-[#262633] h-12 rounded-xl">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent className="bg-[#16161f] border-[#262633]">
                  <SelectItem 
                    value="todas"
                    className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                  >
                    Todas as categorias
                  </SelectItem>
                  {categoriasMock.map((cat) => (
                    <SelectItem 
                      key={cat} 
                      value={cat}
                      className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status de Pagamento */}
            <div className="space-y-2">
              <Label>Status de Pagamento</Label>
              <Select value={filtroPago} onValueChange={(value) => setFiltroPago(value as 'todos' | 'pago' | 'pendente')}>
                <SelectTrigger className="bg-[#262633] border-[#262633] h-12 rounded-xl">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-[#16161f] border-[#262633]">
                  <SelectItem 
                    value="todos"
                    className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                  >
                    Todos
                  </SelectItem>
                  <SelectItem 
                    value="pago"
                    className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                  >
                    Pago
                  </SelectItem>
                  <SelectItem 
                    value="pendente"
                    className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                  >
                    Pendente
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões */}
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={limparFiltros}
                variant="ghost"
                className="flex-1 bg-[#262633] hover:bg-[#262633]/80 h-12 rounded-xl"
              >
                Limpar
              </Button>
              <Button
                onClick={() => setFilterDialogOpen(false)}
                className="flex-1 bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Botão Flutuante - Novo Lançamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] shadow-2xl"
            size="icon"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#16161f] border-[#262633] text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Tipo */}
            <div className="flex space-x-3">
              <Button
                onClick={() => setTipo('despesa')}
                className={`flex-1 h-12 rounded-xl ${
                  tipo === 'despesa'
                    ? 'bg-[#ef4444] hover:bg-[#ef4444]/80'
                    : 'bg-[#262633] hover:bg-[#262633]/80'
                }`}
              >
                <TrendingDown className="w-5 h-5 mr-2" />
                Despesa
              </Button>
              <Button
                onClick={() => setTipo('receita')}
                className={`flex-1 h-12 rounded-xl ${
                  tipo === 'receita'
                    ? 'bg-[#10b981] hover:bg-[#10b981]/80'
                    : 'bg-[#262633] hover:bg-[#262633]/80'
                }`}
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Receita
              </Button>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Ex: Supermercado"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="bg-[#262633] border-[#262633] h-12 rounded-xl">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-[#16161f] border-[#262633]">
                  {categoriasMock.map((cat) => (
                    <SelectItem 
                      key={cat} 
                      value={cat} 
                      className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                    >
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Checkbox Recorrente */}
            <div className="flex items-center space-x-3 p-4 bg-[#262633] rounded-xl">
              <Checkbox 
                id="recorrente" 
                checked={isRecorrente}
                onCheckedChange={(checked) => setIsRecorrente(checked as boolean)}
                className="border-[#9ca3af]"
              />
              <div className="flex items-center space-x-2">
                <Repeat className="w-5 h-5 text-[#ffa506]" />
                <Label htmlFor="recorrente" className="cursor-pointer">
                  Lançamento recorrente
                </Label>
              </div>
            </div>

            {/* Campos condicionais - Recorrente */}
            {isRecorrente ? (
              <>
                {/* Período de Recorrência */}
                <div className="space-y-2">
                  <Label>Período de Recorrência</Label>
                  <Select value={periodoRecorrencia} onValueChange={(value) => setPeriodoRecorrencia(value as PeriodoRecorrencia)}>
                    <SelectTrigger className="bg-[#262633] border-[#262633] h-12 rounded-xl">
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16161f] border-[#262633]">
                      {periodosRecorrencia.map((periodo) => (
                        <SelectItem 
                          key={periodo.value} 
                          value={periodo.value}
                          className="text-white hover:bg-[#262633] focus:bg-[#262633] focus:text-white"
                        >
                          {periodo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dia da Cobrança */}
                <div className="space-y-2">
                  <Label>Dia da Cobrança</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="Ex: 5"
                    value={diaCobranca}
                    onChange={(e) => setDiaCobranca(e.target.value)}
                    className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                  />
                  <p className="text-xs text-[#9ca3af]">
                    Dia do mês em que a cobrança será realizada
                  </p>
                </div>

                {/* Data Final da Recorrência */}
                <div className="space-y-2">
                  <Label>Data Final da Recorrência (Opcional)</Label>
                  <Input
                    type="date"
                    value={dataFinalRecorrencia}
                    onChange={(e) => setDataFinalRecorrencia(e.target.value)}
                    className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                  />
                  <p className="text-xs text-[#9ca3af]">
                    Deixe em branco para recorrência indefinida
                  </p>
                </div>
              </>
            ) : (
              /* Data - apenas para lançamentos únicos */
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                />
              </div>
            )}

            {/* Botão Salvar */}
            <Button
              onClick={handleSubmit}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl"
            >
              {isRecorrente ? 'Criar Recorrência' : 'Salvar Lançamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
