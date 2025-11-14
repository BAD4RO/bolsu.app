'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/custom/bottom-nav';
import { Plus, DollarSign, Edit, Trash2, TrendingUp, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Lista de emojis populares para seleção
const emojisDisponiveis = [
  '🍔', '🍕', '🍜', '🍱', '🍰', '☕', // Alimentação
  '🚗', '🚕', '🚌', '🚲', '✈️', '🚂', // Transporte
  '🎮', '🎬', '🎵', '🎨', '⚽', '🎪', // Lazer
  '🏠', '🏢', '🏨', '🛋️', '🔑', '🚪', // Moradia
  '💰', '💵', '💳', '💎', '🏦', '📊', // Finanças
  '👕', '👗', '👠', '👔', '🧥', '👜', // Vestuário
  '💊', '🏥', '💉', '🩺', '🧘', '💪', // Saúde
  '📚', '📖', '✏️', '🎓', '🖊️', '📝', // Educação
];

// Dados mockados - Categorias com limites
const categoriasMock = [
  {
    id: '1',
    nome: 'Alimentação',
    cor: '#ef4444',
    limiteMensal: 1500,
    gastoAtual: 1200,
    icone: '🍔',
  },
  {
    id: '2',
    nome: 'Transporte',
    cor: '#3b82f6',
    limiteMensal: 500,
    gastoAtual: 450,
    icone: '🚗',
  },
  {
    id: '3',
    nome: 'Lazer',
    cor: '#f59e0b',
    limiteMensal: 400,
    gastoAtual: 300,
    icone: '🎮',
  },
  {
    id: '4',
    nome: 'Moradia',
    cor: '#8b5cf6',
    limiteMensal: 2000,
    gastoAtual: 1800,
    icone: '🏠',
  },
];

export default function LimitesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [icone, setIcone] = useState('💵');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSubmit = () => {
    console.log({ nome, limite, icone });
    setDialogOpen(false);
    setNome('');
    setLimite('');
    setIcone('💵');
    setEditando(null);
  };

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Limites de Gastos</h1>
        <p className="text-[#9ca3af] text-sm">Controle seus gastos por categoria</p>

        {/* Resumo Geral */}
        <div className="bg-[#262633] rounded-2xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#ffa506]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#ffa506]" />
              </div>
              <div>
                <p className="text-sm text-[#9ca3af]">Total Orçado</p>
                <p className="text-xl font-bold">R$ 4.400,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#9ca3af]">Gasto</p>
              <p className="text-xl font-bold text-[#ef4444]">R$ 3.750,00</p>
            </div>
          </div>
          <Progress value={85} className="h-2" />
          <p className="text-xs text-[#9ca3af] mt-2">85% do orçamento utilizado</p>
        </div>
      </div>

      {/* Lista de Categorias */}
      <div className="p-6 space-y-4">
        {categoriasMock.map((categoria) => {
          const percentual = (categoria.gastoAtual / categoria.limiteMensal) * 100;
          const disponivel = categoria.limiteMensal - categoria.gastoAtual;
          const status =
            percentual >= 90 ? 'danger' : percentual >= 70 ? 'warning' : 'success';

          return (
            <div
              key={categoria.id}
              className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-5 border border-[#262633]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${categoria.cor}20` }}
                  >
                    {categoria.icone}
                  </div>
                  <div>
                    <h3 className="font-semibold">{categoria.nome}</h3>
                    <p className="text-sm text-[#9ca3af]">
                      R$ {categoria.gastoAtual.toFixed(2)} de R${' '}
                      {categoria.limiteMensal.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#9ca3af] hover:text-white h-8 w-8"
                    onClick={() => {
                      setEditando(categoria.id);
                      setNome(categoria.nome);
                      setLimite(categoria.limiteMensal.toString());
                      setIcone(categoria.icone);
                      setDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#9ca3af] hover:text-[#ef4444] h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progresso */}
              <div className="space-y-2">
                <div className="w-full bg-[#262633] rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(percentual, 100)}%`,
                      backgroundColor:
                        status === 'danger'
                          ? '#ef4444'
                          : status === 'warning'
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span
                    className={
                      status === 'danger'
                        ? 'text-[#ef4444]'
                        : status === 'warning'
                        ? 'text-[#f59e0b]'
                        : 'text-[#10b981]'
                    }
                  >
                    {percentual.toFixed(0)}% utilizado
                  </span>
                  <span className="text-[#9ca3af]">
                    Disponível: R$ {disponivel.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Alerta */}
              {status === 'danger' && (
                <div className="mt-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3">
                  <p className="text-xs text-[#ef4444]">
                    ⚠️ Atenção! Você está próximo do limite desta categoria.
                  </p>
                </div>
              )}
              {status === 'warning' && (
                <div className="mt-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-lg p-3">
                  <p className="text-xs text-[#f59e0b]">
                    💡 Cuidado! Você já utilizou mais de 70% do orçamento.
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Card Adicionar Categoria */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border-2 border-dashed border-[#262633] flex flex-col items-center justify-center cursor-pointer hover:border-[#ffa506] transition-colors min-h-[150px]">
              <div className="w-14 h-14 bg-[#262633] rounded-full flex items-center justify-center mb-3">
                <Plus className="w-7 h-7 text-[#ffa506]" />
              </div>
              <p className="font-semibold">Adicionar Categoria</p>
              <p className="text-sm text-[#9ca3af] mt-1">Defina um novo limite mensal</p>
            </div>
          </DialogTrigger>

          <DialogContent className="bg-[#16161f] border-[#262633] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editando ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Seletor de Ícone */}
              <div className="space-y-2">
                <Label className="text-white">Ícone da Categoria</Label>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full h-16 bg-[#262633] border-[#262633] hover:bg-[#2d2d3d] hover:border-[#ffa506] rounded-xl flex items-center justify-center text-4xl"
                    >
                      {icone}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 bg-[#0f0f16] border-[#262633] p-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 mb-3">
                        <Smile className="w-4 h-4 text-[#ffa506]" />
                        <p className="text-sm font-semibold text-white">Escolha um ícone</p>
                      </div>
                      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                        {emojisDisponiveis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setIcone(emoji);
                              setPopoverOpen(false);
                            }}
                            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-[#262633] rounded-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label className="text-white">Nome da Categoria</Label>
                <Input
                  placeholder="Ex: Alimentação"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl text-white placeholder:text-gray-500"
                />
              </div>

              {/* Limite Mensal */}
              <div className="space-y-2">
                <Label className="text-white">Limite Mensal</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl text-white placeholder:text-gray-500"
                />
              </div>

              {/* Botão Salvar */}
              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-white font-semibold"
              >
                {editando ? 'Salvar Alterações' : 'Criar Categoria'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
}
