'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { ArrowLeft,User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResource,apiRequest } from '@/hooks/useResource';
import { ResourceState } from '@/components/data/resource-state';
import type { Profile } from '@/lib/database.types';
export default function PerfilPage() {
  const resource=useResource<{profile:Profile;email:string}>('/api/profile');
  const [nome,setNome]=useState(''),[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{if(resource.data)setNome(resource.data.profile.nome);},[resource.data]);
  async function save(event:React.FormEvent){event.preventDefault();setSaving(true);setMessage('');setError('');try{await apiRequest('/api/profile',{method:'PATCH',body:JSON.stringify({nome})});setMessage('Perfil atualizado.');resource.reload();}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.');}finally{setSaving(false);}}
  return <main className="app-shell min-h-screen pb-8"><header className="glass-panel p-6"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link href="/mais" aria-label="Voltar"><ArrowLeft/></Link></Button><h1 className="text-2xl font-bold">Meu perfil</h1></div></header><div className="p-6 space-y-5"><ResourceState {...resource} retry={resource.reload}/>{resource.data&&<form className="glass-panel p-6 rounded-2xl space-y-5" onSubmit={save}><User className="text-primary size-10"/><div className="space-y-2"><Label htmlFor="profile-name">Nome</Label><Input id="profile-name" required maxLength={80} value={nome} onChange={e=>setNome(e.target.value)} disabled={saving}/></div><div className="space-y-2"><Label htmlFor="profile-email">E-mail da conta</Label><Input id="profile-email" value={resource.data.email} readOnly/></div><p className="text-sm text-muted-foreground">Moeda: real brasileiro · Fuso horário: São Paulo</p>{error&&<p role="alert" className="text-red-400">{error}</p>}<Button disabled={saving} type="submit">{saving?'Salvando…':'Salvar alterações'}</Button></form>}<p role="status" className="text-emerald-400">{message}</p></div></main>;
}
