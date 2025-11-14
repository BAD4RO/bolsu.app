'use client';

import { useState } from 'react';
import { ArrowLeft, Crown, Check, X, Calendar, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function AssinaturaPage() {
  const router = useRouter();
  const [planoAtual] = useState('premium');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const planos = [
    {
      id: 'free',
      nome: 'Gratuito',
      preco: 'R$ 0',
      periodo: '/mês',
      recursos: [
        'Até 50 transações/mês',
        '2 contas bancárias',
        'Relatórios básicos',
        'Suporte por email',
      ],
      limitacoes: [
        'Sem categorias personalizadas',
        'Sem exportação de dados',
        'Sem análises avançadas',
      ],
    },
    {
      id: 'premium',
      nome: 'Premium',
      preco: 'R$ 19,90',
      periodo: '/mês',
      destaque: true,
      recursos: [
        'Transações ilimitadas',
        'Contas bancárias ilimitadas',
        'Relatórios avançados',
        'Categorias personalizadas',
        'Exportação de dados',
        'Análises com IA',
        'Suporte prioritário',
        'Sem anúncios',
      ],
      limitacoes: [],
    },
    {
      id: 'anual',
      nome: 'Premium Anual',
      preco: 'R$ 199,90',
      periodo: '/ano',
      economia: 'Economize R$ 38,90',
      recursos: [
        'Todos os recursos Premium',
        '2 meses grátis',
        'Acesso antecipado a novos recursos',
        'Consultoria financeira mensal',
      ],
      limitacoes: [],
    },
  ];

  const historicoCobrancas = [
    { data: '15/01/2024', valor: 'R$ 19,90', status: 'Pago', metodo: '•••• 4532' },
    { data: '15/12/2023', valor: 'R$ 19,90', status: 'Pago', metodo: '•••• 4532' },
    { data: '15/11/2023', valor: 'R$ 19,90', status: 'Pago', metodo: '•••• 4532' },
    { data: '15/10/2023', valor: 'R$ 19,90', status: 'Pago', metodo: '•••• 4532' },
  ];

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
          <h1 className="text-2xl font-bold">Gerenciar Assinatura</h1>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Plano Atual */}
        <div className="bg-gradient-to-br from-[#ffa506] to-[#ff8800] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Plano Atual</h2>
              <p className="text-white/80 text-sm">Premium Mensal</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Próxima cobrança</span>
              <span className="text-white font-semibold">15/02/2024</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Valor</span>
              <span className="text-white font-semibold">R$ 19,90/mês</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Método de pagamento</span>
              <span className="text-white font-semibold">•••• 4532</span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowPaymentModal(true)}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2 border-[#262633] hover:bg-[#262633] bg-[#1a1a24] text-white"
          >
            <CreditCard className="w-6 h-6 text-[#ffa506]" />
            <span className="text-sm font-medium">Alterar Pagamento</span>
          </Button>
          <Button
            onClick={() => setShowHistoryModal(true)}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2 border-[#262633] hover:bg-[#262633] bg-[#1a1a24] text-white"
          >
            <Calendar className="w-6 h-6 text-[#ffa506]" />
            <span className="text-sm font-medium">Ver Histórico</span>
          </Button>
        </div>

        {/* Planos Disponíveis */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Planos Disponíveis</h3>
          <div className="space-y-4">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className={`rounded-2xl p-6 border ${
                  plano.destaque
                    ? 'bg-gradient-to-br from-[#ffa506]/10 to-[#ff8800]/10 border-[#ffa506]'
                    : 'bg-gradient-to-b from-[#252531] to-[#16161f] border-[#262633]'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-bold">{plano.nome}</h4>
                    {plano.economia && (
                      <span className="inline-block mt-1 px-2 py-1 bg-[#10b981] text-white text-xs rounded-full">
                        {plano.economia}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-[#ffa506]">{plano.preco}</p>
                    <p className="text-sm text-[#9ca3af]">{plano.periodo}</p>
                  </div>
                </div>

                {/* Recursos */}
                <div className="space-y-2 mb-4">
                  {plano.recursos.map((recurso, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Check className="w-5 h-5 text-[#10b981] flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{recurso}</span>
                    </div>
                  ))}
                  {plano.limitacoes.map((limitacao, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <X className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#9ca3af]">{limitacao}</span>
                    </div>
                  ))}
                </div>

                {/* Botão */}
                {plano.id === planoAtual ? (
                  <Button
                    disabled
                    className="w-full bg-[#262633] text-[#9ca3af] cursor-not-allowed"
                  >
                    Plano Atual
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      plano.destaque
                        ? 'bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506]'
                        : 'bg-[#262633] hover:bg-[#262633]/80'
                    }`}
                  >
                    {plano.id === 'free' ? 'Fazer Downgrade' : 'Fazer Upgrade'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Aviso de Cancelamento */}
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-[#ef4444] flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-[#ef4444] mb-1">Cancelar Assinatura</h4>
              <p className="text-sm text-[#9ca3af] mb-3">
                Você pode cancelar sua assinatura a qualquer momento. Você continuará tendo acesso
                aos recursos Premium até o final do período pago.
              </p>
              <Button
                variant="ghost"
                className="text-[#ef4444] hover:bg-[#ef4444]/10 h-9 px-4"
              >
                Cancelar Assinatura
              </Button>
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h4 className="font-semibold mb-3">Informações Importantes</h4>
          <ul className="space-y-2 text-sm text-[#9ca3af]">
            <li>• A cobrança é feita automaticamente no cartão cadastrado</li>
            <li>• Você pode alterar ou cancelar seu plano a qualquer momento</li>
            <li>• Não há multa por cancelamento</li>
            <li>• Upgrades são proporcionais ao período restante</li>
            <li>• Downgrades entram em vigor no próximo ciclo de cobrança</li>
          </ul>
        </div>
      </div>

      {/* Modal Alterar Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a24] rounded-2xl p-6 max-w-md w-full border border-[#262633]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Alterar Método de Pagamento</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPaymentModal(false)}
                className="hover:bg-[#262633] rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-[#9ca3af] mb-2 block">Número do Cartão</label>
                <input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-[#262633] border border-[#3a3a4a] rounded-lg px-4 py-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#ffa506]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#9ca3af] mb-2 block">Validade</label>
                  <input
                    type="text"
                    placeholder="MM/AA"
                    className="w-full bg-[#262633] border border-[#3a3a4a] rounded-lg px-4 py-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#ffa506]"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#9ca3af] mb-2 block">CVV</label>
                  <input
                    type="text"
                    placeholder="000"
                    className="w-full bg-[#262633] border border-[#3a3a4a] rounded-lg px-4 py-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#ffa506]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-[#9ca3af] mb-2 block">Nome no Cartão</label>
                <input
                  type="text"
                  placeholder="Nome como está no cartão"
                  className="w-full bg-[#262633] border border-[#3a3a4a] rounded-lg px-4 py-3 text-white placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#ffa506]"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  variant="outline"
                  className="flex-1 border-[#262633] hover:bg-[#262633]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506]"
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a24] rounded-2xl p-6 max-w-md w-full border border-[#262633] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Histórico de Cobranças</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHistoryModal(false)}
                className="hover:bg-[#262633] rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3">
              {historicoCobrancas.map((cobranca, index) => (
                <div
                  key={index}
                  className="bg-[#262633] rounded-xl p-4 border border-[#3a3a4a]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#9ca3af]">{cobranca.data}</span>
                    <span className="text-sm font-semibold text-[#10b981]">{cobranca.status}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{cobranca.valor}</span>
                    <span className="text-sm text-[#9ca3af]">{cobranca.metodo}</span>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setShowHistoryModal(false)}
              className="w-full mt-6 bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506]"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
