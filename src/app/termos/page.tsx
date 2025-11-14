'use client';

import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TermosPage() {
  const router = useRouter();

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
          <h1 className="text-2xl font-bold">Termos de Uso</h1>
        </div>
        <div className="flex items-center space-x-2 text-sm text-[#9ca3af]">
          <Calendar className="w-4 h-4" />
          <span>Última atualização: Janeiro de 2025</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Introdução */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[#ffa506]/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#ffa506]" />
            </div>
            <h2 className="text-xl font-semibold">Bem-vindo ao BOLSU</h2>
          </div>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Ao utilizar o aplicativo BOLSU, você concorda com os termos e
            condições descritos neste documento. Leia atentamente antes de
            continuar usando nossos serviços.
          </p>
        </div>

        {/* 1. Aceitação dos Termos */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">1. Aceitação dos Termos</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            Ao criar uma conta e utilizar o BOLSU, você declara que leu,
            compreendeu e concorda em cumprir estes Termos de Uso e nossa
            Política de Privacidade.
          </p>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Caso não concorde com qualquer parte destes termos, você não deve
            utilizar o aplicativo.
          </p>
        </div>

        {/* 2. Uso do Serviço */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">2. Uso do Serviço</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            O BOLSU é uma ferramenta de gestão financeira pessoal que permite
            controlar receitas, despesas, cartões de crédito e metas financeiras.
          </p>
          <div className="space-y-2 text-sm text-[#9ca3af]">
            <p>• Você é responsável por manter a confidencialidade de sua conta</p>
            <p>• Você deve fornecer informações verdadeiras e atualizadas</p>
            <p>• Você não deve usar o serviço para fins ilegais ou não autorizados</p>
            <p>• Você deve ter pelo menos 18 anos para usar o BOLSU</p>
          </div>
        </div>

        {/* 3. Propriedade Intelectual */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">
            3. Propriedade Intelectual
          </h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            Todo o conteúdo do BOLSU, incluindo design, código, logotipos,
            textos e funcionalidades, são de propriedade exclusiva da empresa e
            protegidos por leis de direitos autorais.
          </p>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            É proibida a reprodução, distribuição ou modificação de qualquer
            parte do aplicativo sem autorização prévia por escrito.
          </p>
        </div>

        {/* 4. Privacidade e Dados */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">4. Privacidade e Dados</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            Seus dados financeiros são tratados com máxima segurança e
            confidencialidade. Utilizamos criptografia de ponta a ponta para
            proteger suas informações.
          </p>
          <div className="space-y-2 text-sm text-[#9ca3af]">
            <p>• Não compartilhamos seus dados com terceiros sem consentimento</p>
            <p>• Você pode solicitar a exclusão de seus dados a qualquer momento</p>
            <p>• Coletamos apenas dados necessários para o funcionamento do app</p>
            <p>• Consulte nossa Política de Privacidade para mais detalhes</p>
          </div>
        </div>

        {/* 5. Planos e Pagamentos */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">5. Planos e Pagamentos</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            O BOLSU oferece planos Free e Premium. O plano Premium é uma
            assinatura recorrente com cobrança mensal ou anual.
          </p>
          <div className="space-y-2 text-sm text-[#9ca3af]">
            <p>• Você pode cancelar sua assinatura a qualquer momento</p>
            <p>• Não há reembolso proporcional em caso de cancelamento</p>
            <p>• Preços podem ser alterados com aviso prévio de 30 dias</p>
            <p>• Ao expirar o Premium, você volta automaticamente para o plano Free</p>
          </div>
        </div>

        {/* 6. Limitação de Responsabilidade */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">
            6. Limitação de Responsabilidade
          </h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            O BOLSU é fornecido &quot;como está&quot; e não garantimos que o serviço
            será ininterrupto ou livre de erros.
          </p>
          <div className="space-y-2 text-sm text-[#9ca3af]">
            <p>• Não somos responsáveis por decisões financeiras tomadas com base no app</p>
            <p>• Não garantimos a precisão absoluta de cálculos e relatórios</p>
            <p>• Você é responsável por verificar suas informações financeiras</p>
            <p>• Não nos responsabilizamos por perdas decorrentes do uso do app</p>
          </div>
        </div>

        {/* 7. Modificações nos Termos */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">
            7. Modificações nos Termos
          </h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Reservamos o direito de modificar estes Termos de Uso a qualquer
            momento. Alterações significativas serão notificadas por e-mail ou
            dentro do aplicativo. O uso continuado após as alterações constitui
            aceitação dos novos termos.
          </p>
        </div>

        {/* 8. Rescisão */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">8. Rescisão</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            Podemos suspender ou encerrar sua conta a qualquer momento, sem
            aviso prévio, caso você viole estes Termos de Uso.
          </p>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Você pode encerrar sua conta a qualquer momento através das
            configurações do aplicativo ou entrando em contato com nosso suporte.
          </p>
        </div>

        {/* 9. Lei Aplicável */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">9. Lei Aplicável</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            Estes Termos de Uso são regidos pelas leis da República Federativa
            do Brasil. Qualquer disputa será resolvida nos tribunais brasileiros
            competentes.
          </p>
        </div>

        {/* 10. Contato */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633]">
          <h3 className="text-lg font-semibold mb-3">10. Contato</h3>
          <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">
            Se você tiver dúvidas sobre estes Termos de Uso, entre em contato
            conosco:
          </p>
          <div className="space-y-2 text-sm text-[#9ca3af]">
            <p>• E-mail: suporte@bolsu.com.br</p>
            <p>• Central de Ajuda: disponível no aplicativo</p>
          </div>
        </div>

        {/* Botão Aceitar */}
        <Button
          onClick={() => router.back()}
          className="w-full bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl"
        >
          Li e Aceito os Termos
        </Button>
      </div>
    </div>
  );
}
