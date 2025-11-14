'use client';

import { useState } from 'react';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface FAQ {
  id: string;
  pergunta: string;
  resposta: string;
  categoria: string;
}

export default function AjudaPage() {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const faqs: FAQ[] = [
    {
      id: '1',
      categoria: 'Conta',
      pergunta: 'Como criar uma conta no BOLSU?',
      resposta:
        'Para criar uma conta, clique em "Cadastrar" na tela inicial, preencha seus dados (nome, e-mail e senha) e confirme seu e-mail. Pronto! Você já pode começar a usar o BOLSU.',
    },
    {
      id: '2',
      categoria: 'Conta',
      pergunta: 'Esqueci minha senha, o que fazer?',
      resposta:
        'Na tela de login, clique em "Esqueci minha senha". Digite seu e-mail cadastrado e você receberá um link para redefinir sua senha.',
    },
    {
      id: '3',
      categoria: 'Transações',
      pergunta: 'Como adicionar uma nova transação?',
      resposta:
        'Clique no botão "+" flutuante na tela inicial ou na aba "Lançamentos". Escolha entre Receita ou Despesa, preencha os dados (descrição, valor, categoria e data) e clique em "Salvar".',
    },
    {
      id: '4',
      categoria: 'Transações',
      pergunta: 'Posso criar transações recorrentes?',
      resposta:
        'Sim! Ao adicionar uma transação, marque a opção "Lançamento recorrente" e escolha o período (mensal, semanal, etc.) e o dia da cobrança.',
    },
    {
      id: '5',
      categoria: 'Cartões',
      pergunta: 'Como adicionar um cartão de crédito?',
      resposta:
        'Vá na aba "Cartões" e clique em "Adicionar Cartão". Preencha o nome do cartão, limite, data de fechamento e vencimento. Você pode adicionar até 1 cartão no plano Free e ilimitados no Premium.',
    },
    {
      id: '6',
      categoria: 'Metas',
      pergunta: 'Como funcionam as metas?',
      resposta:
        'As metas ajudam você a controlar gastos por categoria. Defina um valor máximo mensal para cada categoria e acompanhe seu progresso. No plano Free você pode criar até 3 metas, no Premium são ilimitadas.',
    },
    {
      id: '7',
      categoria: 'Planos',
      pergunta: 'Qual a diferença entre Free e Premium?',
      resposta:
        'O plano Free permite até 3 metas, 1 cartão e transações limitadas. O Premium oferece metas e cartões ilimitados, relatórios avançados, exportação de dados, scanner de comprovantes e muito mais.',
    },
    {
      id: '8',
      categoria: 'Planos',
      pergunta: 'Como faço upgrade para Premium?',
      resposta:
        'Vá em "Mais..." > "Meu Plano" e clique em "Fazer Upgrade". Escolha o plano mensal ou anual e finalize o pagamento. Você terá acesso imediato a todos os recursos Premium.',
    },
    {
      id: '9',
      categoria: 'Segurança',
      pergunta: 'Meus dados estão seguros?',
      resposta:
        'Sim! Utilizamos criptografia de ponta a ponta e seguimos as melhores práticas de segurança. Seus dados financeiros são armazenados de forma segura e nunca são compartilhados com terceiros.',
    },
    {
      id: '10',
      categoria: 'Segurança',
      pergunta: 'Como ativar autenticação em dois fatores?',
      resposta:
        'Vá em "Mais..." > "Privacidade e Segurança" e ative a opção "Autenticação 2FA". Você receberá um código por SMS ou aplicativo autenticador ao fazer login.',
    },
  ];

  const faqsFiltradas = faqs.filter(
    (faq) =>
      faq.pergunta.toLowerCase().includes(busca.toLowerCase()) ||
      faq.resposta.toLowerCase().includes(busca.toLowerCase()) ||
      faq.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  const categorias = Array.from(new Set(faqs.map((faq) => faq.categoria)));

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
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9ca3af]" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar dúvidas..."
            className="bg-[#262633] border-[#262633] h-12 rounded-xl pl-12"
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Perguntas Frequentes */}
        {categorias.map((categoria) => {
          const faqsCategoria = faqsFiltradas.filter((faq) => faq.categoria === categoria);
          if (faqsCategoria.length === 0) return null;

          return (
            <div key={categoria}>
              <h3 className="text-sm font-semibold text-[#9ca3af] mb-3 px-2">
                {categoria}
              </h3>
              <div className="space-y-3">
                {faqsCategoria.map((faq) => (
                  <div
                    key={faq.id}
                    className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl border border-[#262633] overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandido(expandido === faq.id ? null : faq.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#262633]/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3 flex-1 text-left">
                        <div className="w-10 h-10 bg-[#ffa506]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <HelpCircle className="w-5 h-5 text-[#ffa506]" />
                        </div>
                        <span className="font-medium">{faq.pergunta}</span>
                      </div>
                      {expandido === faq.id ? (
                        <ChevronUp className="w-5 h-5 text-[#9ca3af] flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#9ca3af] flex-shrink-0" />
                      )}
                    </button>
                    {expandido === faq.id && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="pl-[52px] text-sm text-[#9ca3af] leading-relaxed">
                          {faq.resposta}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {faqsFiltradas.length === 0 && (
          <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-12 border border-[#262633] text-center">
            <HelpCircle className="w-16 h-16 text-[#9ca3af] mx-auto mb-4" />
            <p className="text-[#9ca3af]">Nenhuma dúvida encontrada</p>
          </div>
        )}

        {/* Contato */}
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-6 border border-[#262633] text-center">
          <h3 className="text-lg font-semibold mb-2">Ainda tem dúvidas?</h3>
          <p className="text-sm text-[#9ca3af] mb-4">
            Entre em contato com nossa equipe de suporte
          </p>
          <Button className="bg-gradient-to-r from-[#ffa506] to-[#ff8800] hover:from-[#ff8800] hover:to-[#ffa506] h-12 rounded-xl">
            Falar com Suporte
          </Button>
        </div>
      </div>
    </div>
  );
}
