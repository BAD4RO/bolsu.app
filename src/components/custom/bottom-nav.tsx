'use client';
import { Home,Plus,CreditCard,Target,MoreHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
export const navItems = [
  { href: '/dashboard', icon: Home, label: 'Início' },
  { href: '/lancamentos', icon: Plus, label: 'Lançamentos' },
  { href: '/cartoes', icon: CreditCard, label: 'Cartões' },
  { href: '/metas', icon: Target, label: 'Metas' },
  { href: '/mais', icon: MoreHorizontal, label: 'Mais' },
];
export function NavigationBar({ active, preview = false, onNavigate }: { active: string; preview?: boolean; onNavigate?: (href: string) => void }) {
  return <nav aria-label="Navegação principal" className={preview ? 'glass-nav glass-nav--preview' : 'glass-nav'}>
    {navItems.map(({ href, icon: Icon, label }) => {
      const current = active === href || (href === '/mais' && ['/recorrencias','/notificacoes','/limites','/contas','/perfil','/assinatura','/seguranca','/ajuda'].includes(active));
      const content = <><Icon aria-hidden="true"/><span>{label}</span></>;
      return preview ? <button key={href} type="button" className="glass-nav-item" aria-current={current?'page':undefined} onClick={()=>onNavigate?.(href)}>{content}</button> : <Link key={href} href={href} className="glass-nav-item" aria-current={current?'page':undefined}>{content}</Link>;
    })}
  </nav>;
}
export function BottomNav() {
  return <NavigationBar active={usePathname()}/>;
}
