import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function ResourceState({loading,error,retry}:{loading:boolean;error:string;retry:()=>void}) {
  if(loading) return <div role="status" className="glass-panel rounded-2xl p-8 flex items-center gap-3"><Loader2 className="size-5 animate-spin"/>Carregando seus dados…</div>;
  if(error) return <div role="alert" className="glass-panel rounded-2xl p-6 space-y-4"><p>{error}</p><div className="flex gap-3 flex-wrap"><Button onClick={retry}>Tentar novamente</Button><Button asChild variant="outline"><Link href="/login">Ir para login</Link></Button></div></div>;
  return null;
}
export const formatMoney = (value:number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export const formatDate = (date:string) => date.split('-').reverse().join('/');
