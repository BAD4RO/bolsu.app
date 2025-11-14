'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/custom/bottom-nav';
import { Plus, Target, Edit, Trash2, TrendingUp, Calendar, Star, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Lista de emojis populares para seleção
const emojisDisponiveis = [
  '✈️', '🌍', '🏖️', '🗼', '🎡', '🎢', // Viagens
  '🚗', '🏍️', '🚙', '🚕', '🚌', '🚎', // Veículos
  '💰', '💵', '💳', '💎', '🏦', '📊', // Finanças
  '🏠', '🏡', '🏢', '🏨', '🏰', '🏗️', // Imóveis
  '🎓', '📚', '📖', '✏️', '🖊️', '📝', // Educação
  '💍', '💐', '🎂', '🎉', '🎊', '🎈', // Eventos
  '🎮', '🎬', '🎵', '🎨', '⚽', '🎪', // Lazer
  '💪', '🏋️', '🧘', '🏃', '🚴', '⛹️', // Saúde
];

// Dados mockados - Metas e Objetivos
const metasMock = [
  {
    id: '1',
    titulo: 'Viagem para Europa',
    descricao: 'Conhecer Paris, Londres e Roma',
    valorAlvo: 15000,
    valorAtual: 4500,
    prazo: '2025-12-31',
    icone: '✈️',
    cor: '#3b82f6',
  },
  {
    id: '2',
    titulo: 'Comprar um Carro',
    descricao: 'Carro 0km para a família',
    valorAlvo: 80000,
    valorAtual: 25000,
    prazo: '2026-06-30',
    icone: '🚗',
    cor: '#10b981',
  },
  {
    id: '3',
    titulo: 'Reserva de Emergência',
    descricao: '6 meses de despesas',
    valorAlvo: 30000,
    valorAtual: 18000,
    prazo: '2025-08-31',
    icone: '💰',
    cor: '#f59e0b',
  },
  {
    id: '4',
    titulo: 'Curso de Especialização',
    descricao: 'MBA em Gestão Financeira',
    valorAlvo: 12000,
    valorAtual: 8500,
    prazo: '2025-03-01',
    icone: '🎓',
    cor: '#8b5cf6',
  },
];

export default function MetasPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [prazo, setPrazo] = useState('');
  const [icone, setIcone] = useState('🎯');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSubmit = () => {
    console.log({ titulo, descricao, valorAlvo, prazo, icone });
    setDialogOpen(false);
    setTitulo('');
    setDescricao('');
    setValorAlvo('');
    setPrazo('');
    setIcone('🎯');
    setEditando(null);
  };

  const calcularDiasRestantes = (prazoString: string) => {
    const hoje = new Date();
    const prazoData = new Date(prazoString);
    const diff = prazoData.getTime() - hoje.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Metas e Sonhos</h1>
        <p className="text-[#9ca3af] text-sm">Planeje e alcance seus objetivos financeiros</p>

        {/* Resumo Geral */}
        <div className="bg-[#262633] rounded-2xl p-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#ffa506]/20 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-[#ffa506]" />
              </div>
              <div>
                <p className="text-sm text-[#9ca3af]">Total em Metas</p>
                <p className="text-xl font-bold">R$ 137.000,00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#9ca3af]">Economizado</p>
              <p className="text-xl font-bold text-[#10b981]">R$ 56.000,00</p>
            </div>
          </div>
          <Progress value={41} className="h-2" />
          <p className="text-xs text-[#9ca3af] mt-2">41% do total alcançado</p>
        </div>
      </div>

      {/* Lista de Metas */}
      <div className="p-6 space-y-4">
        {metasMock.map((meta) => {
          const percentual = (meta.valorAtual / meta.valorAlvo) * 100;
          const faltam = meta.valorAlvo - meta.valorAtual;
          const diasRestantes = calcularDiasRestantes(meta.prazo);
          const status = percentual >= 80 ? 'success' : percentual >= 50 ? 'progress' : 'start';

          return (
            <div
              key={meta.id}
              className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-5 border border-[#262633]"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${meta.cor}20` }}
                  >
                    {meta.icone}
                  </div>
                  <div>
                    <h3 className="font-semibold">{meta.titulo}</h3>
                    <p className="text-xs text-[#9ca3af]">{meta.descricao}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#9ca3af] hover:text-white h-8 w-8"
                    onClick={() => {
                      setEditando(meta.id);
                      setTitulo(meta.titulo);
                      setDescricao(meta.descricao);
                      setValorAlvo(meta.valorAlvo.toString());
                      setPrazo(meta.prazo);
                      setIcone(meta.icone);
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

              {/* Valores */}
              <div className="bg-[#262633] rounded-xl p-3 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-xs text-[#9ca3af]">Economizado</p>
                    <p className="text-lg font-bold text-[#10b981]">
                      R$ {meta.valorAtual.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#9ca3af]">Meta</p>
                    <p className="text-lg font-bold">
                      R$ {meta.valorAlvo.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#9ca3af]">
                  Faltam R$ {faltam.toLocaleString('pt-BR')} para alcançar
                </p>
              </div>

              {/* Progresso */}
              <div className="space-y-2">
                <div className="w-full bg-[#262633] rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{
                      width: `${Math.min(percentual, 100)}%`,
                      backgroundColor: meta.cor,
                    }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span style={{ color: meta.cor }}>
                    {percentual.toFixed(0)}% concluído
                  </span>
                  <div className="flex items-center space-x-1 text-[#9ca3af]">
                    <Calendar className="w-3 h-3" />
                    <span className="text-xs">
                      {diasRestantes > 0 ? `${diasRestantes} dias` : 'Prazo vencido'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Badge de Status */}
              {status === 'success' && (
                <div className="mt-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-3 flex items-center space-x-2">
                  <Star className="w-4 h-4 text-[#10b981]" />
                  <p className="text-xs text-[#10b981]">
                    Parabéns! Você está quase lá!
                  </p>
                </div>
              )}
              {status === 'progress' && (
                <div className="mt-3 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-lg p-3 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
                  <p className="text-xs text-[#3b82f6]">
                    Continue assim! Você está no caminho certo.
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {/* Card Adicionar Meta */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border-2 border-dashed border-[#262633] flex flex-col items-center justify-center cursor-pointer hover:border-[#ffa506] transition-colors min-h-[150px]">
              <div className="w-14 h-14 bg-[#262633] rounded-full flex items-center justify-center mb-3">
                <Plus className="w-7 h-7 text-[#ffa506]" />
              </div>
              <p className="font-semibold">Adicionar Meta</p>
              <p className="text-sm text-[#9ca3af] mt-1">Defina um novo objetivo financeiro</p>
            </div>
          </DialogTrigger>

          <DialogContent className="bg-[#16161f] border-[#262633] text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editando ? 'Editar Meta' : 'Nova Meta'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Seletor de Ícone */}
              <div className="space-y-2">
                <Label className="text-white">Ícone da Meta</Label>
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

              {/* Título */}
              <div className="space-y-2">
                <Label className="text-white">Título da Meta</Label>
                <Input
                  placeholder="Ex: Viagem para Europa"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl text-white placeholder:text-gray-500"
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label className="text-white">Descrição (opcional)</Label>
                <Textarea
                  placeholder="Descreva seu objetivo..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="bg-[#262633] border-[#262633] rounded-xl min-h-[80px] text-white placeholder:text-gray-500"
                />
              </div>

              {/* Valor Alvo */}
              <div className="space-y-2">
                <Label className="text-white">Valor Alvo</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={valorAlvo}
                  onChange={(e) => setValorAlvo(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl text-white placeholder:text-gray-500"
                />
              </div>

              {/* Prazo */}
              <div className="space-y-2">
                <Label className="text-white">Prazo</Label>
                <Input
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl text-white"
                />
              </div>

              {/* Botão Salvar */}
              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-white font-semibold"
              >
                {editando ? 'Salvar Alterações' : 'Criar Meta'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
}
