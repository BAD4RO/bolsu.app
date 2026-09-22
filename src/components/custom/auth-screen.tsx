'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brand, BrandSplash } from '@/components/brand/brand';
import { ArrowRight,Loader2,Eye,EyeOff,Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerUser,loginUser,resendConfirmation } from '@/lib/auth';
type Step='onboarding'|'login'|'register'|'verify-email';
export default function AuthScreen({initialStep='onboarding'}:{initialStep?:'onboarding'|'login'|'register'}) {
  const router=useRouter();
  const [step,setStep]=useState<Step>(initialStep),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[nome,setNome]=useState('');
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[showPassword,setShowPassword]=useState(false),[countdown,setCountdown]=useState(0),[notice,setNotice]=useState('');
  useEffect(()=>{if(countdown<=0)return;const timer=setTimeout(()=>setCountdown(v=>v-1),1000);return()=>clearTimeout(timer);},[step,countdown]);
  function changeStep(value:Step){setStep(value);setError('');setNotice('');setPassword('');setShowPassword(false);}
  async function submit(event:React.FormEvent){
    event.preventDefault();setLoading(true);setError('');
    try {
      if(step==='register') {
        const result=await registerUser({nome,email,password});
        if(!result.success){setError(result.error?.message||'Não foi possível criar a conta.');return;}
        setPassword('');
        if(!result.hasSession){setStep('verify-email');setCountdown(60);return;}
      } else {
        const result=await loginUser({email,password});
        if(!result.success){setError(result.error?.message||'Não foi possível entrar.');return;}
      }
      router.replace('/dashboard');router.refresh();
    } finally{setLoading(false);}
  }
  async function resend(){if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())){setError('Informe seu e-mail para reenviar a confirmação.');return;}setLoading(true);setError('');setNotice('');try{const result=await resendConfirmation(email);if(result.error)setError('Não foi possível reenviar. Tente novamente em alguns instantes.');else {setCountdown(60);setNotice('Se houver um cadastro pendente, uma nova confirmação será enviada. Abra o link no mesmo navegador em que fez o pedido.');}}finally{setLoading(false);}}
  if(step==='onboarding') return <main className="onboarding-shell"><BrandSplash><div className="space-y-2"><Button onClick={()=>changeStep('register')} className="w-full h-12 rounded-xl">Começar agora<ArrowRight/></Button><Button variant="ghost" onClick={()=>changeStep('login')} className="w-full">Já tenho conta</Button><Link href="/tema" className="block text-xs text-muted-foreground py-2">Conheça o novo visual</Link></div></BrandSplash></main>;
  return <main className="auth-shell min-h-screen flex flex-col items-center justify-center p-6">
    <div className="auth-card max-w-md w-full space-y-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <Brand/>
        <h1 className="text-3xl font-bold">{step==='login'?'Bem-vindo de volta!':step==='register'?'Criar conta':'Verifique seu e-mail'}</h1>
        <p className="text-muted-foreground text-sm">{step==='login'?'Entre para continuar':step==='register'?'Comece a organizar suas finanças':'Enviamos as instruções de confirmação para o e-mail informado.'}</p>
      </header>
      {notice&&<p role="status" className="text-sm text-emerald-300">{notice}</p>}
      {error&&<p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}

      {(step==='login'||step==='register')&&<form onSubmit={submit} className="space-y-5">
        {step==='register'&&<div className="space-y-2"><Label htmlFor="auth-name">Nome</Label><Input id="auth-name" autoComplete="name" required minLength={3} maxLength={80} value={nome} onChange={e=>setNome(e.target.value)} disabled={loading} className="bg-glass-inset h-12 rounded-xl"/></div>}
        <div className="space-y-2"><Label htmlFor="auth-email">E-mail</Label><Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" disabled={loading} className="bg-glass-inset h-12 rounded-xl"/></div>
        <div className="space-y-2"><Label htmlFor="auth-password">Senha</Label><div className="relative"><Input id="auth-password" type={showPassword?'text':'password'} autoComplete={step==='register'?'new-password':'current-password'} required minLength={step==='register'?8:undefined} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={loading} className="bg-glass-inset h-12 rounded-xl pr-12"/><button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword?<EyeOff className="size-5"/>:<Eye className="size-5"/>}</button></div>{step==='register'?<p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p>:<Link href="/recuperar-senha" className="text-sm text-primary">Esqueceu a senha?</Link>}</div>
        <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ffca08] to-[#ffb817]">{loading?<><Loader2 className="animate-spin"/>Aguarde…</>:step==='register'?'Criar conta':'Entrar'}</Button>
        {step==='login'&&<Button type="button" variant="ghost" className="w-full text-xs text-muted-foreground" disabled={loading||countdown>0} onClick={resend}>{countdown>0?`Reenviar confirmação em ${countdown}s`:'Reenviar confirmação de e-mail'}</Button>}
        <Button type="button" variant="ghost" disabled={loading} className="w-full" onClick={()=>changeStep(step==='login'?'register':'login')}>{step==='login'?'Criar nova conta':'Já tenho conta'}</Button>
      </form>}
      {step==='verify-email'&&<div className="space-y-5 text-center"><Mail className="size-10 text-primary mx-auto"/><p className="font-semibold break-all">{email}</p><p className="text-sm text-muted-foreground">Abra o link no mesmo navegador em que fez este cadastro. Se ele abrir em outro navegador, volte aqui e entre com sua senha após confirmar o e-mail. Confira também a caixa de spam.</p><Button disabled={loading||countdown>0} onClick={resend} className="w-full h-12">{loading?'Reenviando…':countdown>0?`Reenviar em ${countdown}s`:'Reenviar e-mail'}</Button><Button variant="ghost" disabled={loading} onClick={()=>changeStep('login')} className="w-full">Voltar para login</Button></div>}
    </div>
  </main>;
}
