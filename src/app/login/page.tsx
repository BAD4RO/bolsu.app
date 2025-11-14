'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha incorretos');
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
          <h1 className="text-3xl font-bold mb-2">BOLSU</h1>
          <p className="text-[#9ca3af]">Bem-vindo de volta!</p>
        </div>

        {/* Form */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 pr-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {/* Link Esqueceu a senha - abaixo do campo, canto esquerdo */}
              <div className="flex justify-start">
                <Link 
                  href="/recuperar-senha" 
                  className="text-xs text-[#ffa506] hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {/* Botão Login */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Link Cadastro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#9ca3af]">
              Não tem uma conta?{' '}
              <Link href="/cadastro" className="text-[#ffa506] hover:underline font-semibold">
                Cadastre-se grátis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
