'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Mail, Lock, User, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function CadastroPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, nome);

    if (error) {
      setError(error.message || 'Erro ao criar conta');
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f16] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-[#ffa506] to-[#ff8800] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Criar Conta</h1>
          <p className="text-[#9ca3af]">Comece grátis com 7 dias de trial Premium!</p>
        </div>

        {/* Trial Badge */}
        <div className="bg-gradient-to-r from-[#ffa506]/20 to-[#ff8800]/20 border border-[#ffa506]/30 rounded-xl p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#ffa506]/20 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#ffa506]" />
            </div>
            <div>
              <p className="font-semibold text-sm">Trial Premium Grátis</p>
              <p className="text-xs text-[#9ca3af]">
                Teste todos os recursos por 7 dias
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label className="text-white">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label className="text-white">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label className="text-white">Confirmar Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <Input
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {/* Botão Cadastrar */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Criar Conta Grátis
                </>
              )}
            </Button>
          </form>

          {/* Link Login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#9ca3af]">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-[#ffa506] hover:underline font-semibold">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
