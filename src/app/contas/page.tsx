'use client';

import { ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function ContasPage() {
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
          <h1 className="text-2xl font-bold">Contas Bancárias</h1>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl p-12 border border-[#262633] text-center">
          <div className="w-20 h-20 bg-[#262633] rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-10 h-10 text-[#ffa506]" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Em Breve</h3>
          <p className="text-[#9ca3af] mb-6">
            A integração com contas bancárias estará disponível em breve. Você
            poderá conectar suas contas e sincronizar transações
            automaticamente.
          </p>
          <div className="inline-block bg-[#ffa506]/10 text-[#ffa506] px-4 py-2 rounded-full text-sm font-medium">
            🚀 Novidade em desenvolvimento
          </div>
        </div>
      </div>
    </div>
  );
}
