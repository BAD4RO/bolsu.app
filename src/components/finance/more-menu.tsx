'use client';
import {useState} from 'react';
import {Bell,ChevronRight,Crown,FileText,HelpCircle,Lock,PieChart,Wallet,Search,Repeat} from 'lucide-react';
import {Brand} from '@/components/brand/brand';
import {MenuRow,UserAvatar} from './finance-ui';
const shortcuts=[{icon:Wallet,title:'Contas',hint:'Saldos e carteiras',path:'/contas'},{icon:PieChart,title:'Orçamento',hint:'Seus limites',path:'/limites'},{icon:Repeat,title:'Recorrências',hint:'Tudo organizado',path:'/recorrencias'},{icon:Bell,title:'Notificações',hint:'Seus lembretes',path:'/notificacoes'}];
const support=[{icon:Lock,title:'Privacidade e segurança',path:'/seguranca'},{icon:HelpCircle,title:'Ajuda e suporte',path:'/ajuda'},{icon:FileText,title:'Termos de uso',path:'/termos'}];
export function MoreMenu({name,email,onNavigate}:{name:string;email:string;onNavigate:(path:string)=>void}){
 const [query,setQuery]=useState('');
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const matches=(title:string)=>normalize(title).includes(normalize(query.trim()));
 const tiles=shortcuts.filter(x=>matches(x.title)),links=support.filter(x=>matches(x.title));
 const showPlan=matches('Plano e assinatura Premium');
 return <div className="menu-stack"><button className="glass-panel profile-row" onClick={()=>onNavigate('/perfil')}><UserAvatar name={name}/><div className="min-w-0 text-left"><strong>{name}</strong><p className="truncate">{email}</p></div><ChevronRight className="shrink-0"/></button>
 <label className="menu-search glass-panel"><Search size={18} aria-hidden="true"/><span className="sr-only">Buscar no menu</span><input type="search" placeholder="O que você procura?" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 {showPlan&&<button className="balance-card menu-premium" onClick={()=>onNavigate('/assinatura')}><span className="menu-tile-icon"><Crown aria-hidden="true"/></span><span><strong>Seu plano BOLSU</strong><small>Assinatura, benefícios e preferências</small></span><ChevronRight aria-hidden="true"/></button>}
 {tiles.length>0&&<div className="menu-shortcuts">{tiles.map(({icon:Icon,title,hint,path})=><button className="glass-panel menu-tile" key={path} onClick={()=>onNavigate(path)}><span className="menu-tile-icon"><Icon aria-hidden="true"/></span><strong>{title}</strong><small>{hint}</small><ChevronRight className="menu-tile-arrow" size={16} aria-hidden="true"/></button>)}</div>}
 {links.length>0&&<details className="glass-panel menu-group plan-disclosure" open={query.trim()?true:undefined}><summary className="p-4">Ajuda e segurança</summary>{links.map(x=><MenuRow key={x.path} icon={x.icon} title={x.title} onClick={()=>onNavigate(x.path)}/>)}</details>}
 {!tiles.length&&!links.length&&!showPlan&&<p role="status" className="daily-hint p-4">Nenhum atalho encontrado. Tente outro nome.</p>}<div className="brand-footer"><Brand/></div></div>;
}
