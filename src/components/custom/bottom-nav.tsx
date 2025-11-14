'use client';

import { Home, Plus, CreditCard, Target, MoreHorizontal, DollarSign } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Home' },
  { href: '/lancamentos', icon: Plus, label: 'Lançamentos' },
  { href: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { href: '/limites', icon: DollarSign, label: 'Limites' },
  { href: '/metas', icon: Target, label: 'Metas' },
  { href: '/mais', icon: MoreHorizontal, label: 'Mais' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#16161f] border-t border-[#262633] z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-[#ffa506]' : 'text-[#e5e7eb] hover:text-white'
              }`}
            >
              <Icon className="w-6 h-6 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
