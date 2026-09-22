'use client';
import {PlanLink} from './plan-notice';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {dailySchemas} from '@/lib/domain/daily';
import {apiRequest} from '@/hooks/useResource';
import type {Overview} from '@/lib/overview.types';
export function QuickEntry({mode,data,onClose,onSaved}:{mode:'account'|'transaction';data:Overview;onClose:()=>void;onSaved:()=>void}){
 const returnFocus=useRef<HTMLElement|null>(typeof document!=='undefined'?document.activeElement as HTMLElement:null);
 const account=mode==='account';
 const [name,setName]=useState(''),[amount,setAmount]=useState(''),[day,setDay]=useState(data.today);
 const [type,setType]=useState<'receita'|'despesa'>('despesa'),[accountId,setAccountId]=useState(data.accounts.find(a=>a.incluir_no_disponivel)?.id||data.accounts[0]?.id||'');
 const [category,setCategory]=useState(data.categories.find(c=>c.tipo==='despesa'&&c.nome==='Outros')?.id||data.categories.find(c=>c.tipo==='despesa')?.id||'');
 const [kind,setKind]=useState('corrente'),[included,setIncluded]=useState(true),[status,setStatus]=useState('realizado'),[competence,setCompetence]=useState(data.today),[due,setDue]=useState(data.today),[notes,setNotes]=useState('');
 const [advanced,setAdvanced]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const busy=useRef(false),retry=useRef<{payload:string;key:string}|null>(null);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(busy.current)return;setError('');
  const operation=account?'account.save':'transaction.save';
  const payload=account?{nome:name,tipo:kind,saldo_inicial:amount,data_saldo_inicial:day,incluir_no_disponivel:included}:
   {descricao:name,tipo:type,valor:amount,conta_id:accountId,categoria_id:category,data_competencia:competence,data_vencimento:due,status,data_realizacao:status==='previsto'?null:day,observacoes:notes};
  const parsed=dailySchemas[operation].safeParse(payload);if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const serialized=JSON.stringify({operation,data:parsed.data});if(retry.current?.payload!==serialized)retry.current={payload:serialized,key:crypto.randomUUID()};
  busy.current=true;setSaving(true);
  try{await apiRequest('/api/daily',{method:'POST',body:JSON.stringify({operation,data:parsed.data,requestId:retry.current!.key})});onSaved();}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar. Seus campos foram preservados.');}
  finally{busy.current=false;setSaving(false);}
 }
 const selectClass='w-full rounded-xl border bg-glass-deep p-3 text-sm';
 return <Dialog open onOpenChange={open=>{if(!open&&!busy.current)onClose();}}><DialogContent className="quick-entry" onCloseAutoFocus={e=>{e.preventDefault();const target=returnFocus.current; if(target?.isConnected)target.focus();else document.getElementById('home-content')?.focus();}}><DialogHeader><DialogTitle>{account?'Cadastrar uma conta':'Novo lançamento'}</DialogTitle><DialogDescription>{account?'Informe o saldo no início da data escolhida, antes dos movimentos que registrará nesse dia. O saldo inicial não é uma receita.':'Registre uma receita ou despesa da conta. Compras de cartão ficam na tela Cartões.'}</DialogDescription></DialogHeader>
 <form onSubmit={submit} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
  {!account&&<div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de lançamento">{(['despesa','receita'] as const).map(t=><Button type="button" key={t} variant={type===t?'default':'outline'} aria-pressed={type===t} onClick={()=>{setType(t);setCategory(data.categories.find(c=>c.tipo===t&&c.nome===(t==='despesa'?'Outros':'Salário'))?.id||data.categories.find(c=>c.tipo===t)?.id||'');}}>{t==='despesa'?'Despesa':'Receita'}</Button>)}</div>}
  <div className="space-y-2"><Label htmlFor="quick-name">{account?'Nome da conta':'Descrição'}</Label><Input id="quick-name" required maxLength={account?80:160} value={name} onChange={e=>setName(e.target.value)} placeholder={account?'Ex.: Conta principal':'Ex.: Mercado'}/></div>
  <div className="space-y-2"><Label htmlFor="quick-amount">{account?'Saldo no início do dia (R$)':'Valor (R$)'}</Label><Input id="quick-amount" required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></div>
  {!account&&<><div className="space-y-2"><Label htmlFor="quick-account">Conta</Label><select id="quick-account" required className={selectClass} value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Selecione</option>{data.accounts.map(a=><option value={a.id} key={a.id}>{a.nome}</option>)}</select></div><div className="space-y-2"><Label htmlFor="quick-category">Categoria</Label><select id="quick-category" required className={selectClass} value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecione</option>{data.categories.filter(c=>c.tipo===type).map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div><p className="daily-hint">{status==='previsto'?'Previsão: ainda não altera o saldo.':'Situação: pago / recebido. A conta e a categoria selecionadas podem ser alteradas.'}</p></>}
  {(account||status==='realizado')&&<div className="space-y-2"><Label htmlFor="quick-day">{account?'Data do saldo inicial':'Pago / recebido em'}</Label><Input id="quick-day" type="date" required min="1900-01-01" max={data.today} value={day} onChange={e=>{setDay(e.target.value);if(!advanced){setDue(e.target.value);setCompetence(e.target.value);}}}/></div>}
  <Button type="button" variant="ghost" aria-expanded={advanced} aria-controls="quick-advanced" onClick={()=>setAdvanced(v=>!v)}>{advanced?'Recolher opções':'Mais opções'}</Button>
  <div id="quick-advanced" hidden={!advanced} className="space-y-4">
   {account?<><div className="space-y-2"><Label htmlFor="quick-kind">Tipo de conta</Label><select id="quick-kind" className={selectClass} value={kind} onChange={e=>setKind(e.target.value)}><option value="corrente">Conta corrente</option><option value="poupanca">Poupança</option><option value="carteira">Dinheiro em espécie</option><option value="investimento">Investimento</option></select></div><label className="flex gap-3 items-center"><input type="checkbox" checked={included} onChange={e=>setIncluded(e.target.checked)}/>Incluir no disponível</label></>:<><div className="space-y-2"><Label htmlFor="quick-status">Situação</Label><select id="quick-status" className={selectClass} value={status} onChange={e=>setStatus(e.target.value)}><option value="realizado">Pago / recebido</option><option value="previsto">Previsto / pendente</option></select></div><div className="space-y-2"><Label htmlFor="quick-due">Vencimento</Label><Input id="quick-due" type="date" required={advanced} value={due} onChange={e=>setDue(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="quick-competence">Competência (mês do registro)</Label><Input id="quick-competence" type="date" required={advanced} value={competence} onChange={e=>setCompetence(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="quick-notes">Observações (opcional)</Label><Input id="quick-notes" maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/></div></>}
  </div>
 </fieldset>{error&&<PlanLink error={error}/>} {error&&<p role="alert" className="money-negative">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving} type="submit">{saving?'Salvando…':account?'Cadastrar conta':'Salvar lançamento'}</Button></div>{!account&&<Link href="/cartoes" className="subtle-link">Registrar compra no cartão</Link>}</form></DialogContent></Dialog>;
}
