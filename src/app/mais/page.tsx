'use client';

import { BottomNav } from '@/components/custom/bottom-nav';
import {
  User,
  Wallet,
  Bell,
  Lock,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Shield,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const menuItems = [
  {
    section: 'Conta',
    items: [
      { icon: User, label: 'Meu Perfil', href: '/perfil' },
      { icon: Crown, label: 'Assinatura', href: '/assinatura' },
      { icon: Wallet, label: 'Contas Bancárias', href: '/contas' },
      { icon: Bell, label: 'Notificações', href: '/notificacoes' },
    ],
  },
  {
    section: 'Segurança',
    items: [
      { icon: Lock, label: 'Privacidade e Segurança', href: '/seguranca' },
      { icon: Shield, label: 'Autenticação', href: '/seguranca' },
    ],
  },
  {
    section: 'Suporte',
    items: [
      { icon: HelpCircle, label: 'Central de Ajuda', href: '/ajuda' },
      { icon: FileText, label: 'Termos de Uso', href: '/termos' },
    ],
  },
];

export default function MaisPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f0f16] pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#252531] to-[#16161f] p-6 rounded-b-3xl shadow-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ffa506] to-[#ff8800] rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">João Silva</h1>
            <p className="text-[#9ca3af]">joao@email.com</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#262633] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#ffa506]">12</p>
            <p className="text-xs text-[#9ca3af] mt-1">Transações</p>
          </div>
          <div className="bg-[#262633] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#ffa506]">3</p>
            <p className="text-xs text-[#9ca3af] mt-1">Cartões</p>
          </div>
          <div className="bg-[#262633] rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#ffa506]">8</p>
            <p className="text-xs text-[#9ca3af] mt-1">Categorias</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="p-6 space-y-6">
        {menuItems.map((section) => (
          <div key={section.section}>
            <h3 className="text-sm font-semibold text-[#9ca3af] mb-3 px-2">
              {section.section}
            </h3>
            <div className="bg-gradient-to-b from-[#252531] to-[#16161f] rounded-2xl border border-[#262633] overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center justify-between p-4 hover:bg-[#262633]/50 transition-colors ${
                      index !== section.items.length - 1 ? 'border-b border-[#262633]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#262633] rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#ffa506]" />
                      </div>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#9ca3af]" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Botão Sair */}
        <Button
          onClick={() => {
            window.location.href = '/';
          }}
          variant="ghost"
          className="w-full bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] h-14 rounded-xl"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair da Conta
        </Button>

        {/* Versão */}
        <div className="text-center pt-4">
          <p className="text-sm text-[#9ca3af]">BOLSU v1.0.0</p>
          <p className="text-xs text-[#9ca3af] mt-1">
            Feito com ❤️ para brasileiros
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
