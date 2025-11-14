'use client';

import { useState } from 'react';
import { BottomNav } from '@/components/custom/bottom-nav';
import { Plus, CreditCard, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Dados mockados
const cartoesMock = [
  {
    id: '1',
    nome: 'Nubank',
    bandeira: 'Mastercard',
    limite: 5000,
    utilizado: 1250,
    diaFechamento: 15,
    diaVencimento: 25,
    cor: '#8b5cf6',
  },
  {
    id: '2',
    nome: 'Inter',
    bandeira: 'Visa',
    limite: 3000,
    utilizado: 800,
    diaFechamento: 10,
    diaVencimento: 20,
    cor: '#f59e0b',
  },
];

export default function CartoesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [bandeira, setBandeira] = useState('');
  const [limite, setLimite] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [diaVencimento, setDiaVencimento] = useState('');

  const handleSubmit = () => {
    console.log({ nome, bandeira, limite, diaFechamento, diaVencimento });
    setDialogOpen(false);
    // Reset form
    setNome('');
    setBandeira('');
    setLimite('');
    setDiaFechamento('');
    setDiaVencimento('');
  };

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-2">Meus Cartões</h1>
        <p className="text-[#9ca3af] text-sm">Gerencie seus cartões de crédito</p>
      </div>

      {/* Lista de Cartões */}
      <div className="p-6 space-y-4">
        {cartoesMock.map((cartao) => {
          const percentualUtilizado = (cartao.utilizado / cartao.limite) * 100;

          return (
            <div
              key={cartao.id}
              className="bg-gradient-to-br from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633] shadow-lg"
            >
              {/* Header do Cartão */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${cartao.cor}20` }}
                  >
                    <CreditCard className="w-6 h-6" style={{ color: cartao.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{cartao.nome}</h3>
                    <p className="text-sm text-[#9ca3af]">{cartao.bandeira}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-[#9ca3af] hover:text-white">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </div>

              {/* Limite e Utilizado */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#9ca3af]">Utilizado</span>
                  <span className="text-sm font-semibold">
                    R$ {cartao.utilizado.toFixed(2)} de R$ {cartao.limite.toFixed(2)}
                  </span>
                </div>

                {/* Barra de Progresso */}
                <div className="w-full bg-[#262633] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${percentualUtilizado}%`,
                      backgroundColor: cartao.cor,
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs text-[#9ca3af]">
                  <span>{percentualUtilizado.toFixed(0)}% utilizado</span>
                  <span>Disponível: R$ {(cartao.limite - cartao.utilizado).toFixed(2)}</span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[#262633]">
                <div>
                  <p className="text-xs text-[#9ca3af] mb-1">Fechamento</p>
                  <p className="font-semibold">Dia {cartao.diaFechamento}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9ca3af] mb-1">Vencimento</p>
                  <p className="font-semibold">Dia {cartao.diaVencimento}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Card Adicionar Cartão */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border-2 border-dashed border-[#262633] flex flex-col items-center justify-center cursor-pointer hover:border-[#ffa506] transition-colors min-h-[200px]">
              <div className="w-16 h-16 bg-[#262633] rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-[#ffa506]" />
              </div>
              <p className="font-semibold">Adicionar Cartão</p>
              <p className="text-sm text-[#9ca3af] mt-1">Cadastre um novo cartão de crédito</p>
            </div>
          </DialogTrigger>

          <DialogContent className="bg-[#16161f] border-[#262633] text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Cartão</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome do Cartão</Label>
                <Input
                  placeholder="Ex: Nubank"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                />
              </div>

              {/* Bandeira */}
              <div className="space-y-2">
                <Label>Bandeira</Label>
                <Select value={bandeira} onValueChange={setBandeira}>
                  <SelectTrigger className="bg-[#262633] border-[#262633] h-12 rounded-xl">
                    <SelectValue placeholder="Selecione a bandeira" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#16161f] border-[#262633]">
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Elo">Elo</SelectItem>
                    <SelectItem value="American Express">American Express</SelectItem>
                    <SelectItem value="Hipercard">Hipercard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Limite */}
              <div className="space-y-2">
                <Label>Limite Total</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={limite}
                  onChange={(e) => setLimite(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                />
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dia Fechamento</Label>
                  <Input
                    type="number"
                    placeholder="15"
                    min="1"
                    max="31"
                    value={diaFechamento}
                    onChange={(e) => setDiaFechamento(e.target.value)}
                    className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia Vencimento</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    min="1"
                    max="31"
                    value={diaVencimento}
                    onChange={(e) => setDiaVencimento(e.target.value)}
                    className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                  />
                </div>
              </div>

              {/* Botão Salvar */}
              <Button
                onClick={handleSubmit}
                className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl"
              >
                Adicionar Cartão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <BottomNav />
    </div>
  );
}
