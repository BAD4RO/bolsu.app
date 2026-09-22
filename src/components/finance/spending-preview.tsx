'use client';
import {useState} from 'react';
import {Calculator,RotateCcw} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {formatMoney} from '@/components/data/resource-state';
export function SpendingPreview({cash,hasAccount,visible}:{cash:number;hasAccount:boolean;visible:boolean}){
 const [value,setValue]=useState('');
 const parsed=Number(value.replace(',','.'));
 const valid=/^\d+(?:[.,]\d{1,2})?$/.test(value)&&Number.isFinite(parsed)&&parsed>0&&parsed<=999999999;
 const after=Math.round((cash-parsed)*100)/100;
 const money=(n:number)=>visible?formatMoney(n):'••••••';
 return <section className="glass-panel p-5" aria-labelledby="spending-title"><div className="home-heading"><h2 id="spending-title" className="home-section-title"><Calculator aria-hidden="true"/>E se eu gastar…?</h2><span className="home-badge">Simulador</span></div><p className="daily-hint">Experimente uma despesa à vista. Nenhum lançamento será criado.</p>{!hasAccount?<p className="home-warning">Cadastre uma conta incluída no resumo para simular com seu saldo real.</p>:!visible?<p className="daily-hint">Mostre os valores no topo da tela para usar o simulador.</p>:<><label htmlFor="spending-value" className="text-xs text-muted-foreground">Valor da despesa (R$)</label><div className="flex gap-2 mt-2"><Input id="spending-value" inputMode="decimal" placeholder="Ex.: 150,00" maxLength={14} value={value} aria-invalid={!!value&&!valid} aria-describedby="spending-help" onChange={e=>setValue(e.target.value)}/><Button variant="outline" size="icon" aria-label="Limpar simulação" onClick={()=>setValue('')}><RotateCcw/></Button></div><div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Valores para simular">{[50,100,200].map(n=><Button key={n} size="sm" variant={parsed===n?'default':'outline'} aria-pressed={parsed===n} onClick={()=>setValue(String(n))}>{formatMoney(n)}</Button>)}</div><div className="home-simulation-result" role="status" aria-live="polite">{valid?<><span>Saldo após essa despesa</span><strong className={after<0?'money-negative':'text-primary'}>{money(after)}</strong><small>{after<0?'A despesa supera o saldo atual incluído.':'Resultado considera apenas o saldo atual.'}</small></>:<span>{value?'Informe um valor positivo com até duas casas decimais.':'Digite ou escolha um valor para comparar.'}</span>}</div><p id="spending-help" className="daily-hint">Não desconta reservas nem pagamentos futuros. Consulte Planejamento para ver os compromissos do mês.</p></>}</section>;
}
