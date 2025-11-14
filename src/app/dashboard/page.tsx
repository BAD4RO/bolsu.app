'use client';

import { useState, useEffect } from 'react';
import { BottomNav } from '@/components/custom/bottom-nav';
import { Eye, EyeOff, TrendingUp, TrendingDown, Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import type { PeriodoRecorrencia } from '@/lib/types';

// Dados mockados
const gastosPorCategoria = [
  { categoria: 'Alimentação', valor: 1200, cor: '#ef4444' },
  { categoria: 'Transporte', valor: 450, cor: '#3b82f6' },
  { categoria: 'Moradia', valor: 1800, cor: '#8b5cf6' },
  { categoria: 'Lazer', valor: 300, cor: '#f59e0b' },
  { categoria: 'Outros', valor: 250, cor: '#6b7280' },
];

const vencimentosProximos = [
  { id: '1', descricao: 'Aluguel', valor: 1800, data: '2025-01-05', tipo: 'conta', pago: false },
  { id: '2', descricao: 'Cartão Nubank', valor: 850, data: '2025-01-10', tipo: 'cartao', pago: false },
  { id: '3', descricao: 'Internet', valor: 120, data: '2025-01-15', tipo: 'conta', pago: false },
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

export default function DashboardPage() {
  const [saldoVisivel, setSaldoVisivel] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [data, setData] = useState('');
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [periodoRecorrencia, setPeriodoRecorrencia] = useState<PeriodoRecorrencia>('mensal');
  const [diaCobranca, setDiaCobranca] = useState('');
  const [dataFinalRecorrencia, setDataFinalRecorrencia] = useState('');
  
  const saldoTotal = 5420.50;
  const receitasMes = 8500.00;
  const despesasMes = 4000.00;

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatarData = (dataString: string) => {
    if (!mounted) return '';
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR');
  };

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

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-[#9ca3af] text-sm">Olá,</p>
            <h1 className="text-2xl font-bold">Usuário</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-[#9ca3af] hover:text-white hover:bg-[#262633] rounded-full"
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Saldo Total */}
        <div className="bg-[#262633] rounded-2xl p-6 border border-[#262633]">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[#9ca3af] text-sm">Saldo Total</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSaldoVisivel(!saldoVisivel)}
              className="text-[#9ca3af] hover:text-white h-8 w-8"
            >
              {saldoVisivel ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>
          <h2 className="text-4xl font-bold text-[#ffa506]">
            {saldoVisivel ? `R$ ${saldoTotal.toFixed(2)}` : 'R$ ••••••'}
          </h2>

          {/* Receitas e Despesas */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-[#16161f] rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-[#10b981]/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#10b981]" />
                </div>
                <p className="text-[#9ca3af] text-xs">Receitas</p>
              </div>
              <p className="text-lg font-semibold text-[#10b981]">
                R$ {receitasMes.toFixed(2)}
              </p>
            </div>

            <div className="bg-[#16161f] rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-8 h-8 bg-[#ef4444]/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-[#ef4444]" />
                </div>
                <p className="text-[#9ca3af] text-xs">Despesas</p>
              </div>
              <p className="text-lg font-semibold text-[#ef4444]">
                R$ {despesasMes.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos por Categoria */}
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Gastos por Categoria</h3>
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={gastosPorCategoria}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="valor"
              >
                {gastosPorCategoria.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.cor} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3 mt-4">
            {gastosPorCategoria.map((item) => (
              <div key={item.categoria} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.cor }}
                  />
                  <span className="text-sm">{item.categoria}</span>
                </div>
                <span className="text-sm font-semibold">R$ {item.valor.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vencimentos Próximos */}
      <div className="px-6 pb-6">
        <h3 className="text-lg font-semibold mb-4">Vencimentos Próximos</h3>
        <div className="space-y-3">
          {vencimentosProximos.map((item) => (
            <div
              key={item.id}
              className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-xl p-4 border border-[#262633] flex items-center justify-between"
            >
              <div className="flex-1">
                <p className="font-semibold">{item.descricao}</p>
                <p className="text-sm text-[#9ca3af]">
                  {formatarData(item.data)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[#ef4444]">
                  R$ {item.valor.toFixed(2)}
                </p>
                <span className="text-xs text-[#9ca3af]">
                  {item.tipo === 'cartao' ? 'Cartão' : 'Conta'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                <TrendingUp className="w-5 h-5 text-[#ffa506]" />
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
