import { ArrowDownToLine,ArrowUpRight,Bell,CalendarDays,ChevronRight,CreditCard,Eye,EyeOff,FileText,Fuel,Gamepad2,House,Laptop,Plane,Plus,ShoppingCart,TrendingDown,TrendingUp,Utensils,Wallet,Wifi } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatMoney } from '@/components/data/resource-state';
import { cn } from '@/lib/utils';

export function ScreenHeader({ title, children, greeting }: { title: string; children?: React.ReactNode; greeting?: boolean }) {
  return <header className="screen-header"><div>{greeting && <p className="screen-eyebrow">Olá,</p>}<h1>{title}</h1></div><div className="screen-header__actions">{children}</div></header>;
}
export function RoundButton({ label, children, onClick, className }: { label: string; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return <button type="button" aria-label={label} onClick={onClick} className={cn('round-button',className)}>{children}</button>;
}
export function UserAvatar({ name }: { name: string }) {
  return <span className="user-avatar" aria-hidden="true">{name.trim().slice(0,1).toUpperCase() || 'U'}</span>;
}
export function BalanceCard({ balance, income, expenses, visible, onToggle }: { balance: number; income?: number; expenses?: number; visible: boolean; onToggle: () => void }) {
  const show = (value: number) => visible ? formatMoney(value) : 'R$ ••••••';
  return <section className="balance-card"><div className="balance-card__label"><h2>Saldo Total</h2><RoundButton label={visible?'Ocultar valores':'Mostrar valores'} onClick={onToggle}>{visible?<Eye/>:<EyeOff/>}</RoundButton></div><p className="balance-card__value">{show(balance)}</p>
    {income !== undefined && expenses !== undefined && <div className="balance-split"><div><span><i className="icon-tile icon-tile--green"><TrendingUp/></i>Receitas</span><strong className="money-positive">{show(income)}</strong></div><div><span><i className="icon-tile icon-tile--red"><TrendingDown/></i>Despesas</span><strong className="money-negative">{show(expenses)}</strong></div></div>}
  </section>;
}
export type CategoryAmount = { name: string; amount: number; color: string };
export function CategoryBreakdown({ categories, visible = true, action }: { categories: CategoryAmount[]; visible?: boolean; action?: React.ReactNode }) {
  const total = categories.reduce((sum,item)=>sum+item.amount,0);
  let offset=0;
  return <section className="glass-panel category-panel"><div className="panel-heading"><h2>Gastos por Categoria</h2>{action}</div><div className="donut-chart">
    <svg viewBox="0 0 200 200" role="img" aria-label={visible?`Distribuição de gastos: ${formatMoney(total)}`:'Valores ocultos'}><circle cx="100" cy="100" r="75" fill="none" stroke="#25272d" strokeWidth="22"/>{categories.map(item=>{const length=total?item.amount/total*100:0;const start=offset;offset+=length;return <circle key={item.name} cx="100" cy="100" r="75" fill="none" stroke={item.color} strokeWidth="22" pathLength="100" strokeDasharray={`${Math.max(0,length-1.8)} ${100-Math.max(0,length-1.8)}`} strokeDashoffset={-start} strokeLinecap="round" transform="rotate(-105 100 100)"/>;})}</svg>
    <div className="donut-label"><span>Total de gastos</span><strong>{visible?formatMoney(total):'••••••'}</strong></div></div>
    <ul className="category-legend">{categories.map(item=><li key={item.name}><span><i style={{background:item.color}}/>{item.name}</span><strong>{visible?formatMoney(item.amount):'••••••'}</strong></li>)}</ul>
  </section>;
}
const transactionIcons: Record<string,LucideIcon> = { house:House,card:CreditCard,wifi:Wifi,income:ArrowDownToLine,shopping:ShoppingCart,fuel:Fuel,food:Utensils,travel:Plane };
export type TransactionItem = { id: string; name: string; date: string; amount: number; income: boolean; icon?: string; category?: string; paid?: boolean };
export function TransactionRows({ items, onSelect }: { items: TransactionItem[]; onSelect?: (item: TransactionItem) => void }) {
  return <div className="glass-panel transaction-list">{items.length === 0 ? <p className="list-empty">Nenhum lançamento encontrado.</p> : items.map(item=>{
    const Icon=transactionIcons[item.icon || ''] || (item.income?ArrowDownToLine:Wallet);
    const tone=item.income?'green':item.icon==='house'||item.icon==='shopping'||item.icon==='food'?'gold':item.icon==='fuel'?'red':'neutral';
    return <button type="button" className="transaction-row" key={item.id} onClick={()=>onSelect?.(item)}><span className={`icon-tile icon-tile--${tone}`}><Icon/></span><span className="transaction-row__description"><strong>{item.name}</strong><small>{item.date}</small></span><span className={item.income?'money-positive':'money-negative'}>{item.income?'+':'−'} {formatMoney(item.amount)}</span><ChevronRight className="row-chevron"/></button>;
  })}</div>;
}
export function FilterPills({ values, selected, onChange }: { values: {value:string;label:string}[]; selected:string; onChange:(value:string)=>void }) {
  return <div className="filter-pills" role="group" aria-label="Filtrar resultados">{values.map(item=><button key={item.value} type="button" aria-pressed={selected===item.value} onClick={()=>onChange(item.value)}>{item.label}</button>)}</div>;
}
export function FloatingAdd({ onClick, label = 'Novo lançamento', preview = false }: { onClick:()=>void; label?:string; preview?:boolean }) {
  return <button className={cn('floating-add',preview&&'floating-add--preview')} type="button" aria-label={label} onClick={onClick}><Plus/></button>;
}
export type BankCardData = { id:string; name:string; network:string; limit:number; used:number; closing:number; due:number; color:string; lastDigits?:string };
export function BankCard({ card }: { card:BankCardData }) {
  return <div className="bank-card" style={{'--bank-color':card.color} as React.CSSProperties}><div className="bank-card__brand">{card.name==='Nubank'?<span className="nu-wordmark">nu</span>:<span>{card.name}</span>}<Wifi className="bank-card__contactless"/></div><div className="bank-card__footer"><div><p className="bank-card__number">•••• {card.lastDigits || '••••'}</p><span>{card.name}</span></div>{card.network==='Mastercard'?<span className="card-network" aria-label="Mastercard"><i/><i/></span>:<span className="text-lg font-bold italic">{card.network}</span>}</div></div>;
}
export function CardSummary({ card }: { card:BankCardData }) {
  const percent=Math.min(100,card.used/card.limit*100)||0;
  return <section className="glass-panel card-summary"><div className="panel-heading"><h2>Resumo do Cartão</h2><CreditCard className="size-4 text-muted-foreground"/></div><div className="card-summary__balance"><span>Fatura atual</span><strong>{formatMoney(card.used)}</strong><div className="gold-progress" role="progressbar" aria-label="Limite utilizado" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${percent}%`}}/></div><div className="card-summary__limits"><div><span>Limite total</span><p>{formatMoney(card.limit)}</p></div><div><span>Limite disponível</span><p>{formatMoney(card.limit-card.used)}</p></div></div></div><div className="card-detail-row"><CalendarDays/><div><span>Vencimento</span><p>Dia {card.due}</p></div></div><div className="card-detail-row"><FileText/><div><span>Fechamento da fatura</span><p>Dia {card.closing}</p></div></div></section>;
}
export type GoalItem = { id:string; title:string; current:number; target:number; icon:string };
const goalIcons: Record<string,LucideIcon> = {plane:Plane,house:House,laptop:Laptop,game:Gamepad2,'✈️':Plane,'🚗':Wallet,'💰':Wallet,'🎓':FileText};
export function GoalCards({ goals, onSelect }: { goals:GoalItem[]; onSelect?:(goal:GoalItem)=>void }) {
  return <div className="goal-list">{goals.length?goals.map(goal=>{const percent=Math.min(100,Math.round(goal.current/goal.target*100))||0;const Icon=goalIcons[goal.icon]||Wallet;return <button type="button" key={goal.id} className="glass-panel goal-card" onClick={()=>onSelect?.(goal)}><div className="goal-card__content"><span className={cn('icon-tile',goal.icon==='plane'||goal.icon==='house'?'icon-tile--gold':'icon-tile--neutral')}><Icon/></span><div className="goal-card__text"><h2>{goal.title}</h2><strong>{formatMoney(goal.current)}</strong><p>de {formatMoney(goal.target)}</p></div><span className="goal-card__percentage">{percent}%</span></div><div className="gold-progress" role="progressbar" aria-label={`${goal.title}: progresso`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${percent}%`}}/></div></button>;}):<p className="list-empty glass-panel">Nenhuma meta nesta seleção.</p>}</div>;
}
export function HeaderIdentity({ name, onAlerts, onProfile }: { name:string; onAlerts:()=>void; onProfile:()=>void }) {
  return <ScreenHeader title={name} greeting><RoundButton label="Notificações" onClick={onAlerts} className="round-button--plain"><Bell/></RoundButton><button type="button" aria-label="Meu perfil" onClick={onProfile}><UserAvatar name={name}/></button></ScreenHeader>;
}
export function MenuRow({ icon:Icon, title, onClick }: { icon:LucideIcon; title:string; onClick:()=>void }) {
  return <button className="menu-row" type="button" onClick={onClick}><Icon/><span>{title}</span><ChevronRight/></button>;
}
export function SectionLink({ label, onClick }: { label:string; onClick:()=>void }) {
  return <button className="subtle-link" type="button" onClick={onClick}>{label}<ArrowUpRight/></button>;
}
