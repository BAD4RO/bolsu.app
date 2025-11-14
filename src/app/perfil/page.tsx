'use client';

import { useState } from 'react';
import { ArrowLeft, User, Camera, Mail, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export default function PerfilPage() {
  const router = useRouter();
  const [nome, setNome] = useState('João Silva');
  const [email, setEmail] = useState('joao@email.com');
  const [telefone, setTelefone] = useState('(11) 98765-4321');
  const [dataNascimento, setDataNascimento] = useState('15/03/1990');
  const [cpf, setCpf] = useState('123.456.789-00');

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center space-x-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-[#262633] rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Foto de Perfil e Nome em Destaque */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-8 border border-[#262633] text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-[#ffa506] to-[#ff8800] rounded-full flex items-center justify-center shadow-2xl">
                <User className="w-16 h-16 text-white" />
              </div>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-[#ffa506] hover:bg-[#ff8800] shadow-lg"
              >
                <Camera className="w-5 h-5" />
              </Button>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-1">{nome}</h2>
              <p className="text-[#9ca3af] text-sm">Membro desde Janeiro 2024</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#262633] hover:bg-[#262633] mt-2"
            >
              Alterar Foto
            </Button>
          </div>
        </div>

        {/* Informações Pessoais */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center text-[#9ca3af]">
                <User className="w-4 h-4 mr-2" />
                Nome Completo
              </Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center text-[#9ca3af]">
                <Mail className="w-4 h-4 mr-2" />
                E-mail
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center text-[#9ca3af]">
                <Phone className="w-4 h-4 mr-2" />
                Telefone
              </Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center text-[#9ca3af]">
                <Calendar className="w-4 h-4 mr-2" />
                Data de Nascimento
              </Label>
              <Input
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center text-[#9ca3af]">
                <User className="w-4 h-4 mr-2" />
                CPF
              </Label>
              <Input
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
                disabled
              />
              <p className="text-xs text-[#9ca3af]">
                O CPF não pode ser alterado
              </p>
            </div>
          </div>
        </div>

        {/* Estatísticas do Perfil */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#262633] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#ffa506]">156</p>
              <p className="text-sm text-[#9ca3af] mt-1">Transações</p>
            </div>
            <div className="bg-[#262633] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#10b981]">R$ 12.450</p>
              <p className="text-sm text-[#9ca3af] mt-1">Economizado</p>
            </div>
            <div className="bg-[#262633] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#3b82f6]">5</p>
              <p className="text-sm text-[#9ca3af] mt-1">Contas</p>
            </div>
            <div className="bg-[#262633] rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-[#ec4899]">12</p>
              <p className="text-sm text-[#9ca3af] mt-1">Categorias</p>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <Button className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-base font-semibold">
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
