'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) setError('Link inválido ou expirado. Solicite uma nova recuperação de senha.');
      else setSessionReady(true);
    }).catch(() => { if (active) setError('Não foi possível validar o acesso. Tente novamente.'); });
    return () => { active = false; };
  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!sessionReady) { setError('Solicite um novo link de recuperação.'); return; }
    // Validações
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      await supabase.auth.signOut();
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
      <div className="app-shell min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-[#ffca08] to-[#ffb817] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">💰</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">BOLSU</h1>
          </div>

          {/* Success Card */}
          <div className="glass-panel rounded-2xl p-8 border border-white/10 text-center">
            <div className="w-16 h-16 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#10b981]" />
            </div>
            
            <h2 className="text-2xl font-bold mb-3">Senha Redefinida!</h2>
            <p className="text-[#9ca3af] mb-6">
              Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em instantes.
            </p>

            <div className="animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#ffca08]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-[#ffca08] to-[#ffb817] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">BOLSU</h1>
          <p className="text-[#9ca3af]">Redefinir Senha</p>
        </div>

        {/* Form */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
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
                  className="bg-glass-inset border-white/10 h-12 pl-11 pr-11 rounded-xl text-white placeholder:text-gray-500"
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
                  className="bg-glass-inset border-white/10 h-12 pl-11 pr-11 rounded-xl text-white placeholder:text-gray-500"
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
              disabled={loading || !sessionReady}
              className="w-full bg-gradient-to-r from-[#ffca08] to-[#ffb817] hover:from-[#ffb817] hover:to-[#ffca08] h-12 rounded-xl text-white font-semibold"
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
