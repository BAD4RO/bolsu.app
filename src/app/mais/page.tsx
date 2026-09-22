'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logoutUser } from '@/lib/auth';
import { useResource } from '@/hooks/useResource';
import { ResourceState } from '@/components/data/resource-state';
import type { Overview } from '@/lib/overview.types';
import { BottomNav } from '@/components/custom/bottom-nav';
import { ScreenHeader } from '@/components/finance/finance-ui';
import { MoreMenu } from '@/components/finance/more-menu';
import { Button } from '@/components/ui/button';
export default function MaisPage() {
const router=useRouter(),resource=useResource<Overview>('/api/overview');
const [leaving,setLeaving]=useState(false),[error,setError]=useState('');
return <main className="app-shell finance-shell"><ScreenHeader title="Mais"/><ResourceState {...resource} retry={resource.reload}/><MoreMenu name={resource.data?.profile.nome ?? 'Minha conta'} email={resource.data?.email ?? ''} onNavigate={path=>router.push(path)}/><Button className="w-full mt-5 text-muted-foreground" variant="ghost" disabled={leaving} onClick={async()=>{setLeaving(true);setError('');try{await logoutUser();window.location.assign('/login');}catch{setError('Não foi possível encerrar a sessão. Tente novamente.');setLeaving(false);}}}><LogOut/>{leaving?'Saindo…':'Sair da conta'}</Button>{error&&<p role="alert" className="text-red-400 text-sm">{error}</p>}<BottomNav/></main>;
}
