'use client';

import { useState } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, Shield, Key, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';

export default function SegurancaPage() {
  const router = useRouter();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  const [autenticacao2FA, setAutenticacao2FA] = useState(false);
  const [biometria, setBiometria] = useState(true);

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
          <h1 className="text-2xl font-bold">Privacidade e Segurança</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Gerenciamento de Senha */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[#ffa506]/20 rounded-xl flex items-center justify-center">
              <Key className="w-5 h-5 text-[#ffa506]" />
            </div>
            <h3 className="text-lg font-semibold">Alterar Senha</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Senha Atual</Label>
              <div className="relative">
                <Input
                  type={mostrarSenhas ? 'text' : 'password'}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                  className="bg-[#262633] border-[#262633] h-12 rounded-xl pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMostrarSenhas(!mostrarSenhas)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white"
                >
                  {mostrarSenhas ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type={mostrarSenhas ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite sua nova senha"
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label>Confirmar Nova Senha</Label>
              <Input
                type={mostrarSenhas ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme sua nova senha"
                className="bg-[#262633] border-[#262633] h-12 rounded-xl"
              />
            </div>

            <Button className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl">
              Alterar Senha
            </Button>
          </div>
        </div>

        {/* Autenticação em Dois Fatores */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[#10b981]/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#10b981]" />
            </div>
            <h3 className="text-lg font-semibold">Autenticação em Dois Fatores (2FA)</h3>
          </div>

          <p className="text-sm text-[#9ca3af] mb-4">
            Adicione uma camada extra de segurança à sua conta. Você precisará
            inserir um código de verificação além da senha ao fazer login.
          </p>

          <div className="flex items-center justify-between p-4 bg-[#262633] rounded-xl">
            <div className="flex items-center space-x-3">
              <Smartphone className="w-5 h-5 text-[#ffa506]" />
              <div>
                <p className="font-medium">Autenticação 2FA</p>
                <p className="text-xs text-[#9ca3af]">
                  {autenticacao2FA ? 'Ativada' : 'Desativada'}
                </p>
              </div>
            </div>
            <Switch
              checked={autenticacao2FA}
              onCheckedChange={setAutenticacao2FA}
            />
          </div>

          {autenticacao2FA && (
            <div className="mt-4 p-4 bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl">
              <p className="text-sm text-[#10b981] mb-2">✓ 2FA Ativada</p>
              <p className="text-xs text-[#9ca3af]">
                Você receberá um código por SMS ou aplicativo autenticador ao
                fazer login.
              </p>
            </div>
          )}
        </div>

        {/* Biometria */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[#8b5cf6]/20 rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <h3 className="text-lg font-semibold">Biometria</h3>
          </div>

          <p className="text-sm text-[#9ca3af] mb-4">
            Use sua impressão digital ou reconhecimento facial para acessar o
            aplicativo de forma rápida e segura.
          </p>

          <div className="flex items-center justify-between p-4 bg-[#262633] rounded-xl">
            <div>
              <p className="font-medium">Desbloqueio Biométrico</p>
              <p className="text-xs text-[#9ca3af]">
                {biometria ? 'Ativado' : 'Desativado'}
              </p>
            </div>
            <Switch checked={biometria} onCheckedChange={setBiometria} />
          </div>
        </div>

        {/* Privacidade */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-4">Privacidade de Dados</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-[#262633] rounded-xl">
              <div>
                <p className="font-medium">Compartilhar Dados de Uso</p>
                <p className="text-xs text-[#9ca3af]">
                  Ajude-nos a melhorar o app
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between p-4 bg-[#262633] rounded-xl">
              <div>
                <p className="font-medium">Notificações de Marketing</p>
                <p className="text-xs text-[#9ca3af]">
                  Receba ofertas e novidades
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
