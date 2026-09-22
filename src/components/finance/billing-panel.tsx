'use client';
import {useEffect,useRef,useState} from 'react';
import {useResource,apiRequest} from '@/hooks/useResource';
import {Button} from '@/components/ui/button';
import {ResourceState,formatMoney} from '@/components/data/resource-state';
import type {BillingCycle,BillingView} from '@/lib/billing/types';

const statuses:Record<string,string>={creating:'Preparando checkout',pending:'Aguardando pagamento',active:'Assinatura ativa',past_due:'Pagamento pendente',unpaid:'Pagamento não concluído',incomplete:'Pagamento não concluído',incomplete_expired:'Tentativa encerrada',trialing:'Período de teste gratuito',paused:'Assinatura pausada',canceled:'Assinatura cancelada',expired:'Checkout expirado'};
export function BillingPanel({onUpdate}:{onUpdate:()=>void}){
 const r=useResource<BillingView>('/api/billing');const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[confirmCancel,setConfirmCancel]=useState(false);
 const [selectedCycle,setSelectedCycle]=useState<BillingCycle>('yearly');
 const sending=useRef(false),returned=useRef(false);const data=r.data,order=data?.order;
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get('checkout');if(!returned.current&&value){returned.current=true;setMessage(value==='returned'?'Você voltou da Stripe. Atualize o pagamento para consultar a confirmação. O acesso Premium depende da confirmação da Stripe.':'Checkout interrompido. Seu plano não foi alterado pelo retorno.');}},[]);
 async function act(action:'checkout'|'sync'|'cancel'|'portal',cycle?:BillingCycle){
  if(sending.current)return;sending.current=true;setBusy(true);setError('');setMessage('');
  try{const result=await apiRequest<{url?:string}>('/api/billing/'+action,{method:'POST',body:JSON.stringify(cycle?{cycle}:{})});
   if(result.url){window.location.assign(result.url);return;}
   setMessage(action==='cancel'?'Cancelamento confirmado. O período já pago continua disponível até sua data final.':'Pagamento consultado. O plano reflete a confirmação recebida.');setConfirmCancel(false);r.reload();onUpdate();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar o pagamento.');}finally{sending.current=false;setBusy(false);}
 }
 const canStart=!order||(['canceled','expired','incomplete_expired'].includes(order.status)&&(!order.paidUntil||new Date(order.paidUntil)<=new Date()));
 return <section className="glass-panel p-5 space-y-4" aria-labelledby="billing-title"><h2 id="billing-title" className="font-semibold">Sua assinatura <span className="home-badge">{data?.mode==='live'?'Assinatura Premium':'Ambiente de teste'}</span></h2><p className="daily-hint">{canStart?(data?.mode==='live'?'Escolha seu plano.':'Use apenas cartões de teste. Sem período gratuito.'):'Gerencie seu pagamento e sua renovação.'}</p><ResourceState {...r} retry={r.reload}/>
  {message&&<p role="status" className="daily-message">{message}</p>}{error&&<p role="alert" className="money-negative text-sm">{error}</p>}
  {data&&<>{!data.enabled&&<p className="home-warning">Checkout indisponível até concluir a configuração do ambiente de teste e liberar sua conta para participar.</p>}
   {canStart&&<div className="premium-offer"><div className="billing-cycle-picker" role="group" aria-label="Periodicidade da assinatura">{(['monthly','yearly'] as const).map(cycle=><button type="button" key={cycle} aria-pressed={selectedCycle===cycle} onClick={()=>setSelectedCycle(cycle)}>{cycle==='monthly'?'Mensal':'Anual'}{cycle==='yearly'&&data.prices.yearly<data.prices.monthly*12&&<small>Economize {Math.round((1-data.prices.yearly/(data.prices.monthly*12))*100)}%</small>}</button>)}</div><div className="billing-price"><span>Premium {selectedCycle==='monthly'?'mensal':'anual'}</span><strong>{formatMoney(data.prices[selectedCycle]/100)}<small>/{selectedCycle==='monthly'?'mês':'ano'}</small></strong><p className="daily-hint">Renovação {selectedCycle==='monthly'?'mensal':'anual'}. Cancele quando quiser.</p></div><Button className="w-full" disabled={busy||!data.enabled} onClick={()=>act('checkout',selectedCycle)}>{busy?'Aguarde…':data.mode==='live'?'Assinar Premium':'Testar Premium'}</Button></div>}
   {order&&<div className="space-y-3"><p className="text-sm font-semibold">{statuses[order.status]||'Em conferência'}{order.cancelAtPeriodEnd?' · Renovação cancelada':''}</p><p className="text-sm text-muted-foreground">Premium {order.cycle==='yearly'?'anual':'mensal'} · {formatMoney(data.prices[order.cycle]/100)}/{order.cycle==='yearly'?'ano':'mês'}</p>{order.paidUntil&&<p className="daily-hint">Período pago até {new Date(order.paidUntil).toLocaleDateString('pt-BR')}.</p>}{['past_due','unpaid','incomplete'].includes(order.status)&&<p role="status" className="home-warning">Há um pagamento pendente. Abra Gerenciar assinatura para revisar a fatura, atualizar o cartão ou concluir a autenticação solicitada. Uma cobrança não paga não estende o acesso Premium.</p>}{order.lastSyncedAt&&<p className="daily-hint">Última consulta: {new Date(order.lastSyncedAt).toLocaleString('pt-BR')}.</p>}<div className="flex flex-wrap gap-2">
    <Button variant="outline" disabled={busy||!data.enabled} onClick={()=>act('sync')}>Atualizar pagamento</Button>
    {(['pending','creating'].includes(order.status))&&<Button disabled={busy||!data.enabled} onClick={()=>act('checkout',order.cycle)}>Retomar checkout</Button>}
    {order.hasCustomer&&<Button disabled={busy||!data.enabled} onClick={()=>act('portal')}>Gerenciar assinatura</Button>}
    {!order.cancelAtPeriodEnd&&!['canceled','expired','incomplete_expired'].includes(order.status)&&<Button variant="ghost" disabled={busy||!data.enabled} onClick={()=>setConfirmCancel(true)}>{['pending','creating'].includes(order.status)?'Encerrar checkout':'Cancelar renovação'}</Button>}
   </div>{confirmCancel&&<div className="rounded-xl border p-4 space-y-3"><p className="text-sm">Confirmar o encerramento? Novas renovações serão canceladas e o acesso já pago permanece até o fim do período.</p><div className="flex gap-2 flex-wrap"><Button disabled={busy} onClick={()=>act('cancel')}>Confirmar cancelamento</Button><Button variant="ghost" disabled={busy} onClick={()=>setConfirmCancel(false)}>Voltar</Button></div></div>}</div>}
  </>}
 </section>;
}
