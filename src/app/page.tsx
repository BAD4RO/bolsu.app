'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Shield, TrendingUp, Bell, Lock, Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerUser, loginUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<'onboarding' | 'login' | 'register' | 'verify-email'>('onboarding');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Contagem regressiva para reenvio de email
  useEffect(() => {
    if (step === 'verify-email' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, step]);

  // Função para registrar usuário
  const handleRegister = async () => {
    setError('');
    setLoading(true);

    const result = await registerUser({ nome, email, password });

    setLoading(false);

    if (result.success) {
      // Redirecionar para tela de verificação de email
      setStep('verify-email');
      setCountdown(60);
      setCanResend(false);
    } else {
      setError(result.error?.message || 'Erro ao criar conta');
    }
  };

  // Função para fazer login
  const handleLogin = async () => {
    setError('');
    setLoading(true);

    const result = await loginUser({ email, password });

    setLoading(false);

    if (result.success) {
      // Redirecionar para dashboard após login bem-sucedido
      router.push('/dashboard');
    } else {
      setError(result.error?.message || 'Erro ao fazer login');
    }
  };

  // Função para reenviar email de verificação
  const handleResendEmail = async () => {
    setLoading(true);
    setError('');
    
    // Reenviar email através do Supabase
    const result = await registerUser({ nome, email, password });
    
    setLoading(false);
    
    if (result.success) {
      setCountdown(60);
      setCanResend(false);
    } else {
      setError('Erro ao reenviar email. Tente novamente.');
    }
  };

  // Onboarding
  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#252531] to-[#16161f] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8 text-center">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-4">
            <img 
              src="https://i.imgur.com/KQvEZMv.png" 
              alt="BOLSU Logo" 
              className="w-24 h-24 rounded-3xl shadow-2xl object-contain p-2 bg-[#2a2a3a]"
            />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#ffa506] to-[#ff8800] bg-clip-text text-transparent">
              BOLSU
            </h1>
          </div>

          {/* Features */}
          <div className="space-y-6 pt-8">
            <div className="flex items-start space-x-4 text-left">
              <div className="w-12 h-12 bg-[#262633] rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-[#ffa506]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Controle Total</h3>
                <p className="text-[#9ca3af] text-sm">
                  Visualize seus gastos e receitas de forma simples
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 text-left">
              <div className="w-12 h-12 bg-[#262633] rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-[#ffa506]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Alertas Inteligentes</h3>
                <p className="text-[#9ca3af] text-sm">
                  Nunca mais esqueça de pagar suas contas
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 text-left">
              <div className="w-12 h-12 bg-[#262633] rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-[#ffa506]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Seguro e Privado</h3>
                <p className="text-[#9ca3af] text-sm">
                  Seus dados protegidos com criptografia
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="space-y-3 pt-8">
            <Button
              onClick={() => setStep('register')}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] text-white font-semibold h-12 rounded-xl shadow-lg"
            >
              Começar Agora
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              onClick={() => setStep('login')}
              variant="ghost"
              className="w-full text-[#9ca3af] hover:text-white hover:bg-[#262633] h-12 rounded-xl"
            >
              Já tenho conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Login
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#252531] to-[#16161f] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-4">
            <img 
              src="https://i.imgur.com/KQvEZMv.png" 
              alt="BOLSU Logo" 
              className="w-20 h-20 rounded-3xl shadow-2xl object-contain p-2 bg-[#2a2a3a]"
            />
            <h1 className="text-3xl font-bold">Bem-vindo de volta!</h1>
            <p className="text-[#9ca3af]">Entre para continuar</p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#262633] border-[#262633] focus:border-[#ffa506] h-12 rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-[#262633] border-[#262633] focus:border-[#ffa506] h-12 rounded-xl pr-10"
                  disabled={loading}
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

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] text-white font-semibold h-12 rounded-xl shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <Button
              onClick={() => {
                setStep('register');
                setError('');
              }}
              variant="ghost"
              className="w-full text-[#9ca3af] hover:text-white hover:bg-[#262633] h-12 rounded-xl"
              disabled={loading}
            >
              Criar nova conta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Verify Email
  if (step === 'verify-email') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#252531] to-[#16161f] flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full space-y-8">
          {/* Logo */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-[#262633] rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-[#ffa506]" />
            </div>
            <h1 className="text-3xl font-bold text-center">Verifique seu e-mail</h1>
            <p className="text-[#9ca3af] text-center">
              Enviamos um link de confirmação para
            </p>
            <p className="text-white font-semibold text-center">{email}</p>
          </div>

          {/* Instructions */}
          <div className="bg-[#262633] rounded-xl p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-[#9ca3af]">
                📧 Clique no link enviado para ativar sua conta
              </p>
              <p className="text-sm text-[#9ca3af]">
                ⏱️ O link expira em 24 horas
              </p>
              <p className="text-sm text-[#9ca3af]">
                📁 Verifique também sua caixa de spam
              </p>
            </div>
          </div>

          {/* Resend Button */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleResendEmail}
              disabled={!canResend || loading}
              className="w-full bg-[#262633] hover:bg-[#2f2f3f] text-white font-semibold h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : canResend ? (
                'Reenviar e-mail'
              ) : (
                `Reenviar em ${countdown}s`
              )}
            </Button>

            <Button
              onClick={() => {
                setStep('login');
                setError('');
              }}
              variant="ghost"
              className="w-full text-[#9ca3af] hover:text-white hover:bg-[#262633] h-12 rounded-xl"
            >
              Voltar para login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Register
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#252531] to-[#16161f] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <img 
            src="https://i.imgur.com/KQvEZMv.png" 
            alt="BOLSU Logo" 
            className="w-20 h-20 rounded-3xl shadow-2xl object-contain p-2 bg-[#2a2a3a]"
          />
          <h1 className="text-3xl font-bold">Criar Conta</h1>
          <p className="text-[#9ca3af]">Comece a organizar suas finanças</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-[#262633] border-[#262633] focus:border-[#ffa506] h-12 rounded-xl"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-register">E-mail</Label>
            <Input
              id="email-register"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#262633] border-[#262633] focus:border-[#ffa506] h-12 rounded-xl"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password-register">Senha</Label>
            <div className="relative">
              <Input
                id="password-register"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#262633] border-[#262633] focus:border-[#ffa506] h-12 rounded-xl pr-10"
                disabled={loading}
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

          <Button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] text-white font-semibold h-12 rounded-xl shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>

          <Button
            onClick={() => {
              setStep('login');
              setError('');
            }}
            variant="ghost"
            className="w-full text-[#9ca3af] hover:text-white hover:bg-[#262633] h-12 rounded-xl"
            disabled={loading}
          >
            Já tenho conta
          </Button>
        </div>
      </div>
    </div>
  );
}
