'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar email de recuperação');
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
            
            <h2 className="text-2xl font-bold mb-3">Email Enviado!</h2>
            <p className="text-[#9ca3af] mb-6">
              Enviamos um link de recuperação para <span className="text-white font-semibold">{email}</span>. 
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>

            <div className="bg-glass-inset rounded-xl p-4 mb-6">
              <p className="text-sm text-[#9ca3af]">
                <strong className="text-white">Dica:</strong> Se não encontrar o email, verifique sua pasta de spam ou lixo eletrônico.
              </p>
            </div>

            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-[#ffca08] to-[#ffb817] hover:from-[#ffb817] hover:to-[#ffca08] h-12 rounded-xl text-white font-semibold">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar para Login
              </Button>
            </Link>
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
          <p className="text-[#9ca3af]">Recuperação de Senha</p>
        </div>

        {/* Form */}
        <div className="glass-panel rounded-2xl p-6 border border-white/10">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-2">Esqueceu sua senha?</h2>
            <p className="text-sm text-[#9ca3af]">
              Não se preocupe! Digite seu email abaixo e enviaremos um link para você redefinir sua senha.
            </p>
          </div>

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
                  className="bg-glass-inset border-white/10 h-12 pl-11 rounded-xl text-white placeholder:text-gray-500"
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

            {/* Botão Enviar */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ffca08] to-[#ffb817] hover:from-[#ffb817] hover:to-[#ffca08] h-12 rounded-xl text-white font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Enviar Link de Recuperação
                </>
              )}
            </Button>
          </form>

          {/* Link Voltar */}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[#9ca3af] hover:text-white inline-flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar para Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
