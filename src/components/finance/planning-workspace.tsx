'use client';
import {PlanNotice,PlanLink} from './plan-notice';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {Plus} from 'lucide-react';
import {BottomNav} from '@/components/custom/bottom-nav';
import {ScreenHeader} from './finance-ui';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {ResourceState,formatMoney as money,formatDate as date} from '@/components/data/resource-state';
import {apiRequest,useResource} from '@/hooks/useResource';
import {todayBR} from '@/lib/domain/validation';
import {planningSchemas,reserveSummary,type PlanningOperation} from '@/lib/domain/planning';
import type {PlanningSnapshot} from '@/lib/planning.types';
type Values=Record<string,string|number|boolean|null>;
type Mode='recurrences'|'budgets'|'goals'|'alerts';
const titles:Record<Mode,string>={recurrences:'Recorrências',budgets:'Orçamento',goals:'Metas',alerts:'Avisos'};
const links:[Mode,string][]=[['recurrences','/recorrencias'],['budgets','/limites'],['goals','/metas'],['alerts','/notificacoes']];
const operationTitles:Record<PlanningOperation,string>={
 'recurrence.save':'Recorrência mensal','recurrence.end':'Encerrar recorrência','recurrence.generate':'Gerar previsões',
 'occurrence.save':'Editar somente esta ocorrência','occurrence.delete':'Excluir somente esta ocorrência',
 'budget.save':'Orçamento por categoria','budget.delete':'Excluir orçamento','goal.save':'Meta financeira','goal.entry':'Movimentar reserva','alert.read':'Atualizar leitura',
};
const hints:Partial<Record<PlanningOperation,string>>={
 'recurrence.save':'Geramos 12 meses de previsões. Nada é pago automaticamente. Dias 29–31 usam o último dia quando necessário. Alterações futuras preservam ocorrências realizadas, vencidas e editadas individualmente.',
 'recurrence.end':'O dia final é inclusivo. Previsões após essa data serão excluídas, inclusive as editadas individualmente. Pagamentos registrados ficam preservados.',
 'occurrence.save':'Esta alteração afeta apenas a ocorrência selecionada. Sua competência permanece no mês original.',
 'occurrence.delete':'A ocorrência será excluída do controle e não voltará na próxima geração. Se realizada, seu efeito no saldo também será desfeito.',
 'budget.save':'Gasto considera despesas realizadas e parcelas de cartão na competência. Previsões manuais aparecem separadas; pagar a fatura não duplica o gasto.',
 'goal.entry':'Aporte reserva dinheiro dentro da conta. Retirada libera a reserva e não movimenta caixa. Para registrar uma transferência feita no banco junto ao aporte, selecione a conta de origem opcional. Para corrigir, registre um movimento inverso; a transferência vinculada continua no histórico.',
 'goal.save':'O aporte mensal estimado divide o que falta pelos meses até o prazo, incluindo o mês atual, sem supor rendimento. Para prazo vencido, mostra todo o restante. Arquivar exige retirar as reservas.',
};
export default function PlanningWorkspace({mode}:{mode:Mode}){
 const [month,setMonth]=useState(todayBR().slice(0,7)),[page,setPage]=useState(0);
 const resource=useResource<PlanningSnapshot>(`/api/planning?month=${month}&page=${page}`);
 const {data,reload}=resource;
 useEffect(()=>{const m=new URLSearchParams(window.location.search).get('month');if(m&&/^\d{4}-(0[1-9]|1[0-2])$/.test(m)&&m>='1900-01'&&m<='2200-12')setMonth(m);},[]);
 const [operation,setOperation]=useState<PlanningOperation|null>(null),[values,setValues]=useState<Values>({});
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState(false),[syncError,setSyncError]=useState(''),[syncing,setSyncing]=useState(false),[syncVersion,setSyncVersion]=useState(0);
 const busy=useRef(false),retry=useRef<{payload:string;key:string}|null>(null);
 useEffect(()=>{
  if(!/^\d{4}-\d{2}$/.test(month))return;
  let active=true;setSyncing(true);setSyncError('');
  apiRequest('/api/planning',{method:'POST',body:JSON.stringify({operation:'recurrence.generate',data:{mes:month+'-01'},requestId:crypto.randomUUID()})})
   .then(()=>{if(active)reload();}).catch(e=>{if(active)setSyncError(e.message);}).finally(()=>{if(active)setSyncing(false);});
  return ()=>{active=false;};
 },[month,reload,syncVersion]);
 function open(op:PlanningOperation,initial:Values={}){
  const defaults:Partial<Record<PlanningOperation,Values>>={
   'recurrence.save':{descricao:'',tipo:'despesa',valor:'',conta_id:'',categoria_id:'',dia:1,data_inicio:todayBR(),data_fim:null},
   'recurrence.end':{data_fim:todayBR()},'budget.save':{categoria_id:'',mes:month+'-01',valor:''},
   'goal.save':{titulo:'',valor_alvo:'',prazo:null,arquivada:false},
   'goal.entry':{meta_id:'',conta_id:'',tipo:'aporte',valor:'',data:todayBR()},
  };
  const next={...defaults[op],...initial};
  if(op==='recurrence.save'&&next.id){delete next.data_inicio;delete next.data_fim;next.desde=month+'-01';}
  setValues(next);setOperation(op);setError('');setMessage('');retry.current=null;
 }
 async function save(event:React.FormEvent){
  event.preventDefault();if(!operation||busy.current)return;setError('');
  const payload={...values};
  if(operation==='occurrence.save'&&payload.status==='previsto')payload.data_realizacao=null;
  if(operation==='goal.entry'&&(!payload.origem_id||payload.tipo==='retirada'))delete payload.origem_id;
  const parsed=planningSchemas[operation].safeParse(payload);
  if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const serialized=JSON.stringify({operation,data:parsed.data});
  if(!retry.current||retry.current.payload!==serialized)retry.current={payload:serialized,key:crypto.randomUUID()};
  busy.current=true;setSaving(true);
  try{await apiRequest('/api/planning',{method:'POST',body:JSON.stringify({operation,data:parsed.data,requestId:retry.current.key})});setOperation(null);setMessage('Alteração salva.');retry.current=null;reload();}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}
  finally{busy.current=false;setSaving(false);}
 }
 const set=(key:string,value:string|number|boolean|null)=>setValues(v=>({...v,[key]:value}));
 const field=(key:string,label:string,type='text',optional=false)=><div className="space-y-2" key={key}><Label htmlFor={'plan-'+key}>{label}</Label><Input id={'plan-'+key} type={type} value={String(values[key]??'')} required={!optional} inputMode={['valor','valor_alvo'].includes(key)?'decimal':undefined} min={type==='number'?1:undefined} max={key==='dia'?31:undefined} onChange={e=>set(key,type==='number'?Number(e.target.value):optional&&e.target.value===''?null:e.target.value)}/></div>;
 const select=(key:string,label:string,options:{id:string;name:string}[],optional=false)=><div className="space-y-2" key={key}><Label htmlFor={'plan-'+key}>{label}</Label><select id={'plan-'+key} required={!optional} className="w-full bg-glass-deep border rounded-xl p-3 text-sm" value={String(values[key]??'')} onChange={e=>set(key,e.target.value)}><option value="">{optional?'Sem transferência':'Selecione'}</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>;
 const accounts=data?.accounts.filter(a=>!a.arquivada).map(a=>({id:a.id,name:a.nome}))||[];
 const summary=data?reserveSummary(data.accounts):null;
 const count=data?(mode==='recurrences'?data.occurrenceCount:mode==='goals'?data.entryCount:mode==='alerts'?data.alertCount:0):0;
 return <main className="app-shell finance-shell">
  <ScreenHeader title={titles[mode]}/><PlanNotice/>
  <nav aria-label="Planejamento" className="flex flex-wrap gap-2 mb-5">{links.map(([key,href])=><Button key={key} asChild variant={key===mode?'default':'outline'} size="sm"><Link href={href} aria-current={key===mode?'page':undefined}>{titles[key]}</Link></Button>)}</nav>
  {mode!=='alerts'&&<div className="flex flex-wrap items-end gap-3 mb-5"><div><Label htmlFor="planning-month">Mês de consulta</Label><Input id="planning-month" type="month" min="1900-01" max="2200-12" value={month} onChange={e=>{setMonth(e.target.value);setPage(0);}}/></div><Button onClick={()=>open(mode==='recurrences'?'recurrence.save':mode==='budgets'?'budget.save':'goal.save')} disabled={!data}><Plus/>{mode==='recurrences'?'Nova recorrência':mode==='budgets'?'Definir orçamento':'Nova meta'}</Button></div>}
  {message&&<p role="status" className="glass-panel p-4 mb-4 money-positive">{message}</p>}
  {syncing&&<p role="status" className="daily-hint mb-3">Atualizando previsões dos próximos 12 meses…</p>}
  {syncError&&<div role="alert" className="glass-panel p-4 mb-4"><p>Não foi possível atualizar as previsões: {syncError}</p><Button variant="outline" onClick={()=>setSyncVersion(v=>v+1)}>Tentar geração novamente</Button></div>}
  <ResourceState loading={resource.loading} error={resource.error} retry={reload}/>
  {data&&<div className="content-stack">
   {mode==='recurrences'&&<>
    <p className="daily-hint">Ao abrir o planejamento, geramos 12 meses a partir do mês consultado. Não há pagamentos automáticos nem geração em segundo plano.</p>
    {!data.recurrences.length&&<Empty>Crie sua primeira conta recorrente, como aluguel, internet ou salário.</Empty>}
    {data.recurrences.map(r=>{const v=data.versions.filter(v=>v.recorrencia_id===r.id).at(-1);return <section className="glass-panel p-5 space-y-3" key={r.id}><h2 className="font-semibold">{r.descricao}</h2><p>{money(r.valor)} · {r.tipo==='receita'?'Receita':'Despesa'} · dia {r.dia}</p><p className="daily-hint">Início {date(r.data_inicio)}{r.data_fim?` · Último dia: ${date(r.data_fim)}`:''}{v?` · Regra mais recente desde ${date(v.desde)}`:''}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>open('recurrence.save',{id:r.id,descricao:r.descricao,tipo:r.tipo,valor:String(r.valor),conta_id:r.conta_id,categoria_id:r.categoria_id,dia:r.dia})}>Editar futuras</Button><Button size="sm" variant="ghost" onClick={()=>open('recurrence.end',{id:r.id})}>Encerrar</Button></div></section>;})}
    <h2 className="font-semibold">Ocorrências · {month.split('-').reverse().join('/')}</h2>
    {!data.occurrences.length&&<Empty>Nenhuma ocorrência neste mês.</Empty>}
    {data.occurrences.map(t=><section key={t.id} className="glass-panel p-4 space-y-2"><h3 className="font-semibold">{t.descricao} · {money(t.valor)}</h3><p className="daily-hint">Vencimento {date(t.data_vencimento)} · {t.status==='realizado'?'Realizado':'Previsto'}{t.personalizada?' · Alterada individualmente':''}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>open('occurrence.save',{id:t.id,descricao:t.descricao,valor:String(t.valor),data_vencimento:t.data_vencimento,status:t.status,data_realizacao:t.data_realizacao})}>Editar / registrar realização</Button><Button size="sm" variant="ghost" onClick={()=>open('occurrence.delete',{id:t.id})}>Excluir ocorrência</Button></div></section>)}
   </>}
   {mode==='budgets'&&<>
    <p className="daily-hint">Despesas realizadas e parcelas do cartão por competência. Previsões aparecem separadas; pagamentos de fatura não contam de novo.</p>
    {!data.budgets.length&&<Empty>Defina um valor por categoria para acompanhar os gastos deste mês.</Empty>}
    {data.budgets.map(b=><section key={b.id} className="glass-panel p-5 space-y-3"><h2 className="font-semibold">{b.categoria}</h2><p className="text-xl">{money(b.gasto)} <span className="text-sm text-muted-foreground">de {money(b.valor)}</span></p><Meter value={b.percentual} label={b.categoria}/><p className={b.restante<0?'money-negative':'daily-hint'}>{b.percentual}% utilizado · Restante {money(b.restante)}</p><p className="daily-hint">Ainda previsto: {money(b.previsto)}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>open('budget.save',{categoria_id:b.categoria_id,mes:b.mes,valor:String(b.valor)})}>Editar</Button><Button size="sm" variant="ghost" onClick={()=>open('budget.delete',{id:b.id})}>Excluir orçamento</Button></div></section>)}
   </>}
   {mode==='goals'&&<>
    {summary&&<section className="balance-card space-y-2"><h2>Saldo após reservas</h2><p className="text-3xl font-semibold">{money(summary.available)}</p><p className="text-sm">Saldo incluído {money(summary.cash)} − reservas incluídas {money(summary.reserved)}</p><p className="daily-hint">Contas fora do disponível já estão excluídas, junto com suas reservas. Este valor ainda não desconta contas e faturas pendentes.</p></section>}
    {data.accounts.some(a=>a.reservado>a.saldo_atual)&&<p role="status" className="glass-panel p-4 money-negative">Há conta com saldo menor que o reservado. Revise seus movimentos e reservas; os valores negativos continuam visíveis.</p>}
    {!data.goals.length&&<Empty>Crie uma meta e reserve dinheiro em uma das suas contas.</Empty>}
    {data.goals.map(g=><section key={g.id} className="glass-panel p-5 space-y-3"><h2 className="font-semibold">{g.titulo}{g.arquivada?' · Arquivada':''}</h2><p className="text-xl">{money(g.reservado)} <span className="text-sm text-muted-foreground">de {money(g.valor_alvo)}</span></p><Meter value={g.reservado/g.valor_alvo*100} label={g.titulo}/><p className="daily-hint">{g.prazo?`Prazo ${date(g.prazo)}${g.prazo<todayBR()?' (vencido)':''}${data.hasPlus?` · Estimativa mensal ${money(g.mensal_necessario||0)}`:''}`:'Sem prazo definido'}</p>{data.reserves.filter(r=>r.meta_id===g.id&&r.reservado!==0).map(r=><p className="daily-hint" key={r.conta_id}>{data.accounts.find(a=>a.id===r.conta_id)?.nome}: {money(r.reservado)}</p>)}<div className="flex flex-wrap gap-2">{!g.arquivada&&<Button size="sm" onClick={()=>open('goal.entry',{meta_id:g.id})}>Aporte / retirada</Button>}<Button size="sm" variant="outline" onClick={()=>open('goal.save',{id:g.id,titulo:g.titulo,valor_alvo:String(g.valor_alvo),prazo:g.prazo,arquivada:g.arquivada})}>Editar meta</Button></div></section>)}
    <h2 className="font-semibold">Movimentos de reservas · {month.split('-').reverse().join('/')}</h2>
    {!data.entries.length&&<Empty>Nenhum aporte ou retirada neste mês.</Empty>}
    {data.entries.map(e=><section key={e.id} className="glass-panel p-4"><h3>{e.tipo==='aporte'?'Aporte':'Retirada'} · {money(e.valor)}</h3><p className="daily-hint">{data.goals.find(g=>g.id===e.meta_id)?.titulo} · {data.accounts.find(a=>a.id===e.conta_id)?.nome} · {date(e.data)}{e.transferencia_id?' · Com transferência vinculada':''}</p></section>)}
   </>}
   {mode==='alerts'&&<>
    <p className="daily-hint">Avisos dentro do app: vencidos, próximos vencimentos e orçamento. Consulte as regras vigentes em Plano e assinatura. Não enviamos e-mail, push ou WhatsApp. Avisos resolvidos deixam esta lista; marcar como lido não quita uma conta.</p>
    {!data.alerts.length&&<Empty>Nenhum aviso para os registros atuais.</Empty>}
    {data.alerts.map(a=><section key={a.chave} className="glass-panel p-5 space-y-3"><h2 className="font-semibold">{a.titulo} · {a.lido?'Lido':'Novo'}</h2><p>{a.detalhe} · {money(a.valor)}</p><p className="daily-hint">{date(a.data)}</p><div className="flex gap-2 flex-wrap"><Button asChild size="sm" variant="outline"><Link href={a.destino}>Ver registros</Link></Button><Button size="sm" variant="ghost" onClick={()=>open('alert.read',{chave:a.chave,lido:!a.lido})}>{a.lido?'Marcar como não lido':'Marcar como lido'}</Button></div></section>)}
   </>}
   {count>100&&<div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</Button><span className="text-sm">{page+1} / {Math.ceil(count/100)}</span><Button variant="outline" disabled={(page+1)*100>=count} onClick={()=>setPage(p=>p+1)}>Próxima</Button></div>}
  </div>}
  <Dialog open={!!operation} onOpenChange={o=>{if(!o&&!busy.current)setOperation(null);}}><DialogContent className="max-h-[88dvh] overflow-y-auto"><DialogHeader><DialogTitle>{operation?operationTitles[operation]:''}</DialogTitle><DialogDescription>{operation?hints[operation]||'Confirme para salvar esta alteração.':''}</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4"><fieldset disabled={saving} className="space-y-4">
   {operation==='recurrence.save'&&<>{field('descricao','Descrição')}{select('tipo','Tipo',[{id:'despesa',name:'Despesa'},{id:'receita',name:'Receita'}])}{field('valor','Valor (R$)')}{select('conta_id','Conta',accounts)}{select('categoria_id','Categoria',data?.categories.filter(c=>!c.arquivada&&c.tipo===values.tipo).map(c=>({id:c.id,name:c.nome}))||[])}{field('dia','Dia do mês','number')}{values.id?field('desde','Alterar a partir do mês (primeiro dia)','date'):<>{field('data_inicio','Primeiro dia permitido','date')}{field('data_fim','Último dia (opcional)','date',true)}</>}</>}
   {operation==='recurrence.end'&&field('data_fim','Último dia permitido','date')}
   {operation==='occurrence.save'&&<>{field('descricao','Descrição')}{field('valor','Valor (R$)')}{field('data_vencimento','Vencimento','date')}{select('status','Situação',[{id:'previsto',name:'Previsto'},{id:'realizado',name:'Realizado'}])}{values.status==='realizado'&&field('data_realizacao','Pago / recebido em','date')}</>}
   {operation==='budget.save'&&<>{select('categoria_id','Categoria',data?.categories.filter(c=>c.tipo==='despesa'&&!c.arquivada).map(c=>({id:c.id,name:c.nome}))||[])}{field('mes','Mês (primeiro dia)','date')}{field('valor','Orçamento (R$)')}</>}
   {operation==='goal.save'&&<>{field('titulo','Nome da meta')}{field('valor_alvo','Valor alvo (R$)')}{field('prazo','Prazo (opcional)','date',true)}{values.id&&<label className="flex gap-3 items-center"><input type="checkbox" checked={!!values.arquivada} onChange={e=>set('arquivada',e.target.checked)}/>Arquivada</label>}</>}
   {operation==='goal.entry'&&<>{select('tipo','Movimento',[{id:'aporte',name:'Aporte'},{id:'retirada',name:'Retirada'}])}{select('conta_id','Conta onde o dinheiro está reservado',accounts)}{field('valor','Valor (R$)')}{field('data','Data do movimento','date')}{values.tipo==='aporte'&&select('origem_id','Registrar também transferência da origem (opcional)',accounts.filter(a=>a.id!==values.conta_id),true)}</>}
  </fieldset>{error&&<PlanLink error={error}/>} {error&&<p role="alert" className="money-negative">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={saving} onClick={()=>setOperation(null)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving?'Salvando…':operation?.endsWith('.delete')?'Confirmar exclusão':'Salvar'}</Button></div></form></DialogContent></Dialog>
 <BottomNav/></main>;
}
function Empty({children}:{children:React.ReactNode}){return <p className="glass-panel p-6 text-muted-foreground">{children}</p>;}
function Meter({value,label}:{value:number;label:string}){return <div className="gold-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,Math.max(0,Math.round(value)))} aria-valuetext={`${Math.round(value)}%`}><span style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div>;}
