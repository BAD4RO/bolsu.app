'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Verifica se há um token de recuperação na URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (!accessToken) {
      setError('Link de recuperação inválido ou expirado');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redireciona para login após 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f16] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-[#ffa506] to-[#ff8800] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">💰</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">BOLSU</h1>
          </div>

          {/* Success Card */}
          <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-8 border border-[#262633] text-center">
            <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#10b981]" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Senha Redefinida!</h2>
            <p className="text-[#9ca3af] mb-6">
              Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em instantes.
            </p>

            <div className="animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#ffa506]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f16] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-[#ffa506] to-[#ff8800] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">BOLSU</h1>
          <p className="text-[#9ca3af]">Redefinir Senha</p>
        </div>

        {/* Form */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Nova Senha</h2>
            <p className="text-sm text-[#9ca3af]">
              Digite sua nova senha abaixo. Certifique-se de usar uma senha forte e segura.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-2">
              <Label className="text-white">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 pr-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                  minLength={6}
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
              <p className="text-xs text-[#9ca3af]">Mínimo de 6 caracteres</p>
            </div>

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label className="text-white">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-[#262633] border-[#262633] h-12 pl-11 pr-11 rounded-xl text-white placeholder:text-gray-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3">
                <p className="text-sm text-[#ef4444]">{error}</p>
              </div>
            )}

            {/* Botão Redefinir */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Redefinir Senha
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
