'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';

export default function SetupAdminPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const createAdmin = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    setMessage('');

    try {
      const response = await fetch('/api/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'gabriellimabadaro@gmail.com',
          password: 'admin.bolsuapp',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setMessage(data.message || 'Usuário admin criado com sucesso!');
      } else {
        setError(data.error || 'Erro ao criar usuário admin');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor');
    } finally {
      setLoading(false);
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
          <p className="text-[#9ca3af]">Configuração de Admin</p>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <div className="space-y-6">
            {/* Info */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white">Criar Usuário Admin</h2>
              <p className="text-sm text-[#9ca3af]">
                Clique no botão abaixo para criar o usuário administrador do BOLSU.
              </p>
            </div>

            {/* Credenciais */}
            <div className="bg-[#262633] rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9ca3af]">Email:</span>
                <span className="text-sm text-white font-mono">gabriellimabadaro@gmail.com</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#9ca3af]">Senha:</span>
                <span className="text-sm text-white font-mono">admin.bolsuapp</span>
              </div>
            </div>

            {/* Mensagens */}
            {success && (
              <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#10b981] font-semibold">Sucesso!</p>
                  <p className="text-sm text-[#10b981]/80 mt-1">{message}</p>
                  <p className="text-xs text-[#10b981]/60 mt-2">
                    Você já pode fazer login na página de entrada.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#ef4444] font-semibold">Erro</p>
                  <p className="text-sm text-[#ef4444]/80 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Botão */}
            <Button
              onClick={createAdmin}
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl text-white font-semibold disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Criando usuário...
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Usuário criado!
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Criar Usuário Admin
                </>
              )}
            </Button>

            {/* Link para Login */}
            {success && (
              <div className="text-center pt-4 border-t border-[#262633]">
                <a
                  href="/login"
                  className="text-sm text-[#ffa506] hover:underline font-semibold"
                >
                  Ir para página de login →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Nota */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#9ca3af]">
            ⚠️ Esta página deve ser acessada apenas uma vez para configuração inicial
          </p>
        </div>
      </div>
    </div>
  );
}
