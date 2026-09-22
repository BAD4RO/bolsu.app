'use client';
import Link from 'next/link';
import {useSubscription} from '@/hooks/useSubscription';
export function PlanNotice(){
 const r=useSubscription();const p=r.data;if(!p)return null;
 const blocked=[...p.accounts,...p.cards,...p.goals].filter(x=>!x.allowed);
 return <aside className="glass-panel p-4 mb-4 text-sm"><div className="flex gap-3 justify-between flex-wrap"><span>{p.hasPlus?'Plus':'Gratuito'} · {p.accounts.filter(a=>a.allowed).length}/{p.limits.accounts??'∞'} contas · {p.cards.filter(a=>a.allowed).length}/{p.limits.cards??'∞'} cartões · {p.goals.filter(a=>a.allowed).length}/{p.limits.goals??'∞'} metas</span><Link href="/assinatura" className="subtle-link">Gerenciar plano e recursos</Link></div>{blocked.length>0&&<p className="daily-hint">Aguardando seleção: {blocked.map(x=>x.name).join(', ')}. Histórico, pagamentos de fatura e retiradas de reservas permanecem disponíveis.</p>}{p.pausedRecurrences>0&&<p className="daily-hint">{p.pausedRecurrences} recorrência(s) com geração suspensa pelo plano. Previsões e parcelas existentes foram preservadas.</p>}</aside>;
}
export function PlanLink({error}:{error:string}){return /Gratuito|Plus|plano/.test(error)?<Link className="subtle-link" href="/assinatura">Ver benefícios e gerenciar meus recursos</Link>:null;}
